#!/usr/bin/env python3
"""Revisión de coherencia de las especificaciones (paso *analyze* del proceso SDD).

Comprueba que:
  1. cada criterio de aceptación (CAx.y) de una funcionalidad tiene al menos una tarea;
  2. cada funcionalidad tiene spec.md, plan.md y tasks.md;
  3. ninguna spec.md de funcionalidad supera ~2 páginas (≈ 900 palabras) sin estar marcada como excepción;
  4. las aclaraciones pendientes se listan (aviso, no error).
Uso: python3 tools/spec-check.py   (sale con código 1 si hay errores)
"""
import glob, os, re, sys

errors, warnings = [], []
transversal = open('specs/002-mvp/tasks.md').read()

for d in sorted(glob.glob('specs/01*/')):
    name = os.path.basename(d.rstrip('/'))
    for f in ('spec.md', 'plan.md', 'tasks.md'):
        if not os.path.exists(d + f):
            errors.append(f'{name}: falta {f}')
    if not os.path.exists(d + 'spec.md') or not os.path.exists(d + 'tasks.md'):
        continue
    spec, tasks = open(d + 'spec.md').read(), open(d + 'tasks.md').read() + transversal
    for ca in sorted(set(re.findall(r'\*\*(CA\d+\.\d+)', spec))):
        a, b = ca[2:].split('.')
        ok = ca in tasks or f'CA{a}.*' in tasks or any(
            int(m.group(1)) <= int(b) <= int(m.group(2))
            for m in re.finditer(rf'CA{a}\.(\d+)[–-](?:CA{a}\.)?(\d+)', tasks))
        if not ok:
            errors.append(f'{name}: {ca} no tiene ninguna tarea')
    words = len(spec.split())
    if words > 900 and 'excepción-tamaño' not in spec:
        warnings.append(f'{name}: spec.md tiene {words} palabras (> ~2 páginas); ¿dividir?')
    pending = len(re.findall(r'^- \[ \]', spec, re.M))
    if pending:
        warnings.append(f'{name}: {pending} aclaraciones pendientes')

for w in warnings: print('AVISO ', w)
for e in errors: print('ERROR ', e)
print(f'{len(errors)} errores, {len(warnings)} avisos')
sys.exit(1 if errors else 0)
