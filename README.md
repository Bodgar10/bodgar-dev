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
