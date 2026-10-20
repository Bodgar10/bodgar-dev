"""Descarga las fuentes de Google (latin + latin-ext) y genera @font-face locales.
Uso: python3 -I herramientas/fuentes.py . <salida.json>
El json dice qué @font-face va en cada CSS; se pegan a mano bajo el comentario de cabecera."""
import sys, re, os, hashlib, urllib.request, json
raiz = sys.argv[1]
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
PAGINAS = {  # html -> css propio donde van los @font-face
  'index.html': 'assets/home/home.css',
  'es/index.html': 'assets/home/home.css',
  'plataformas/index.html': 'assets/styles.css',
  'stats/index.html': 'assets/styles.css',
  'plataformas/fisioterapia/index.html': 'plataformas/fisioterapia/fisio.css',
  'plataformas/bodegas/index.html': 'plataformas/bodegas/bodegas.css',
  'aom/x7k2/index.html': 'aom/x7k2/aom.css',
}
os.makedirs(f'{raiz}/assets/fonts', exist_ok=True)
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read()
por_css, resumen = {}, {}
for html, css in PAGINAS.items():
    src = open(f'{raiz}/{html}').read()
    url = re.search(r'https://fonts\.googleapis\.com/css2\?[^"]*', src).group(0).replace('&amp;', '&')
    google = get(url).decode()
    bloques = re.findall(r'/\* ([a-z-]+) \*/\s*(@font-face \{.*?\})', google, re.S)
    caras, archivos = [], []
    for subset, cara in bloques:
        if subset not in ('latin', 'latin-ext'):
            continue
        fam = re.search(r"font-family: '([^']+)'", cara).group(1)
        u = re.search(r'url\((https://[^)]+\.woff2)\)', cara).group(1)
        nombre = f"{fam.lower().replace(' ', '-')}-{subset}-{hashlib.sha1(u.encode()).hexdigest()[:8]}.woff2"
        ruta = f'{raiz}/assets/fonts/{nombre}'
        if not os.path.exists(ruta):
            open(ruta, 'wb').write(get(u))
        cara = cara.replace(u, f'/assets/fonts/{nombre}')
        caras.append(cara)
        archivos.append((fam, subset, nombre))
    por_css.setdefault(css, [])
    for c in caras:
        if c not in por_css[css]:
            por_css[css].append(c)
    resumen[html] = {'css': css, 'url': url, 'archivos': sorted(set(archivos))}
json.dump({'por_css': por_css, 'resumen': resumen}, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
for h, r in resumen.items():
    print(h, '->', r['css'], len(r['archivos']), 'archivos')
