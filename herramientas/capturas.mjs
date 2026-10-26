// Capturas reales (con animaciones corriendo) vía Chrome DevTools, sin dependencias.
// Chrome headless con --screenshot congela el reloj; esto espera tiempo real.
//
// uso: node herramientas/capturas.mjs <url> <ancho> <alto> <salida-prefijo> <ms1,ms2,...> [js-antes]
//   node herramientas/capturas.mjs http://localhost:8000/es/ 390 844 /tmp/es "3000,8000"
//   node herramientas/capturas.mjs http://localhost:8000/ 1440 900 /tmp/x "1500" "document.getElementById('interruptor').click()"
// Sirve el sitio con: python3 -m http.server 8000 (desde la raíz). t.js no mide fuera de bodgar.dev.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [url, w, h, out, tiempos, js] = process.argv.slice(2);
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 500);
const p = spawn(CH, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, "--user-data-dir=/tmp/cdp-" + port, "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let lista;
for (let i = 0; i < 50; i++) { try { lista = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (lista.length) break; } catch {} await espera(200); }
const ws = new WebSocket(lista.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d.result); delete pend[d.id]; } };
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await cmd("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
await cmd("Page.enable");
await cmd("Page.navigate", { url });
await espera(1500);
if (js) await cmd("Runtime.evaluate", { expression: js });
let t0 = 0;
for (const t of tiempos.split(",").map(Number)) {
  await espera(t - t0); t0 = t;
  const r = await cmd("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${out}-${t}.png`, Buffer.from(r.data, "base64"));
}
ws.close(); p.kill();
