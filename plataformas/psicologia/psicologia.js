/* Psicología · /plataformas/psicologia/
 *
 * La sala que anochece (un día del consultorio, de las 7:30 de la mañana a
 * la medianoche: lo que antes pasaba por el WhatsApp de la psicóloga ahora
 * pasa solo), la semana viva (un horario apartado sin pagar que se libera y
 * la lista de espera recupera), las tarjetas de problema que abren su
 * solución, el celular del paciente y del terapeuta, el plan armado con lo
 * marcado y el diagnóstico económico.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del mensaje de WhatsApp que el terapeuta revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa tarjeta (enlace de correo frío).
 */
(function () {
  "use strict";

  var WA = "https://wa.me/525527149106?text=";
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GUARDADO = "bd_psicologia_marcas";

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
    inasistencias: {
      nombre: "Inasistencias y cancelaciones de último momento", tipo: "recupera",
      construye: "Reserva con pago o anticipo, política de cancelación aceptada al reservar, recordatorio un día antes y liberación de horarios sin pagar.",
      gana: "Menos horas perdidas, sin tener que cobrarlas tú.",
      empezar: "Reservas con pago y política de cancelación",
      porque: "Es lo que más dinero se lleva cada semana y ya está probado en producción: la plataforma de la psicóloga libera sola los horarios que nadie pagó."
    },
    transferencias: {
      nombre: "Transferencias que revisas con capturas", tipo: "recupera",
      construye: "Cobro con tarjeta o transferencia desde la reserva, conciliado contra cada sesión.",
      gana: "Sesiones que sí se cobran y nada de capturas a media noche.",
      empezar: "Cobro y conciliación de transferencias",
      porque: "Ya funciona en la plataforma de la psicóloga, y se nota desde la primera semana: sabes quién pagó sin abrir el banco."
    },
    paquetes: {
      nombre: "Paquetes de sesiones contados en libreta", tipo: "recupera",
      construye: "Paquetes que se descuentan solos con cada sesión; el paciente ve cuántas le quedan y se le ofrece renovar en la última.",
      gana: "Cuentas claras y renovaciones sin hablar de dinero en sesión.",
      empezar: "Paquetes que se descuentan solos",
      porque: "Es pequeño, ya existe en producción y quita una conversación incómoda de cada paquete."
    },
    noche: {
      nombre: "Agendar por WhatsApp de noche", tipo: "libera",
      construye: "Tu enlace de reservas: el paciente ve los horarios que abriste, elige y paga; a ti solo te llega el aviso.",
      gana: "Tus noches de vuelta.",
      empezar: "Reserva en línea con tus horarios",
      porque: "Es la base de todo lo demás, y desde el primer día deja de pasar por tu WhatsApp."
    },
    recurrentes: {
      nombre: "Citas de cada semana agendadas a mano", tipo: "libera",
      construye: "Citas recurrentes que se apartan solas y el enlace de la videollamada dentro del recordatorio.",
      gana: "Una semana armada antes de empezar.",
      empezar: "Citas recurrentes y videollamada",
      porque: "Si tienes muchos pacientes de cada semana, es la forma más rápida de dejar de agendar lo mismo."
    },
    espera: {
      nombre: "Personas a las que les dices que no", tipo: "crece",
      construye: "Lista de espera con los días que le acomodan a cada quien; cuando se libera un horario, el aviso sale y el primero que paga se lo queda.",
      gana: "Una agenda llena que se mantiene llena.",
      empezar: "Lista de espera que se avisa sola",
      porque: "Si tu agenda ya está llena, cada horario que se libera es ingreso que hoy se pierde sin que nadie lo note."
    },
    seguimiento: {
      nombre: "Pacientes que dejan de agendar sin que lo notes", tipo: "retiene",
      construye: "Una lista privada de quién dejó de agendar o terminó su paquete. No escribe por ti ni manda nada automático.",
      gana: "Ningún proceso se pierde por descuido de agenda.",
      empezar: "Aviso privado de continuidad",
      porque: "Lo decides tú, pero necesitas saberlo a tiempo. Es poco código encima de la agenda."
    },
    leads: {
      nombre: "Gente que pregunta el precio y no agenda", tipo: "capta",
      construye: "Enlace de reservas para la primera sesión y registro de dónde llegó cada paciente.",
      gana: "Más primeras sesiones con la misma gente que ya te escribe.",
      empezar: "Primera sesión en línea, medida",
      porque: "Quien ya se decidió, agenda en ese momento. Y sabes qué canal sí te trae pacientes."
    },
    talleres: {
      nombre: "Talleres inscritos por formulario y sin pagar", tipo: "crece",
      construye: "Talleres y grupos con cupo, pago al inscribirse, lista de espera y aviso a tu base.",
      gana: "Ingreso que no depende de sumar horas de consulta.",
      empezar: "Talleres con cupo y pago",
      porque: "Cada taller que entra cobrado desde la inscripción es dinero que hoy se queda en el aire."
    },
    centro: {
      nombre: "Varios terapeutas y consultorios en un Excel", tipo: "libera",
      construye: "Agenda por terapeuta y por consultorio sin choques, pacientes y notas por terapeuta, y el corte de cada uno.",
      gana: "Un centro que crece sin choques ni discusiones de fin de mes.",
      empezar: "Agenda del centro y cortes por terapeuta",
      porque: "Antes de sumar otro terapeuta, conviene que todos trabajen sobre la misma agenda."
    }
  };
  var ORDEN = Object.keys(PROB);
  var ALIAS = {
    inasistencias: "inasistencias", cancelaciones: "inasistencias", cancelacion: "inasistencias", faltas: "inasistencias", politica: "inasistencias",
    transferencias: "transferencias", pagos: "transferencias", cobros: "transferencias", conciliacion: "transferencias", capturas: "transferencias",
    paquetes: "paquetes", paquete: "paquetes", sesiones: "paquetes",
    noche: "noche", whatsapp: "noche", agenda: "noche", reservas: "noche", citas: "noche",
    recurrentes: "recurrentes", recurrente: "recurrentes", semana: "recurrentes", videollamada: "recurrentes", enlinea: "recurrentes",
    espera: "espera", listadeespera: "espera", llena: "espera",
    seguimiento: "seguimiento", continuidad: "seguimiento", abandono: "seguimiento",
    leads: "leads", instagram: "leads", captacion: "leads", nuevos: "leads",
    talleres: "talleres", taller: "talleres", grupos: "talleres", cursos: "talleres",
    centro: "centro", terapeutas: "centro", consultorios: "centro", porcentajes: "centro"
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
  function salta(id) { var b = $(id); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta"); }

  /* ---------- La sala: un día, de la mañana a la medianoche ---------- */
  var H0 = 7.5, H1 = 24, DIA = 26, PAUSA = 3.4;
  var CIELO = [
    [7.5, "#F3C6A6", "#F8E6D2"], [9, "#A9D2EA", "#E6F2F8"], [15, "#9CCBE8", "#E3F0F7"],
    [17.5, "#E9B48E", "#F6DDC4"], [19, "#8E76B0", "#E2A3A0"], [20.5, "#3A3466", "#6A5A8E"], [24, "#1C1A3A", "#2E2A55"]
  ];
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mezcla(a, b, f) {
    var x = rgb(a), y = rgb(b);
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * f); }).join(",") + ")";
  }
  function rampa(h, a, b) { return Math.max(0, Math.min(1, (h - a) / (b - a))); }
  function cielo(h) {
    for (var i = 0; i < CIELO.length - 1; i++) {
      if (h <= CIELO[i + 1][0]) {
        var f = (h - CIELO[i][0]) / (CIELO[i + 1][0] - CIELO[i][0]);
        return [mezcla(CIELO[i][1], CIELO[i + 1][1], f), mezcla(CIELO[i][2], CIELO[i + 1][2], f)];
      }
    }
    return [CIELO[CIELO.length - 1][1], CIELO[CIELO.length - 1][2]];
  }
  function horaTxt(h) {
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    if (hh >= 24) { hh = 23; mm = 59; }
    var ap = hh >= 12 ? "PM" : "AM", h12 = hh % 12 || 12;
    return h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ap;
  }
  function pintarSala(h) {
    var c = cielo(h);
    $("cielo-a").setAttribute("stop-color", c[0]);
    $("cielo-b").setAttribute("stop-color", c[1]);
    var f = (h - 7.5) / 11.5, sol = $("sol");
    sol.setAttribute("cx", (84 + f * 170).toFixed(1));
    sol.setAttribute("cy", (250 - Math.sin(Math.PI * Math.min(1, Math.max(0, f))) * 150).toFixed(1));
    sol.setAttribute("opacity", (1 - rampa(h, 18.2, 19.2)).toFixed(2));
    var noche = rampa(h, 19.4, 20.6);
    $("luna").setAttribute("opacity", noche.toFixed(2));
    $("estrellas").setAttribute("opacity", (noche * 0.9).toFixed(2));
    $("velo").setAttribute("opacity", (rampa(h, 17.4, 21) * 0.4).toFixed(3));
    $("luz").setAttribute("opacity", rampa(h, 18.4, 20).toFixed(2));
    var m = (h % 1) * 360, hr = ((h % 12) / 12) * 360 + m / 12;
    $("aguja-m").setAttribute("transform", "rotate(" + m.toFixed(1) + " 548 122)");
    $("aguja-h").setAttribute("transform", "rotate(" + hr.toFixed(1) + " 548 122)");
    $("reloj-h").textContent = horaTxt(h);
    $("reloj").classList.toggle("noche", h >= 19.2);
  }
  function hT(h) { return (h - H0) / (H1 - H0) * DIA; }
  var cuenta = { msj: 0, cob: 0 };
  function sumar(msj, cob, conSalto) {
    cuenta.msj += msj; cuenta.cob += cob;
    $("c-msj").textContent = cuenta.msj;
    $("c-cobrado").textContent = dinero(cuenta.cob);
    if (conSalto) { if (msj) salta("c-msj"); if (cob) salta("c-cobrado"); }
  }
  function celMesa() {
    var c = $("cel-mesa");
    c.setAttribute("fill", "#C9BDEB");
    setTimeout(function () { c.setAttribute("fill", "#2B2540"); }, 1100);
  }
  // [segundo, tipo, título, detalle, mensajes que no pasaron por ti, cobrado]
  var DIA_EV = [
    [hT(8.3), "", "✓ Reservó en línea", "Ana R. · jueves 6:00 PM · pagó $800", 1, 800],
    [hT(10.6), "", "🔔 Recordatorios enviados", "Las 6 sesiones de hoy · sin escribir uno", 6, 0],
    [hT(13.4), "dinero", "$ Transferencia conciliada", "Sofía L. · $800 · sin revisar capturas", 1, 800],
    [hT(16.8), "", "🎥 Enlace de videollamada", "Marta P. lo recibió con su recordatorio", 1, 0],
    [hT(19.3), "", "✓ Sesión descontada del paquete", "Diego M. · le quedan 3 de 8", 1, 0],
    [hT(22.8), "", "✓ Reservó a las 10:47 PM", "Carla V. · martes 7:00 PM · tú no contestaste nada", 1, 800],
    [hT(23.97), "alerta", "↺ Horario sin pagar liberado", "Martes 8:00 PM · aviso a tu lista de espera", 0, 0],
    [DIA + 1.3, "dinero", "✓ Luis G. tomó el horario", "Martes 8:00 PM · pagado mientras descansabas", 1, 800]
  ];
  var evI = 0;
  function salaInicial() {
    evI = 0; cuenta = { msj: 0, cob: 0 }; sumar(0, 0, false);
    pintarSala(H0);
  }
  function sala_t(t) {
    pintarSala(H0 + Math.min(1, t / DIA) * (H1 - H0));
    while (evI < DIA_EV.length && DIA_EV[evI][0] <= t) {
      var e = DIA_EV[evI];
      aviso(e[1], e[2], e[3]);
      sumar(e[4], e[5], true);
      celMesa();
      evI++;
    }
  }

  /* ---------- La semana viva ---------- */
  var SEMANA = [
    { h: "Lun 4 PM", n: "Ana R.", e: "cada lunes", c: "recurrente" },
    { h: "Lun 6 PM", n: "Diego M.", e: "paquete · 5 de 8" },
    { h: "Mar 5 PM", n: "Marta P.", e: "enlace enviado", c: "linea" },
    { h: "Mar 7 PM", n: "Carla V.", e: "reservó a las 10:47 PM" },
    { h: "Mar 8 PM", n: "Apartado", e: "sin pagar…", c: "esperando" },
    { h: "Mié 4 PM", n: "Sofía L.", e: "transferencia por revisar", c: "esperando" },
    { h: "Mié 6 PM", n: "Taller", e: "12 de 12 pagados", c: "taller" },
    { h: "Jue 4 PM", n: "Mario T.", e: "cada jueves", c: "recurrente" },
    { h: "Jue 6 PM", n: "Ana R.", e: "reservó en línea" },
    { h: "Vie 5 PM", n: "Laura P.", e: "paquete · 1 de 4", c: "linea" }
  ];
  var LIBERA = 4, CONCILIA = 5, DURA = 30, PAUSA_FIN = 2.5;
  var pista = $("ag-pista"), vista = $("ag-vista"), ahora = $("ag-ahora"), celdas = [];
  SEMANA.forEach(function (c) {
    var d = document.createElement("div");
    d.innerHTML = '<span class="cita__h">' + c.h.replace(/ (\d)/, " <b>$1") + '</b></span><span class="cita__n"></span><span class="cita__e"></span>';
    pista.insertBefore(d, ahora);
    celdas.push(d);
  });
  pista.style.transition = "none";
  var est = {};
  function reiniciar() {
    est = { hechas: {}, lib: 0, conc: 0, ses: 0, rec: 0 };
    celdas.forEach(function (d, i) {
      d.className = "cita" + (SEMANA[i].c ? " " + SEMANA[i].c : "");
      d.querySelector(".cita__n").textContent = SEMANA[i].n;
      d.querySelector(".cita__e").textContent = SEMANA[i].e;
    });
    $("ag-ses").textContent = "0";
    $("ag-rec").textContent = dinero(0);
  }
  function poner(i, clase, n, e) {
    var d = celdas[i];
    d.className = "cita " + clase;
    if (n) d.querySelector(".cita__n").textContent = n;
    if (e) d.querySelector(".cita__e").textContent = e;
  }
  function agenda(p, conSalto) {
    var tramo = Math.floor(p * SEMANA.length);
    for (var i = 0; i < Math.min(tramo, SEMANA.length); i++) {
      if (est.hechas[i]) continue;
      if ((i === LIBERA && est.lib < 3) || (i === CONCILIA && est.conc < 1)) continue;
      est.hechas[i] = true;
      celdas[i].classList.remove("esperando", "cancelada");
      celdas[i].classList.add("atendida");
      est.ses++;
      $("ag-ses").textContent = est.ses;
      if (conSalto) salta("ag-ses");
    }
    // Martes 8 PM: apartado sin pagar → se libera de noche → la lista de espera lo toma.
    if (est.lib < 1 && p > 0.2) { est.lib = 1; poner(LIBERA, "cancelada", "Liberado", "nadie lo pagó · 11:59 PM"); }
    if (est.lib < 2 && p > 0.27) { est.lib = 2; poner(LIBERA, "esperando", "Lista de espera", "avisando a 3…"); }
    if (est.lib < 3 && p > 0.34) {
      est.lib = 3; poner(LIBERA, "recuperada", "Luis G.", "tomó el horario ✓ pagó");
      est.rec += 800; $("ag-rec").textContent = dinero(est.rec); if (conSalto) salta("ag-rec");
    }
    // Miércoles 4 PM: la transferencia de Sofía se concilia sola.
    if (est.conc < 1 && p > 0.45) {
      est.conc = 1; poner(CONCILIA, "recuperada", null, "transferencia conciliada ✓");
      est.rec += 800; $("ag-rec").textContent = dinero(est.rec); if (conSalto) salta("ag-rec");
    }
    var pw = pista.scrollWidth, vw = vista.clientWidth, x = p * pw;
    ahora.style.transform = "translateX(" + x.toFixed(1) + "px)";
    var tx = pw > vw ? Math.max(0, Math.min(x - vw * 0.4, pw - vw)) : 0;
    pista.style.transform = "translateX(" + (-tx).toFixed(1) + "px)";
  }

  /* ---------- Un solo reloj para el héroe ---------- */
  function heroe() {
    reiniciar();
    salaInicial();
    if (CALMA) {
      pintarSala(22.9);
      sumar(11, 2400, false);
      agenda(0.6, false);
      hud.className = "aviso-hud visible";
      $("hud-k").textContent = "✓ Reservó a las 10:47 PM";
      $("hud-t").textContent = "Carla V. · martes 7:00 PM · tú no contestaste nada";
      return;
    }
    var visible = true, corriendo = false, previo = 0, tS = 0, tA = 0;
    function cuadro(t) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (t - (previo || t)) / 1000);
      previo = t;
      tS += dt; tA += dt;
      if (tS > DIA + PAUSA) { tS = 0; salaInicial(); }
      sala_t(tS);
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

  /* ---------- 5 · Tu plan ---------- */
  function mensajePlan() {
    var l = lista(), partes = ["Hola Bodgar. Vi la página de psicología"];
    if (l.length) {
      partes[0] += " y marqué estos problemas:";
      l.forEach(function (k) { partes.push("- " + PROB[k].nombre); });
      partes.push("Me interesaría empezar por: " + PROB[l[0]].empezar + ".");
    } else partes[0] += " y quiero revisar cómo trabajo.";
    if (estimado) partes.push("Mi estimado: ~" + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    return partes.join("\n");
  }

  function plan() {
    var l = lista(), n = l.length;
    var crece = l.some(function (k) { return PROB[k].tipo === "crece"; });
    var cosa = crece ? (n === 1 ? "punto" : "puntos") : (n === 1 ? "problema" : "problemas");
    $("plan-titulo").textContent = n === 0
      ? "Marca arriba lo que te pasa y aquí aparece tu plan."
      : n === 1 ? "Revisaste 1 " + cosa + ". Tiene solución."
      : "Revisaste " + n + " " + cosa + ". Los " + n + " se resuelven con el mismo sistema.";
    $("plan-intro").textContent = n
      ? "Esto es lo que construiría, lo que ganarías y por dónde empezaría yo."
      : "Un solo sistema, construido alrededor de tu consultorio. Empezamos por lo que más tiempo o dinero te quita.";
    $("receta-folio").textContent = "Exp. PSI-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("receta-vacia").hidden = n > 0;
    $("receta-lista").innerHTML = l.map(function (k, i) {
      var p = PROB[k];
      return '<li style="animation-delay:' + (i * 0.06) + 's"><span class="n">' + (i + 1) + "</span>" +
        '<div><span class="k">Lo que te pasa</span><b>' + esc(p.nombre) + '</b><button type="button" data-reabrir="' + k + '">Ver la solución</button></div>' +
        '<div><span class="k">Lo que construyo</span><p>' + esc(p.construye) + "</p></div>" +
        '<div><span class="k">Resultado esperado</span><p class="g">' + esc(p.gana) + "</p></div></li>";
    }).join("");
    $("receta-inicio").hidden = n === 0;
    if (n) { $("receta-primero").textContent = PROB[l[0]].empezar; $("receta-porque").textContent = PROB[l[0]].porque; }

    var tipos = {};
    l.forEach(function (k) { tipos[PROB[k].tipo] = true; });
    document.querySelectorAll("#ganas li").forEach(function (li) { li.classList.toggle("activo", !!tipos[li.getAttribute("data-tipo")]); });

    $("ruta-1").textContent = n ? PROB[l[0]].empezar : "Un solo flujo";
    $("ruta-1p").textContent = n
      ? "En producción con tus pacientes reales. Medimos antes y después: si no ahorra o genera, no seguimos."
      : "En producción, con tus pacientes reales. Medimos antes y después.";
    var resto = l.slice(1);
    $("ruta-2").textContent = resto.length ? resto.map(function (k) { return PROB[k].nombre; }).join(" · ") : "El siguiente proceso";
    $("ruta-2p").textContent = resto.length
      ? "Lo demás que marcaste, uno por uno y solo si el primero funcionó. Mismo sistema, sin rehacer nada."
      : "Solo si el primero funcionó. Mismo sistema, otra parte de tu consultorio.";

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
    var l = lista(), t = "Hola Bodgar. Quiero el diagnóstico de 45 minutos para mi consultorio de psicología.";
    if (l.length) t += "\nLo que más me interesó: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".";
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
  var TOUR = [["paciente", "reservar"], ["paciente", "sesiones"], ["paciente", "pagos"], ["paciente", "aviso"],
    ["tu", "hoy"], ["tu", "conciliar"], ["tu", "espera"], ["tu", "notas"]];
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
      ir(v === "paciente" ? "reservar" : "hoy");
    });
  });
  document.querySelectorAll(".demo__lista [data-pant], .app__tabs [data-pant]").forEach(function (b) {
    b.addEventListener("click", function () { tocar("pantalla-" + b.getAttribute("data-pant")); ir(b.getAttribute("data-pant")); });
  });
  cel.addEventListener("pointerdown", function () { tocar(); });

  function hecho(b, txt) { b.classList.add("hecho"); b.textContent = txt; b.disabled = true; }
  var elegido = null;
  document.querySelectorAll("#horarios [data-h]").forEach(function (b) {
    b.addEventListener("click", function () {
      if ($("res-pagar").classList.contains("hecho")) return;
      tocar("horario");
      document.querySelectorAll("#horarios .elegido").forEach(function (x) { x.classList.remove("elegido"); });
      b.classList.add("elegido");
      elegido = b;
      $("res-txt").textContent = "Jueves 20 · " + b.getAttribute("data-h") + " · " + b.querySelector("small").textContent;
      $("res-pagar").disabled = false;
    });
  });
  $("res-pagar").addEventListener("click", function () {
    if (!elegido) return;
    tocar("reservar");
    hecho(this, "✓ Apartado y pagado");
    elegido.classList.remove("elegido"); elegido.classList.add("tuyo"); elegido.disabled = true;
    elegido.querySelector("small").textContent = "tuyo ✓";
    toast("✓ Listo · tu recordatorio llega un día antes");
  });
  $("video").addEventListener("click", function () { tocar("video"); toast("La videollamada se abre 10 minutos antes de tu sesión"); });
  $("pag-subir").addEventListener("click", function () {
    tocar("comprobante");
    hecho(this, "Comprobante recibido");
    $("pag-estado").textContent = "Recibido · conciliando con tu paquete…";
    setTimeout(function () {
      $("pag-estado").textContent = "✓ Conciliado · 4 sesiones nuevas en tu paquete";
      toast("✓ Pago conciliado · 4 sesiones más");
    }, 1600);
  });
  $("conc-btn").addEventListener("click", function () {
    tocar("conciliar");
    var li = $("conc-ana");
    li.className = "hecho";
    li.querySelector("small").textContent = "✓ Ana R. · hoy 6:00 PM";
    this.outerHTML = '<em class="ok">✓</em>';
    var h = $("hoy-ana");
    h.className = "hecho";
    h.querySelector("small").textContent = "transferencia conciliada · pagado";
    h.querySelector("em").className = "ok"; h.querySelector("em").textContent = "✓";
    toast("✓ Conciliada · Ana R. ya aparece como pagada");
  });
  var avisoDado = false;
  document.querySelectorAll("[data-avisar]").forEach(function (b) {
    b.addEventListener("click", function () {
      tocar("lista-espera");
      b.disabled = true; b.textContent = "Avisado";
      toast("Aviso enviado: hay lugar el jueves 8:00 PM");
      if (!avisoDado) {
        avisoDado = true;
        var li = b.closest("li");
        setTimeout(function () {
          li.className = "hecho";
          li.querySelector("small").textContent = "✓ tomó jueves 8:00 PM y pagó";
          b.outerHTML = '<em class="ok">✓</em>';
          toast("✓ " + li.querySelector("b").textContent + " tomó el lugar y pagó");
        }, 1600);
      }
    });
  });
  $("nota-guardar").addEventListener("click", function () { tocar("nota"); toast("Guardada con fecha · solo tú la ves (ejemplo)"); });

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
  ir("reservar");

  /* ---------- 4 · Diagnóstico económico ---------- */
  // [etiqueta, inicial, mín, máx, paso, formato]; "ticket" (precio de la sesión) es compartido.
  var FUGAS = {
    inasist: { t: "Inasistencias y cancelaciones tardías", usa: true,
      campos: [["Inasistencias o avisos tardíos al mes", 10, 0, 200, 1], ["¿Cuántas no se cobran?", 8, 0, 200, 1]],
      f: function (v, tk) { return Math.min(v[0], v[1]) * tk; },
      det: function (v) { return Math.min(v[0], v[1]) + " horas apartadas que no se cobraron"; } },
    cobros: { t: "Sesiones que se quedan sin cobrar", usa: true,
      campos: [["Sesiones dadas y no cobradas al mes", 2, 0, 60, 1]],
      f: function (v, tk) { return v[0] * tk; },
      det: function (v) { return v[0] + " sesiones sin cobrar"; } },
    continuidad: { t: "Pacientes que dejan de agendar", usa: true,
      campos: [["Pacientes que dejan de agendar al mes", 2, 0, 50, 1], ["Sesiones al mes que tenía cada uno", 4, 1, 12, 1]],
      f: function (v, tk) { return v[0] * v[1] * tk; },
      det: function (v) { return v[0] * v[1] + " sesiones al mes que dejan de estar"; } },
    leads: { t: "Personas que preguntan y no agendan", usa: true,
      campos: [["Personas que preguntan al mes", 30, 1, 500, 1], ["¿Cuántas agendan?", 3, 0, 200, 1], ["Sesiones al mes de un paciente nuevo", 4, 1, 12, 1]],
      f: function (v, tk) { return Math.max(1, Math.round(v[1] * 0.6)) * v[2] * tk; },
      det: function (v) { var e = Math.max(1, Math.round(v[1] * 0.6)); return "si de " + v[1] + " pasaran a " + (v[1] + e) + " pacientes nuevos"; } },
    talleres: { t: "Lugares de taller sin cobrar",
      campos: [["Talleres al mes", 1, 0, 20, 1], ["Lugares por taller", 12, 1, 200, 1], ["Lugares que no se cobran o se quedan vacíos", 4, 0, 200, 1], ["Precio por lugar", 600, 50, 10000, 50, "$"]],
      f: function (v) { return v[0] * Math.min(v[1], v[2]) * v[3]; },
      det: function (v) { return v[0] * Math.min(v[1], v[2]) + " lugares al mes"; } },
    espera: { t: "Personas a las que les dices que no", usa: true,
      campos: [["Personas a las que les dices que no al mes", 6, 0, 100, 1], ["¿Cuántas tomarían lugar si les avisaras?", 3, 0, 100, 1], ["Sesiones al mes por paciente", 4, 1, 12, 1]],
      f: function (v, tk) { return Math.min(v[0], v[1]) * v[2] * tk; },
      det: function (v) { return Math.min(v[0], v[1]) + " pacientes más con la misma agenda"; } }
  };
  var dlgDiag = $("diag"), diagSel = [], diagRes = {};
  function fmt(v, tipo) { return tipo === "$" ? dinero(v) : tipo === "%" ? v + "%" : (+v).toLocaleString("es-MX"); }
  function rango(id, c) {
    return '<label class="rango"><span>' + c[0] + ' <output data-o="' + id + '">' + fmt(c[1], c[5]) + "</output></span>" +
      '<input type="range" id="' + id + '" data-fmt="' + (c[5] || "") + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" value="' + c[1] + '"></label>';
  }
  function armarDiag() {
    var html = [], ticket = diagSel.some(function (k) { return FUGAS[k].usa; });
    if (ticket) html.push('<div class="diag__fila diag__fila--ticket">' + rango("d-ticket", ["Precio de tu sesión", 800, 200, 5000, 50, "$"]) + "</div>");
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
    var partes = ["Hola Bodgar. Hice el diagnóstico económico en la página de psicología:"];
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
    var partes = ["Hola Bodgar. Vi la página de psicología."];
    if (v("nombre")) partes.push("Soy " + v("nombre") + (v("clinica") ? ", de " + v("clinica") : "") + ".");
    else if (v("clinica")) partes.push("Escribo de " + v("clinica") + ".");
    if (hoy) partes.push("Hoy lo llevo en: " + hoy.value + ".");
    var l = lista();
    if (l.length) partes.push("Problemas que marqué: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".");
    if (estimado) partes.push("Mi estimado: " + dinero(estimado.mes) + "/mes en " + estimado.tipo + ".");
    partes.push("Lo que quiero dejar de hacer a mano: " + v("proceso"));
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
    location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Consultorio de psicología") + "&body=" + encodeURIComponent(mensajeForm());
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
