"""Refresh every asset version before manual publication; entry URL stays stable."""
from pathlib import Path
import hashlib,re
root=Path(__file__).resolve().parent.parent
files=[root/'index.html',*sorted((root/'src').glob('*'))]
h=hashlib.sha256()
for p in [*files,*sorted(root.glob('*.png'))]:
 data=p.read_bytes()
 if p.suffix in ('.html','.js','.css'):
  data=re.sub(rb'(\?v=)[a-zA-Z0-9]+',rb'\1VERSION',data)
  data=re.sub(rb"assetVersion = '[a-zA-Z0-9]+'",b"assetVersion = 'VERSION'",data)
 h.update(data)
version=h.hexdigest()[:12]
for p in files:
 s=p.read_text();s=re.sub(r'\?v=[a-zA-Z0-9]+','?v='+version,s)
 s=re.sub(r"assetVersion = '[a-zA-Z0-9]+'","assetVersion = '"+version+"'",s)
 p.write_text(s)
print('Asset version:',version)
