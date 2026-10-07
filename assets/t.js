/* Medición propia de bodgar.dev — sin cookies ni terceros.
 *
 * Manda a Supabase (esquema bodgar_dev, ver supabase/001_visitas.sql):
 *   vista    al abrir la página
 *   seccion  cuando una sección cruza el centro de la pantalla
 *   scroll   al pasar 25 / 50 / 75 / 100 %
 *   clic     en cualquier enlace; se nombra solo: "<sección>:<tipo>"
 *   tiempo   segundos visibles acumulados, al salir o cambiar de pestaña
 *
 * ?r=<código>   el enlace del correo frío; se recuerda en este navegador
 * ?interno=1    marca este navegador como mío (no cuenta); ?interno=0 lo quita
 */
(function () {
  var URL = "https://uxtmdhbqiphvmixtxlox.supabase.co/rest/v1/rpc/bodgardev_registrar";
  var KEY = "sb_publishable_oSpCqCP0M-6OgyLH8jjBuA_ii9UJVOL";

  // Escáneres de correo y navegadores automatizados: no son personas.
  if (navigator.webdriver) return;

  var path = location.pathname.replace(/index\.html$/, "");
  if (path.charAt(path.length - 1) !== "/") path += "/";
  if (path !== "/" && path !== "/es/" && path !== "/plataformas/") return;

  function guardado(store, k, v) {
    try {
      if (v === undefined) return store.getItem(k);
      if (v === null) store.removeItem(k); else store.setItem(k, v);
    } catch (e) {}
    return v;
  }
  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  var q = new URLSearchParams(location.search);
  if (q.get("interno") === "1") guardado(localStorage, "bd_interno", "1");
  if (q.get("interno") === "0") guardado(localStorage, "bd_interno", null);
  if (q.get("r")) guardado(localStorage, "bd_ref", q.get("r").slice(0, 40));

  // Quita r e interno de la barra: el enlace que se reenvía queda limpio.
  if (q.has("r") || q.has("interno")) {
    q.delete("r"); q.delete("interno");
    var limpio = location.pathname + (q.toString() ? "?" + q : "") + location.hash;
    try { history.replaceState(null, "", limpio); } catch (e) {}
  }

  var anon = guardado(localStorage, "bd_anon") || guardado(localStorage, "bd_anon", nuevoId());
  var sesion = guardado(sessionStorage, "bd_ses") || guardado(sessionStorage, "bd_ses", nuevoId());
  var ref = guardado(localStorage, "bd_ref");
  var interno = guardado(localStorage, "bd_interno") === "1";
  var fuente = q.get("utm_source");
  var referer = null;
  try {
    var h = document.referrer ? new window.URL(document.referrer).hostname : "";
    if (h && !/(^|\.)bodgar\.dev$/.test(h)) referer = h;
  } catch (e) {}
  var movil = window.matchMedia ? matchMedia("(pointer: coarse)").matches : null;
  var zona = null;
  try { zona = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}

  function enviar(evento, detalle) {
    var body = {
      p_anon_id: anon, p_sesion_id: sesion, p_pagina: path, p_evento: evento,
      p_detalle: detalle == null ? null : String(detalle),
      p_ref: ref, p_fuente: fuente, p_referer: referer,
      p_movil: movil, p_zona: zona, p_interno: interno
    };
    try {
      fetch(URL, {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", apikey: KEY },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) {}
  }

  enviar("vista");

  // Nombre de la sección: su eyebrow ("The problem" → "the-problem").
  function slug(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  }
  function nombreSeccion(el) {
    if (!el) return "otro";
    if (el.closest(".topbar")) return "header";
    if (el.closest("footer")) return "footer";
    if (el.closest(".wa-float")) return "flotante";
    var s = el.closest("main > section");
    if (!s) return "otro";
    if (s.classList.contains("hero")) return "hero";
    if (s.classList.contains("final")) return "final";
    var eb = s.querySelector(".eyebrow");
    return slug(eb && eb.textContent) || "s" + Array.prototype.indexOf.call(s.parentNode.children, s);
  }

  var secciones = document.querySelectorAll("main > section");
  if ("IntersectionObserver" in window) {
    var vistas = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = nombreSeccion(e.target);
        io.unobserve(e.target);
        if (!vistas[n]) { vistas[n] = 1; enviar("seccion", n); }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    for (var i = 0; i < secciones.length; i++) io.observe(secciones[i]);
  }

  var hitos = [25, 50, 75, 100], hecho = {};
  function medirScroll() {
    var alto = document.documentElement.scrollHeight;
    var p = (window.scrollY + window.innerHeight) / alto * 100;
    for (var i = 0; i < hitos.length; i++) {
      var m = hitos[i];
      if (!hecho[m] && p >= (m === 100 ? 98 : m)) { hecho[m] = 1; enviar("scroll", m); }
    }
  }
  var pendiente = false;
  window.addEventListener("scroll", function () {
    if (pendiente) return;
    pendiente = true;
    setTimeout(function () { pendiente = false; medirScroll(); }, 300);
  }, { passive: true });

  function tipoEnlace(a) {
    if (a.dataset.t) return a.dataset.t;
    var href = a.getAttribute("href") || "";
    if (/wa\.me\//.test(href)) return "whatsapp";
    if (/cal\.com\//.test(href)) return "agenda";
    if (/^mailto:/.test(href)) return /subject=/.test(href) ? "correo-app" : "correo";
    if (/\.pdf$/i.test(href)) return "cv";
    if (/apps\.apple\.com/.test(href)) {
      var img = a.querySelector("img");
      return "appstore-" + slug(img ? img.alt : "");
    }
    if (/linkedin\.com/.test(href)) return "linkedin";
    if (/^https?:/.test(href)) {
      try { return "sitio-" + new window.URL(href).hostname.replace(/^www\./, ""); } catch (e) {}
    }
    if (a.closest(".lang") || a.hasAttribute("hreflang")) return "idioma";
    return "interno-" + (href.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "inicio");
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    enviar("clic", (nombreSeccion(a) + ":" + tipoEnlace(a)).slice(0, 80));
  }, true);

  // Tiempo visible: se acumula solo con la pestaña al frente.
  var acumulado = 0, desde = document.visibilityState === "visible" ? Date.now() : 0, mandado = 0;
  function cerrarTramo() {
    if (desde) { acumulado += Date.now() - desde; desde = 0; }
    var s = Math.round(acumulado / 1000);
    if (s >= 1 && s !== mandado) { mandado = s; enviar("tiempo", Math.min(s, 99999)); }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") cerrarTramo();
    else desde = Date.now();
  });
  window.addEventListener("pagehide", cerrarTramo);

  // En celular la pestaña a veces muere sin avisar: marcas a los 10/30/60/120 s.
  var marcas = [10, 30, 60, 120];
  setInterval(function () {
    if (!desde || !marcas.length) return;
    var s = Math.round((acumulado + Date.now() - desde) / 1000);
    if (s >= marcas[0]) {
      while (marcas.length && s >= marcas[0]) marcas.shift();
      mandado = s; enviar("tiempo", s);
    }
  }, 2000);
})();
