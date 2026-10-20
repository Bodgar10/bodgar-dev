/* Bodegas · /plataformas/bodegas/
 *
 * La nave (racks, lámparas, banda con escáner), las etiquetas de problema
 * que se marcan y abren su solución, el plan que se arma con lo marcado,
 * la báscula de costos y las tarimas: la plataforma fija repartida entre clientes.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del mensaje de WhatsApp que la persona revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa etiqueta (enlace de correo frío).
 */
(function () {
  "use strict";

  var WA = "https://wa.me/525527149106?text=";
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var GUARDADO = "bd_bodegas_marcas";

  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function dinero(n) { return "$" + Math.round(n).toLocaleString("es-MX"); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Aleatorio con semilla: la nave sale igual en cada visita.
  function semilla(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---------- Problemas: orden = por dónde empezaría ---------- */
  var PROB = {
    cobros: {
      nombre: "Trabajo que nadie cobró", tipo: "cobras",
      construye: "Cada servicio queda registrado como concepto cobrable, con reporte semanal de pendientes.",
      gana: "Recuperas ingresos que hoy se quedan fuera de la factura.",
      empezar: "Piloto: operaciones cobrables",
      porque: "Es la fuga que se convierte en dinero más rápido y la más fácil de medir: lo que el sistema encuentra, se factura."
    },
    errores: {
      nombre: "Pedidos con el producto equivocado", tipo: "pierdes",
      construye: "Escaneo en picking y empaque, y báscula que compara el peso esperado contra el real antes de la guía.",
      gana: "Menos devoluciones, reenvíos y quejas.",
      empezar: "Piloto: picking sin errores",
      porque: "Cada error que no sale de la bodega te ahorra envío, devolución, soporte y reenvío. Se mide desde la primera semana."
    },
    inventario: {
      nombre: "Inventario que no cuadra", tipo: "procesas",
      construye: "Cada entrada, salida y movimiento actualiza el inventario al momento, con código de barras o QR.",
      gana: "Menos conteos y diferencias: sabes lo que de verdad tienes.",
      empezar: "Piloto: inventario por escaneo",
      porque: "Sin un inventario confiable, todo lo demás se construye sobre arena. Es la base de lo que sigue."
    },
    ubicacion: {
      nombre: "Producto que nadie encuentra", tipo: "procesas",
      construye: "Ubicación exacta por rack, nivel y posición, y quién lo movió por última vez.",
      gana: "Menos horas buscando y menos producto «perdido».",
      empezar: "Piloto: recepción y ubicación",
      porque: "Si cada caja entra escaneada y ubicada, dejas de perder tiempo y producto desde el primer día."
    },
    evidencia: {
      nombre: "Reclamaciones sin pruebas", tipo: "pierdes",
      construye: "Cadena de custodia: fotos, peso, usuario y hora de cada paso, ligados al pedido.",
      gana: "Menos disputas, y un servicio premium que puedes cobrar.",
      empezar: "Piloto: empaque con evidencia",
      porque: "Cada reclamación que puedes probar es dinero que no devuelves. Y la evidencia se puede vender como servicio."
    },
    paqueteria: {
      nombre: "Guías y tracking a mano", tipo: "procesas",
      construye: "Guía, etiqueta y tracking sin recapturar; manifiesto escaneado al entregar al transportista.",
      gana: "Menos captura y prueba de lo que entregaste.",
      empezar: "Piloto: despacho a paquetería",
      porque: "Es el paso con más captura manual. Automatizarlo libera horas cada día y deja prueba de cada entrega."
    },
    portal: {
      nombre: "Clientes preguntando por WhatsApp", tipo: "vendes",
      construye: "Portal con tu marca: inventario, pedidos, tracking y evidencias en tiempo real.",
      gana: "Menos administración y un plan premium que vender.",
      empezar: "Piloto: portal para tus clientes",
      porque: "Te quita trabajo hoy y te ayuda a vender mañana: un cliente que ve su inventario en vivo paga más."
    }
  };
  var ORDEN = Object.keys(PROB);
  var ALIAS = {
    ubicacion: "ubicacion", donde: "ubicacion", rack: "ubicacion", racks: "ubicacion", recepcion: "ubicacion",
    inventario: "inventario", excel: "inventario", conteo: "inventario", conteos: "inventario",
    errores: "errores", error: "errores", picking: "errores", packing: "errores", empaque: "errores", peso: "errores",
    evidencia: "evidencia", custodia: "evidencia", reclamos: "evidencia", reclamaciones: "evidencia", fotos: "evidencia", trazabilidad: "evidencia",
    cobros: "cobros", cobro: "cobros", facturacion: "cobros", fugas: "cobros",
    paqueteria: "paqueteria", paqueterias: "paqueteria", guias: "paqueteria", tracking: "paqueteria", envios: "paqueteria",
    portal: "portal", clientes: "portal", pl: "portal"
  };

  var marcas = {};
  try { (JSON.parse(sessionStorage.getItem(GUARDADO) || "[]") || []).forEach(function (k) { if (PROB[k]) marcas[k] = true; }); } catch (e) {}
  var estimado = null; // { tipo, mes } de la báscula, viaja en el mensaje

  function lista() { return ORDEN.filter(function (k) { return marcas[k]; }); }
  function carta(k) { return document.querySelector('.etq[data-card="' + k + '"]'); }

  /* ---------- La nave ---------- */
  function nave() {
    var g = $("racks"), rnd = semilla("bodega");
    if (!g) return;
    var piso = 640, vigas = [250, 370, 490, 610], ancho = 250;
    var cartones = ["#8C6A44", "#9E7850", "#7B5B3A", "#A88458", "#6E5134"];
    var frag = document.createDocumentFragment();
    for (var b = 0; b < 7; b++) {
      var x0 = -60 + b * ancho, pasillo = String.fromCharCode(65 + b);
      vigas.forEach(function (vy, nivel) {
        var x = x0 + 16;
        while (x < x0 + ancho - 30) {
          var w = 36 + rnd() * 52, h = 34 + rnd() * 70;
          if (x + w > x0 + ancho - 14) break;
          if (rnd() < 0.18) { x += w * 0.6; continue; }
          var c = cartones[Math.floor(rnd() * cartones.length)];
          frag.appendChild(el("rect", { x: x.toFixed(0), y: (vy - h).toFixed(0), width: w.toFixed(0), height: h.toFixed(0), fill: c, "class": "rack-caja" }));
          if (rnd() < 0.5) frag.appendChild(el("rect", { x: (x + w * 0.2).toFixed(0), y: (vy - h * 0.6).toFixed(0), width: (w * 0.45).toFixed(0), height: (h * 0.22).toFixed(0), fill: "#D8D2C3", opacity: "0.7" }));
          if (rnd() < 0.35 && h < 80) {
            var h2 = 26 + rnd() * 30, w2 = w * (0.6 + rnd() * 0.3);
            frag.appendChild(el("rect", { x: (x + 3).toFixed(0), y: (vy - h - h2).toFixed(0), width: w2.toFixed(0), height: h2.toFixed(0), fill: cartones[Math.floor(rnd() * cartones.length)], "class": "rack-caja" }));
          }
          x += w + 4 + rnd() * 8;
        }
        frag.appendChild(el("rect", { x: x0, y: vy, width: ancho, height: 11, "class": "rack-viga" }));
        var etq = el("g", {});
        etq.appendChild(el("rect", { x: x0 + ancho / 2 - 28, y: vy + 1, width: 56, height: 9, rx: 1, "class": "rack-etq" }));
        var t = el("text", { x: x0 + ancho / 2, y: vy + 9, "text-anchor": "middle", "class": "rack-txt", "font-size": "8.5" });
        t.textContent = pasillo + "-0" + (nivel + 1) + "-" + (10 + b * 3);
        etq.appendChild(t);
        frag.appendChild(etq);
      });
      frag.appendChild(el("rect", { x: x0 - 6, y: 150, width: 12, height: piso - 150, "class": "rack-poste" }));
      for (var d = 0; d < 4; d++) {
        frag.appendChild(el("path", { d: "M" + (x0 - 4) + " " + (vigas[d] - 4) + " L" + (x0 + 4) + " " + (vigas[d] - 100), stroke: "#2E3A48", "stroke-width": "3" }));
      }
    }
    g.appendChild(frag);
    g.setAttribute("opacity", "0.8");

    var l = $("lamparas");
    for (var i = 0; i < 6; i++) {
      var cx = 120 + i * 240;
      var lam = el("g", { "class": "lampara", style: "animation-delay:" + (0.25 + i * 0.32).toFixed(2) + "s" });
      lam.appendChild(el("path", { "class": "cono", d: "M" + (cx - 24) + " 64 L" + (cx + 24) + " 64 L" + (cx + 200) + " 650 L" + (cx - 200) + " 650 Z", fill: "url(#g-cono)" }));
      lam.appendChild(el("line", { x1: cx, y1: 0, x2: cx, y2: 40, stroke: "#2A2E33", "stroke-width": "2" }));
      lam.appendChild(el("path", { "class": "foco", d: "M" + (cx - 10) + " 40 H" + (cx + 10) + " L" + (cx + 28) + " 62 H" + (cx - 28) + " Z" }));
      lam.appendChild(el("ellipse", { "class": "luz", cx: cx, cy: 63, rx: 24, ry: 4 }));
      l.appendChild(lam);
    }
    requestAnimationFrame(function () {
      document.querySelectorAll(".lampara").forEach(function (n) { n.classList.add("prende"); });
    });
  }

  /* ---------- La banda: cada caja pasa por el escáner ---------- */
  var EVENTOS = [
    { t: "ok", e: "✓ Recibido", c: "B-03-14", d: "24 pzas verificadas · 08:42 · Juan" },
    { t: "ok", e: "✓ Pedido validado", c: "PEDIDO #8391", d: "4 de 4 piezas correctas · Ana" },
    { t: "alerta", e: "⚠ Revisar antes de cerrar", c: "PEDIDO #8392", d: "Esperado 1.85 kg · detectado 1.42 kg" },
    { t: "ok", e: "✓ Entregado a paquetería", c: "DHL 4829 1930", d: "Manifiesto 17:21 · 48 de 48" },
    { t: "dinero", e: "$ Servicio registrado", c: "REEMPAQUE #118", d: "+$180 por cobrar al cliente" },
    { t: "ok", e: "✓ Devolución recibida", c: "DEV #311", d: "Revendible · a rack C-01-02" }
  ];

  function nuevaCaja(rnd, x) {
    var w = 84 + rnd() * 50, h = 62 + rnd() * 44;
    var g = el("g", {});
    g.appendChild(el("rect", { "class": "caja-cuerpo", x: 0, y: 0, width: w.toFixed(0), height: h.toFixed(0), rx: 2 }));
    g.appendChild(el("rect", { "class": "caja-lado", x: (w * 0.84).toFixed(0), y: 0, width: (w * 0.16).toFixed(0), height: h.toFixed(0) }));
    g.appendChild(el("rect", { "class": "caja-cinta", x: (w * 0.42).toFixed(0), y: 0, width: 12, height: (h * 0.4).toFixed(0) }));
    g.appendChild(el("rect", { "class": "caja-etq", x: (w * 0.1).toFixed(0), y: (h * 0.5).toFixed(0), width: (w * 0.5).toFixed(0), height: (h * 0.34).toFixed(0), rx: 1 }));
    for (var i = 0; i < 6; i++) {
      g.appendChild(el("rect", { x: (w * 0.14 + i * w * 0.07).toFixed(1), y: (h * 0.56).toFixed(0), width: (i % 2 ? 1.5 : 3), height: (h * 0.2).toFixed(0), fill: "#16181B" }));
    }
    $("cajas").appendChild(g);
    return { g: g, x: x, w: w, h: h };
  }

  function banda() {
    var capa = $("cajas");
    if (!capa) return;
    var rnd = semilla("banda"), cajas = [], idx = 0;
    var lector = $("lector"), arco = $("arco"), contenedor = document.querySelector(".banda");
    var VEL = 150, CENTRO = 720, BASE = 174;
    var pausa = 0, ocultar = null, quitarArco = null;

    function pinta(c) { c.g.setAttribute("transform", "translate(" + c.x.toFixed(1) + " " + (BASE - c.h).toFixed(1) + ")"); }

    function escanear() {
      var ev = EVENTOS[idx++ % EVENTOS.length];
      $("lector-estado").textContent = ev.e;
      $("lector-codigo").textContent = ev.c;
      $("lector-det").textContent = ev.d;
      lector.className = "lector visible " + (ev.t === "ok" ? "" : ev.t);
      arco.setAttribute("class", "arco " + ev.t);
      clearTimeout(ocultar); clearTimeout(quitarArco);
      var dura = ev.t === "alerta" ? 1700 : 900;
      if (ev.t === "alerta") { pausa = 1.4; contenedor.classList.add("quieta"); }
      quitarArco = setTimeout(function () { arco.setAttribute("class", "arco"); }, dura);
      ocultar = setTimeout(function () { lector.classList.remove("visible"); }, 2300);
    }

    if (CALMA) {
      [-300, 150, 960, 1500].forEach(function (x) { pinta(nuevaCaja(rnd, x)); });
      escanear();
      clearTimeout(ocultar);
      return;
    }

    for (var x0 = 2700; x0 > -1300; x0 -= 300 + rnd() * 60) { if (Math.abs(x0 + 50 - CENTRO) > 120) cajas.push(nuevaCaja(rnd, x0)); }
    cajas.forEach(pinta);

    var visible = true, corriendo = false, previo = 0;
    function cuadro(t) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (t - (previo || t)) / 1000);
      previo = t;
      if (pausa > 0) {
        pausa -= dt;
        if (pausa <= 0) contenedor.classList.remove("quieta");
      } else {
        var ultimo = cajas[cajas.length - 1];
        if (!ultimo || ultimo.x > -1150 + rnd() * 60) cajas.push(nuevaCaja(rnd, -1400));
        for (var i = cajas.length - 1; i >= 0; i--) {
          var c = cajas[i], antes = c.x + c.w / 2;
          c.x += VEL * dt;
          if (antes < CENTRO && c.x + c.w / 2 >= CENTRO) escanear();
          if (c.x > 2850) { capa.removeChild(c.g); cajas.splice(i, 1); continue; }
          pinta(c);
        }
      }
      requestAnimationFrame(cuadro);
    }
    function arrancar() {
      if (corriendo || !visible || document.hidden) return;
      corriendo = true; previo = 0;
      requestAnimationFrame(cuadro);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; arrancar(); }).observe($("inicio"));
    }
    document.addEventListener("visibilitychange", arrancar);
    setTimeout(arrancar, 900);
  }

  /* ---------- Códigos de barras de las etiquetas ---------- */
  function codigos() {
    document.querySelectorAll(".codigo").forEach(function (s) {
      var rnd = semilla(s.getAttribute("data-c") || "x"), x = 0, out = [];
      s.setAttribute("viewBox", "0 0 110 44");
      while (x < 108) {
        var w = rnd() < 0.3 ? 3 : rnd() < 0.5 ? 2 : 1;
        out.push('<rect x="' + x + '" y="0" width="' + w + '" height="34" fill="#16181B"/>');
        x += w + (rnd() < 0.5 ? 1 : 2);
      }
      var num = "75" + Math.floor(rnd() * 1e10).toString().padStart(10, "0");
      out.push('<text x="0" y="43" font-family="IBM Plex Mono, monospace" font-size="8.5" fill="#16181B" textLength="108">' + num + "</text>");
      s.innerHTML = out.join("");
    });
  }

  /* ---------- Marcar problemas ---------- */
  function guardar() { try { sessionStorage.setItem(GUARDADO, JSON.stringify(lista())); } catch (e) {} }

  function marcar(k, si) {
    if (!!marcas[k] === si) return;
    if (si) marcas[k] = true; else delete marcas[k];
    var c = carta(k);
    if (c) {
      c.classList.toggle("marcada", si);
      var btn = c.querySelector(".etq__btn");
      if (btn) btn.textContent = si ? "✓ Ver solución" : (k === "cobros" ? "Sí pasa →" : "Esto me pasa →");
    }
    guardar();
    refrescar(si);
  }

  function refrescar(subio) {
    var n = lista().length;
    $("conteo-n").textContent = n;
    $("conteo-ir").hidden = n === 0;
    $("manif-n").textContent = n;
    $("manif-txt").textContent = n === 1 ? "problema marcado" : "problemas marcados";
    if (subio) {
      var m = $("manif");
      m.classList.remove("salta"); void m.offsetWidth; m.classList.add("salta");
    }
    plan();
    flotante();
  }

  /* ---------- La ficha (modal) ---------- */
  var ficha = $("ficha"), actual = null;
  function abrir(k) {
    var c = carta(k);
    if (!c) return;
    if (!marcas[k]) { marcar(k, true); track("clic", "problemas:me-pasa-" + k); }
    else track("clic", "problemas:reabrir-" + k);
    actual = k;
    $("ficha-tag").textContent = c.querySelector(".etq__top span:last-child").textContent;
    $("ficha-frase").textContent = c.querySelector(".etq__frase").textContent;
    $("ficha-cuerpo").innerHTML = c.querySelector(".sol").innerHTML;
    var n = lista().length;
    $("ficha-plan").textContent = "Ver mi solución (" + n + ") ↓";
    if (typeof ficha.showModal === "function") ficha.showModal(); else ficha.setAttribute("open", "");
    ficha.scrollTop = 0;
  }
  function cerrar() {
    if (typeof ficha.close === "function") ficha.close(); else ficha.removeAttribute("open");
  }
  function irA(id) {
    var d = $(id);
    if (d) d.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "start" });
  }

  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.getAttribute("data-abrir")); });
  });
  $("ficha-x").addEventListener("click", cerrar);
  $("ficha-otro").addEventListener("click", function () {
    cerrar();
    var siguiente = ORDEN.filter(function (k) { return !marcas[k]; })[0];
    var c = siguiente ? carta(siguiente) : null;
    if (c) {
      c.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "center" });
      c.querySelector(".etq__btn").focus({ preventScroll: true });
    }
  });
  $("ficha-plan").addEventListener("click", function () { cerrar(); track("clic", "problemas:ficha-plan"); irA("solucion"); });
  $("ficha-quitar").addEventListener("click", function () { if (actual) marcar(actual, false); cerrar(); });
  ficha.addEventListener("click", function (e) { if (e.target === ficha) cerrar(); });

  /* ---------- B · El plan ---------- */
  function mensajePlan() {
    var l = lista();
    var partes = ["Hola Bodgar. Vi la página de bodegas"];
    if (l.length) {
      partes[0] += " y marqué estos problemas:";
      l.forEach(function (k) { partes.push("- " + PROB[k].nombre); });
      partes.push("Me interesaría empezar por: " + PROB[l[0]].empezar + ".");
    } else partes[0] += " y quiero revisar mi operación.";
    if (estimado) partes.push("Mi estimado en la báscula: " + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    return partes.join("\n");
  }

  function plan() {
    var l = lista(), n = l.length;
    $("sol-titulo").textContent = n === 0
      ? "Marca arriba lo que te pasa y aquí aparece tu plan."
      : n === 1 ? "Marcaste 1 problema. Tiene solución."
      : "Marcaste " + n + " problemas. Los " + n + " se resuelven con el mismo sistema.";
    $("sol-intro").textContent = n
      ? "Esto es lo que construiría, lo que ganarías y por dónde empezaría yo."
      : "Un solo sistema, construido alrededor de tu operación. Empezamos por la fuga que más dinero te cuesta.";
    $("orden-folio").textContent = "#BOD-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("orden-vacia").hidden = n > 0;
    $("orden-lista").innerHTML = l.map(function (k, i) {
      var p = PROB[k];
      return '<li style="animation-delay:' + (i * 0.06) + 's"><span class="n">' + String(i + 1).padStart(2, "0") + "</span>" +
        "<div><span class=\"k\">Problema</span><b>" + esc(p.nombre) + "</b><button type=\"button\" data-reabrir=\"" + k + "\">Ver la solución</button></div>" +
        "<div><span class=\"k\">Lo que construyo</span><p>" + esc(p.construye) + "</p></div>" +
        "<div><span class=\"k\">Lo que ganas</span><p class=\"g\">" + esc(p.gana) + "</p></div></li>";
    }).join("");
    $("orden-inicio").hidden = n === 0;
    if (n) {
      $("orden-primero").textContent = PROB[l[0]].empezar;
      $("orden-porque").textContent = PROB[l[0]].porque;
    }

    var tipos = {};
    l.forEach(function (k) { tipos[PROB[k].tipo] = true; });
    document.querySelectorAll("#ganas li").forEach(function (li) { li.classList.toggle("activo", !!tipos[li.getAttribute("data-tipo")]); });

    $("ruta-1").textContent = n ? PROB[l[0]].empezar : "La fuga más cara";
    $("ruta-1p").textContent = n
      ? "En producción con tu gente real. Medimos antes y después: si no ahorra o genera, no seguimos."
      : "Un solo flujo en producción, con tu gente real. Medimos antes y después.";
    var resto = l.slice(1).filter(function (k) { return k !== "portal"; });
    $("ruta-2").textContent = resto.length ? resto.map(function (k) { return PROB[k].nombre; }).join(" · ") : "El siguiente flujo";
    $("ruta-2p").textContent = resto.length
      ? "Lo demás que marcaste, uno por uno y solo si el primero funcionó. Mismo sistema, sin rehacer nada."
      : "Solo si el primero funcionó. Mismo sistema, otra parte de la operación.";

    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
    $("plan-wa-txt").textContent = n ? (n === 1 ? "Quiero resolver este problema" : "Quiero resolver estos " + n + " problemas") : "Revisemos mi operación";
  }

  $("orden-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-reabrir]");
    if (b) abrir(b.getAttribute("data-reabrir"));
  });

  /* ---------- Manifiesto flotante ---------- */
  var vistos = {};
  function flotante() {
    var m = $("manif");
    var mostrar = lista().length > 0 && !vistos.solucion && !vistos.hablemos && !vistos.inicio;
    if (mostrar === m.classList.contains("visible")) return;
    if (mostrar) { m.hidden = false; requestAnimationFrame(function () { m.classList.add("visible"); }); }
    else m.classList.remove("visible");
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vistos[e.target.id] = e.isIntersecting; });
      flotante();
    }, { rootMargin: "-20% 0px -20% 0px" });
    ["inicio", "solucion", "hablemos"].forEach(function (id) { io.observe($(id)); });
  }

  /* ---------- C · La báscula ---------- */
  var tab = "errores", calcAbierta = false;
  var FORMATO = {
    "c-pedidos": function (v) { return (+v).toLocaleString("es-MX"); },
    "c-error": function (v) { return (+v).toFixed(1) + "%"; },
    "c-costo": dinero,
    "c-servicios": function (v) { return (+v).toLocaleString("es-MX"); },
    "c-precio": dinero,
    "c-fuga": function (v) { return v + "%"; },
    "t-clientes": function (v) { return v; }
  };
  function salidas() {
    document.querySelectorAll("output[data-for]").forEach(function (o) {
      var id = o.getAttribute("data-for");
      o.textContent = FORMATO[id]($(id).value);
    });
  }
  var anim = null;
  function mostrarNumero(v) {
    var n = $("calc-num");
    cancelAnimationFrame(anim);
    if (CALMA) { n.textContent = dinero(v); return; }
    var desde = parseInt((n.textContent || "").replace(/\D/g, ""), 10) || 0, t0 = 0;
    function paso(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3);
      n.textContent = dinero(desde + (v - desde) * e);
      if (p < 1) anim = requestAnimationFrame(paso);
    }
    anim = requestAnimationFrame(paso);
  }
  function calcular() {
    salidas();
    if (!calcAbierta) return;
    var v = function (id) { return parseFloat($(id).value); };
    var mes, det, mitad;
    if (tab === "errores") {
      var inc = v("c-pedidos") * v("c-error") / 100;
      mes = inc * v("c-costo");
      $("calc-etq").textContent = "Te cuestan los errores al mes";
      det = Math.round(inc).toLocaleString("es-MX") + " pedidos con error al mes · " + dinero(mes * 12) + " al año";
      mitad = "Si el sistema evitara solo la mitad: <b>" + dinero(mes / 2) + "/mes</b> recuperados.";
      estimado = { tipo: "errores de pedidos", mes: mes };
    } else {
      var sin = v("c-servicios") * v("c-fuga") / 100;
      mes = sin * v("c-precio");
      $("calc-etq").textContent = "Dejas de cobrar al mes";
      det = Math.round(sin).toLocaleString("es-MX") + " servicios sin facturar al mes · " + dinero(mes * 12) + " al año";
      mitad = "Si recuperaras solo la mitad: <b>" + dinero(mes / 2) + "/mes</b> que hoy no entran.";
      estimado = { tipo: "servicios sin cobrar", mes: mes };
    }
    mostrarNumero(mes);
    $("calc-det").textContent = det;
    $("calc-mitad").innerHTML = mitad;
    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
  }
  $("calc-abrir").addEventListener("click", function () {
    calcAbierta = true;
    $("calc-cuerpo").hidden = false;
    this.hidden = true;
    track("clic", "cuanto-te-cuesta:abrir");
    calcular();
  });
  document.querySelectorAll(".calc__tabs [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      tab = b.getAttribute("data-tab");
      document.querySelectorAll(".calc__tabs [data-tab]").forEach(function (o) { o.setAttribute("aria-selected", o === b ? "true" : "false"); });
      document.querySelectorAll(".calc__panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== tab; });
      track("clic", "cuanto-te-cuesta:tab-" + tab);
      calcular();
    });
  });
  ["c-pedidos", "c-error", "c-costo", "c-servicios", "c-precio", "c-fuga"].forEach(function (id) {
    $(id).addEventListener("input", calcular);
  });

  /* ---------- D · Tarimas: una por cliente ---------- */
  var tocado = false;
  function tarimas() {
    var n = parseInt($("t-clientes").value, 10), caja = $("tarimas");
    while (caja.children.length < n) {
      var t = document.createElement("i");
      t.className = "tarima";
      caja.appendChild(t);
    }
    while (caja.children.length > n) caja.removeChild(caja.lastChild);
    var FIJO = 2000, EXTRA = 1500;
    var cobras = n * EXTRA, queda = cobras - FIJO;
    $("t-cobras-k").textContent = n + " × " + dinero(EXTRA);
    $("t-cobras").textContent = "+" + dinero(cobras) + "/mes";
    $("t-unidad-k").textContent = dinero(FIJO) + " ÷ " + n + (n === 1 ? " cliente" : " clientes");
    $("t-unidad").textContent = dinero(FIJO / n) + "/mes";
    $("t-total").textContent = (queda < 0 ? "−" : "") + dinero(Math.abs(queda));
    $("t-total").classList.toggle("negativo", queda < 0);
    $("t-punto").textContent = n === 1
      ? "Con 1 cliente todavía no se paga sola: desde el 2.º, sí."
      : "Con " + n + " clientes te sale en " + dinero(FIJO / n) + " por cliente. Entre más clientes, más barata.";
    salidas();
  }
  $("t-clientes").addEventListener("input", function () {
    if (!tocado) { tocado = true; track("clic", "como-crece:clientes"); }
    tarimas();
  });

  /* ---------- Formulario → WhatsApp ---------- */
  var form = $("form");
  function mensajeForm() {
    var v = function (n) { var e = form.elements[n]; return (e && e.value || "").trim(); };
    var hoy = form.querySelector('input[name="hoy"]:checked');
    var partes = ["Hola Bodgar. Vi la página de bodegas."];
    if (v("nombre")) partes.push("Soy " + v("nombre") + (v("empresa") ? ", de " + v("empresa") : "") + ".");
    else if (v("empresa")) partes.push("Escribo de " + v("empresa") + ".");
    if (hoy) partes.push("Hoy lo llevamos en: " + hoy.value + ".");
    var l = lista();
    if (l.length) partes.push("Problemas que marqué: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".");
    if (estimado) partes.push("Mi estimado en la báscula: " + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    partes.push("Lo que más nos duele: " + v("proceso"));
    return partes.join("\n");
  }
  function valido() {
    var ok = (form.elements.proceso.value || "").trim().length >= 5;
    $("f-aviso").hidden = ok;
    if (!ok) form.elements.proceso.focus();
    return ok;
  }
  var empezado = false;
  form.addEventListener("focusin", function () { if (!empezado) { empezado = true; track("clic", "form:empezado"); } });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valido()) return;
    track("clic", "form:whatsapp");
    window.open(WA + encodeURIComponent(mensajeForm()), "_blank", "noopener");
  });
  $("f-correo").addEventListener("click", function (e) {
    e.preventDefault();
    if (!valido()) return;
    track("clic", "form:correo");
    location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Mi bodega") + "&body=" + encodeURIComponent(mensajeForm());
  });

  /* ---------- ?problema= : esa etiqueta primero ---------- */
  var q = new URLSearchParams(location.search);
  var clave = ALIAS[(q.get("problema") || "").toLowerCase().replace(/[^a-z]/g, "")];
  if (clave) {
    var c = carta(clave), padre = $("etiquetas");
    if (c && padre.firstElementChild !== c) padre.insertBefore(c, padre.firstElementChild);
    if (c) c.classList.add("destacado");
  }

  /* ---------- Arranque ---------- */
  nave();
  banda();
  codigos();
  lista().forEach(function (k) {
    var c = carta(k);
    if (c) { c.classList.add("marcada"); c.querySelector(".etq__btn").textContent = "✓ Ver solución"; }
  });
  refrescar(false);
  tarimas();
  salidas();
})();
