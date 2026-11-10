"""Build runtime-only docs and root-entry ZIP; never changes editable artwork/code.
Requires cwebp and esbuild. Override ESBUILD with a local executable path if needed.
"""
from pathlib import Path
import base64,hashlib,json,os,re,shutil,subprocess,tempfile,zipfile
ROOT=Path(__file__).resolve().parent.parent
sha=lambda data:hashlib.sha256(data).hexdigest()
def run(args):
 p=subprocess.run([str(x) for x in args],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stderr

def build():
 esbuild=os.environ.get('ESBUILD') or shutil.which('esbuild') or '/tmp/thanksgiving-build-tools/node_modules/.bin/esbuild'
 if not Path(esbuild).is_file():raise RuntimeError('Install esbuild as a build-time tool or set ESBUILD to its executable.')
 if not shutil.which('cwebp'):raise RuntimeError('cwebp is required.')
 sources=[ROOT/'index.html',*sorted((ROOT/'src').glob('*')),*sorted(ROOT.glob('*.png'))]
 originals={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sources}
 previous=ROOT/'production-build.json'
 old=json.loads(previous.read_text()) if previous.exists() else {}
 docs=ROOT/'docs'
 if docs.exists():
  unknown={str(p.relative_to(docs)) for p in docs.rglob('*') if p.is_file()}-set(old.get('files',{}))
  if unknown:raise RuntimeError('Unmanaged docs files; refusing overwrite: '+str(unknown))
 with tempfile.TemporaryDirectory(prefix='thanksgiving-production-') as tmp:
  temp=Path(tmp);out=temp/'output';assets=out/'assets';assets.mkdir(parents=True);work=temp/'src';work.mkdir()
  mapping={};image_report=[]
  for p in sorted(ROOT.glob('*.png')):
   name='background' if p.name=='1920х1080.png' else p.stem
   dest=temp/(name+'.webp')
   args=['cwebp','-m','6','-metadata','none']
   if p.name=='life.png':args+=['-lossless','-resize','276','276']
   else:
    args+=['-q','94','-sharp_yuv']
    if name!='background':args+=['-resize','940','940']
   diagnostic=run([*args,p,'-o',dest]);data=dest.read_bytes();filename=f'{name}.{sha(data)[:12]}.webp'
   (assets/filename).write_bytes(data);mapping[p.name]='assets/'+filename
   image_report.append({'source':p.name,'source_bytes':p.stat().st_size,'output':'assets/'+filename,'output_bytes':len(data),'dimensions':[2160,1215] if name=='background' else [276,276] if name=='life' else [940,940], 'encoding':'lossless after resize, alpha preserved' if name=='life' else 'WebP quality 94, sharp YUV', 'encoder_diagnostic':diagnostic})
  for p in (ROOT/'src').glob('*.js'):
   s=p.read_text();s=re.sub(r"(from ['\"]\./[^'\"]+\.js)\?v=[a-zA-Z0-9]+",r'\1',s)
   if p.name in ('data.js','game.js'):
    for original,replacement in mapping.items():s=s.replace(original,replacement)
   if p.name=='game.js':s=s.replace('?v=${assetVersion}','')
   (work/p.name).write_text(s)
  js=temp/'game.js';run([esbuild,work/'game.js','--bundle','--minify','--format=esm','--target=es2020','--legal-comments=none','--outfile='+str(js)])
  jsname='game.'+sha(js.read_bytes())[:12]+'.js';(assets/jsname).write_bytes(js.read_bytes())
  css=(ROOT/'src/style.css').read_text();css=re.sub(r'\.\./1920х1080\.png(?:\?v=[a-zA-Z0-9]+)?',mapping['1920х1080.png'],css)
  if '1920х1080.png' in css:raise RuntimeError('Background URL was not replaced')
  # Tiny inline copy of the approved background avoids a plain-colour first paint.
  fallback=temp/'background-preview.webp'
  run(['cwebp','-q','50','-m','6','-resize','192','108',ROOT/'1920х1080.png','-o',fallback])
  preview='data:image/webp;base64,'+base64.b64encode(fallback.read_bytes()).decode()
  css+='body{background-image:url('+preview+');background-position:center;background-size:contain;background-repeat:no-repeat}'
  (temp/'style.css').write_text(css);mini=temp/'style.min.css'
  run([esbuild,temp/'style.css','--minify','--target=es2020','--outfile='+str(mini)])
  html=(ROOT/'index.html').read_text()
  critical='<link rel="preload" as="image" fetchpriority="high" href="'+mapping['1920х1080.png']+'"><style>'+mini.read_text().strip()+'</style>'
  html=re.sub(r'<link rel="stylesheet" href="src/style\.css\?v=[a-zA-Z0-9]+">',critical,html)
  html=re.sub(r'src/game\.js\?v=[a-zA-Z0-9]+','assets/'+jsname,html)
  html=re.sub(r'>\s+<','><',html).strip();(out/'index.html').write_text(html+'\n')
  files={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(out.rglob('*')) if p.is_file()}
  docs.mkdir(exist_ok=True)
  for name,info in old.get('files',{}).items():
   p=docs/name
   if p.exists() and sha(p.read_bytes())!=info['sha256']:raise RuntimeError('Modified production file, refusing overwrite: '+name)
  for p in out.rglob('*'):
   if p.is_file():target=docs/p.relative_to(out);target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
  for name in set(old.get('files',{}))-set(files):(docs/name).unlink(missing_ok=True)
  archive=ROOT/'thanksgiving-production.zip'
  with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
   for name in files:z.write(docs/name,name)
  report={'original_runtime_bytes':sum(p.stat().st_size for p in sources),'optimized_runtime_bytes':sum(f['bytes'] for f in files.values()),'zip_bytes':archive.stat().st_size,'source_hashes':originals,'images':image_report,'files':files,'tools':{'cwebp':run_version('cwebp'),'esbuild':run_version(esbuild)}}
  previous.write_text(json.dumps(report,indent=2)+'\n')
  for name,digest in originals.items():assert sha((ROOT/name).read_bytes())==digest,'Source changed: '+name
  print(json.dumps({k:v for k,v in report.items() if k in ('original_runtime_bytes','optimized_runtime_bytes','zip_bytes','tools')},indent=2))
def run_version(tool):return subprocess.check_output([str(tool),'--version' if str(tool).endswith('esbuild') else '-version'],text=True).strip()
if __name__=='__main__':build()
