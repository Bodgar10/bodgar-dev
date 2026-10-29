/* Idiomas · /plataformas/idiomas/
 *
 * El salón (una hora que pasa de 1 alumno a 8 en el club de conversación),
 * la bandeja de WhatsApp que se resuelve sola al cruzar la plataforma, las
 * tarjetas de vocabulario que se marcan y abren su solución, el celular de
 * prueba (alumno y maestro, con examen rápido jugable), el pizarrón con la
 * cuenta y el plan de clase armado con lo marcado.
 *
 * Nada va a un servidor: lo marcado vive en sessionStorage y viaja solo
 * dentro del mensaje de WhatsApp que la persona revisa antes de enviar.
 * ?problema=<clave> sube y resalta esa tarjeta (enlace de mensaje frío).
 */
(function () {
  "use strict";

  var WA = "https://wa.me/525527149106?text=";
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GUARDADO = "bd_idiomas_marcas";
  var COLORES = ["var(--rosa)", "var(--azul)", "var(--naranja)", "var(--violeta)", "var(--menta)", "var(--amarillo)"];

  function $(id) { return document.getElementById(id); }
  function track(ev, det) { if (window.bdTrack) window.bdTrack(ev, det); }
  function dinero(n) { return "$" + Math.round(n).toLocaleString("es-MX"); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function salta(n) { if (!n || CALMA) return; n.classList.remove("salta"); void n.offsetWidth; n.classList.add("salta"); }

  /* ---------- Problemas: orden = por dónde empezaría ---------- */
  var PROB = {
    pagos: {
      nombre: "Persigo pagos cada mes", corto: "pagos", tipo: "libera", fase: 1,
      construye: "Pagos del mes con recordatorio automático, registro de transferencias y lo que debe cada alumno en su celular.",
      gana: "Cobras a tiempo sin perseguir a nadie.",
      empezar: "Pagos del mes con recordatorio automático",
      porque: "Es lo que más horas te quita cada mes y lo más fácil de medir: cuántos pagaron a tiempo antes y después."
    },
    avance: {
      nombre: "Alumnos que se van porque no ven su avance", corto: "avance", tipo: "retiene", fase: 1,
      construye: "Nivel, porcentaje hacia el siguiente, temas dominados y por reforzar, y sus exámenes, en el celular del alumno.",
      gana: "Alumnos que se quedan porque ven que avanzan.",
      empezar: "El avance de cada alumno en su celular",
      porque: "Cada alumno que se queda son meses de mensualidad. Es la base de todo lo demás: sin avance visible no hay plan extra que vender."
    },
    practica: {
      nombre: "No practican entre clases", corto: "práctica", tipo: "retiene", fase: 1,
      construye: "Clase de hoy (ejercicios, audios, vocabulario y tarea), examen rápido con calificación al momento y tu banco de ejercicios.",
      gana: "Alumnos que llegan practicados y menos preparación desde cero.",
      empezar: "Clase de hoy y examen rápido",
      porque: "El examen rápido alimenta el avance y la alerta de quién no practica: con él, la plataforma empieza a saber cómo va cada alumno."
    },
    riesgo: {
      nombre: "Me entero tarde de quién se va a ir", corto: "alertas", tipo: "retiene", fase: 1,
      construye: "Alerta semanal de quién no hizo ejercicios, bajó en sus exámenes o faltó seguido.",
      gana: "Rescatas alumnos antes de que se vayan.",
      empezar: "Alerta de alumnos que no practican",
      porque: "Un alumno rescatado a tiempo vale más que uno nuevo. Se mide desde el primer mes: cuántos se quedaron."
    },
    cursos: {
      nombre: "Cursos que se llenan y pierdo los contactos", corto: "cursos", tipo: "llena", fase: 2,
      construye: "Cursos con cupo, página de inscripción con pago, lista de espera y base de contactos con aviso de un clic.",
      gana: "Cursos que se llenan solos con gente que ya te conoce.",
      empezar: "Cursos con cupo, lista de espera y contactos",
      porque: "Cada curso que abres sin guardar contactos es un grupo que pierdes. Desde el primer curso tu base empieza a crecer."
    },
    club: {
      nombre: "Ya no puedo aceptar más alumnos", corto: "club", tipo: "mas", fase: 3,
      construye: "Club de conversación y grupos temáticos con cupo; el alumno aparta su lugar con un botón.",
      gana: "Una hora tuya rinde para 8 alumnos, no para 1.",
      empezar: "Club de conversación con cupo",
      porque: "Es lo que rompe tu techo de ingreso: la misma hora, varios alumnos. Se monta sobre tu lista de alumnos y pagos."
    },
    fieles: {
      nombre: "Mis alumnos fieles no tienen nada extra que comprar", corto: "plan extra", tipo: "vende", fase: 3,
      construye: "Plan extra mensual: club, comunidad por nivel, retos semanales y práctica guiada.",
      gana: "Más ingreso por alumno sin horas extra.",
      empezar: "Plan extra para tus alumnos fieles",
      porque: "Con 5 alumnos en el plan, la plataforma ya se pagó. Es ingreso nuevo de gente que ya confía en ti."
    },
    nivel: {
      nombre: "Gasto una clase en evaluar a cada interesado", corto: "examen de nivel", tipo: "libera", fase: 4,
      construye: "Examen de nivel en línea: el interesado lo hace desde su celular y te llegan su nivel y sus datos.",
      gana: "Horas recuperadas y prospectos que llegan con nivel.",
      empezar: "Examen de nivel en línea",
      porque: "Cada evaluación que no das en persona es una hora que recuperas, y cada interesado queda en tus contactos."
    },
    exalumnos: {
      nombre: "Exalumnos y referidos sin seguimiento", corto: "referidos", tipo: "llena", fase: 4,
      construye: "Aviso de cursos nuevos a exalumnos y enlace de recomendación con beneficio para quien trae a un amigo.",
      gana: "Alumnos nuevos sin pagar publicidad.",
      empezar: "Exalumnos y referidos",
      porque: "Tu base histórica ya existe: es de lo más barato de activar y se mide desde el primer aviso."
    }
  };
  var ORDEN = Object.keys(PROB);
  var ALIAS = {
    pagos: "pagos", pago: "pagos", cobros: "pagos", cobranza: "pagos", transferencias: "pagos",
    avance: "avance", progreso: "avance", retencion: "avance", bajas: "avance",
    practica: "practica", ejercicios: "practica", tarea: "practica", examen: "practica", quiz: "practica",
    riesgo: "riesgo", alertas: "riesgo", alerta: "riesgo",
    cursos: "cursos", curso: "cursos", contactos: "cursos", espera: "cursos", inscripcion: "cursos",
    club: "club", conversacion: "club", tope: "club", grupos: "club", horas: "club",
    fieles: "fieles", plan: "fieles", planextra: "fieles", extra: "fieles", comunidad: "fieles",
    nivel: "nivel", nuevos: "nivel", colocacion: "nivel", placement: "nivel",
    exalumnos: "exalumnos", referidos: "exalumnos", recomendaciones: "exalumnos"
  };

  var marcas = {};
  try { (JSON.parse(sessionStorage.getItem(GUARDADO) || "[]") || []).forEach(function (k) { if (PROB[k]) marcas[k] = true; }); } catch (e) {}
  var estimado = null;

  function lista() { return ORDEN.filter(function (k) { return marcas[k]; }); }
  function carta(k) { return document.querySelector('.tj[data-card="' + k + '"]'); }

  /* ---------- El salón: una hora, de 1 alumno a 8 ---------- */
  var ALUMNOS = [
    { l: "A", c: "var(--rosa)", d: "Hi! I'm Ana 👋" },
    { l: "L", c: "var(--azul)", d: "I went to Paris!" },
    { l: "C", c: "var(--naranja)", d: "Bonjour à tous !" },
    { l: "D", c: "var(--violeta)", d: "How do you say «antojo»?" },
    { l: "S", c: "var(--menta)", d: "Me too!" },
    { l: "P", c: "var(--rosa)", d: "Next stop: Tokyo ✈️" },
    { l: "M", c: "var(--azul)", d: "Can I go next?" },
    { l: "J", c: "var(--naranja)", d: "That's amazing!" }
  ];
  var ANGULOS = [180, 135, 225, 90, 270, 45, 315, 0];
  var IND = 250, CLUB = 200;
  var salon = document.querySelector(".salon"), mesa = $("mesa"), asientos = [];
  ALUMNOS.forEach(function (a, i) {
    var r = ANGULOS[i] * Math.PI / 180, s = document.createElement("span");
    s.className = "asiento";
    s.style.left = (50 + 40 * Math.sin(r)).toFixed(2) + "%";
    s.style.top = (50 - 40 * Math.cos(r)).toFixed(2) + "%";
    s.style.setProperty("--c", a.c);
    if (Math.cos(r) > 0.5) s.classList.add("abajo");
    s.innerHTML = a.l + '<span class="dice">' + esc(a.d) + "</span>";
    mesa.appendChild(s);
    asientos.push(s);
  });

  var hud = $("hud"), hudT = null, hablando = [];
  function aviso(tipo, k, t) {
    $("hud-k").textContent = k;
    $("hud-t").textContent = t;
    hud.className = "hud visible" + (tipo ? " " + tipo : "");
    clearTimeout(hudT);
    if (!CALMA) hudT = setTimeout(function () { hud.classList.remove("visible"); }, 2600);
  }
  function habla(i) {
    var s = asientos[i];
    s.classList.add("habla");
    hablando.push(setTimeout(function () { s.classList.remove("habla"); }, 1900));
  }
  var enMesa = 0;
  function marcador(club) {
    $("sal-n").textContent = enMesa;
    $("sal-d").textContent = dinero(club ? enMesa * CLUB : IND);
    salta($("sal-n")); salta($("sal-d"));
  }
  function sienta(i, club) {
    asientos[i].classList.add("lleno");
    enMesa = i + 1;
    marcador(club);
  }
  function resetSalon() {
    hablando.forEach(clearTimeout); hablando = [];
    asientos.forEach(function (s) { s.classList.remove("lleno", "habla"); });
    salon.classList.remove("completo");
    hud.classList.remove("visible");
    $("salon-titulo").textContent = "Clase individual · jueves 7:00 PM";
    $("mesa-tema").textContent = "Una hora · un alumno";
    sienta(0, false);
  }
  // Guion del salón, en segundos desde que arranca la vuelta.
  var GUION = [[0.6, function () { habla(0); }], [2.8, function () {
    $("salon-titulo").textContent = "Club de conversación · jueves 7:00 PM";
    $("mesa-tema").textContent = "Tema: Travel stories ✈️";
  }]];
  for (var g = 1; g < ALUMNOS.length; g++) {
    (function (i) {
      GUION.push([2.8 + (i - 1) * 0.7, function () {
        sienta(i, true); habla(i);
        if (i === 3) aviso("", "✓ Lugar apartado desde su celular", "Carla · club del jueves");
      }]);
    })(g);
  }
  GUION.push([7.8, function () {
    salon.classList.add("completo");
    aviso("lleno", "★ Cupo lleno · 3 en lista de espera", "8 alumnos · " + dinero(8 * CLUB) + " en la misma hora");
  }]);
  var VUELTA = 12.5;

  /* ---------- La bandeja de WhatsApp ---------- */
  var MENSAJES = [
    ["Miss, ¿hay clase hoy?", "✓ Recordatorio enviado · 7:00 PM"],
    ["¿Cuánto te debo de octubre?", "✓ Debe $1,600 · vence el 5"],
    ["¿Me pasas la tarea?", "✓ Ya está en su celular"],
    ["Ya te transferí 🙏", "✓ Transferencia registrada"],
    ["¿Qué nivel soy?", "✓ Su avance: B1 · 64%"],
    ["¿Cuándo abres el de viajes?", "✓ Aviso: Inglés para viajes, 6 lugares"],
    ["Mi prima quiere entrar, ¿qué nivel?", "✓ Examen de nivel en línea enviado"],
    ["¿Hay lugar en el club del jueves?", "✓ Lugar apartado · quedan 2"],
    ["¿Mañana sí hay clase?", "✓ Calendario del mes en su celular"],
    ["¿Me mandas el audio de hoy?", "✓ Audio de la clase disponible"]
  ];
  var pista = $("bd-pista"), vista = $("bd-vista"), burbujas = [], iMsg = 0, resueltos = 0;
  function nuevaBurbuja(x, resuelta) {
    var m = MENSAJES[iMsg++ % MENSAJES.length], d = document.createElement("div");
    d.className = "msg" + (resuelta ? " resuelta" : "");
    d.innerHTML = '<span class="msg__q">' + esc(m[0]) + '</span><span class="msg__r">' + esc(m[1]) + "</span>";
    pista.appendChild(d);
    var b = { el: d, w: d.offsetWidth, x: x, ok: !!resuelta };
    if (x === null) b.x = -b.w;
    return b;
  }
  function pinta(b) { b.el.style.transform = "translateX(" + b.x.toFixed(1) + "px)"; }
  function llenarBandeja() {
    var W = vista.clientWidth, x = W * 0.9;
    while (x > -40) {
      var b = nuevaBurbuja(0, false);
      b.x = x - b.w;
      if (b.x + b.w / 2 > W / 2) { b.ok = true; b.el.classList.add("resuelta"); }
      pinta(b);
      burbujas.unshift(b);
      x = b.x - 34;
    }
  }
  function contar() {
    resueltos++;
    $("bd-n").textContent = resueltos;
    $("bd-min").textContent = resueltos * 2;
    salta($("bd-n"));
  }
  function bandeja(dt) {
    var W = vista.clientWidth, V = 64;
    for (var i = burbujas.length - 1; i >= 0; i--) {
      var b = burbujas[i];
      b.x += V * dt;
      if (!b.ok && b.x + b.w / 2 >= W / 2) { b.ok = true; b.el.classList.add("resuelta"); contar(); }
      if (b.x > W + 30) { pista.removeChild(b.el); burbujas.splice(i, 1); continue; }
      pinta(b);
    }
    var primero = burbujas[0];
    if (!primero || primero.x > 34) {
      var n = nuevaBurbuja(null, false);
      n.x = (primero ? primero.x : W * 0.2) - 34 - n.w;
      pinta(n);
      burbujas.unshift(n);
    }
  }

  /* ---------- Un solo reloj para el héroe ---------- */
  function heroe() {
    resetSalon();
    llenarBandeja();
    if (CALMA) {
      for (var i = 1; i < ALUMNOS.length; i++) sienta(i, true);
      $("salon-titulo").textContent = "Club de conversación · jueves 7:00 PM";
      $("mesa-tema").textContent = "Tema: Travel stories ✈️";
      salon.classList.add("completo");
      aviso("lleno", "★ Cupo lleno · 3 en lista de espera", "8 alumnos · " + dinero(8 * CLUB) + " en la misma hora");
      return;
    }
    var visible = true, corriendo = false, previo = 0, t = 0, paso = 0;
    function cuadro(ts) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (ts - (previo || ts)) / 1000);
      previo = ts;
      t += dt;
      while (paso < GUION.length && t >= GUION[paso][0]) GUION[paso++][1]();
      if (t >= VUELTA) { t = 0; paso = 0; resetSalon(); }
      bandeja(dt);
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
    setTimeout(arrancar, 500);
  }

  /* ---------- Tarjetas ---------- */
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
    dlg.setAttribute("data-card", k);
    dlg.style.setProperty("--fc", c.style.getPropertyValue("--c"));
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
  // Toda la tarjeta se puede tocar, no solo el botón.
  document.querySelectorAll(".tj[data-card]").forEach(function (c) {
    c.addEventListener("click", function () { abrir(c.getAttribute("data-card")); });
  });
  $("ficha-x").addEventListener("click", cerrar);
  $("ficha-otro").addEventListener("click", function () {
    cerrar();
    var orden = Array.prototype.map.call(document.querySelectorAll(".tj[data-card]"), function (c) { return c.getAttribute("data-card"); });
    var sig = orden.filter(function (k) { return !marcas[k]; })[0];
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

  /* ---------- 4 · Plan de clase ---------- */
  function mensajePlan() {
    var l = lista(), partes = ["Hola Bodgar. Vi la página de idiomas"];
    if (l.length) {
      partes[0] += " y marqué estos problemas:";
      l.forEach(function (k) { partes.push("- " + PROB[k].nombre); });
      partes.push("Me interesaría empezar por: " + PROB[l[0]].empezar + ".");
    } else partes[0] += " y quiero revisar cómo doy mis clases.";
    if (estimado) partes.push("Mi cuenta en la página: " + estimado.txt + ".");
    return partes.join("\n");
  }

  function plan() {
    var l = lista(), n = l.length;
    $("plan-titulo").textContent = n === 0
      ? "Marca arriba lo que te pasa y aquí aparece tu plan."
      : n === 1 ? "Revisaste 1 problema. Tiene solución."
      : "Revisaste " + n + " problemas. Los " + n + " se resuelven con la misma plataforma.";
    $("plan-intro").textContent = n
      ? "Esto es lo que construiría, lo que ganarías y por dónde empezaría yo."
      : "Una sola plataforma, construida alrededor de cómo das clase. Empezamos por lo que más dinero o tiempo te cuesta.";
    $("libreta-folio").textContent = "Nº IDI-" + String(l.reduce(function (a, k) { return a + Math.pow(2, ORDEN.indexOf(k)); }, 0)).padStart(3, "0");
    $("libreta-vacia").hidden = n > 0;
    $("libreta-lista").innerHTML = l.map(function (k, i) {
      var p = PROB[k];
      return '<li style="animation-delay:' + (i * 0.12) + 's"><span class="n">' + (i + 1) + ".</span>" +
        '<div><span class="k">Lo que te pasa</span><b>' + esc(p.nombre) + '</b><span class="fase">Fase ' + p.fase + " · " + ["A1", "A2", "B1", "B2"][p.fase - 1] + '</span><button type="button" data-reabrir="' + k + '">Ver la solución</button></div>' +
        '<div><span class="k">Lo que construyo</span><p>' + esc(p.construye) + "</p></div>" +
        '<div><span class="k">Lo que ganas</span><p class="g">' + esc(p.gana) + "</p></div></li>";
    }).join("");
    $("libreta-inicio").hidden = n === 0;
    if (n) { $("libreta-primero").textContent = PROB[l[0]].empezar; $("libreta-porque").textContent = PROB[l[0]].porque; }

    var tipos = {};
    l.forEach(function (k) { tipos[PROB[k].tipo] = true; });
    document.querySelectorAll("#ganas li").forEach(function (li) { li.classList.toggle("activo", !!tipos[li.getAttribute("data-tipo")]); });

    var max = 0;
    document.querySelectorAll("#niveles li").forEach(function (li) {
      var f = +li.getAttribute("data-fase"), suyos = l.filter(function (k) { return PROB[k].fase === f; });
      li.classList.toggle("activo", suyos.length > 0);
      li.querySelector(".niveles__tuyo").textContent = suyos.length ? "← marcaste: " + suyos.map(function (k) { return PROB[k].corto; }).join(", ") : "";
      if (suyos.length) max = f;
    });
    $("niveles").style.setProperty("--llenar", max > 1 ? "calc((100% - 64px) * " + ((max - 1) / 3).toFixed(3) + ")" : "0px");

    $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
    $("plan-wa-txt").textContent = n ? (n === 1 ? "Quiero resolver este problema" : "Quiero resolver estos " + n + " problemas") : "Revisemos cómo das tus clases";
  }
  $("libreta-lista").addEventListener("click", function (e) {
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
  // Fuera del héroe siempre hay algo flotando: el plan si ya abrió algo; si no, WhatsApp.
  function flotante() {
    var fuera = !vistos.plan && !vistos.hablemos && !vistos.inicio, hay = lista().length > 0;
    mostrarFlota($("manif"), fuera && hay);
    mostrarFlota($("wa-flota"), fuera && !hay);
  }
  function mensajeDiag() {
    var l = lista(), t = "Hola Bodgar. Quiero el diagnóstico de 45 minutos para mis clases de idiomas.";
    if (l.length) t += "\nLo que más me interesó: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".";
    if (estimado) t += "\nMi cuenta en la página: " + estimado.txt + ".";
    return t;
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vistos[e.target.id] = e.isIntersecting; });
      flotante();
    }, { rootMargin: "-20% 0px -20% 0px" });
    ["inicio", "plan", "hablemos"].forEach(function (id) { io.observe($(id)); });
  }

  /* ---------- 2 · El celular ---------- */
  var cel = $("cel"), vistaApp = "alumno", tocoDemo = false;
  var TOUR = [["alumno", "hoy"], ["alumno", "quiz"], ["alumno", "avance"], ["alumno", "club"], ["alumno", "pagos"],
    ["maestro", "alumnos"], ["maestro", "cobros"], ["maestro", "riesgo"], ["maestro", "cursos"]];
  var tourI = 0;

  function toast(t) {
    var n = $("toast");
    n.textContent = t;
    n.classList.add("visible");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { n.classList.remove("visible"); }, 2200);
  }
  function confeti(cuantos) {
    if (CALMA) return;
    var caja = $("confeti");
    for (var i = 0; i < cuantos; i++) {
      var s = document.createElement("i"), a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 150;
      s.className = "cf";
      s.style.setProperty("--c", COLORES[i % COLORES.length]);
      s.style.setProperty("--dx", (Math.cos(a) * r).toFixed(0) + "px");
      s.style.setProperty("--dy", (Math.sin(a) * r + 160).toFixed(0) + "px");
      s.style.setProperty("--rot", (Math.random() * 720 - 360).toFixed(0) + "deg");
      s.style.left = (40 + Math.random() * 20) + "%";
      caja.appendChild(s);
    }
    setTimeout(function () { caja.innerHTML = ""; }, 1600);
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
    if (p === "quiz" && !quizEmpezado) pintarQuiz();
  }
  function tocar(det) {
    if (!tocoDemo) { tocoDemo = true; track("clic", "app:tocado"); }
    if (det) track("clic", "app:" + det);
  }

  document.querySelectorAll(".vista-sw [data-vista]").forEach(function (b) {
    b.addEventListener("click", function () {
      tocar("vista-" + b.getAttribute("data-vista"));
      cambiarVista(b.getAttribute("data-vista"));
      ir(b.getAttribute("data-vista") === "alumno" ? "hoy" : "alumnos");
    });
  });
  document.querySelectorAll(".demo__lista [data-pant], .app__tabs [data-pant]").forEach(function (b) {
    b.addEventListener("click", function () { tocar("pantalla-" + b.getAttribute("data-pant")); ir(b.getAttribute("data-pant")); });
  });
  cel.addEventListener("pointerdown", function () { tocar(); });
  cel.querySelectorAll("[data-ir]").forEach(function (b) {
    b.addEventListener("click", function () { ir(b.getAttribute("data-ir")); });
  });
  cel.querySelectorAll(".voc").forEach(function (b) {
    b.addEventListener("click", function () { b.classList.toggle("vuelta"); });
  });

  // Recorrido solo mientras nadie lo toca y está en pantalla.
  var tourT = null, demoVisible = false;
  function tour() {
    clearTimeout(tourT);
    if (tocoDemo || !demoVisible || CALMA) return;
    tourT = setTimeout(function () {
      if (tocoDemo || !demoVisible) return;
      tourI = (tourI + 1) % TOUR.length;
      if (TOUR[tourI][0] !== vistaApp) cambiarVista(TOUR[tourI][0]);
      ir(TOUR[tourI][1]);
      if (TOUR[tourI][1] === "hoy") { var v = cel.querySelector(".voc"); setTimeout(function () { if (!tocoDemo) v.classList.toggle("vuelta"); }, 900); }
      tour();
    }, 3600);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { demoVisible = e[0].isIntersecting; tour(); }, { threshold: 0.35 }).observe(cel);
  }

  // Examen rápido jugable
  var PREG = [
    { k: "Inglés · Past simple", p: "She ___ to Paris last summer.", o: ["goes", "went", "has gone"], ok: 1, tema: "Past simple" },
    { k: "Français · Conditionnel", p: "Je ___ un café, s'il vous plaît.", o: ["voudrais", "voulez", "vouloir"], ok: 0, tema: "Le conditionnel" },
    { k: "Inglés · Gerunds", p: "I'm looking forward to ___ you.", o: ["see", "seeing", "saw"], ok: 1, tema: "Gerunds" }
  ];
  var BASE = 64, qi = 0, aciertos = 0, res = [], quizEmpezado = false;
  function pintarQuiz() {
    var q = $("quiz");
    if (qi >= PREG.length) return finQuiz();
    var p = PREG[qi];
    q.innerHTML = '<div class="quiz__prog">' + PREG.map(function (_, i) { return '<i class="' + (res[i] || (i === qi ? "ya" : "")) + '"></i>'; }).join("") + "</div>" +
      '<div class="quiz__k"><span class="k">' + esc(p.k) + '</span><span class="k">' + (qi + 1) + " de " + PREG.length + "</span></div>" +
      '<p class="quiz__p">' + esc(p.p).replace("___", "<u>?</u>") + "</p>" +
      '<div class="quiz__ops">' + p.o.map(function (o, i) { return '<button type="button" data-o="' + i + '">' + esc(o) + "</button>"; }).join("") + "</div>" +
      '<p class="quiz__fb" id="quiz-fb"></p>';
  }
  function finQuiz() {
    var pct = BASE + aciertos * 3;
    $("quiz").innerHTML = '<div class="quiz__fin"><span class="k">Examen rápido · tu calificación</span><b>' + aciertos + "/" + PREG.length + "</b>" +
      "<p>" + (aciertos === 3 ? "Excellent! ¡Perfecto!" : aciertos === 2 ? "Very good! Casi perfecto." : "¡Sigue practicando! Ya sabes qué reforzar.") + "</p>" +
      '<p>Tu avance: ' + BASE + '% → <span class="sube">' + pct + "%</span></p>" +
      '<button type="button" class="app__cta" data-fin="avance">Ver mi avance →</button>' +
      '<button type="button" class="mini-btn" data-fin="otra">Repetir</button></div>';
    if (aciertos >= 2) confeti(aciertos === 3 ? 40 : 24);
    track("clic", "app:quiz-fin-" + aciertos);
    // El avance del alumno cambia con el examen.
    $("av-barra").style.setProperty("--p", pct);
    $("av-pct").textContent = pct + "%";
    $("app-nivel").textContent = "B1 · " + pct + "%";
    salta($("app-nivel"));
    var dom = $("av-dom"), ref = $("av-ref");
    dom.querySelectorAll(".nuevo").forEach(function (n) { n.remove(); });
    ref.querySelectorAll("span").forEach(function (n) { n.hidden = false; });
    PREG.forEach(function (p, i) {
      if (res[i] !== "ok") return;
      var ya = Array.prototype.some.call(dom.children, function (c) { return c.textContent === p.tema; });
      if (ya) return;
      Array.prototype.forEach.call(ref.children, function (c) { if (c.textContent === p.tema) c.hidden = true; });
      var s = document.createElement("span");
      s.className = "chip chip--ok nuevo"; s.textContent = p.tema;
      dom.appendChild(s);
    });
    var barras = $("av-examenes"), ult = $("av-ultimo");
    if (!ult) { ult = document.createElement("i"); ult.id = "av-ultimo"; barras.appendChild(ult); }
    var diez = Math.round(aciertos / PREG.length * 10);
    ult.style.setProperty("--h", Math.max(8, diez * 10) + "%");
    ult.innerHTML = "<span>" + diez + "</span>";
  }
  $("quiz").addEventListener("click", function (e) {
    var fin = e.target.closest("[data-fin]");
    if (fin) {
      if (fin.getAttribute("data-fin") === "avance") ir("avance");
      else { qi = 0; aciertos = 0; res = []; pintarQuiz(); }
      return;
    }
    var b = e.target.closest("[data-o]");
    if (!b || b.disabled) return;
    quizEmpezado = true;
    var p = PREG[qi], o = +b.getAttribute("data-o"), bien = o === p.ok;
    var ops = this.querySelectorAll("[data-o]");
    ops.forEach(function (x) { x.disabled = true; });
    ops[p.ok].classList.add("ok");
    if (!bien) b.classList.add("mal");
    res[qi] = bien ? "ok" : "mal";
    if (bien) aciertos++;
    var fb = $("quiz-fb");
    fb.className = "quiz__fb" + (bien ? "" : " mal");
    fb.textContent = bien ? ["¡Muy bien!", "Très bien !", "Great job!"][qi % 3] : "Casi: era «" + p.o[p.ok] + "»";
    if (bien) confeti(10);
    setTimeout(function () { qi++; pintarQuiz(); }, 1200);
  });

  // Club: apartar un lugar
  $("club-apartar").addEventListener("click", function () {
    if (this.classList.contains("hecho")) return;
    var libre = $("club-sillas").querySelector("i:not(.si)");
    if (libre) libre.className = "tu";
    this.classList.add("hecho");
    this.textContent = "✓ Lugar apartado";
    $("club-cupo").textContent = "Queda 1 lugar";
    toast("¡Listo! Te esperamos el jueves 💬");
    confeti(18);
    track("clic", "app:club-apartar");
  });
  // Pago: comprobante
  $("pago-subir").addEventListener("click", function () {
    if (this.classList.contains("hecho")) return;
    this.classList.add("hecho");
    this.textContent = "✓ Comprobante enviado";
    $("pago-estado").textContent = "✓ Recibido · tu maestra lo confirma";
    $("pago-estado").className = "ok";
    toast("Comprobante enviado. Sin capturas por WhatsApp.");
    track("clic", "app:pago-comprobante");
  });
  // Maestro: registrar transferencia
  $("cob-registrar").addEventListener("click", function () {
    if (this.classList.contains("hecho")) return;
    this.classList.add("hecho");
    this.textContent = "✓";
    var li = this.closest("li");
    li.classList.add("hecho");
    li.querySelector("small").textContent = "✓ transferencia registrada · $1,600";
    $("cob-n").textContent = "$54,400";
    $("cob-barra").style.setProperty("--w", "85%");
    toast("Transferencia registrada. Carla ya ve su comprobante.");
    track("clic", "app:cobro-registrar");
  });
  cel.querySelectorAll("[data-escribir]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.classList.contains("hecho")) return;
      b.classList.add("hecho");
      b.textContent = "✓ Enviado";
      toast("Mensaje enviado a " + b.closest("li").querySelector("b").textContent);
      track("clic", "app:riesgo-escribir");
    });
  });
  $("avisar").addEventListener("click", function () {
    if (this.classList.contains("hecho")) return;
    var btn = this, n = 0;
    btn.classList.add("hecho");
    btn.textContent = "Avisando…";
    toast("Aviso enviado a 124 contactos 📣");
    track("clic", "app:curso-avisar");
    var t = setInterval(function () {
      n++;
      $("neg-n").textContent = n + "/10";
      $("neg-cupo").style.setProperty("--w", n * 10 + "%");
      if (n >= 6) { clearInterval(t); btn.textContent = "✓ Aviso enviado · 6 inscritos"; }
    }, CALMA ? 0 : 380);
  });

  /* ---------- 3 · El pizarrón ---------- */
  var tab = "fieles", tocoCalc = false, anim = null;
  var FORMATO = {
    "c-alumnos": String, "c-pct": function (v) { return v + " de 10"; }, "c-precio": dinero,
    "b-alumnos": String, "b-van": String, "b-cuota": dinero,
    "h-n": String, "h-precio": dinero, "h-ind": dinero, "h-sem": String
  };
  function salidas() {
    document.querySelectorAll("output[data-for]").forEach(function (o) {
      var id = o.getAttribute("data-for");
      o.textContent = FORMATO[id]($(id).value);
    });
  }
  function numero(v, signo) {
    var n = $("calc-num");
    cancelAnimationFrame(anim);
    if (CALMA) { n.textContent = signo + dinero(v); return; }
    var desde = parseInt((n.textContent || "").replace(/\D/g, ""), 10) || 0, t0 = 0;
    function paso(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3);
      n.textContent = signo + dinero(desde + (v - desde) * e);
      if (p < 1) anim = requestAnimationFrame(paso);
    }
    anim = requestAnimationFrame(paso);
  }
  function puntos(n, clase) {
    var caja = $("dots");
    while (caja.children.length < n) { var d = document.createElement("i"); d.className = "dot"; caja.appendChild(d); }
    while (caja.children.length > n) caja.removeChild(caja.lastChild);
    Array.prototype.forEach.call(caja.children, function (d, i) { d.className = "dot " + clase(i); });
  }
  function calcular() {
    salidas();
    var v = function (id) { return parseFloat($(id).value); };
    var est;
    if (tab === "fieles") {
      var A = v("c-alumnos"), k = Math.round(A * v("c-pct") / 10), precio = v("c-precio");
      var extra = k * precio, paga = Math.ceil(2000 / precio);
      $("calc-etq").textContent = "Te entra de más al mes";
      numero(extra, "+");
      $("calc-det").textContent = k + " de " + A + " alumnos × " + dinero(precio) + " · " + dinero(extra * 12) + " al año";
      $("calc-mitad").innerHTML = k >= paga
        ? "La plataforma (desde $2,000) se paga con <b>" + paga + " alumnos</b> en el plan." + (k > paga ? " Los otros " + (k - paga) + " ya son ganancia." : "")
        : "Con " + k + " todavía no se paga sola: necesitas <b>" + paga + "</b> en el plan.";
      puntos(A, function (i) { return i < k ? (i < Math.min(k, paga) ? "x paga" : "x") : ""; });
      $("dots-ley").innerHTML = "<i>●</i> en el plan extra · <em>◯</em> estos pagan la plataforma";
      est = { mes: extra, txt: "+" + dinero(extra) + "/mes con un plan extra de " + dinero(precio) + " (" + k + " de " + A + " alumnos)" };
    } else if (tab === "bajas") {
      var B = v("b-alumnos"), s = Math.min(v("b-van"), B), cuota = v("b-cuota");
      var pierde = s * cuota, quedan = Math.max(1, Math.round(s / 3));
      $("calc-etq").textContent = "Se te va cada mes";
      numero(pierde, "−");
      $("calc-det").textContent = s + (s === 1 ? " alumno" : " alumnos") + " × " + dinero(cuota) + " de mensualidad que ya tenías";
      $("calc-mitad").innerHTML = "Si " + (quedan === 1 ? "1 se queda" : quedan + " se quedan") + " porque " + (quedan === 1 ? "ve su" : "ven su") + " avance: <b>+" + dinero(quedan * cuota) + "/mes</b>, mes tras mes.";
      puntos(B, function (i) { var j = i - (B - s); return j >= 0 ? (j < quedan ? "rescata" : "fuera") : ""; });
      $("dots-ley").innerHTML = "<em>◌</em> se van este mes · <u>●</u> se quedan si ven su avance";
      est = { mes: pierde, txt: "se me van ~" + s + " alumnos al mes (" + dinero(pierde) + "/mes)" };
    } else {
      var N = v("h-n"), p = v("h-precio"), ind = v("h-ind"), sem = v("h-sem");
      var club = N * p, dif = club - ind, mes = dif * sem * 4.3;
      $("calc-etq").textContent = "Una hora de club te deja";
      numero(club, "");
      $("calc-det").textContent = "en vez de " + dinero(ind) + " de una clase individual";
      $("calc-mitad").innerHTML = dif > 0
        ? "Con " + sem + (sem === 1 ? " club" : " clubes") + " a la semana: <b>+" + dinero(mes) + "/mes</b> con las mismas horas tuyas."
        : "Con estos números el club todavía no rinde más que una clase individual.";
      puntos(N, function () { return "silla"; });
      $("dots-ley").innerHTML = "● " + N + " alumnos en la misma hora";
      est = { mes: Math.max(0, mes), txt: "club de " + N + " alumnos: " + dinero(club) + " por hora en vez de " + dinero(ind) };
    }
    if (tocoCalc) {
      estimado = est;
      $("plan-wa").href = WA + encodeURIComponent(mensajePlan());
      var msg = WA + encodeURIComponent(mensajeDiag());
      $("final-wa").href = msg; $("wa-flota").href = msg;
    }
  }
  function tocarCalc(det) {
    if (!tocoCalc) { tocoCalc = true; track("clic", "la-cuenta:" + det); }
  }
  document.querySelectorAll(".calc__tabs [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      tab = b.getAttribute("data-tab");
      document.querySelectorAll(".calc__tabs [data-tab]").forEach(function (o) { o.setAttribute("aria-selected", o === b ? "true" : "false"); });
      document.querySelectorAll(".calc__panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== tab; });
      tocarCalc("tab-" + tab);
      track("clic", "la-cuenta:tab-" + tab);
      calcular();
    });
  });
  $("calc").addEventListener("input", function (e) {
    if (e.target.type === "range") { tocarCalc("mover-" + tab); calcular(); }
  });

  /* ---------- Aparecer al bajar ---------- */
  var rvs = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !CALMA) {
    var ioRv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); ioRv.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach(function (n) { ioRv.observe(n); });
  } else rvs.forEach(function (n) { n.classList.add("visto"); });

  /* ---------- Formulario → WhatsApp ---------- */
  var form = $("form");
  function mensajeForm() {
    var v = function (n) { var e = form.elements[n]; return (e && e.value || "").trim(); };
    var hoy = form.querySelector('input[name="hoy"]:checked'), al = form.querySelector('input[name="alumnos"]:checked');
    var partes = ["Hola Bodgar. Vi la página de idiomas."];
    if (v("nombre")) partes.push("Soy " + v("nombre") + (v("academia") ? ", de " + v("academia") : "") + ".");
    else if (v("academia")) partes.push("Escribo de " + v("academia") + ".");
    if (al) partes.push("Tengo " + al.value + " alumnos.");
    if (hoy) partes.push("Hoy lo llevo en: " + hoy.value + ".");
    var l = lista();
    if (l.length) partes.push("Problemas que marqué: " + l.map(function (k) { return PROB[k].nombre.toLowerCase(); }).join(", ") + ".");
    if (estimado) partes.push("Mi cuenta en la página: " + estimado.txt + ".");
    partes.push("Lo que más tiempo me quita: " + v("proceso"));
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
    location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Clases de idiomas") + "&body=" + encodeURIComponent(mensajeForm());
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
  function arrancarHeroe() { if (!arrancarHeroe.ya) { arrancarHeroe.ya = true; heroe(); } }
  // La bandeja mide cada burbuja: mejor con la fuente ya cargada.
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(arrancarHeroe); setTimeout(arrancarHeroe, 1500); }
  else arrancarHeroe();
  lista().forEach(function (k) {
    var c = carta(k);
    if (c) { c.classList.add("marcada"); c.querySelector(".tj__btn").textContent = textoBoton(true); }
  });
  refrescar(false);
  ir("hoy");
  calcular();
})();
