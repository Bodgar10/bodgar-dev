/* bodgar.dev · / y /es/
 *
 * La escena (la misma app en iPhone y Android, con el interruptor de
 * mantenimiento), las notificaciones de problema que abren su ficha, el
 * plan que recomienda un nivel con lo marcado y la calculadora de lo que
 * cuesta una falla. Los textos largos viven en el HTML de cada idioma;
 * aquí solo los cortos de la escena y del plan.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del correo que la persona revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa notificación (enlace de correo frío).
 */
(function () {
  "use strict";

  var ES = (document.documentElement.lang || "").indexOf("es") === 0;
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GUARDADO = "bd_home_marcas";
  var LOCALE = document.body.getAttribute("data-moneda") === "MXN" ? "es-MX" : "en-US";

  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function dinero(n) { return "$" + Math.round(n).toLocaleString(LOCALE); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var L = ES ? {
    on: "Encendido", off: "Apagado",
    eventos: [
      { f: "1 jul", t: "Vence el certificado de notificaciones", afecta: ["ios", "android"], falla: "notif", ok: "Certificado renovado el 15 de junio", perdidos: 6, baja: 0.1 },
      { f: "31 ago", t: "Fecha límite de SDK en Google Play", afecta: ["android"], falla: "play", ok: "SDK actualizado el 12 de julio", perdidos: 14, baja: 0.3 },
      { f: "16 sep", t: "Sale iOS 27", afecta: ["ios"], falla: "crash", ok: "Lista para iOS 27 desde hace 12 días", perdidos: 22, baja: 0.6 },
      { f: "3 nov", t: "El proveedor de pagos retira su versión vieja", afecta: ["ios", "android"], falla: "pago", ok: "Pagos migrados en octubre", perdidos: 18, baja: 0.3 }
    ],
    marcados: function (n) { return n === 1 ? "marcado" : "marcados"; },
    titulo0: "Marca arriba lo que te pasa y aquí aparece tu plan.",
    titulo1: "Marcaste 1. Tiene solución.",
    tituloN: function (n) { return "Marcaste " + n + ". Todo entra en un solo plan."; },
    intro0: "Con lo que marques te digo qué haría y qué plan te conviene. Ni más, ni menos.",
    introN: "Esto es lo que haría, lo que ganas y el plan que te conviene.",
    kProblema: "Lo que te pasa", kHago: "Lo que hago", kGanas: "Lo que ganas", ver: "Ver la solución",
    porque: {
      essentials: "Lo que marcaste son cambios de Apple, Google y tus proveedores: con mantenerla al día basta.",
      standard: "Además de mantenerla al día, necesitas que alguien corrija errores, vigile fallas y tenga horas para lo nuevo.",
      priority: "Necesitas respuesta en 24 horas y que alguien atienda a Apple cuando rechaza una actualización."
    },
    asunto: "Revisión gratis de mi app",
    cuerpo: function (lineas, plan, est) {
      var t = "Este es el link de mi app: \n\n";
      if (lineas.length) t += "Lo que me pasa:\n" + lineas.map(function (x) { return "- " + x; }).join("\n") + "\n\nPlan que me recomendó la página: " + plan + ".\n";
      if (est) t += "Mi estimado: una falla me costaría " + est + ".\n";
      return t;
    },
    btnPlan: function (n) { return n ? "Mándame tu app con este plan" : "Mándame tu app"; },
    detCalc: function (cl, d) { return cl.toLocaleString(LOCALE) + " clientes perdidos en " + d + (d === 1 ? " día" : " días"); },
    vsCalc: function (m, p) { return "Equivale a " + m + " meses de Essentials (" + p + ")."; },
    meBtn: "Me pasa →", meOk: "✓ Ver solución", planDe: "Plan "
  } : {
    on: "On", off: "Off",
    eventos: [
      { f: "Jul 1", t: "The push notification certificate expires", afecta: ["ios", "android"], falla: "notif", ok: "Certificate renewed on June 15", perdidos: 6, baja: 0.1 },
      { f: "Aug 31", t: "Google Play target SDK deadline", afecta: ["android"], falla: "play", ok: "SDK updated on July 12", perdidos: 14, baja: 0.3 },
      { f: "Sep 16", t: "iOS 27 ships", afecta: ["ios"], falla: "crash", ok: "Ready for iOS 27 for 12 days", perdidos: 22, baja: 0.6 },
      { f: "Nov 3", t: "Your payment provider retires its old SDK", afecta: ["ios", "android"], falla: "pago", ok: "Payments migrated in October", perdidos: 18, baja: 0.3 }
    ],
    marcados: function () { return "selected"; },
    titulo0: "Tap what's happening to you above and your plan shows up here.",
    titulo1: "You picked 1. It's fixable.",
    tituloN: function (n) { return "You picked " + n + ". One plan covers all of it."; },
    intro0: "Based on what you pick, I'll tell you what I'd do and which plan fits. No more, no less.",
    introN: "Here's what I'd do, what you get, and the plan that fits.",
    kProblema: "What's happening", kHago: "What I do", kGanas: "What you get", ver: "See the fix",
    porque: {
      essentials: "What you picked are changes from Apple, Google and your providers: keeping the app current is enough.",
      standard: "Beyond keeping it current, you need someone fixing bugs, watching for crashes and with hours for new work.",
      priority: "You need a 24-hour response and someone handling Apple when it rejects an update."
    },
    asunto: "Free app check",
    cuerpo: function (lineas, plan, est) {
      var t = "Here is my App Store link: \n\n";
      if (lineas.length) t += "What's happening:\n" + lineas.map(function (x) { return "- " + x; }).join("\n") + "\n\nPlan the page recommended: " + plan + ".\n";
      if (est) t += "My estimate: one outage would cost me " + est + ".\n";
      return t;
    },
    btnPlan: function (n) { return n ? "Send me your app with this plan" : "Send me your app"; },
    detCalc: function (cl, d) { return cl.toLocaleString(LOCALE) + " lost customers in " + d + (d === 1 ? " day" : " days"); },
    vsCalc: function (m, p) { return "That's " + m + " months of Essentials (" + p + ")."; },
    meBtn: "This is me →", meOk: "✓ See the fix", planDe: ""
  };

  /* ---------- Escena: la app sin y con mantenimiento ---------- */
  var tel = { ios: $("tel-ios"), android: $("tel-android") };
  var sw = $("interruptor"), escena = document.querySelector(".escena");
  var encendido = false, tocado = false, idx = 0, corrida = 0;
  var rating = { ios: 4.8, android: 4.8 }, perdidos = 0, evitadas = 0;

  function pintaRating() {
    document.querySelectorAll(".estrellas").forEach(function (s) {
      var r = rating[s.getAttribute("data-r")];
      s.textContent = "★ " + r.toFixed(1);
      s.classList.toggle("baja", r < 4.5);
    });
  }
  function salta(id) { var b = $(id); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta"); }
  function limpiar() {
    ["ios", "android"].forEach(function (k) {
      tel[k].classList.remove("falla", "ok", "pago-falla");
      tel[k].querySelectorAll(".capa").forEach(function (c) { c.classList.remove("on"); });
    });
  }
  function reiniciar() {
    idx = 0; rating = { ios: 4.8, android: 4.8 }; perdidos = 0; evitadas = 0;
    $("perdidos").textContent = "0"; $("evitadas").textContent = "0";
    pintaRating(); limpiar();
  }
  function mostrarEvento(ev) {
    $("evento-fecha").textContent = ev.f;
    $("evento-t").textContent = ev.t;
    var e = $("evento");
    e.classList.remove("cae"); void e.offsetWidth; e.classList.add("cae");
    if (!CALMA) { escena.classList.remove("destello"); void escena.offsetWidth; escena.classList.add("destello"); }
  }
  function aplicar(ev) {
    ev.afecta.forEach(function (k) {
      var t = tel[k];
      if (encendido) {
        t.classList.add("ok");
        t.querySelector(".capa--ok .toast-ok").textContent = ev.ok;
        t.querySelector(".capa--ok").classList.add("on");
      } else {
        t.classList.add("falla");
        var capa = ev.falla === "crash" ? ".capa--falla" : ev.falla === "play" ? ".capa--play" : ev.falla === "pago" ? ".capa--pago" : ".capa--notif";
        var c = t.querySelector(capa);
        if (c) c.classList.add("on");
        if (ev.falla === "pago") t.classList.add("pago-falla");
        rating[k] = Math.max(1, rating[k] - ev.baja);
      }
    });
    if (encendido) { evitadas++; $("evitadas").textContent = evitadas; salta("evitadas"); }
    else { perdidos += ev.perdidos; $("perdidos").textContent = perdidos; salta("perdidos"); }
    pintaRating();
  }

  var visible = true;
  function paso(mia) {
    if (mia !== corrida) return;
    if (!visible || document.hidden) { setTimeout(function () { paso(mia); }, 600); return; }
    if (idx >= L.eventos.length) { setTimeout(function () { if (mia === corrida) { reiniciar(); paso(mia); } }, 1600); return; }
    var ev = L.eventos[idx++];
    mostrarEvento(ev);
    setTimeout(function () { if (mia === corrida) aplicar(ev); }, 900);
    setTimeout(function () { if (mia === corrida) limpiar(); }, 4200);
    if (!tocado && !encendido && idx === 2) {
      $("pista").classList.add("visible"); sw.classList.add("llama");
    }
    setTimeout(function () { paso(mia); }, 4800);
  }
  function arrancar() {
    corrida++;
    reiniciar();
    if (CALMA) {
      var ev = L.eventos[2];
      mostrarEvento(ev); aplicar(ev);
      return;
    }
    var mia = corrida;
    setTimeout(function () { paso(mia); }, 500);
  }
  sw.addEventListener("click", function () {
    encendido = !encendido; tocado = true;
    sw.setAttribute("aria-checked", encendido ? "true" : "false");
    $("interruptor-estado").textContent = encendido ? L.on : L.off;
    $("pista").classList.remove("visible"); sw.classList.remove("llama");
    track("clic", "hero:mantenimiento-" + (encendido ? "on" : "off"));
    arrancar();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe($("inicio"));
  }

  /* ---------- Notificaciones de problema ---------- */
  var tarjetas = Array.prototype.slice.call(document.querySelectorAll(".nt[data-card]"));
  var ORDEN = tarjetas.map(function (t) { return t.getAttribute("data-card"); });
  var NIVEL = { essentials: 1, standard: 2, priority: 3 };
  var marcas = {};
  try { (JSON.parse(sessionStorage.getItem(GUARDADO) || "[]") || []).forEach(function (k) { if (ORDEN.indexOf(k) >= 0) marcas[k] = true; }); } catch (e) {}
  var estimado = null;

  function carta(k) { return document.querySelector('.nt[data-card="' + k + '"]'); }
  function lista() { return ORDEN.filter(function (k) { return marcas[k]; }); }
  function guardar() { try { sessionStorage.setItem(GUARDADO, JSON.stringify(lista())); } catch (e) {} }

  function marcar(k, si) {
    if (!!marcas[k] === si) return;
    if (si) marcas[k] = true; else delete marcas[k];
    var c = carta(k);
    if (c) { c.classList.toggle("marcada", si); c.querySelector(".nt__btn").textContent = si ? L.meOk : L.meBtn; }
    guardar();
    refrescar(si);
  }
  function refrescar(subio) {
    var n = lista().length;
    $("conteo-n").textContent = n;
    $("conteo-ir").hidden = n === 0;
    $("manif-n").textContent = n;
    $("manif-txt").textContent = L.marcados(n);
    if (subio) { var m = $("manif"); m.classList.remove("salta"); void m.offsetWidth; m.classList.add("salta"); }
    plan();
    flotante();
  }

  var dlg = $("ficha"), actual = null;
  function abrir(k) {
    var c = carta(k);
    if (!c) return;
    if (!marcas[k]) { marcar(k, true); track("clic", "problemas:me-pasa-" + k); }
    else track("clic", "problemas:reabrir-" + k);
    actual = k;
    $("ficha-tag").textContent = c.querySelector(".nt__cab span:not(.nt__app)").textContent;
    $("ficha-frase").textContent = c.querySelector(".nt__frase").textContent;
    $("ficha-cuerpo").innerHTML = c.querySelector(".sol").innerHTML;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
  }
  function cerrar() { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.getAttribute("data-abrir")); });
  });
  $("ficha-x").addEventListener("click", cerrar);
  $("ficha-otro").addEventListener("click", function () {
    cerrar();
    var sig = ORDEN.filter(function (k) { return !marcas[k]; })[0];
    var c = sig ? carta(sig) : null;
    if (c) {
      if (c.offsetParent === null && $("notifs-mas")) $("notifs-mas").click();
      c.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "center" });
      c.querySelector(".nt__btn").focus({ preventScroll: true });
    }
  });
  $("ficha-plan").addEventListener("click", function () {
    cerrar(); track("clic", "problemas:ficha-plan");
    $("plan").scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "start" });
  });
  $("ficha-quitar").addEventListener("click", function () { if (actual) marcar(actual, false); cerrar(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrar(); });
  var mas = $("notifs-mas");
  if (mas) mas.addEventListener("click", function () { $("notifs").classList.remove("compacta"); mas.remove(); track("clic", "problemas:ver-mas"); });

  /* ---------- Plan recomendado ---------- */
  function planDe(nivel) { return document.querySelector('.plan[data-plan="' + nivel + '"]'); }
  function recomendado(l) {
    var max = "essentials";
    l.forEach(function (k) { var p = carta(k).getAttribute("data-plan"); if (NIVEL[p] > NIVEL[max]) max = p; });
    return max;
  }
  function correoPlan() {
    var l = lista(), rec = l.length ? planDe(recomendado(l)).getAttribute("data-nombre") : "";
    var lineas = l.map(function (k) { return carta(k).getAttribute("data-nombre"); });
    return "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent(L.asunto) + "&body=" + encodeURIComponent(L.cuerpo(lineas, rec, estimado));
  }
  function plan() {
    var l = lista(), n = l.length;
    $("plan-titulo").textContent = n === 0 ? L.titulo0 : n === 1 ? L.titulo1 : L.tituloN(n);
    $("plan-intro").textContent = n ? L.introN : L.intro0;
    $("reporte-folio").textContent = "APP-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("reporte-vacio").hidden = n > 0;
    $("reporte-lista").innerHTML = l.map(function (k, i) {
      var c = carta(k), p = planDe(c.getAttribute("data-plan"));
      return '<li style="animation-delay:' + (i * 0.06) + 's"><span class="n">' + (i + 1) + "</span>" +
        '<div><span class="k">' + L.kProblema + "</span><b>" + esc(c.getAttribute("data-nombre")) + '</b><button type="button" data-reabrir="' + k + '">' + L.ver + "</button></div>" +
        '<div><span class="k">' + L.kHago + "</span><p>" + esc(c.getAttribute("data-hago")) + "</p></div>" +
        '<div><span class="k">' + L.kGanas + '</span><p class="g">' + esc(c.getAttribute("data-gana")) + "</p></div>" +
        '<span class="pl">' + esc(p.getAttribute("data-nombre")) + "</span></li>";
    }).join("");
    $("reporte-rec").hidden = n === 0;
    document.querySelectorAll(".plan").forEach(function (p) { p.classList.remove("recomendado"); });
    if (n) {
      var r = recomendado(l), p = planDe(r);
      $("rec-nombre").textContent = p.getAttribute("data-nombre") + " · " + p.getAttribute("data-precio");
      $("rec-porque").textContent = L.porque[r];
      p.classList.add("recomendado");
    }
    $("plan-correo").href = correoPlan();
    $("plan-correo").textContent = L.btnPlan(n);
  }
  $("reporte-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-reabrir]");
    if (b) abrir(b.getAttribute("data-reabrir"));
  });

  var vistos = {};
  function flotante() {
    var m = $("manif");
    var mostrar = lista().length > 0 && !vistos.plan && !vistos.empieza && !vistos.inicio && !vistos.precios;
    if (mostrar === m.classList.contains("visible")) return;
    if (mostrar) { m.hidden = false; requestAnimationFrame(function () { m.classList.add("visible"); }); }
    else m.classList.remove("visible");
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vistos[e.target.id] = e.isIntersecting; });
      flotante();
    }, { rootMargin: "-20% 0px -20% 0px" });
    ["inicio", "plan", "precios", "empieza"].forEach(function (id) { io.observe($(id)); });
  }

  /* ---------- Calculadora ---------- */
  var movida = false;
  function fmt(v, tipo) { return tipo === "$" ? dinero(v) : tipo === "%" ? v + "%" : (+v).toLocaleString(LOCALE); }
  function calcular() {
    document.querySelectorAll("output[data-for]").forEach(function (o) {
      o.textContent = fmt($(o.getAttribute("data-for")).value, o.getAttribute("data-fmt"));
    });
    var v = function (id) { return +$(id).value; };
    var clientes = Math.round(v("c-pedidos") * v("c-perdida") / 100 * v("c-dias"));
    var costo = clientes * v("c-ticket");
    var base = planDe("essentials");
    var meses = costo / +base.getAttribute("data-monto");
    $("calc-num").textContent = dinero(costo);
    $("calc-det").textContent = L.detCalc(clientes, v("c-dias"));
    $("calc-vs").textContent = L.vsCalc(meses >= 10 ? Math.round(meses) : meses.toFixed(1), base.getAttribute("data-precio"));
    if (movida) { estimado = dinero(costo); $("plan-correo").href = correoPlan(); }
  }
  ["c-pedidos", "c-ticket", "c-perdida", "c-dias"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      if (!movida) { movida = true; track("clic", "cuanto-cuesta:mover"); }
      calcular();
    });
  });

  /* ---------- ?problema= ---------- */
  var q = new URLSearchParams(location.search);
  var clave = (q.get("problema") || "").toLowerCase().replace(/[^a-z]/g, "");
  if (clave && carta(clave)) {
    var c = carta(clave), padre = $("notifs");
    if (padre.firstElementChild !== c) padre.insertBefore(c, padre.firstElementChild);
    c.classList.add("destacado");
  }

  /* ---------- Arranque ---------- */
  arrancar();
  lista().forEach(function (k) { var c = carta(k); c.classList.add("marcada"); c.querySelector(".nt__btn").textContent = L.meOk; });
  refrescar(false);
  calcular();
})();
