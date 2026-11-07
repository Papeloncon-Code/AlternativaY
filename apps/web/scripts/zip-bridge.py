# Empaqueta apps/bridge en public/todotube-puente.zip (se sirve desde /todotube-puente.zip).
import pathlib, zipfile
root = pathlib.Path(__file__).resolve().parents[2] / 'bridge'
out = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'todotube-puente.zip'
files = ['manifest.json', 'rules.json', 'background.js', 'content.js', 'injected.js', 'NOTICE.md']
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(root / f, f)
print(f'Puente empaquetado: {out.name} ({out.stat().st_size} bytes)')
