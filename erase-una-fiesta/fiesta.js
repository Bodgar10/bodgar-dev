/* Érase una fiesta · /erase-una-fiesta/
 *
 * - La invitación partida del héroe: una grieta que se arrastra entre dos mundos.
 * - «Tu frase»: lo que escribe la persona, contado en cada mundo.
 * - Al bajar, la página cambia de mundo: la marca de arriba toma su letra.
 * - Un ambiente animado por mundo (canvas), solo mientras se ve.
 * - La invitación de pádel real, en vivo dentro del celular.
 * - Todo lo que es contacto abre WhatsApp con el mensaje escrito; nada va a un servidor.
 * Con «reducir movimiento» todo queda quieto y legible.
 */
(function () {
  "use strict";
  var CALMA = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WA = "525527149106";
  var MUNDOS = ["boda", "xv", "princesas", "aventura", "padel"];
  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function wa(t) { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(t); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function visibleEn(el, cb, margen) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (e) { cb(e[0].isIntersecting); }, { rootMargin: margen || "0px" }).observe(el);
  }

  // ---------- WhatsApp con mensaje listo ----------
  document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); });

  // ---------- «tu fiesta.»: cada letra en un mundo ----------
  var h1b = $("h1b");
  var letras = [];
  (function () {
    var t = "tu fiesta.", html = "", k = 0;
    for (var i = 0; i < t.length; i++) {
      if (t[i] === " ") { html += '<span class="sp"></span>'; continue; }
      html += '<span class="l l-' + MUNDOS[(k * 2) % 5] + '">' + t[i] + "</span>"; k++;
    }
    h1b.innerHTML = html;
    letras = Array.prototype.slice.call(h1b.querySelectorAll(".l"));
  })();
  var heroVisible = true;
  visibleEn($("inicio"), function (v) { heroVisible = v; });
  if (!CALMA) setInterval(function () {
    if (!heroVisible || document.hidden) return;
    var l = letras[(Math.random() * letras.length) | 0];
    var actual = MUNDOS.filter(function (m) { return l.classList.contains("l-" + m); })[0];
    var otros = MUNDOS.filter(function (m) { return m !== actual; });
    l.classList.remove("l-" + actual, "cambia");
    void l.offsetWidth;
    l.classList.add("l-" + otros[(Math.random() * otros.length) | 0], "cambia");
  }, 700);

  // ---------- la invitación partida ----------
  var marco = document.querySelector(".partida__marco");
  var arriba = $("cartaArriba"), costura = $("costura"), costuraPath = $("costuraPath"), rango = $("rango");
  var corte = 52, tocado = false, arrastra = false;
  var SEM = [0, -6, 5, -3, 7, -5, 4, -7, 6, -2, 5, -6, 3, 0];
  function dibujarCorte() {
    var w = marco.clientWidth, h = marco.clientHeight;
    if (!w || !h) return;
    var cx = w * corte / 100, pts = [];
    for (var i = 0; i < SEM.length; i++) pts.push([cx + SEM[i], h * i / (SEM.length - 1)]);
    var p = pts.map(function (q) { return q[0].toFixed(1) + "px " + q[1].toFixed(1) + "px"; });
    arriba.style.clipPath = "polygon(" + p.join(",") + "," + w + "px " + h + "px," + w + "px 0px)";
    costura.setAttribute("viewBox", "0 0 " + w + " " + h);
    costuraPath.setAttribute("d", "M" + pts.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" L"));
    marco.style.setProperty("--x", corte + "%");
  }
  function desde(e) {
    var r = marco.getBoundingClientRect();
    corte = Math.max(4, Math.min(96, (e.clientX - r.left) / r.width * 100));
    rango.value = Math.round(corte);
    dibujarCorte();
  }
  marco.addEventListener("pointerdown", function (e) {
    arrastra = true;
    if (!tocado) track("clic", "partida:grieta");
    tocado = true;
    if (e.pointerType === "mouse") desde(e);
    try { marco.setPointerCapture(e.pointerId); } catch (x) {}
  });
  marco.addEventListener("pointermove", function (e) { if (arrastra) desde(e); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { marco.addEventListener(ev, function () { arrastra = false; }); });
  rango.addEventListener("input", function () { tocado = true; corte = +rango.value; dibujarCorte(); });
  window.addEventListener("resize", dibujarCorte, { passive: true });
  dibujarCorte();
  if (!CALMA) {
    var t0 = performance.now();
    (function vaiven(now) {
      if (!tocado && heroVisible && !document.hidden) {
        corte = 52 + 24 * Math.sin((now - t0) / 1500);
        dibujarCorte();
      }
      if (!tocado) requestAnimationFrame(vaiven);
    })(t0);
  }

  // ---------- tu frase en cada mundo ----------
  var fraseIn = $("fraseIn"), escena = $("escena");
  var capas = escena.querySelectorAll(".capa"), chips = document.querySelectorAll(".chip");
  var enFrase = "boda", fraseManual = false, fraseVisible = false;
  function textoPara(m, t) {
    t = (t || "").trim() || "Ven a celebrar conmigo";
    if (m === "aventura") return "¡" + t.replace(/^[¡!\s]+|[!.\s]+$/g, "") + "!";
    if (m === "padel") return t.replace(/[.\s]+$/g, "");
    return t;
  }
  function pintarFrase() {
    capas.forEach(function (c) { c.querySelector(".capa__txt").textContent = textoPara(c.getAttribute("data-m"), fraseIn.value); });
  }
  function irFrase(m, manual) {
    if (manual) { fraseManual = true; track("clic", "frase:" + m); }
    if (m === enFrase) return;
    var antes = escena.querySelector('.capa[data-m="' + enFrase + '"]');
    var despues = escena.querySelector('.capa[data-m="' + m + '"]');
    capas.forEach(function (c) { c.classList.remove("sale", "entra"); });
    antes.classList.remove("activa"); antes.classList.add("sale");
    despues.classList.add("activa");
    if (!CALMA) {
      void despues.offsetWidth; despues.classList.add("entra");
      escena.classList.remove("barre"); void escena.offsetWidth; escena.classList.add("barre");
    }
    setTimeout(function () { antes.classList.remove("sale"); }, CALMA ? 0 : 760);
    chips.forEach(function (c) { c.setAttribute("aria-selected", String(c.getAttribute("data-m") === m)); });
    enFrase = m;
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { irFrase(c.getAttribute("data-m"), true); }); });
  fraseIn.addEventListener("input", pintarFrase);
  pintarFrase();
  visibleEn(escena, function (v) { fraseVisible = v; });
  if (!CALMA) setInterval(function () {
    if (fraseManual || !fraseVisible || document.hidden) return;
    irFrase(MUNDOS[(MUNDOS.indexOf(enFrase) + 1) % MUNDOS.length], false);
  }, 2800);

  // ---------- cambio de mundo al bajar ----------
  var NOMBRE = { inicio: "", boda: "Bodas", xv: "XV años", princesas: "Princesas", aventura: "Aventura", padel: "Cumpleaños" };
  var marca = $("marca"), marcaMundo = $("marcaMundo");
  var mundoActual = "inicio";
  function ponerMundo(m) {
    if (m === mundoActual) return;
    mundoActual = m;
    document.body.setAttribute("data-mundo", m);
    marcaMundo.textContent = NOMBRE[m] || "";
    if (!CALMA) { marca.classList.remove("salta"); void marca.offsetWidth; marca.classList.add("salta"); }
  }
  var articulos = document.querySelectorAll(".mundo");
  if ("IntersectionObserver" in window) {
    var dentro = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { dentro[e.target.getAttribute("data-mundo")] = e.isIntersecting; });
      var m = MUNDOS.filter(function (k) { return dentro[k]; })[0];
      ponerMundo(m || "inicio");
    }, { rootMargin: "-50% 0px -50% 0px" });
    articulos.forEach(function (a) { io.observe(a); });

    // la grieta se dibuja al llegar
    document.querySelectorAll(".grieta path").forEach(function (p) { p.setAttribute("pathLength", "1"); });
    if (!CALMA) {
      var ioG = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("cerrada"); ioG.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -12% 0px" });
      articulos.forEach(function (a) {
        if (a.getBoundingClientRect().top > innerHeight) { a.classList.add("cerrada"); ioG.observe(a); }
      });
    }
  }

  // ---------- ambientes: uno por mundo, solo mientras se ve ----------
  function Ambiente(cv) {
    var tipo = cv.getAttribute("data-tipo"), cx = cv.getContext("2d");
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5), ps = [], extra = [], vivo = false, last = 0, fugaz = null, pelota = null;
    function medir() {
      var r = cv.parentNode.getBoundingClientRect();
      if (Math.abs(r.width - W) < 2 && Math.abs(r.height - H) < 2) return;
      W = r.width; H = r.height;
      cv.width = W * DPR; cv.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      sembrar();
      if (CALMA) cuadro(0);
    }
    function sembrar() {
      var n = Math.round(W * H / ({ boda: 7000, xv: 3200, princesas: 9000, aventura: 14000, padel: 9000 }[tipo] || 9000));
      n = Math.min(n, 220);
      ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: rand(0, W), y: rand(0, H), r: rand(.5, 2.2), vx: rand(-.15, .15), vy: rand(-.45, -.08), p: rand(0, 6.28), s: rand(.5, 1.6), a: rand(.3, 1) });
      extra = [];
      if (tipo === "boda") for (var b = 0; b < 7; b++) extra.push({ x: rand(0, W), y: rand(0, H), r: rand(24, 70), vy: rand(-.12, -.04), p: rand(0, 6.28) });
      if (tipo === "aventura") for (var h = 0; h < 10; h++) extra.push(hoja(true));
    }
    function hoja(cualquiera) { return { x: rand(0, W), y: cualquiera ? rand(0, H) : -20, vy: rand(.4, .9), vx: rand(-.3, .3), rot: rand(0, 6.28), vr: rand(-.02, .02), l: rand(8, 16) }; }
    function estrella(x, y, r, rot) {
      cx.save(); cx.translate(x, y); cx.rotate(rot); cx.beginPath();
      for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * .32 : r, a = i * Math.PI / 4; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      cx.closePath(); cx.fill(); cx.restore();
    }
    function cuadro(now) {
      var t = now / 1000;
      cx.clearRect(0, 0, W, H);
      var mover = !CALMA;
      if (tipo === "boda") {
        cx.globalCompositeOperation = "lighter";
        extra.forEach(function (b) {
          if (mover) { b.y += b.vy; if (b.y < -b.r) { b.y = H + b.r; b.x = rand(0, W); } }
          var g = cx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, "rgba(227,195,123,.10)"); g.addColorStop(1, "rgba(227,195,123,0)");
          cx.fillStyle = g; cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, 6.283); cx.fill();
        });
        ps.forEach(function (p) {
          if (mover) { p.x += p.vx + Math.sin(t + p.p) * .12; p.y += p.vy; if (p.y < -5) { p.y = H + 5; p.x = rand(0, W); } }
          var a = p.a * (.55 + .45 * Math.sin(t * p.s * 2 + p.p));
          cx.fillStyle = "rgba(255,226,150," + a.toFixed(3) + ")";
          cx.beginPath(); cx.arc(p.x, p.y, p.r * .8, 0, 6.283); cx.fill();
        });
      } else if (tipo === "xv") {
        cx.globalCompositeOperation = "lighter";
        ps.forEach(function (p) {
          var a = p.a * (.35 + .65 * Math.abs(Math.sin(t * p.s + p.p)));
          cx.fillStyle = "rgba(255,236,246," + a.toFixed(3) + ")";
          cx.fillRect(p.x, p.y, p.r * .7, p.r * .7);
        });
        if (mover) {
          if (!fugaz && Math.random() < .012) fugaz = { x: rand(W * .3, W), y: rand(0, H * .15), v: rand(8, 12), l: 0 };
          if (fugaz) {
            fugaz.l += 1; fugaz.x -= fugaz.v; fugaz.y += fugaz.v * .45;
            var g = cx.createLinearGradient(fugaz.x, fugaz.y, fugaz.x + 90, fugaz.y - 40);
            g.addColorStop(0, "rgba(255,240,248,.95)"); g.addColorStop(1, "rgba(244,182,200,0)");
            cx.strokeStyle = g; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(fugaz.x, fugaz.y); cx.lineTo(fugaz.x + 90, fugaz.y - 40); cx.stroke();
            if (fugaz.l > 34) fugaz = null;
          }
        }
      } else if (tipo === "princesas") {
        cx.globalCompositeOperation = "source-over";
        var col = ["232,184,75", "255,140,190", "180,140,255"];
        ps.forEach(function (p, i) {
          if (mover) { p.y += p.vy * .7; p.x += Math.sin(t * .8 + p.p) * .25; if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); } }
          var a = .25 + .5 * Math.abs(Math.sin(t * p.s + p.p));
          cx.fillStyle = "rgba(" + col[i % 3] + "," + a.toFixed(3) + ")";
          estrella(p.x, p.y, p.r * 3.2, t * .6 + p.p);
        });
      } else if (tipo === "aventura") {
        cx.globalCompositeOperation = "source-over";
        extra.forEach(function (h, i) {
          if (mover) { h.y += h.vy; h.x += h.vx + Math.sin(t + i) * .3; h.rot += h.vr; if (h.y > H + 20) extra[i] = hoja(false); }
          cx.save(); cx.translate(h.x, h.y); cx.rotate(h.rot);
          cx.fillStyle = "rgba(76,150,92,.45)"; cx.beginPath(); cx.ellipse(0, 0, h.l, h.l * .42, 0, 0, 6.283); cx.fill();
          cx.restore();
        });
        cx.globalCompositeOperation = "lighter";
        ps.forEach(function (p) {
          if (mover) { p.x += Math.sin(t * .7 + p.p) * .5; p.y += Math.cos(t * .5 + p.p * 2) * .4; }
          var a = Math.max(0, Math.sin(t * p.s * 1.4 + p.p));
          var g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
          g.addColorStop(0, "rgba(246,255,138," + (a * .9).toFixed(3) + ")"); g.addColorStop(1, "rgba(246,255,138,0)");
          cx.fillStyle = g; cx.fillRect(p.x - 9, p.y - 9, 18, 18);
        });
      } else if (tipo === "padel") {
        cx.globalCompositeOperation = "lighter";
        ps.forEach(function (p) {
          if (mover) { p.y += p.vy * .6; p.x += p.vx; if (p.y < -5) { p.y = H + 5; p.x = rand(0, W); } }
          cx.fillStyle = "rgba(220,232,255," + (p.a * .45).toFixed(3) + ")";
          cx.beginPath(); cx.arc(p.x, p.y, p.r * .7, 0, 6.283); cx.fill();
        });
        if (mover) {
          if (!pelota) pelota = { x: -20, t: 0, base: H - 40 };
          pelota.x += 3.2; pelota.t += .045;
          var y = pelota.base - Math.abs(Math.sin(pelota.t)) * 90;
          cx.globalCompositeOperation = "source-over";
          cx.fillStyle = "rgba(0,0,10,.35)"; cx.beginPath(); cx.ellipse(pelota.x, pelota.base + 6, 7, 2.5, 0, 0, 6.283); cx.fill();
          cx.fillStyle = "#d9f24b"; cx.beginPath(); cx.arc(pelota.x, y, 6, 0, 6.283); cx.fill();
          if (pelota.x > W + 20) pelota = null;
        }
      }
      cx.globalCompositeOperation = "source-over";
    }
    function loop(now) {
      if (!vivo) return;
      if (now - last > 30) { cuadro(now); last = now; }
      requestAnimationFrame(loop);
    }
    medir();
    window.addEventListener("resize", medir, { passive: true });
    if (CALMA) { cuadro(0); return; }
    visibleEn(cv.parentNode, function (v) {
      if (v && !vivo) { vivo = true; medir(); requestAnimationFrame(loop); }
      else if (!v) vivo = false;
    }, "100px");
  }
  document.querySelectorAll(".ambiente").forEach(Ambiente);

  // ---------- cuenta regresiva de ejemplo (XV) ----------
  var xvMeta = new Date("2027-05-15T20:00:00-06:00").getTime();
  var xvB = $("xvCuenta").querySelectorAll("b");
  function xvTic() {
    var s = Math.max(0, Math.floor((xvMeta - Date.now()) / 1000));
    var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    v.forEach(function (n, i) { xvB[i].textContent = String(n).padStart(2, "0"); });
  }
  xvTic(); setInterval(xvTic, 1000);

  // ---------- la invitación de pádel, en vivo ----------
  var vivo = $("padelVivo");
  function escalar() {
    var p = vivo.parentNode, s = p.clientWidth / 390;
    if (!s) return;
    vivo.style.transform = "scale(" + s + ")";
    vivo.style.height = (p.clientHeight / s) + "px";
  }
  escalar();
  window.addEventListener("resize", escalar, { passive: true });
  visibleEn(vivo.parentNode, function (v) { if (v && !vivo.src) vivo.src = vivo.getAttribute("data-src"); }, "400px");
  (function () {
    var a = document.createElement("a");
    a.className = "cel__abrir"; a.href = "ejemplos/padel/"; a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "Abrir la invitación de pádel en pantalla completa");
    a.setAttribute("data-t", "ver-padel-cel");
    a.addEventListener("click", function () { track("clic", "padel:celular"); });
    document.querySelector(".cel--vivo").appendChild(a);
  })();

  // ---------- WhatsApp flotante después del héroe ----------
  var flota = $("flota");
  visibleEn($("inicio"), function (v) { flota.classList.toggle("visible", !v); });

  // ---------- formulario final ----------
  var nombre = $("f-nombre"), fecha = $("f-fecha"), historia = $("f-historia"), enviar = $("f-enviar"), error = $("f-error");
  function mensaje() {
    var ev = document.querySelector('input[name="evento"]:checked');
    var t = "Hola, soy " + (nombre.value.trim() || "____") + ". Vi Érase una fiesta y quiero una invitación para " + (ev ? ev.value : "mi fiesta");
    if (fecha.value.trim()) t += " el " + fecha.value.trim();
    t += ".";
    if (historia.value.trim()) t += "\nLa historia: " + historia.value.trim();
    return t;
  }
  function actualizar() { enviar.href = wa(mensaje()); }
  $("forma").addEventListener("input", actualizar);
  $("forma").addEventListener("change", actualizar);
  $("forma").addEventListener("submit", function (e) { e.preventDefault(); });
  nombre.addEventListener("input", function () { if (nombre.value.trim()) error.hidden = true; });
  enviar.addEventListener("click", function (e) {
    if (!nombre.value.trim()) { e.preventDefault(); error.hidden = false; nombre.focus(); return; }
    actualizar();
    track("formulario", "enviado");
  });
  actualizar();

  // ---------- destellos que siguen el dedo, del color del mundo ----------
  if (CALMA) return;
  var COLORES = {
    inicio: ["255,77,157", "255,211,107", "69,232,255"], boda: ["227,195,123", "255,240,200"],
    xv: ["244,182,200", "255,255,255"], princesas: ["255,140,190", "180,140,255", "232,184,75"],
    aventura: ["246,255,138", "255,207,58"], padel: ["217,242,75", "242,245,251"]
  };
  var fx = $("chispas"), fc = fx.getContext("2d"), chispas = [], fxVivo = false, fDPR = Math.min(window.devicePixelRatio || 1, 2);
  function fxMedir() { fx.width = innerWidth * fDPR; fx.height = innerHeight * fDPR; fc.setTransform(fDPR, 0, 0, fDPR, 0, 0); }
  fxMedir(); window.addEventListener("resize", fxMedir, { passive: true });
  function chispa(x, y, f) {
    if (chispas.length > 160) return;
    var c = COLORES[mundoActual] || COLORES.inicio, a = rand(0, 6.283), v = rand(.3, 1) * f;
    chispas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .5, l: 1, r: rand(1.4, 3.2), c: c[(Math.random() * c.length) | 0] });
    if (!fxVivo) { fxVivo = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop() {
    fc.clearRect(0, 0, innerWidth, innerHeight);
    chispas = chispas.filter(function (s) { return (s.l -= .03) > 0; });
    chispas.forEach(function (s) {
      s.x += s.vx; s.y += s.vy; s.vy += .05;
      fc.fillStyle = "rgba(" + s.c + "," + s.l.toFixed(3) + ")";
      fc.beginPath(); fc.arc(s.x, s.y, s.r * s.l, 0, 6.283); fc.fill();
    });
    if (chispas.length) requestAnimationFrame(fxLoop); else fxVivo = false;
  }
  var ultimo = 0;
  function estela(x, y) { var n = performance.now(); if (n - ultimo < 18) return; ultimo = n; chispa(x, y, 1.1); chispa(x, y, 1.1); }
  window.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) estela(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") estela(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener("pointerdown", function (e) { for (var i = 0; i < 12; i++) chispa(e.clientX, e.clientY, 3); }, { passive: true });
})();
