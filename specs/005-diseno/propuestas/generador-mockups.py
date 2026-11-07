import json, sys, time, html, hashlib
M = sys.argv[1]
items = json.load(open(f'{M}/feed.json'))['items']
now = time.time() * 1000
def ago(ms):
    s = (now - ms) / 1000
    if s < 3600: return f'hace {max(1,int(s//60))} min'
    if s < 86400: h=int(s//3600); return f'hace {h} h'
    d = int(s // 86400); return 'ayer' if d == 1 else f'hace {d} días'
def ini(n): return ''.join(w[0] for w in n.split()[:2]).upper()
def hue(s): return int(hashlib.md5(s.encode()).hexdigest()[:4], 16) % 360
esc = html.escape
# Orden: el destacado es el más reciente; la cuadrícula intercala canales
feat = items[0]
rest = items[1:]
by = {}
for v in rest: by.setdefault(v['channel'], []).append(v)
grid = []
while any(by.values()):
    for k in list(by):
        if by[k]: grid.append(by[k].pop(0))
channels = sorted({v['channel'] for v in items})
D = {
 'a': dict(name='Grafito y lima', bg='#0E0F11', s1='#16171A', s2='#1F2024', line='#2A2B30', text='#F2F2EF', t2='#A3A5AB', acc='#C8F169', accText='#0E0F11',
           ui="'Inter Variable'", disp="'Instrument Serif'", dispStyle='italic', dispWeight='400', radius='12px'),
 'b': dict(name='Tinta y ámbar', bg='#0D0C0B', s1='#171513', s2='#211E1B', line='#2E2A26', text='#F5F0E8', t2='#ABA397', acc='#F2A93B', accText='#1A1206',
           ui="'Manrope Variable'", disp="'Manrope Variable'", dispStyle='normal', dispWeight='700', radius='14px'),
}
FONTS = f"""
@font-face{{font-family:'Inter Variable';src:url('file://{M}/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:'Manrope Variable';src:url('file://{M}/node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2') format('woff2');font-weight:200 800}}
@font-face{{font-family:'Instrument Serif';font-style:italic;src:url('file://{M}/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2') format('woff2')}}
"""
ICON = {
 'menu':'M4 7h16M4 12h16M4 17h16','search':'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4','bell':'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
 'home':'M4 10.5 12 4l8 6.5V20h-5v-5h-6v5H4z','subs':'M4 6h16M4 11h16M4 16h9M17 14.5l4 2.5-4 2.5z','lib':'M5 4h3v16H5zM10.5 4h3v16h-3zM16 5l3 .8-3.5 14.5-3-.8z',
 'hist':'M12 7v5l3 2M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4 4v4h4','down':'M12 4v11M7 10.5l5 5 5-5M5 20h14','play':'M8 5.5v13l11-6.5z','plus':'M12 5v14M5 12h14','focus':'M12 4v3M12 17v3M4 12h3M17 12h3M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}
def ic(n, s=20, fill=False): return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="{"currentColor" if fill else "none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="{ICON[n]}"/></svg>'
def logo(d, small=False):
    sz = 26 if not small else 22
    mark = f'''<svg width="{sz}" height="{sz}" viewBox="0 0 32 32"><circle cx="15" cy="17" r="14" fill="{d['acc']}"/>
<path d="M11.5 11v12l10-6z" fill="{d['accText']}"/><circle cx="26.5" cy="5.5" r="4.5" fill="{d['text']}" stroke="{d['bg']}" stroke-width="2.5"/></svg>'''
    return f'<a class="logo">{mark}<span>todo<b>tube</b></span></a>'
def avatar(name, size=34):
    return f'<span class="av" style="width:{size}px;height:{size}px;background:hsl({hue(name)} 28% 30%);font-size:{size*0.38:.0f}px">{ini(name)}</span>'
def card(v, new=False):
    return f'''<article class="card"><div class="th"><img src="https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg">{'<span class="new">Nuevo</span>' if new else ''}</div>
<div class="cb">{avatar(v['channel'])}<div><h3>{esc(v['title'])}</h3><p>{esc(v['channel'])} · {ago(v['publishedAt'])}</p></div></div></article>'''
def css(d):
    return FONTS + f"""
*{{box-sizing:border-box;margin:0}} body{{background:{d['bg']};color:{d['text']};font-family:{d['ui']},system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:14px}}
img{{display:block;width:100%;height:100%;object-fit:cover}} a{{color:inherit;text-decoration:none}}
.top{{height:64px;display:grid;grid-template-columns:240px 1fr auto;align-items:center;padding:0 20px 0 16px;position:sticky;top:0;background:color-mix(in srgb,{d['bg']} 86%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid {d['line']};z-index:3}}
.lft{{display:flex;align-items:center;gap:14px}} .iconbtn{{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:{d['t2']}}}
.logo{{display:flex;align-items:center;gap:9px;font-size:20px;letter-spacing:-.03em;font-weight:600}} .logo b{{font-weight:800}}
.search{{justify-self:center;width:min(640px,100%);height:42px;border-radius:999px;background:{d['s1']};border:1px solid {d['line']};display:flex;align-items:center;gap:10px;padding:0 6px 0 18px;color:{d['t2']}}}
.search span{{flex:1}} .search kbd{{font:inherit;font-size:12px;border:1px solid {d['line']};border-radius:6px;padding:2px 7px}}
.rgt{{display:flex;align-items:center;gap:6px}}
.foco{{display:flex;align-items:center;gap:8px;height:36px;padding:0 6px 0 12px;border-radius:999px;border:1px solid {d['line']};color:{d['t2']};font-weight:600;font-size:13px}}
.sw{{width:30px;height:18px;border-radius:999px;background:{d['s2']};position:relative}} .sw::after{{content:'';position:absolute;left:3px;top:3px;width:12px;height:12px;border-radius:50%;background:{d['t2']}}}
.foco.on{{color:{d['text']};border-color:{d['acc']}}} .foco.on .sw{{background:{d['acc']}}} .foco.on .sw::after{{left:15px;background:{d['accText']}}}
.me{{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,hsl({hue('jerry')} 40% 45%),hsl({hue('jerry')+40} 40% 30%));margin-left:6px}}
.wrap{{display:grid;grid-template-columns:240px 1fr}}
.side{{padding:12px 12px 24px;border-right:1px solid {d['line']};min-height:calc(100vh - 64px)}}
.nav a{{display:flex;align-items:center;gap:14px;height:42px;padding:0 12px;border-radius:10px;color:{d['t2']};font-weight:500}}
.nav a.on{{background:{d['s1']};color:{d['text']};font-weight:650}} .nav a.on svg{{color:{d['acc']}}}
.side h4{{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:{d['t2']};margin:22px 12px 8px;font-weight:600}}
.ch{{display:flex;align-items:center;gap:12px;height:40px;padding:0 12px;color:{d['text']};font-size:13.5px}} .ch .dot{{margin-left:auto;width:7px;height:7px;border-radius:50%;background:{d['acc']}}}
.av{{flex:none;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;letter-spacing:.02em}}
main{{padding:18px 28px 40px;min-width:0}}
.chips{{display:flex;gap:8px;margin-bottom:22px}} .chip{{height:34px;padding:0 14px;border-radius:9px;background:{d['s1']};display:flex;align-items:center;font-weight:600;font-size:13.5px;color:{d['text']}}}
.chip.on{{background:{d['text']};color:{d['bg']}}}
.hero{{display:grid;grid-template-columns:1.45fr 1fr;gap:28px;align-items:center;padding:18px;border-radius:calc({d['radius']} + 8px);background:linear-gradient(135deg,{d['s1']},{d['bg']});border:1px solid {d['line']};margin-bottom:34px}}
.hero .th{{border-radius:{d['radius']};overflow:hidden;aspect-ratio:16/9;box-shadow:0 24px 60px -20px rgba(0,0,0,.7)}}
.eyebrow{{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:{d['acc']}}}
.eyebrow i{{width:8px;height:8px;border-radius:50%;background:{d['acc']};box-shadow:0 0 0 4px color-mix(in srgb,{d['acc']} 22%,transparent)}}
.hero h2{{font-family:{d['disp']};font-style:{d['dispStyle']};font-weight:{d['dispWeight']};font-size:{'44px' if d['dispStyle']=='italic' else '36px'};display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.02;letter-spacing:-.02em;margin:14px 0 14px}}
.hero .meta{{display:flex;align-items:center;gap:10px;color:{d['t2']};font-size:14px}} .hero .meta b{{color:{d['text']};font-weight:650}}
.btns{{display:flex;gap:10px;margin-top:24px}} .btn{{height:44px;padding:0 20px;border-radius:999px;display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;border:1px solid {d['line']}}}
.btn.pri{{background:{d['acc']};color:{d['accText']};border-color:{d['acc']}}}
.sh{{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}} .sh h2{{font-size:19px;font-weight:700;letter-spacing:-.01em}} .sh span{{color:{d['t2']};font-size:13px}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:28px 18px}}
.card .th{{aspect-ratio:16/9;border-radius:{d['radius']};overflow:hidden;position:relative;background:{d['s1']}}}
.new{{position:absolute;left:8px;bottom:8px;background:{d['acc']};color:{d['accText']};font-size:11px;font-weight:800;padding:3px 7px;border-radius:6px;letter-spacing:.02em}}
.cb{{display:flex;gap:12px;margin-top:12px}} .cb h3{{font-size:14.5px;line-height:1.35;font-weight:650;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.cb p{{color:{d['t2']};font-size:13px;margin-top:4px}}
/* Foco */
.focus .top{{grid-template-columns:240px 1fr auto}} .fcol{{max-width:760px;margin:0 auto;padding:44px 24px}}
.fh{{font-family:{d['disp']};font-style:{d['dispStyle']};font-weight:{d['dispWeight']};font-size:40px;letter-spacing:-.02em;line-height:1.05}}
.fsub{{color:{d['t2']};margin:10px 0 34px;font-size:15px}}
.day{{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:{d['t2']};font-weight:700;margin:30px 0 6px}}
.row{{display:grid;grid-template-columns:168px 1fr;gap:18px;padding:14px 0;border-bottom:1px solid {d['line']};align-items:center}}
.row .th{{aspect-ratio:16/9;border-radius:10px;overflow:hidden;filter:grayscale(1) contrast(1.05);transition:filter .2s}} .row:hover .th{{filter:none}} .row h3{{font-size:16px;line-height:1.35;font-weight:600}} .row p{{color:{d['t2']};font-size:13px;margin-top:6px}}
/* Móvil */
.m .top{{grid-template-columns:auto 1fr auto;padding:0 12px;height:56px}} .m main{{padding:12px 16px 90px}}
.m .hero{{grid-template-columns:1fr;padding:0;background:none;border:0;gap:14px}} .m .hero h2{{font-size:30px;margin:10px 0}}
.m .grid{{grid-template-columns:1fr;gap:22px}} .m .chips{{overflow:hidden}}
.tabs{{position:fixed;left:0;right:0;bottom:0;height:66px;display:grid;grid-template-columns:repeat(5,1fr);background:color-mix(in srgb,{d['bg']} 90%,transparent);backdrop-filter:blur(14px);border-top:1px solid {d['line']}}}
.tabs a{{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:10.5px;color:{d['t2']};font-weight:600}} .tabs a.on{{color:{d['text']}}} .tabs a.on svg{{color:{d['acc']}}}
"""
def topbar(d, foco=False, mobile=False):
    if mobile:
        return f'<header class="top"><div class="lft">{logo(d,True)}</div><div></div><div class="rgt"><span class="iconbtn">{ic("search")}</span><span class="foco{" on" if foco else ""}">Foco<span class="sw"></span></span><span class="me"></span></div></header>'
    return f'''<header class="top"><div class="lft"><span class="iconbtn">{ic("menu")}</span>{logo(d)}</div>
<div class="search">{ic("search",18)}<span>Buscar en YouTube y tus canales</span><kbd>/</kbd></div>
<div class="rgt"><span class="foco{" on" if foco else ""}">Modo Foco<span class="sw"></span></span><span class="iconbtn">{ic("bell")}</span><span class="me"></span></div></header>'''
def page(d, body, cls=''):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{css(d)}</style></head><body class="{cls}">{body}</body></html>'
def desktop(d):
    side = '<nav class="nav">' + ''.join(f'<a class="{"on" if i==0 else ""}">{ic(n)}{l}</a>' for i,(n,l) in enumerate([('home','Inicio'),('subs','Suscripciones'),('lib','Biblioteca'),('hist','Historial'),('down','Descargas')])) + '</nav>'
    side += '<h4>Tus canales</h4>' + ''.join(f'<a class="ch">{avatar(c,26)}{esc(c)}{"<span class=dot></span>" if c==feat["channel"] else ""}</a>' for c in channels)
    hero = f'''<section class="hero"><div class="th"><img src="https://i.ytimg.com/vi/{feat['id']}/maxresdefault.jpg" onerror="this.src='https://i.ytimg.com/vi/{feat['id']}/hqdefault.jpg'"></div>
<div><span class="eyebrow"><i></i>Recién publicado · aviso al momento</span><h2>{esc(feat['title'])}</h2>
<div class="meta">{avatar(feat['channel'],28)}<b>{esc(feat['channel'])}</b> · {ago(feat['publishedAt'])}</div>
<div class="btns"><a class="btn pri">{ic("play",18,True)}Ver ahora</a><a class="btn">{ic("plus",18)}Guardar</a></div></div></section>'''
    chips = '<div class="chips">' + ''.join(f'<span class="chip{" on" if i==0 else ""}">{c}</span>' for i,c in enumerate(['Todo','Sin ver','Hoy','Directos','Podcasts','Más de 20 min'])) + '</div>'
    cards = ''.join(card(v, new=(i<2)) for i,v in enumerate(grid[:8]))
    body = topbar(d) + f'<div class="wrap"><aside class="side">{side}</aside><main>{chips}{hero}<div class="sh"><h2>Novedades de tus canales</h2><span>{len(items)} vídeos esta semana</span></div><div class="grid">{cards}</div></main></div>'
    return page(d, body)
def focus(d):
    rows = []
    today = [v for v in items if now - v['publishedAt'] < 86400000][:5]
    older = [v for v in items if now - v['publishedAt'] >= 86400000][:3]
    for label, lst in (('Hoy', today), ('Antes', older)):
        if not lst: continue
        rows.append(f'<p class="day">{label}</p>')
        rows += [f'<div class="row"><div class="th"><img src="https://i.ytimg.com/vi/{v["id"]}/mqdefault.jpg"></div><div><h3>{esc(v["title"])}</h3><p>{esc(v["channel"])} · {ago(v["publishedAt"])}</p></div></div>' for v in lst]
    body = topbar(d, foco=True) + f'<div class="fcol"><h1 class="fh">Lo nuevo de tus canales</h1><p class="fsub">{len(today)} vídeos hoy. Sin recomendaciones ni distracciones.</p>{"".join(rows)}</div>'
    return page(d, body, 'focus')
def mobile(d):
    chips = '<div class="chips">' + ''.join(f'<span class="chip{" on" if i==0 else ""}">{c}</span>' for i,c in enumerate(['Todo','Sin ver','Hoy','Directos'])) + '</div>'
    hero = f'''<section class="hero"><div class="th"><img src="https://i.ytimg.com/vi/{feat['id']}/hqdefault.jpg"></div>
<div><span class="eyebrow"><i></i>Recién publicado</span><h2>{esc(feat['title'])}</h2><div class="meta">{avatar(feat['channel'],24)}<b>{esc(feat['channel'])}</b> · {ago(feat['publishedAt'])}</div></div></section>'''
    tabs = '<nav class="tabs">' + ''.join(f'<a class="{"on" if i==0 else ""}">{ic(n,22)}{l}</a>' for i,(n,l) in enumerate([('home','Inicio'),('subs','Canales'),('search','Buscar'),('lib','Biblioteca'),('down','Descargas')])) + '</nav>'
    body = topbar(d, mobile=True) + f'<main>{chips}{hero}<div class="grid" style="margin-top:26px">{"".join(card(v,new=i<1) for i,v in enumerate(grid[:3]))}</div></main>{tabs}'
    return page(d, body, 'm')
for k, d in D.items():
    open(f'{M}/{k}-desktop.html','w').write(desktop(d))
    open(f'{M}/{k}-focus.html','w').write(focus(d))
    open(f'{M}/{k}-mobile.html','w').write(mobile(d))
print('ok')
