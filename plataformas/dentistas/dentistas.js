/* Dentistas · /plataformas/dentistas/
 *
 * El plan de tratamiento de Laura (presupuesto → aceptado → tres fases
 * en el odontograma), la agenda viva de dos sillones (una cancelación que
 * la lista de espera recupera), las tarjetas de problema que abren su
 * solución, el celular del paciente y del consultorio, el plan armado con
 * lo marcado y el diagnóstico económico.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del mensaje de WhatsApp que el consultorio revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa tarjeta (enlace de correo frío).
 */
(function () {
  "use strict";

  var WA = "https://wa.me/525527149106?text=";
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GUARDADO = "bd_dentistas_marcas";
  var PAGINA = "dentistas";

  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function dinero(n) { return "$" + Math.round(n).toLocaleString("es-MX"); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Problemas: orden = por dónde empezaría ---------- */
  var PROB = {
    presupuestos: {
      nombre: "Presupuestos que no regresan", tipo: "recupera",
      construye: "Cada presupuesto con sus fases y vigencia; recordatorio al paciente o aviso a recepción cuando no hay respuesta.",
      gana: "Pacientes que dijeron «lo pienso» y sí regresan.",
      empezar: "Seguimiento de presupuestos",
      porque: "Es dinero que ya está sobre la mesa: el paciente ya vino, ya lo valoraste y ya sabe el precio. Se mide desde el primer mes: cuántos presupuestos se aceptaron."
    },
    cancelaciones: {
      nombre: "Sillones vacíos por cancelaciones y faltas", tipo: "recupera",
      construye: "Confirmación de un día antes con botón, lista de espera que se avisa sola y anticipo para quien falta seguido.",
      gana: "Horas de sillón que se vuelven a vender.",
      empezar: "Confirmación de citas y lista de espera",
      porque: "Cada hora vacía ya está pagada (asistente, renta, equipo). Se mide cada semana: cuántos huecos se volvieron a llenar."
    },
    ortodoncia: {
      nombre: "Controles de ortodoncia que no se dan", tipo: "recupera",
      construye: "Plan de cada paciente de ortodoncia: mes en que va, controles, pagos y saldo; lista de quién no ha agendado.",
      gana: "Mensualidades al corriente y tratamientos que terminan a tiempo.",
      empezar: "Ortodoncia: controles y mensualidades",
      porque: "Es ingreso recurrente: cada control que no se da es una mensualidad que no entra ese mes."
    },
    fases: {
      nombre: "Tratamientos que se quedan a medias", tipo: "retiene",
      construye: "Plan de tratamiento por fases en el expediente, con aviso cuando la siguiente fase no tiene fecha.",
      gana: "Tratamientos terminados y fases que sí se cobran.",
      empezar: "Tratamientos por fases que no se olvidan",
      porque: "La fase que falta casi siempre es la más cara (la corona, la prótesis), y el paciente ya aceptó hacerla."
    },
    limpiezas: {
      nombre: "Pacientes que no regresan a su limpieza", tipo: "crece",
      construye: "Recordatorios de limpieza y revisión con los intervalos que define el dentista, con botón para agendar.",
      gana: "Agenda que se llena con pacientes que ya confían en ti.",
      empezar: "Recordatorios de limpieza y revisión",
      porque: "La base de pacientes ya existe: es de lo más barato de activar y se mide desde la primera tanda de recordatorios."
    },
    leads: {
      nombre: "No sabes qué canal trae pacientes", tipo: "capta",
      construye: "Seguimiento de anuncio → WhatsApp → valoración → presupuesto → tratamiento, por canal.",
      gana: "Saber en qué invertir y en qué paso se pierden.",
      empezar: "De prospecto a tratamiento, medido",
      porque: "Si ya inviertes en anuncios, saber cuál trae pacientes que aceptan su presupuesto cambia en qué gastas desde el primer mes."
    },
    laboratorio: {
      nombre: "Trabajos de laboratorio que no llegan a tiempo", tipo: "libera",
      construye: "Orden de cada trabajo con fecha prometida y la cita en que se coloca; aviso un día antes si no se ha recibido.",
      gana: "Cero citas perdidas por un trabajo que no llegó.",
      empezar: "Control de trabajos de laboratorio",
      porque: "Es pequeño de construir y evita la peor cita del día: el paciente en el sillón y la corona sin llegar."
    },
    especialistas: {
      nombre: "Porcentajes de especialistas calculados a mano", tipo: "libera",
      construye: "Cada tratamiento con quién lo hizo, lo cobrado y lo pagado; el corte de cada especialista sale solo.",
      gana: "Cortes que cuadran a la primera.",
      empezar: "Corte automático de especialistas",
      porque: "Libera horas de recepción cada mes y quita la discusión de fin de mes con los especialistas."
    },
    portal: {
      nombre: "Recepción contestando WhatsApp todo el día", tipo: "libera",
      construye: "Portal del paciente: próxima cita con confirmación, presupuesto por fases, pagos, indicaciones y comprobantes.",
      gana: "Una recepción que atiende en lugar de contestar mensajes.",
      empezar: "Portal del paciente",
      porque: "Quita las preguntas repetidas desde el primer día y el paciente sabe en qué va su tratamiento."
    },
    expediente: {
      nombre: "Expediente, radiografías y consentimientos dispersos", tipo: "libera",
      construye: "Expediente único con odontograma, notas, radiografías, presupuestos y consentimientos firmados en pantalla, con permisos por rol.",
      gana: "Todo el paciente en una pantalla, en cualquier sillón.",
      empezar: "Expediente único con odontograma",
      porque: "Antes de sumar sillones o dentistas, conviene que todos trabajen sobre el mismo paciente."
    }
  };
  var ORDEN = Object.keys(PROB);
  var ALIAS = {
    presupuestos: "presupuestos", presupuesto: "presupuestos", cotizaciones: "presupuestos", seguimiento: "presupuestos",
    cancelaciones: "cancelaciones", cancelacion: "cancelaciones", citas: "cancelaciones", agenda: "cancelaciones", faltas: "cancelaciones", sillon: "cancelaciones", espera: "cancelaciones",
    ortodoncia: "ortodoncia", brackets: "ortodoncia", orto: "ortodoncia", mensualidades: "ortodoncia",
    fases: "fases", tratamientos: "fases", endodoncia: "fases", corona: "fases", inconclusos: "fases",
    limpiezas: "limpiezas", limpieza: "limpiezas", recall: "limpiezas", base: "limpiezas", revision: "limpiezas",
    leads: "leads", captacion: "leads", marketing: "leads", instagram: "leads", anuncios: "leads",
    laboratorio: "laboratorio", lab: "laboratorio", protesis: "laboratorio",
    especialistas: "especialistas", comisiones: "especialistas", porcentajes: "especialistas", corte: "especialistas",
    portal: "portal", recepcion: "portal", pacientes: "portal",
    expediente: "expediente", odontograma: "expediente", radiografias: "expediente", consentimientos: "expediente"
  };

  var marcas = {};
  try { (JSON.parse(sessionStorage.getItem(GUARDADO) || "[]") || []).forEach(function (k) { if (PROB[k]) marcas[k] = true; }); } catch (e) {}
  var estimado = null;

  function lista() { return ORDEN.filter(function (k) { return marcas[k]; }); }
  function carta(k) { return document.querySelector('.tj[data-card="' + k + '"]'); }

  /* ---------- Avisos del héroe ---------- */
  var hud = $("hud"), hudTimer = null;
  function aviso(tipo, k, t) {
    $("hud-k").textContent = k;
    $("hud-t").textContent = t;
    hud.className = "aviso-hud visible" + (tipo ? " hud--" + tipo : "");
    clearTimeout(hudTimer);
    if (!CALMA) hudTimer = setTimeout(function () { hud.classList.remove("visible"); }, 2400);
  }

  /* ---------- El plan de Laura, en el odontograma ---------- */
  function diente(n) { return document.querySelector('.diente[data-n="' + n + '"]'); }
  function numero(n, si) { var t = document.querySelector('.num[data-n="' + n + '"]'); if (t) t.classList.toggle("activo", si); }
  function fase(i, p, clase) {
    var f = $("f" + i);
    f.style.setProperty("--p", p);
    f.classList.remove("lista", "pendiente");
    if (clase) f.classList.add(clase);
  }
  function estado(txt, clase) { var e = $("estado"); e.textContent = txt; e.className = "consulta__estado" + (clase ? " " + clase : ""); }
  function pagado(txt) { $("presu-pag").textContent = txt ? "· " + txt : ""; }

  function planInicial() {
    document.querySelectorAll(".diente").forEach(function (d) { d.setAttribute("class", "diente"); });
    document.querySelectorAll(".num.activo").forEach(function (t) { t.classList.remove("activo"); });
    ["16", "26"].forEach(function (n) { diente(n).classList.add("caries"); numero(n, true); });
    diente("36").classList.add("endo"); numero("36", true);
    [1, 2, 3].forEach(function (i) { fase(i, 0); });
    $("sello").classList.remove("visible");
    $("barrido").classList.remove("activo");
    estado("Presupuesto entregado");
    pagado("");
  }
  var GUION = [
    [0.4, function (v) { if (v) aviso("", "↗ Presupuesto entregado", "Laura G. · 3 fases · $12,600"); }],
    [2.6, function (v) { estado("Sin respuesta · 3 días", "e-alerta"); if (v) aviso("alerta", "⏱ 3 días sin respuesta", "Se le envió el recordatorio que aprobaste"); }],
    [5.0, function (v) { estado("Aceptado", "e-ok"); $("sello").classList.add("visible"); pagado("$1,300 de anticipo"); if (v) aviso("dinero", "✓ Aceptó el plan", "Anticipo $1,300 · fase 1 agendada"); }],
    [7.0, function () {
      $("sello").classList.remove("visible");
      var b = $("barrido"); b.classList.remove("activo"); void b.getBoundingClientRect(); b.classList.add("activo");
      document.querySelectorAll(".diente").forEach(function (d) { d.classList.add("limpio"); });
      fase(1, 0.6);
    }],
    [8.4, function (v) {
      ["16", "26"].forEach(function (n) { diente(n).classList.remove("caries"); diente(n).classList.add("hecho"); numero(n, false); });
      fase(1, 1, "lista"); estado("En tratamiento", "e-ok"); pagado("$2,600 pagado");
      if (v) aviso("", "✓ Fase 1 terminada", "Limpieza y 2 resinas · $2,600");
    }],
    [10.2, function (v) { diente("36").classList.add("trabajando"); fase(2, 0.5); if (v) aviso("", "✓ Endodoncia · cita 1 de 2", "Laura G. · pieza 36"); }],
    [12.4, function (v) { diente("36").classList.add("hecho"); fase(2, 1, "lista"); pagado("$7,100 pagado"); if (v) aviso("", "✓ Endodoncia terminada", "Cita 2 de 2 · $4,500"); }],
    [14.4, function (v) { fase(3, 0, "pendiente"); estado("Corona sin fecha", "e-alerta"); if (v) aviso("alerta", "⚠ La corona del 36 no tiene fecha", "Pasaron 7 días · aviso a recepción"); }],
    [16.6, function (v) { fase(3, 0.4); estado("Corona agendada", "e-ok"); if (v) aviso("", "📅 Corona agendada", "Jueves 27 · el laboratorio ya la tiene"); }],
    [18.8, function (v) {
      diente("36").classList.add("coronado"); numero("36", false);
      fase(3, 1, "lista"); estado("Tratamiento terminado", "e-fin"); pagado("pagado completo");
      if (v) aviso("dinero", "$ Tratamiento terminado", "$12,600 cobrado · 3 de 3 fases");
    }],
    [21.2, function (v) { if (v) aviso("", "↻ Limpieza en 6 meses", "Recordatorio programado para mayo"); }]
  ];
  var CICLO_PLAN = 25;
  var guionI = 0;
  function plan_t(t) {
    while (guionI < GUION.length && GUION[guionI][0] <= t) { GUION[guionI][1](true); guionI++; }
  }

  /* ---------- Agenda viva: dos sillones ---------- */
  var HORAS = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  // Por hora: [sillón 1, sillón 2]. ev = aviso cuando la línea pasa por ahí.
  var CITAS = [
    [{ n: "Laura G.", e: "endodoncia 2 de 2" }, { n: "Diego M.", e: "control de ortodoncia" }],
    [{ n: "Pedro R.", e: "limpieza · volvió a los 6 meses", ev: ["", "↻ Regresó a su limpieza", "Pedro R. · recordatorio de 6 meses"] }, { n: "Andrea P.", e: "limpieza" }],
    [{ n: "Valeria S.", e: "control · mes 14 de 24" }, { n: "Dr. Ramírez", e: "endodoncia · Raúl C." }],
    [{ n: "Sofía L.", e: "corona · lab ✓ recibida", ev: ["", "✓ Trabajo de laboratorio a tiempo", "Corona de Sofía L. · recibida ayer"] }, { n: "Carla V.", e: "valoración de ortodoncia", ev: ["", "↗ Presupuesto entregado", "Carla V. · ortodoncia · $22,000"] }],
    [{ n: "Comida", e: "", libre: true }, { n: "Comida", e: "", libre: true }],
    [{ n: "Jorge T.", e: "valoración · llegó por Instagram" }, { n: "Mónica S.", e: "resina · pagó anticipo", ev: ["", "✓ Anticipo cobrado", "Mónica S. · regla de 2 faltas"] }],
    [{ n: "Marco T.", e: "endodoncia 1 de 2" }, { n: "Elena T.", e: "resinas · aceptó presupuesto", ev: ["dinero", "$ Presupuesto aceptado", "Elena T. · $3,900 tras el recordatorio"], suma: 3900 }],
    [{ n: "Iván R.", e: "control de ortodoncia" }, { n: "Raúl C.", e: "extracción" }],
    [{ n: "Sofía R.", e: "limpieza" }, { n: "Libre", e: "", libre: true }]
  ];
  var CANCELA = [1, 1], BASE_REC = 3600, PRECIO = 900, DURA = 30, PAUSA_FIN = 2.5;
  var pista = $("ag-pista"), vista = $("ag-vista"), ahora = $("ag-ahora"), celdas = [];
  CITAS.forEach(function (par, h) {
    par.forEach(function (c, s) {
      var d = document.createElement("div");
      d.className = "cita" + (s ? " s2" : "") + (c.libre ? " libre" : "");
      d.innerHTML = '<span class="cita__h">' + HORAS[h] + "<b>S" + (s + 1) + '</b></span><span class="cita__n"></span><span class="cita__e"></span>';
      pista.insertBefore(d, ahora);
      celdas.push({ el: d, c: c, h: h, s: s });
    });
  });
  function celda(h, s) { return celdas[h * 2 + s]; }

  var est = {};
  function reiniciar() {
    est = { hechas: {}, cancel: 0, ses: 0, rec: BASE_REC };
    celdas.forEach(function (x) {
      x.el.className = "cita" + (x.s ? " s2" : "") + (x.c.libre ? " libre" : "");
      x.el.querySelector(".cita__n").textContent = x.c.n;
      x.el.querySelector(".cita__e").textContent = x.c.e;
    });
    $("ag-ses").textContent = "0";
    $("ag-rec").textContent = dinero(BASE_REC);
  }
  function salta(id) { var b = $(id); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta"); }
  function poner(x, clase, n, e) {
    x.el.className = "cita" + (x.s ? " s2" : "") + " " + clase;
    if (n) x.el.querySelector(".cita__n").textContent = n;
    if (e) x.el.querySelector(".cita__e").textContent = e;
  }
  var avisosAgenda = true;
  function agenda(p, conAvisos) {
    var col = Math.floor(p * HORAS.length);
    celdas.forEach(function (x, i) {
      if (x.h >= col || est.hechas[i] || x.c.libre) return;
      est.hechas[i] = true;
      x.el.classList.remove("cancelada", "esperando");
      x.el.classList.add("atendida");
      est.ses++;
      $("ag-ses").textContent = est.ses;
      if (x.c.suma) { est.rec += x.c.suma; $("ag-rec").textContent = dinero(est.rec); }
      if (conAvisos) {
        salta("ag-ses");
        if (x.c.suma) salta("ag-rec");
        if (x.c.ev && avisosAgenda) aviso.apply(null, x.c.ev);
      }
    });
    // La cancelación: 10:00 del sillón 2 se libera y se vuelve a llenar antes de su hora.
    var cx = celda(CANCELA[0], CANCELA[1]);
    if (est.cancel < 1 && p > 0.02) {
      est.cancel = 1;
      poner(cx, "cancelada", null, "canceló a las 8:40");
      if (conAvisos && avisosAgenda) aviso("alerta", "↺ Canceló Andrea P.", "10:00 sillón 2 · aviso a 3 en lista de espera");
    }
    if (est.cancel < 2 && p > 0.05) { est.cancel = 2; poner(cx, "esperando", "Lista de espera", "avisando a 3 pacientes…"); }
    if (est.cancel < 3 && p > 0.085) {
      est.cancel = 3;
      poner(cx, "recuperada", "Luis G.", "tomó el horario ✓");
      est.rec += PRECIO;
      $("ag-rec").textContent = dinero(est.rec);
      if (conAvisos) { salta("ag-rec"); if (avisosAgenda) aviso("dinero", "$ Hora de sillón recuperada", "Luis G. tomó las 10:00 · +" + dinero(PRECIO)); }
    }
    var pw = pista.scrollWidth, vw = vista.clientWidth, x = p * pw;
    ahora.style.transform = "translateX(" + x.toFixed(1) + "px)";
    var tx = pw > vw ? Math.max(0, Math.min(x - vw * 0.4, pw - vw)) : 0;
    pista.style.transform = "translateX(" + (-tx).toFixed(1) + "px)";
  }
  pista.style.transition = "none";

  /* ---------- Un solo reloj para el héroe ---------- */
  // El plan de Laura es la historia principal; la agenda solo avisa mientras el plan descansa.
  function heroe() {
    reiniciar();
    planInicial();
    if (CALMA) {
      GUION.forEach(function (g) { g[1](false); });
      agenda(0.75, false);
      hud.className = "aviso-hud visible hud--dinero";
      $("hud-k").textContent = "$ Tratamiento terminado";
      $("hud-t").textContent = "$12,600 cobrado · 3 de 3 fases";
      return;
    }
    var visible = true, corriendo = false, previo = 0, tP = 0, tA = 0;
    function cuadro(t) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (t - (previo || t)) / 1000);
      previo = t;
      tP += dt; tA += dt;
      if (tP > CICLO_PLAN) { tP = 0; guionI = 0; planInicial(); }
      avisosAgenda = tP > 22.5 || tP < 0.2;
      plan_t(tP);
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
    agenda(0, false);
    setTimeout(arrancar, 500);
  }

  /* ---------- Tarjetas ---------- */
  document.querySelectorAll(".hoyos").forEach(function (h) {
    var out = [];
    for (var i = 0; i < 10; i++) out.push('<i style="animation-delay:' + (i * 0.04).toFixed(2) + 's"></i>');
    h.innerHTML = out.join("");
  });

  function guardar() { try { sessionStorage.setItem(GUARDADO, JSON.stringify(lista())); } catch (e) {} }
  function textoBoton(si) { return si ? "✓ En tu plan · ver" : "Ver cómo se resuelve →"; }

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
    var msg = WA + encodeURIComponent(mensajeDiag());
    $("final-wa").href = msg; $("wa-flota").href = msg;
    if (subio) { var m = $("manif"); m.classList.remove("salta"); void m.offsetWidth; m.classList.add("salta"); }
    plan();
    flotante();
  }

  /* ---------- La ficha (modal) ---------- */
  var dlg = $("ficha"), actual = null;
  function abrir(k) {
    var c = carta(k);
    if (!c) return;
    if (!marcas[k]) { marcar(k, true); track("clic", "problemas:ver-" + k); }
    else track("clic", "problemas:reabrir-" + k);
    actual = k;
    $("ficha-tag").textContent = c.querySelector(".tj__top span:last-child").textContent;
    $("ficha-frase").textContent = c.querySelector(".tj__frase").textContent;
    $("ficha-cuerpo").innerHTML = c.querySelector(".sol").innerHTML;
    $("ficha-plan").textContent = "Ver tu plan (" + lista().length + ") ↓";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
  }
  function cerrar() { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  function irA(id) { var d = $(id); if (d) d.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "start" }); }

  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); abrir(b.getAttribute("data-abrir")); });
  });
  document.querySelectorAll(".tj[data-card]").forEach(function (c) {
    c.addEventListener("click", function () { abrir(c.getAttribute("data-card")); });
  });
  $("ficha-x").addEventListener("click", cerrar);
  $("ficha-otro").addEventListener("click", function () {
    cerrar();
    var sig = ORDEN.filter(function (k) { return !marcas[k]; })[0];
    var c = sig ? carta(sig) : null;
    if (c) {
      if (c.offsetParent === null && $("tarjetas-mas")) $("tarjetas-mas").click();
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

  /* ---------- 4 · Plan de tratamiento ---------- */
  function mensajePlan() {
    var l = lista(), partes = ["Hola Bodgar. Vi la página de " + PAGINA];
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
    var crece = l.some(function (k) { return PROB[k].tipo === "crece"; });
    var cosa = crece ? (n === 1 ? "punto" : "puntos") : (n === 1 ? "problema" : "problemas");
    $("plan-titulo").textContent = n === 0
      ? "Marca arriba lo que te pasa y aquí aparece tu plan."
      : n === 1 ? "Revisaste 1 " + cosa + ". Tiene tratamiento."
      : "Revisaste " + n + " " + cosa + ". Los " + n + " se resuelven con el mismo sistema.";
    $("plan-intro").textContent = n
      ? "Esto es lo que construiría, lo que ganaría tu consultorio y por dónde empezaría yo."
      : "Un solo sistema, construido alrededor de tu consultorio. Empezamos por lo que más dinero o tiempo te cuesta.";
    $("receta-folio").textContent = "Exp. DEN-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("receta-vacia").hidden = n > 0;
    $("receta-lista").innerHTML = l.map(function (k, i) {
      var p = PROB[k];
      return '<li style="animation-delay:' + (i * 0.06) + 's"><span class="n">' + (i + 1) + "</span>" +
        '<div><span class="k">Lo que te pasa</span><b>' + esc(p.nombre) + '</b><button type="button" data-reabrir="' + k + '">Ver la solución</button></div>' +
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
      ? "En producción con tu equipo real. Medimos antes y después: si no ahorra o genera, no seguimos."
      : "En producción, con tu equipo real. Medimos antes y después.";
    var resto = l.slice(1).filter(function (k) { return k !== "portal"; });
    $("ruta-2").textContent = resto.length ? resto.map(function (k) { return PROB[k].nombre; }).join(" · ") : "El siguiente proceso";
    $("ruta-2p").textContent = resto.length
      ? "Lo demás que marcaste, uno por uno y solo si el primero funcionó. Mismo sistema, sin rehacer nada."
      : "Solo si el primero funcionó. Mismo sistema, otra parte del consultorio.";
    var portalPrimero = l[0] === "portal";
    $("ruta-3").textContent = portalPrimero ? "Presupuestos y fases" : "Portal del paciente";
    $("ruta-3p").textContent = portalPrimero
      ? "El paciente acepta su siguiente fase desde el mismo portal. Más tratamientos terminados."
      : "Citas, presupuesto y pagos en su celular. Menos mensajes a recepción.";

    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
    $("plan-wa-txt").textContent = n ? (n === 1 ? "Quiero resolver este problema" : "Quiero resolver estos " + n + " problemas") : "Revisemos mi consultorio";
  }
  $("receta-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-reabrir]");
    if (b) abrir(b.getAttribute("data-reabrir"));
  });

  /* ---------- Flotantes ---------- */
  var vistos = {};
  function mostrarFlota(el, si) {
    if (si === el.classList.contains("visible")) return;
    if (si) { el.hidden = false; requestAnimationFrame(function () { el.classList.add("visible"); }); }
    else el.classList.remove("visible");
  }
  function flotante() {
    var fuera = !vistos.plan && !vistos.escribir && !vistos.inicio, hay = lista().length > 0;
    mostrarFlota($("manif"), fuera && hay);
    mostrarFlota($("wa-flota"), fuera && !hay);
  }
  function mensajeDiag() {
    var l = lista(), t = "Hola Bodgar. Quiero el diagnóstico de 45 minutos para mi consultorio dental.";
    if (l.length) t += "\nLo que más nos interesó: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".";
    return t;
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vistos[e.target.id] = e.isIntersecting; });
      flotante();
    }, { rootMargin: "-20% 0px -20% 0px" });
    ["inicio", "plan", "escribir"].forEach(function (id) { io.observe($(id)); });
  }

  /* ---------- 2 · El celular ---------- */
  var cel = $("cel"), vistaApp = "paciente", tocoDemo = false;
  var TOUR = [["paciente", "cita"], ["paciente", "presu"], ["paciente", "pagos"], ["paciente", "indic"],
    ["tu", "hoy"], ["tu", "segui"], ["tu", "lab"], ["tu", "corte"]];
  var tourI = 0;
  function toast(t) {
    var n = $("toast");
    n.textContent = t;
    n.classList.add("visible");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { n.classList.remove("visible"); }, 2400);
  }
  function cambiarVista(v) {
    vistaApp = v;
    document.querySelectorAll(".vista-sw [data-vista]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-vista") === v ? "true" : "false"); });
    document.querySelectorAll(".demo__lista").forEach(function (u) { u.hidden = u.getAttribute("data-de") !== v; });
    cel.querySelectorAll(".app").forEach(function (a) { a.hidden = a.getAttribute("data-de") !== v; });
  }
  function ir(p) {
    var app = cel.querySelector('.app[data-de="' + vistaApp + '"]');
    app.querySelectorAll(".pant").forEach(function (s) { s.classList.toggle("activa", s.getAttribute("data-pant") === p); });
    app.querySelectorAll(".app__tabs [data-pant]").forEach(function (b) { b.classList.toggle("activa", b.getAttribute("data-pant") === p); });
    document.querySelectorAll(".demo__lista [data-pant]").forEach(function (b) { b.classList.toggle("activo", b.getAttribute("data-pant") === p); });
    var s = app.querySelector('.pant[data-pant="' + p + '"]');
    if (s) s.scrollTop = 0;
  }
  function tocar(det) {
    if (!tocoDemo) { tocoDemo = true; track("clic", "app:tocado"); }
    if (det) track("clic", "app:" + det);
  }
  document.querySelectorAll(".vista-sw [data-vista]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-vista");
      tocar("vista-" + v);
      cambiarVista(v);
      ir(v === "paciente" ? "cita" : "hoy");
    });
  });
  document.querySelectorAll(".demo__lista [data-pant], .app__tabs [data-pant]").forEach(function (b) {
    b.addEventListener("click", function () { tocar("pantalla-" + b.getAttribute("data-pant")); ir(b.getAttribute("data-pant")); });
  });
  cel.addEventListener("pointerdown", function () { tocar(); });

  function hecho(b, txt) { b.classList.add("hecho"); b.textContent = txt; b.disabled = true; }
  $("cita-si").addEventListener("click", function () { tocar("confirmar"); hecho(this, "✓ Confirmé"); $("cita-cambio").disabled = true; toast("✓ Cita confirmada · recepción ya lo sabe"); });
  $("cita-cambio").addEventListener("click", function () { tocar("cambiar"); toast("Te proponemos 3 horarios nuevos aquí mismo"); });
  $("aceptar-f3").addEventListener("click", function () {
    tocar("aceptar-fase");
    hecho(this, "✓ Fase 3 aceptada");
    $("fase3").classList.add("curso");
    $("fase3-est").textContent = "aceptada · se agenda al llegar del laboratorio";
    toast("✓ Fase 3 aceptada · tu dentista ya lo sabe");
  });
  $("pag-subir").addEventListener("click", function () {
    var b = this;
    tocar("comprobante");
    hecho(b, "Comprobante recibido");
    $("pag-estado").textContent = "Comprobante recibido · en revisión";
    setTimeout(function () {
      $("pag-n").innerHTML = "$7,100 <small>de $12,600</small>";
      $("pag-barra").style.setProperty("--w", "56%");
      $("pag-estado").textContent = "Por pagar: $5,500 · al iniciar la fase 3";
      toast("✓ Pago conciliado · $2,000");
    }, 1600);
  });
  $("hoy-recordar").addEventListener("click", function () {
    var b = this;
    tocar("recordar");
    b.disabled = true; b.textContent = "Enviado";
    toast("Recordatorio enviado a Marco T.");
    setTimeout(function () {
      var li = $("hoy-marco");
      li.className = "hecho";
      li.querySelector("small").textContent = "✓ confirmó por WhatsApp";
      b.outerHTML = '<em class="ok">✓</em>';
      $("hoy-conf").textContent = "12"; $("hoy-pend").textContent = "2";
      toast("✓ Marco T. confirmó su cita");
    }, 1500);
  });
  var aceptados = 41300;
  document.querySelectorAll("[data-seguir]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = +b.getAttribute("data-seguir"), li = b.closest("li");
      tocar("seguir");
      b.disabled = true; b.textContent = "Enviado";
      toast(m === 8200 ? "Recepción tiene la tarea de llamarle hoy" : "Recordatorio enviado");
      if (m === 14500) setTimeout(function () {
        li.className = "hecho";
        li.querySelector("small").textContent = "✓ aceptó la fase 1";
        b.outerHTML = '<em class="ok">+$14,500</em>';
        aceptados += m;
        $("seg-tot").textContent = dinero(aceptados);
        $("seg-barra").style.setProperty("--w", Math.round(aceptados / 900) + "%");
        toast("✓ Carla V. aceptó · +$14,500");
      }, 1700);
    });
  });
  $("lab-recibir").addEventListener("click", function () {
    var li = $("lab-ana");
    tocar("laboratorio");
    li.className = "hecho";
    li.querySelector("small").textContent = "✓ recibida hoy · se coloca a las 13:00";
    this.outerHTML = '<em class="ok">✓ Recibida</em>';
    toast("✓ Recibida · recepción y el dentista ya lo saben");
  });
  $("corte-excel").addEventListener("click", function () { tocar("excel"); toast("En la plataforma real, aquí se descarga el Excel"); });

  var tourT = null, demoVisible = false;
  function tour() {
    clearTimeout(tourT);
    if (tocoDemo || !demoVisible || CALMA) return;
    tourT = setTimeout(function () {
      if (tocoDemo || !demoVisible) return;
      tourI = (tourI + 1) % TOUR.length;
      if (TOUR[tourI][0] !== vistaApp) cambiarVista(TOUR[tourI][0]);
      ir(TOUR[tourI][1]);
      tour();
    }, 3800);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { demoVisible = e[0].isIntersecting; tour(); }, { threshold: 0.4 }).observe(cel);
  }
  ir("cita");

  /* ---------- 3 · Diagnóstico económico ---------- */
  // [etiqueta, inicial, mín, máx, paso, formato]; "ticket" (hora de sillón) es compartido.
  var FUGAS = {
    presu: { t: "Presupuestos que no regresan",
      campos: [["Presupuestos entregados al mes", 20, 1, 400, 1], ["¿Cuántos no regresan?", 12, 0, 400, 1], ["Valor promedio de un presupuesto", 12000, 1000, 150000, 500, "$"]],
      f: function (v) { return Math.round(Math.min(v[0], v[1]) * 0.25) * v[2]; },
      det: function (v) { return "si 1 de cada 4 sin respuesta aceptara: " + Math.round(Math.min(v[0], v[1]) * 0.25) + " tratamientos"; } },
    cancel: { t: "Cancelaciones y faltas", usa: true,
      campos: [["Cancelaciones y faltas al mes", 20, 0, 400, 1], ["¿Cuántas quedan vacías?", 12, 0, 400, 1]],
      f: function (v, tk) { return Math.min(v[0], v[1]) * tk; },
      det: function (v) { return Math.min(v[0], v[1]) + " horas de sillón vacías al mes"; } },
    orto: { t: "Controles de ortodoncia que no se dan",
      campos: [["Pacientes de ortodoncia", 38, 1, 600, 1], ["Controles que no se dan al mes", 6, 0, 600, 1], ["Mensualidad", 900, 200, 5000, 50, "$"]],
      f: function (v) { return Math.min(v[0], v[1]) * v[2]; },
      det: function (v) { return Math.min(v[0], v[1]) + " mensualidades que no entran ese mes"; } },
    fases: { t: "Tratamientos que se quedan a medias",
      campos: [["Tratamientos a medias al mes", 4, 0, 100, 1], ["Valor de la fase que falta", 5500, 500, 60000, 500, "$"]],
      f: function (v) { return v[0] * v[1]; },
      det: function (v) { return v[0] + " fases sin hacer ni cobrar"; } },
    leads: { t: "Prospectos que preguntan y no agendan",
      campos: [["Personas que preguntan al mes", 45, 5, 1000, 5], ["¿Cuántas empiezan tratamiento?", 4, 0, 300, 1], ["Valor de un tratamiento", 12000, 500, 150000, 500, "$"]],
      f: function (v) { return Math.max(1, Math.round(v[1] * 0.5)) * v[2]; },
      det: function (v) { var e = Math.max(1, Math.round(v[1] * 0.5)); return "si de " + v[1] + " pasaran a " + (v[1] + e) + " pacientes nuevos"; } },
    limpiezas: { t: "Pacientes que no regresan a su limpieza",
      campos: [["Pacientes a los que les toca limpieza cada mes", 20, 1, 1000, 1], ["Porcentaje que agendaría con un recordatorio", 30, 1, 90, 1, "%"], ["Precio de la limpieza", 700, 200, 5000, 50, "$"]],
      f: function (v) { return Math.round(v[0] * v[1] / 100) * v[2]; },
      det: function (v) { return Math.round(v[0] * v[1] / 100) + " limpiezas más al mes"; } }
  };
  var dlgDiag = $("diag"), diagSel = [], diagRes = {};
  function fmt(v, tipo) { return tipo === "$" ? dinero(v) : tipo === "%" ? v + "%" : (+v).toLocaleString("es-MX"); }
  function rango(id, c) {
    return '<label class="rango"><span>' + c[0] + ' <output data-o="' + id + '">' + fmt(c[1], c[5]) + "</output></span>" +
      '<input type="range" id="' + id + '" data-fmt="' + (c[5] || "") + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" value="' + c[1] + '"></label>';
  }
  function armarDiag() {
    var html = [], ticket = diagSel.some(function (k) { return FUGAS[k].usa; });
    if (ticket) html.push('<div class="diag__fila diag__fila--ticket">' + rango("d-ticket", ["Lo que deja una hora de sillón", 900, 200, 5000, 50, "$"]) + "</div>");
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
    estimado = { mes: total, tipo: "ingreso no aprovechado (" + diagSel.map(function (k) { return FUGAS[k].t.toLowerCase(); }).join(", ") + ")" };
    var partes = ["Hola Bodgar. Hice el diagnóstico económico en la página de dentistas:"];
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
    var partes = ["Hola Bodgar. Vi la página de dentistas."];
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
    location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Consultorio dental") + "&body=" + encodeURIComponent(mensajeForm());
  });

  /* ---------- Aparecer al bajar ---------- */
  var rvs = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !CALMA) {
    var ioRv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); ioRv.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach(function (n) { ioRv.observe(n); });
  } else rvs.forEach(function (n) { n.classList.add("visto"); });

  /* ---------- ?problema= : esa tarjeta primero ---------- */
  var q = new URLSearchParams(location.search);
  var clave = ALIAS[(q.get("problema") || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")];
  if (clave) {
    var c = carta(clave), padre = $("tarjetas");
    if (c && padre.firstElementChild !== c) padre.insertBefore(c, padre.firstElementChild);
    if (c) c.classList.add("destacado");
  }

  /* ---------- Arranque ---------- */
  heroe();
  lista().forEach(function (k) {
    var c = carta(k);
    if (c) { c.classList.add("marcada"); c.querySelector(".tj__btn").textContent = textoBoton(true); }
  });
  refrescar(false);
})();
