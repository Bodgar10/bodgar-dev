# bodgar.dev

Landing page. Static HTML, no build step, no framework.

```
index.html        English (canonical)
es/index.html     Spanish
assets/styles.css shared stylesheet
assets/           CV, favicon, photo, OG image
```

## Local preview

```sh
python3 -m http.server 8080
# http://localhost:8080
```

## Deploy

Cloudflare Pages, connected to this repo. Build command: none.
Output directory: `/` (repo root). Custom domain: `bodgar.dev`.

## Editing

Copy changes must be made in **both** `index.html` and `es/index.html`.

## /aom/x7k2/ — Torneo de los Dioses (Age of Mythology)

Página privada (sin enlaces desde el sitio, `noindex`) para un torneo amateur
entre amigos. HTML/CSS/JS sueltos en `aom/x7k2/`, sin el rastreador `t.js`.
Datos en el proyecto de Supabase de Rally, esquema privado `aom`:
ver `supabase/aom/001_torneo.sql` (incluye cómo armar la liga y capturar resultados).
