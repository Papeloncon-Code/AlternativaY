# Empaqueta apps/bridge:
#  - public/todotube-puente.zip          → Chrome/Edge (instalación manual en modo desarrollador)
#  - public/todotube-puente-firefox.zip → para subir a Mozilla y firmarlo (sin el campo service_worker, que Firefox no usa)
# Si existe apps/bridge/firmado/todotube-puente.xpi (la versión firmada por Mozilla), se publica en /todotube-puente.xpi.
import json, pathlib, shutil, zipfile
root = pathlib.Path(__file__).resolve().parents[2] / 'bridge'
web = pathlib.Path(__file__).resolve().parents[1]
files = ['rules.json', 'background.js', 'content.js', 'injected.js', 'NOTICE.md']
manifest = json.loads((root / 'manifest.json').read_text())

def pack(out, m):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps(m, indent=2, ensure_ascii=False))
        for f in files:
            z.write(root / f, f)
    print(f'Puente empaquetado: {out.relative_to(web)} ({out.stat().st_size} bytes)')

pack(web / 'public' / 'todotube-puente.zip', manifest)
ff = json.loads(json.dumps(manifest)); ff['background'].pop('service_worker', None)
pack(web / 'public' / 'todotube-puente-firefox.zip', ff)  # se descarga desde la web para subirlo a Mozilla

signed = root / 'firmado' / 'todotube-puente.xpi'
target = web / 'public' / 'todotube-puente.xpi'
if signed.exists():
    shutil.copyfile(signed, target); print('Versión firmada para Firefox publicada en /todotube-puente.xpi')
elif target.exists():
    target.unlink()
