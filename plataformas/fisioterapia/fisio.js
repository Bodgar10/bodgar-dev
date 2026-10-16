/* Fisioterapia · /plataformas/fisioterapia/
 *
 * La sala (paciente con goniómetro que avanza sesión a sesión), la agenda
 * viva del día (una cancelación que la lista de espera recupera), las
 * tarjetas de problema que se perforan y abren su solución, el plan de
 * tratamiento armado con lo marcado y el monitor de costos.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del mensaje de WhatsApp que la clínica revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa tarjeta (enlace de correo frío).
 */
(function () {
  "use strict";

  var WA = "https://wa.me/525527149106?text=";
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GUARDADO = "bd_fisio_marcas";

  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function dinero(n) { return "$" + Math.round(n).toLocaleString("es-MX"); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function suave(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  /* ---------- Problemas: orden = por dónde empezaría ---------- */
  var PROB = {
    cancelaciones: {
      nombre: "Citas canceladas que quedan vacías", tipo: "recupera",
      construye: "Lista de espera que se avisa sola cuando alguien cancela; el primero que confirma se queda con el horario.",
      gana: "Horas que se vuelven a vender en lugar de perderse.",
      empezar: "Lista de espera y recuperación de citas",
      porque: "Es dinero que hoy se va cada semana y se mide desde el primer mes: cuántas citas canceladas se volvieron a llenar."
    },
    seguros: {
      nombre: "Cartas pase contadas a mano", tipo: "recupera",
      construye: "Cada tratamiento ligado a su autorización: sesiones cubiertas, usadas, vigencia y documentos, con aviso antes de que se acabe.",
      gana: "Sesiones que sí se cobran y tratamientos que no se cortan.",
      empezar: "Control de cartas pase y autorizaciones",
      porque: "Una autorización vencida es una sesión que no se cobra o un paciente que se va. Es de lo más fácil de medir."
    },
    sesiones: {
      nombre: "Paquetes que terminan sin seguimiento", tipo: "recupera",
      construye: "Cada sesión se descuenta del plan del paciente y el sistema avisa antes de que termine, para que el terapeuta revise la continuidad.",
      gana: "Ningún paquete termina sin que alguien revise cómo sigue el paciente.",
      empezar: "Paquetes y sesiones que se descuentan solos",
      porque: "Es la base de casi todo lo demás, y cada paquete que termina sin revisión es un paciente que puede perderse sin que nadie lo decida."
    },
    leads: {
      nombre: "No saben qué canal trae pacientes", tipo: "capta",
      construye: "Seguimiento de anuncio → WhatsApp → valoración → tratamiento → renovación, por canal.",
      gana: "Saber en qué invertir y en qué paso se pierden.",
      empezar: "De lead a paciente, medido",
      porque: "Si ya invierten en anuncios, saber cuál trae pacientes que pagan cambia en qué gastan desde el primer mes."
    },
    ejercicios: {
      nombre: "Ejercicios en casa sin seguimiento", tipo: "retiene",
      construye: "El plan que el terapeuta prescribe, en el celular del paciente, con registro de lo que hizo.",
      gana: "Mejor adherencia y sesiones más productivas.",
      empezar: "Ejercicios en casa con seguimiento",
      porque: "Un paciente que avanza entre sesiones termina su tratamiento y lo recomienda."
    },
    evolucion: {
      nombre: "El avance se pierde entre notas", tipo: "retiene",
      construye: "Las mediciones que la clínica ya usa, ordenadas en una línea de tiempo clara para terapeuta y paciente.",
      gana: "Pacientes que ven su avance y no abandonan.",
      empezar: "Evolución del paciente en una sola vista",
      porque: "El abandono a la mitad del tratamiento es ingreso perdido; ver el avance es lo que más lo evita."
    },
    portal: {
      nombre: "Recepción contestando WhatsApp todo el día", tipo: "libera",
      construye: "Portal del paciente: próxima cita, sesiones restantes, ejercicios, pagos y documentos.",
      gana: "Una recepción que atiende en lugar de contestar mensajes.",
      empezar: "Portal del paciente",
      porque: "Quita las preguntas repetidas desde el primer día y hace que la clínica se sienta más cercana."
    },
    sucursales: {
      nombre: "Varias sedes o terapeutas, varias versiones del paciente", tipo: "libera",
      construye: "Expediente único con permisos por rol: cada especialista registra lo suyo y ve lo que le corresponde.",
      gana: "Crecer sin que cada sede empiece de cero.",
      empezar: "Expediente único entre sedes y terapeutas",
      porque: "Antes de abrir otra sede o sumar terapeutas, conviene que todos trabajen sobre el mismo paciente."
    }
  };
  var ORDEN = Object.keys(PROB);
  var ALIAS = {
    cancelaciones: "cancelaciones", cancelacion: "cancelaciones", citas: "cancelaciones", agenda: "cancelaciones", espera: "cancelaciones",
    seguros: "seguros", aseguradoras: "seguros", aseguradora: "seguros", cartapase: "seguros", autorizaciones: "seguros",
    sesiones: "sesiones", paquetes: "sesiones",
    leads: "leads", marketing: "leads", captacion: "leads", instagram: "leads",
    ejercicios: "ejercicios", casa: "ejercicios",
    evolucion: "evolucion", progreso: "evolucion",
    portal: "portal", familia: "portal", recepcion: "portal",
    sucursales: "sucursales", sedes: "sucursales", multidisciplinario: "sucursales", equipo: "sucursales"
  };

  var marcas = {};
  try { (JSON.parse(sessionStorage.getItem(GUARDADO) || "[]") || []).forEach(function (k) { if (PROB[k]) marcas[k] = true; }); } catch (e) {}
  var estimado = null;

  function lista() { return ORDEN.filter(function (k) { return marcas[k]; }); }
  function carta(k) { return document.querySelector('.tj[data-card="' + k + '"]'); }

  /* ---------- Avisos de la sala ---------- */
  var hud = $("hud"), hudTimer = null;
  function aviso(tipo, k, t) {
    $("hud-k").textContent = k;
    $("hud-t").textContent = t;
    hud.className = "aviso-hud visible" + (tipo ? " hud--" + tipo : "");
    clearTimeout(hudTimer);
    if (!CALMA) hudTimer = setTimeout(function () { hud.classList.remove("visible"); }, 2600);
  }

  /* ---------- Goniómetro: el hombro de Sofía, sesión a sesión ---------- */
  var SX = 392, SY = 244, R = 58;
  var FASES = [
    { fase: "Día 1", max: 70, dolor: "8/10" },
    { fase: "Semana 4", max: 115, dolor: "4/10" },
    { fase: "Semana 8", max: 160, dolor: "2/10" }
  ];
  var REP = 3.1, POR_FASE = REP * 2, ALTA = 2.4, CICLO = POR_FASE * FASES.length + ALTA;

  function arco(th) {
    if (th < 0.5) return "";
    var r = th * Math.PI / 180;
    var x = SX + R * Math.sin(r), y = SY + R * Math.cos(r);
    return "M" + SX + " " + (SY + R) + " A" + R + " " + R + " 0 " + (th > 180 ? 1 : 0) + " 0 " + x.toFixed(1) + " " + y.toFixed(1);
  }
  function brazo(th) {
    $("brazo").setAttribute("transform", "rotate(" + (-th).toFixed(1) + " " + SX + " " + SY + ")");
    $("arco").setAttribute("d", arco(th));
    $("grados").textContent = Math.round(th) + "°";
    var m = Math.max(th, 40) / 2 * Math.PI / 180;
    $("grados").setAttribute("x", (SX + 122 * Math.sin(m)).toFixed(0));
    $("grados").setAttribute("y", (SY + 14 + 122 * Math.cos(m)).toFixed(0));
  }
  $("arco-meta").setAttribute("d", arco(160));

  var faseActual = -1;
  function ficha(i) {
    var fp = document.querySelector(".ficha-paciente");
    if (i === FASES.length) {
      $("fp-fase").textContent = "Alta ✓";
      $("fp-rango").textContent = "160°";
      fp.classList.add("fp__alta");
      return;
    }
    fp.classList.remove("fp__alta");
    $("fp-fase").textContent = FASES[i].fase;
    $("fp-dolor").textContent = FASES[i].dolor;
    $("fp-rango").textContent = "—";
  }
  function gonio(t) {
    var c = t % CICLO, i = Math.floor(c / POR_FASE);
    if (i !== faseActual) { faseActual = i; ficha(i); }
    if (i >= FASES.length) { brazo(0); $("grados").textContent = "160°"; return; }
    var max = FASES[i].max, r = (c - i * POR_FASE) % REP, th;
    if (r < 1.2) th = max * suave(r / 1.2);
    else if (r < 1.7) th = max;
    else if (r < 2.7) th = max * (1 - suave((r - 1.7) / 1.0));
    else th = 0;
    if (r >= 1.2 && r < 1.7) $("fp-rango").textContent = max + "°";
    brazo(th);
  }

  /* ---------- Agenda viva ---------- */
  var CITAS = [
    { h: "9:00", n: "Sofía M.", e: "sesión 7 de 12", ev: ["", "✓ Sesión registrada", "Sofía M. · 7 de 12"] },
    { h: "10:00", n: "Jorge R.", e: "valoración" },
    { h: "11:00", n: "Ana P.", e: "carta pase 8 de 10", ev: ["alerta", "⚠ Carta pase por terminar", "Ana P. · quedan 2 · pedir renovación"] },
    { h: "12:00", n: "Luis G.", e: "sesión 3 de 10" },
    { h: "13:00", n: "Libre", e: "comida", libre: true },
    { h: "14:00", n: "Marta S.", e: "sesión 9 de 10", ev: ["alerta", "⚠ Paquete por terminar", "Marta S. · revisar continuidad"] },
    { h: "15:00", n: "Pedro V.", e: "ejercicios 3 de 3", ev: ["", "✓ Hizo sus ejercicios en casa", "Pedro V. · 3 de 3 esta semana"] },
    { h: "16:00", n: "Elena T.", e: "sesión 5 de 8" },
    { h: "17:00", n: "Mariana L.", e: "sesión 4 de 10" },
    { h: "18:00", n: "Raúl C.", e: "sesión 2 de 6" }
  ];
  var CANCELA = 8, BASE_REC = 2800, PRECIO = 700, DURA = 30, PAUSA_FIN = 2.5;
  var pista = $("ag-pista"), vista = $("ag-vista"), ahora = $("ag-ahora"), celdas = [];
  CITAS.forEach(function (c) {
    var d = document.createElement("div");
    d.className = "cita" + (c.libre ? " libre" : "");
    d.innerHTML = '<span class="cita__h">' + c.h + '</span><span class="cita__n"></span><span class="cita__e"></span>';
    pista.insertBefore(d, ahora);
    celdas.push(d);
  });
  pista.style.transition = "none";

  var estado = {};
  function reiniciar() {
    estado = { hechas: {}, cancel: 0, ses: 0, rec: BASE_REC };
    celdas.forEach(function (d, i) {
      d.className = "cita" + (CITAS[i].libre ? " libre" : "");
      d.querySelector(".cita__n").textContent = CITAS[i].n;
      d.querySelector(".cita__e").textContent = CITAS[i].e;
    });
    $("ag-ses").textContent = "0";
    $("ag-rec").textContent = dinero(BASE_REC);
  }
  function salta(id) { var b = $(id); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta"); }
  function poner(i, clase, n, e) {
    var d = celdas[i];
    d.className = "cita " + clase;
    if (n) d.querySelector(".cita__n").textContent = n;
    if (e) d.querySelector(".cita__e").textContent = e;
  }

  function agenda(p, conAvisos) {
    var tramo = Math.floor(p * CITAS.length);
    for (var i = 0; i < Math.min(tramo, CITAS.length); i++) {
      if (estado.hechas[i] || CITAS[i].libre) continue;
      estado.hechas[i] = true;
      celdas[i].classList.remove("cancelada", "esperando");
      celdas[i].classList.add("atendida");
      estado.ses++;
      $("ag-ses").textContent = estado.ses;
      if (conAvisos) {
        salta("ag-ses");
        if (CITAS[i].ev) aviso.apply(null, CITAS[i].ev);
      }
    }
    // La historia de la cancelación: 17:00 se libera y se vuelve a llenar.
    if (estado.cancel < 1 && p > 0.38) {
      estado.cancel = 1;
      poner(CANCELA, "cancelada", null, "canceló hace 5 min");
      if (conAvisos) aviso("alerta", "↺ Canceló Mariana L.", "17:00 libre · aviso a 3 en lista de espera");
    }
    if (estado.cancel < 2 && p > 0.45) { estado.cancel = 2; poner(CANCELA, "esperando", "Lista de espera", "avisando a 3 pacientes…"); }
    if (estado.cancel < 3 && p > 0.53) {
      estado.cancel = 3;
      poner(CANCELA, "recuperada", "Carlos D.", "tomó el horario ✓");
      estado.rec += PRECIO;
      $("ag-rec").textContent = dinero(estado.rec);
      if (conAvisos) { salta("ag-rec"); aviso("dinero", "$ Cita recuperada", "Carlos D. tomó las 17:00 · +" + dinero(PRECIO)); }
    }
    var pw = pista.scrollWidth, vw = vista.clientWidth, x = p * pw;
    ahora.style.transform = "translateX(" + x.toFixed(1) + "px)";
    var tx = pw > vw ? Math.max(0, Math.min(x - vw * 0.4, pw - vw)) : 0;
    pista.style.transform = "translateX(" + (-tx).toFixed(1) + "px)";
  }

  /* ---------- Un solo reloj para la sala ---------- */
  function sala() {
    reiniciar();
    if (CALMA) {
      faseActual = 2; ficha(2); brazo(160); $("fp-rango").textContent = "160°";
      agenda(0.6, false);
      aviso("dinero", "$ Cita recuperada", "Carlos D. tomó las 17:00 · +" + dinero(PRECIO));
      return;
    }
    var visible = true, corriendo = false, previo = 0, tG = 0, tA = 0;
    function cuadro(t) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (t - (previo || t)) / 1000);
      previo = t;
      tG += dt; tA += dt;
      gonio(tG);
      if (tA > DURA + PAUSA_FIN) { tA = 0; reiniciar(); }
      agenda(Math.min(1, tA / DURA), true);
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
    window.addEventListener("resize", function () { agenda(Math.min(1, tA / DURA), false); }, { passive: true });
    gonio(0); agenda(0, false);
    setTimeout(arrancar, 600);
  }

  /* ---------- Tarjetas: hoyos de la tarjeta de sesiones ---------- */
  document.querySelectorAll(".hoyos").forEach(function (h) {
    var out = [];
    for (var i = 0; i < 10; i++) out.push('<i style="animation-delay:' + (i * 0.04).toFixed(2) + 's"></i>');
    h.innerHTML = out.join("");
  });

  function guardar() { try { sessionStorage.setItem(GUARDADO, JSON.stringify(lista())); } catch (e) {} }
  function textoBoton(si) { return si ? "✓ Ver solución" : "Nos pasa →"; }

  function marcar(k, si) {
    if (!!marcas[k] === si) return;
    if (si) marcas[k] = true; else delete marcas[k];
    var c = carta(k);
    if (c) { c.classList.toggle("marcada", si); c.querySelector(".tj__btn").textContent = textoBoton(si); }
    guardar();
    refrescar(si);
  }

  function refrescar(subio) {
    var n = lista().length;
    $("conteo-n").textContent = n;
    $("conteo-ir").hidden = n === 0;
    $("manif-n").textContent = n;
    $("manif-txt").textContent = n === 1 ? "problema marcado" : "problemas marcados";
    if (subio) { var m = $("manif"); m.classList.remove("salta"); void m.offsetWidth; m.classList.add("salta"); }
    plan();
    flotante();
  }

  /* ---------- La ficha (modal) ---------- */
  var dlg = $("ficha"), actual = null;
  function abrir(k) {
    var c = carta(k);
    if (!c) return;
    if (!marcas[k]) { marcar(k, true); track("clic", "problemas:nos-pasa-" + k); }
    else track("clic", "problemas:reabrir-" + k);
    actual = k;
    $("ficha-tag").textContent = c.querySelector(".tj__top span:last-child").textContent;
    $("ficha-frase").textContent = c.querySelector(".tj__frase").textContent;
    $("ficha-cuerpo").innerHTML = c.querySelector(".sol").innerHTML;
    $("ficha-plan").textContent = "Ver su plan (" + lista().length + ") ↓";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
  }
  function cerrar() { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  function irA(id) { var d = $(id); if (d) d.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "start" }); }

  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.getAttribute("data-abrir")); });
  });
  $("ficha-x").addEventListener("click", cerrar);
  $("ficha-otro").addEventListener("click", function () {
    cerrar();
    var sig = ORDEN.filter(function (k) { return !marcas[k]; })[0];
    var c = sig ? carta(sig) : null;
    if (c) {
      if (c.offsetParent === null) $("tarjetas-mas").click();
      c.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "center" });
      c.querySelector(".tj__btn").focus({ preventScroll: true });
    }
  });
  $("ficha-plan").addEventListener("click", function () { cerrar(); track("clic", "problemas:ficha-plan"); irA("plan"); });
  $("ficha-quitar").addEventListener("click", function () { if (actual) marcar(actual, false); cerrar(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrar(); });

  $("tarjetas-mas").addEventListener("click", function () {
    $("tarjetas").classList.remove("compacta");
    this.remove();
    track("clic", "problemas:ver-mas");
  });

  /* ---------- 2 · Plan de tratamiento ---------- */
  function mensajePlan() {
    var l = lista(), partes = ["Hola Bodgar. Vi la página de fisioterapia"];
    if (l.length) {
      partes[0] += " y marqué estos problemas:";
      l.forEach(function (k) { partes.push("- " + PROB[k].nombre); });
      partes.push("Me interesaría empezar por: " + PROB[l[0]].empezar + ".");
    } else partes[0] += " y quiero revisar nuestro proceso.";
    if (estimado) partes.push("Mi estimado: ~" + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    return partes.join("\n");
  }

  function plan() {
    var l = lista(), n = l.length;
    $("plan-titulo").textContent = n === 0
      ? "Marquen arriba lo que les pasa y aquí aparece su plan."
      : n === 1 ? "Marcaron 1 problema. Tiene tratamiento."
      : "Marcaron " + n + " problemas. Los " + n + " se resuelven con el mismo sistema.";
    $("plan-intro").textContent = n
      ? "Esto es lo que construiría, lo que ganaría la clínica y por dónde empezaría yo."
      : "Un solo sistema, construido alrededor de su clínica. Empezamos por lo que más dinero o tiempo les cuesta.";
    $("receta-folio").textContent = "Exp. FIS-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("receta-vacia").hidden = n > 0;
    $("receta-lista").innerHTML = l.map(function (k, i) {
      var p = PROB[k];
      return '<li style="animation-delay:' + (i * 0.06) + 's"><span class="n">' + (i + 1) + "</span>" +
        '<div><span class="k">Lo que les pasa</span><b>' + esc(p.nombre) + '</b><button type="button" data-reabrir="' + k + '">Ver la solución</button></div>' +
        '<div><span class="k">Tratamiento: lo que construyo</span><p>' + esc(p.construye) + "</p></div>" +
        '<div><span class="k">Resultado esperado</span><p class="g">' + esc(p.gana) + "</p></div></li>";
    }).join("");
    $("receta-inicio").hidden = n === 0;
    if (n) { $("receta-primero").textContent = PROB[l[0]].empezar; $("receta-porque").textContent = PROB[l[0]].porque; }

    var tipos = {};
    l.forEach(function (k) { tipos[PROB[k].tipo] = true; });
    document.querySelectorAll("#ganas li").forEach(function (li) { li.classList.toggle("activo", !!tipos[li.getAttribute("data-tipo")]); });

    $("ruta-1").textContent = n ? PROB[l[0]].empezar : "Un solo flujo";
    $("ruta-1p").textContent = n
      ? "En producción con su equipo real. Medimos antes y después: si no ahorra o genera, no seguimos."
      : "En producción, con su equipo real. Medimos antes y después.";
    var resto = l.slice(1).filter(function (k) { return k !== "portal"; });
    $("ruta-2").textContent = resto.length ? resto.map(function (k) { return PROB[k].nombre; }).join(" · ") : "El siguiente proceso";
    $("ruta-2p").textContent = resto.length
      ? "Lo demás que marcaron, uno por uno y solo si el primero funcionó. Mismo sistema, sin rehacer nada."
      : "Solo si el primero funcionó. Mismo sistema, otra parte de la clínica.";
    var portalPrimero = l[0] === "portal";
    $("ruta-3").textContent = portalPrimero ? "Ejercicios y evolución" : "Portal del paciente";
    $("ruta-3p").textContent = portalPrimero
      ? "El paciente ve su plan y su avance en el mismo portal. Más adherencia, menos abandono."
      : "Citas, sesiones y ejercicios en su celular. Menos mensajes a recepción.";

    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
    $("plan-wa-txt").textContent = n ? (n === 1 ? "Quiero resolver este problema" : "Quiero resolver estos " + n + " problemas") : "Revisemos nuestro proceso";
  }
  $("receta-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-reabrir]");
    if (b) abrir(b.getAttribute("data-reabrir"));
  });

  /* ---------- Plan flotante ---------- */
  var vistos = {};
  function flotante() {
    var m = $("manif");
    var mostrar = lista().length > 0 && !vistos.plan && !vistos.escribir && !vistos.inicio;
    if (mostrar === m.classList.contains("visible")) return;
    if (mostrar) { m.hidden = false; requestAnimationFrame(function () { m.classList.add("visible"); }); }
    else m.classList.remove("visible");
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vistos[e.target.id] = e.isIntersecting; });
      flotante();
    }, { rootMargin: "-20% 0px -20% 0px" });
    ["inicio", "plan", "escribir"].forEach(function (id) { io.observe($(id)); });
  }

  /* ---------- 2 · Diagnóstico económico ---------- */
  // [etiqueta, inicial, mín, máx, paso, formato]; "ticket" es compartido.
  var FUGAS = {
    cancel: { t: "Cancelaciones que no se rellenan", usa: true,
      campos: [["Cancelaciones al mes", 18, 0, 300, 1], ["¿Cuántas quedan vacías?", 10, 0, 300, 1]],
      f: function (v, tk) { return Math.min(v[0], v[1]) * tk; },
      det: function (v) { return Math.min(v[0], v[1]) + " horas vacías al mes"; } },
    abandono: { t: "Pacientes que abandonan el tratamiento", usa: true,
      campos: [["Pacientes que abandonan al mes", 4, 0, 80, 1], ["Sesiones que les faltaban, en promedio", 5, 1, 30, 1]],
      f: function (v, tk) { return v[0] * v[1] * tk; },
      det: function (v) { return v[0] * v[1] + " sesiones que no se dieron"; } },
    leads: { t: "Prospectos que preguntan y no agendan",
      campos: [["Personas que preguntan al mes", 80, 5, 800, 5], ["¿Cuántas iniciaron tratamiento?", 6, 0, 200, 1], ["Valor de un tratamiento", 4000, 500, 40000, 500, "$"]],
      f: function (v) { return Math.round(v[1] * 0.5) * v[2]; },
      det: function (v) { var e = Math.round(v[1] * 0.5); return "si de " + v[1] + " pasaran a " + (v[1] + e) + " pacientes nuevos"; } },
    paquetes: { t: "Paquetes que terminan sin seguimiento",
      campos: [["Paquetes que terminan al mes", 12, 0, 300, 1], ["¿Cuántos debían continuar?", 3, 0, 300, 1], ["Valor de un paquete", 5000, 500, 30000, 500, "$"]],
      f: function (v) { return Math.min(v[0], v[1]) * v[2]; },
      det: function (v) { return Math.min(v[0], v[1]) + " pacientes sin revisión de continuidad"; } },
    ocupacion: { t: "Horarios con baja ocupación", usa: true,
      campos: [["Horas de terapia disponibles a la semana", 120, 10, 1000, 10], ["Porcentaje que se ocupa", 70, 10, 100, 5, "%"]],
      f: function (v, tk) { return v[0] * (1 - v[1] / 100) * 4.3 * tk; },
      det: function (v) { return Math.round(v[0] * (1 - v[1] / 100) * 4.3) + " horas libres al mes"; } },
    autoriza: { t: "Autorizaciones que vencen", usa: true,
      campos: [["Autorizaciones que vencen al mes sin renovarse", 3, 0, 60, 1], ["Sesiones pendientes en cada una", 4, 1, 20, 1]],
      f: function (v, tk) { return v[0] * v[1] * tk; },
      det: function (v) { return v[0] * v[1] + " sesiones que no se cobran"; } }
  };
  var dlgDiag = $("diag"), diagSel = [], diagRes = {};
  function fmt(v, tipo) { return tipo === "$" ? dinero(v) : tipo === "%" ? v + "%" : (+v).toLocaleString("es-MX"); }
  function rango(id, c) {
    return '<label class="rango"><span>' + c[0] + ' <output data-o="' + id + '">' + fmt(c[1], c[5]) + "</output></span>" +
      '<input type="range" id="' + id + '" data-fmt="' + (c[5] || "") + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" value="' + c[1] + '"></label>';
  }
  function armarDiag() {
    var html = [], ticket = diagSel.some(function (k) { return FUGAS[k].usa; });
    if (ticket) html.push('<div class="diag__fila diag__fila--ticket">' + rango("d-ticket", ["Precio promedio por sesión", 650, 200, 3000, 50, "$"]) + "</div>");
    diagSel.forEach(function (k) {
      html.push('<fieldset class="diag__fila"><legend>' + FUGAS[k].t + "</legend>" +
        FUGAS[k].campos.map(function (c, i) { return rango("d-" + k + "-" + i, c); }).join("") +
        '<p class="diag__res" id="r-' + k + '"></p></fieldset>');
    });
    $("diag-filas").innerHTML = html.join("");
  }
  function calcDiag() {
    var tk = $("d-ticket") ? +$("d-ticket").value : 0, total = 0;
    diagSel.forEach(function (k) {
      var v = FUGAS[k].campos.map(function (c, i) { return +$("d-" + k + "-" + i).value; });
      var m = FUGAS[k].f(v, tk);
      diagRes[k] = m; total += m;
      $("r-" + k).innerHTML = "≈ <b>" + dinero(m) + "/mes</b> · " + FUGAS[k].det(v);
    });
    $("diag-num").textContent = "~" + dinero(total);
    estimado = { mes: total, tipo: "capacidad no aprovechada (" + diagSel.map(function (k) { return FUGAS[k].t.toLowerCase(); }).join(", ") + ")" };
    var partes = ["Hola Bodgar. Hice el diagnóstico económico en la página de fisioterapia:"];
    diagSel.forEach(function (k) { partes.push("- " + FUGAS[k].t + ": ≈ " + dinero(diagRes[k]) + "/mes"); });
    partes.push("Total aproximado: " + dinero(total) + "/mes.");
    partes.push("Quiero solicitar el diagnóstico sin costo para ver cuánto sí se podría atacar.");
    $("diag-wa").href = WA + encodeURIComponent(partes.join("\n"));
    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
  }
  $("diag-abrir").addEventListener("click", function () {
    diagSel = Array.prototype.map.call(document.querySelectorAll("#checks input:checked"), function (i) { return i.value; });
    $("checks-aviso").hidden = diagSel.length > 0;
    if (!diagSel.length) return;
    track("clic", ("cuanto-cuesta:calcular-" + diagSel.join("-")).slice(0, 80));
    armarDiag(); calcDiag();
    if (typeof dlgDiag.showModal === "function") dlgDiag.showModal(); else dlgDiag.setAttribute("open", "");
    dlgDiag.scrollTop = 0;
  });
  $("diag-filas").addEventListener("input", function (e) {
    var o = document.querySelector('output[data-o="' + e.target.id + '"]');
    if (o) o.textContent = fmt(e.target.value, e.target.getAttribute("data-fmt"));
    calcDiag();
  });
  function cerrarDiag() { if (typeof dlgDiag.close === "function") dlgDiag.close(); else dlgDiag.removeAttribute("open"); }
  $("diag-x").addEventListener("click", cerrarDiag);
  $("diag-cerrar").addEventListener("click", cerrarDiag);
  dlgDiag.addEventListener("click", function (e) { if (e.target === dlgDiag) cerrarDiag(); });
  $("checks").addEventListener("change", function () { $("checks-aviso").hidden = true; });

  /* ---------- Formulario → WhatsApp ---------- */
  var form = $("form");
  function mensajeForm() {
    var v = function (n) { var e = form.elements[n]; return (e && e.value || "").trim(); };
    var hoy = form.querySelector('input[name="hoy"]:checked');
    var partes = ["Hola Bodgar. Vi la página de fisioterapia."];
    if (v("nombre")) partes.push("Soy " + v("nombre") + (v("clinica") ? ", de " + v("clinica") : "") + ".");
    else if (v("clinica")) partes.push("Escribo de " + v("clinica") + ".");
    if (hoy) partes.push("Hoy lo llevamos en: " + hoy.value + ".");
    var l = lista();
    if (l.length) partes.push("Problemas que marqué: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".");
    if (estimado) partes.push("Mi estimado: " + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    partes.push("Lo que queremos dejar de hacer a mano: " + v("proceso"));
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
    location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Clínica de fisioterapia") + "&body=" + encodeURIComponent(mensajeForm());
  });

  /* ---------- ?problema= : esa tarjeta primero ---------- */
  var q = new URLSearchParams(location.search);
  var clave = ALIAS[(q.get("problema") || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")];
  if (clave) {
    var c = carta(clave), padre = $("tarjetas");
    if (c && padre.firstElementChild !== c) padre.insertBefore(c, padre.firstElementChild);
    if (c) c.classList.add("destacado");
  }

  /* ---------- Arranque ---------- */
  sala();
  lista().forEach(function (k) {
    var c = carta(k);
    if (c) { c.classList.add("marcada"); c.querySelector(".tj__btn").textContent = textoBoton(true); }
  });
  refrescar(false);
})();
