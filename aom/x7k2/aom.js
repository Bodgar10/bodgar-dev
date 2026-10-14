/* Torneo de los Dioses · /aom/x7k2/
 * Datos: Supabase de Rally, esquema privado `aom` (ver supabase/aom/001_torneo.sql).
 * La página solo llama a dos funciones: aom_publico() y aom_inscribir(...).
 */
(function () {
  "use strict";

  var API = "https://xnyhgikcrzalzquzlzyu.supabase.co/rest/v1/rpc/";
  var KEY = "sb_publishable_J_2iCN-coWd9ItctOlSzHw_4wnmiE54";
  var GUARDADO = "aom_x7k2_jugador";

  var DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  var HORAS = [];
  for (var h0 = 7; h0 <= 24; h0++) HORAS.push(h0);
  var TRAMOS = { 7: "Mañana", 12: "Tarde", 19: "Noche" };
  var CALMA = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hora(h) { return (h % 24) + ":00"; }
  function leer() { try { return JSON.parse(localStorage.getItem(GUARDADO) || "null"); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(GUARDADO, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  function rpc(nombre, cuerpo) {
    return fetch(API + nombre, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify(cuerpo || {})
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }

  /* ---------- Laurel (dibujado, no imagen) ---------- */
  function laurel(color, animar) {
    var out = [], n = 0;
    out.push('<path d="M32 56 C18 54 10 44 10 33 C10 22 16 14 24 9 M32 56 C46 54 54 44 54 33 C54 22 48 14 40 9" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-linecap="round"/>');
    [[100, 250, 1], [80, -70, -1]].forEach(function (rama) {
      for (var a = rama[0]; rama[2] > 0 ? a <= rama[1] : a >= rama[1]; a += 15 * rama[2]) {
        var rad = a * Math.PI / 180;
        [[-3.2, 1], [3.2, -1]].forEach(function (lado) {
          var r = 22 + lado[0];
          var x = 32 + r * Math.cos(rad), y = 34 + r * Math.sin(rad);
          var rot = a + 90 + 28 * lado[1] * rama[2];
          var d = animar ? ' style="animation-delay:' + (0.04 * n++) + 's"' : "";
          out.push('<g class="hoja"' + d + '><ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="5.2" ry="2.3" transform="rotate(' + rot.toFixed(0) + " " + x.toFixed(1) + " " + y.toFixed(1) + ')" fill="' + color + '"/></g>');
        });
      }
    });
    return out.join("");
  }

  /* ---------- Cielo y rayos ---------- */
  function cielo() {
    var g = $("estrellas");
    if (!g) return;
    var s = [];
    for (var i = 0; i < 150; i++) {
      var x = Math.random() * 1440, y = Math.random() * 760;
      var r = (Math.random() * 1.3 + 0.4).toFixed(2);
      var tit = Math.random() < 0.28;
      s.push('<circle class="estrella' + (tit ? " titila" : "") + '" cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + r + '" opacity="' + (Math.random() * 0.6 + 0.3).toFixed(2) + '"' + (tit ? ' style="animation-delay:' + (Math.random() * 4).toFixed(2) + 's"' : "") + "/>");
    }
    g.innerHTML = s.join("");
  }

  function rayos() {
    if (CALMA) return;
    var heroe = $("inicio");
    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(heroe);
    }
    function caer() {
      if (visible && !document.hidden) {
        heroe.classList.remove("cae");
        void heroe.offsetWidth;
        heroe.classList.add("cae");
        setTimeout(function () { heroe.classList.remove("cae"); }, 950);
      }
      setTimeout(caer, 6000 + Math.random() * 7000);
    }
    setTimeout(caer, 2700);
  }

  /* ---------- Horarios ---------- */
  var sel = {}; // "d-h": true
  var pintando = null, ignorarClic = false;

  function construirRejilla() {
    var r = $("rejilla");
    var html = ['<div class="rejilla__fila rejilla__dias" aria-hidden="true"><span></span>'];
    DIAS.forEach(function (d) { html.push("<span>" + d + "</span>"); });
    html.push("</div>");
    HORAS.forEach(function (h) {
      if (TRAMOS[h]) html.push('<div class="rejilla__tramo" aria-hidden="true">' + TRAMOS[h] + "</div>");
      html.push('<div class="rejilla__fila"><span class="rejilla__hora" aria-hidden="true">' + hora(h) + "</span>");
      DIAS.forEach(function (d, i) {
        html.push('<button type="button" class="celda" data-k="' + i + "-" + h + '" aria-pressed="false" aria-label="' + DIAS_LARGO[i] + " de " + hora(h) + " a " + hora(h + 1) + '"></button>');
      });
      html.push("</div>");
    });
    r.innerHTML = html.join("");

    r.addEventListener("pointerdown", function (e) {
      var c = e.target.closest(".celda");
      if (!c || e.pointerType !== "mouse" || e.button !== 0) return;
      e.preventDefault();
      pintando = !sel[c.dataset.k];
      ignorarClic = true;
      poner(c.dataset.k, pintando);
    });
    r.addEventListener("pointerover", function (e) {
      if (pintando === null) return;
      var c = e.target.closest(".celda");
      if (c && !!sel[c.dataset.k] !== pintando) poner(c.dataset.k, pintando);
    });
    window.addEventListener("pointerup", function () {
      if (pintando === null) return;
      pintando = null;
      setTimeout(function () { ignorarClic = false; }, 0);
    });
    r.addEventListener("click", function (e) {
      var c = e.target.closest(".celda");
      if (!c) return;
      if (ignorarClic) { ignorarClic = false; return; }
      poner(c.dataset.k, !sel[c.dataset.k]);
    });
  }

  function poner(k, v) {
    if (v) sel[k] = true; else delete sel[k];
    var c = document.querySelector('.celda[data-k="' + k + '"]');
    if (c) {
      c.setAttribute("aria-pressed", v ? "true" : "false");
      if (!CALMA) { c.classList.remove("pulso"); void c.offsetWidth; c.classList.add("pulso"); }
    }
    resumen();
  }

  function pintarTodo() {
    document.querySelectorAll(".celda").forEach(function (c) {
      c.setAttribute("aria-pressed", sel[c.dataset.k] ? "true" : "false");
    });
    resumen();
  }

  function rangos(horas) {
    var out = [], ini = null, prev = null;
    horas.slice().sort(function (a, b) { return a - b; }).forEach(function (h) {
      if (ini === null) { ini = h; prev = h; return; }
      if (h === prev + 1) { prev = h; return; }
      out.push(hora(ini) + "–" + hora(prev + 1)); ini = h; prev = h;
    });
    if (ini !== null) out.push(hora(ini) + "–" + hora(prev + 1));
    return out;
  }

  function horasDe(d) {
    return HORAS.filter(function (h) { return sel[d + "-" + h]; });
  }

  function disponibilidad() {
    var o = {};
    for (var d = 0; d < 7; d++) { var hs = horasDe(d); if (hs.length) o[d] = hs; }
    return o;
  }

  function resumen() {
    var html = [];
    DIAS_LARGO.forEach(function (n, d) {
      var r = rangos(horasDe(d));
      html.push("<div><dt>" + n + "</dt>" + (r.length ? "<dd>" + r.join(", ") + "</dd>" : '<dd class="vacio">No puedo</dd>') + "</div>");
    });
    $("resumen").innerHTML = html.join("");
    var tot = Object.keys(sel).length;
    $("total-horas").textContent = tot;
    $("total-txt").textContent = tot === 1 ? "hora a la semana" : "horas a la semana";
    checar();
  }

  function atajo(tipo) {
    if (tipo === "borrar") { sel = {}; }
    else {
      var de = tipo === "semana" ? 0 : 5, a = tipo === "semana" ? [1, 2, 3, 4] : [6];
      a.forEach(function (d) {
        HORAS.forEach(function (h) {
          if (sel[de + "-" + h]) sel[d + "-" + h] = true; else delete sel[d + "-" + h];
        });
      });
    }
    pintarTodo();
  }

  /* ---------- Formulario ---------- */
  function telLimpio() {
    var t = $("telefono").value.replace(/\D/g, "");
    if (t.length === 12 && t.indexOf("52") === 0) t = t.slice(2);
    return t;
  }

  function requisitos() {
    return [
      { id: "gamertag", txt: "Nombre en el juego", ok: $("gamertag").value.trim().length >= 2, msg: "Escribe tu nombre en el juego." },
      { id: "telefono", txt: "WhatsApp de 10 dígitos", ok: telLimpio().length === 10, msg: "Revisa tu WhatsApp: deben ser 10 dígitos." },
      { id: "en-grupo", txt: "Dentro del grupo", ok: $("en-grupo").checked, msg: "Únete al grupo de WhatsApp y marca la casilla." },
      { id: "rejilla", txt: "Al menos 3 horas", ok: Object.keys(sel).length >= 3, msg: "Marca al menos 3 horas en tu semana." }
    ];
  }

  function checar() {
    $("faltan").innerHTML = requisitos().map(function (r) {
      return '<li class="' + (r.ok ? "listo" : "") + '"><svg aria-hidden="true"><use href="#' + (r.ok ? "i-ok" : "i-falta") + '"/></svg>' + r.txt + '<span class="sr">' + (r.ok ? ": listo" : ": falta") + "</span></li>";
    }).join("");
  }

  var ERRORES = {
    gamertag: "Escribe tu nombre en el juego (de 2 a 32 caracteres).",
    telefono: "Revisa tu WhatsApp: deben ser 10 dígitos.",
    grupo: "Únete al grupo de WhatsApp y marca la casilla.",
    horarios: "Marca al menos 3 horas en tu semana.",
    gamertag_ocupado: "Ese nombre ya lo registró otro WhatsApp. Si eres tú, usa el mismo número con el que te inscribiste.",
    cerrado: "Las inscripciones ya cerraron. Pregunta en el grupo si todavía hay lugar.",
    ritmo: "Hay muchas inscripciones al mismo tiempo. Intenta de nuevo en unos minutos."
  };

  function avisar(msg) {
    var a = $("aviso");
    a.textContent = msg;
    a.hidden = !msg;
  }

  function enviar(e) {
    e.preventDefault();
    var faltan = requisitos().filter(function (r) { return !r.ok; });
    if (faltan.length) {
      avisar(faltan[0].msg);
      var el = $(faltan[0].id);
      if (el.id === "rejilla") el.querySelector(".celda").focus(); else el.focus();
      return;
    }
    avisar("");
    var b = $("boton-enviar");
    b.disabled = true;
    b.textContent = "Grabando tu nombre…";
    var datos = {
      p_gamertag: $("gamertag").value.trim(),
      p_telefono: telLimpio(),
      p_en_grupo: true,
      p_disponibilidad: disponibilidad()
    };
    rpc("aom_inscribir", datos).then(function (r) {
      if (!r || !r.ok) { avisar(ERRORES[r && r.error] || "No se pudo guardar. Intenta de nuevo."); return; }
      guardar({ tag: r.gamertag, tel: datos.p_telefono, disp: datos.p_disponibilidad });
      mostrarVictoria(r.gamertag, r.nuevo);
      cargar();
    }).catch(function () {
      avisar("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }).then(function () {
      b.disabled = false;
      b.textContent = "Inscribirme";
    });
  }

  function mostrarVictoria(tag, nuevo) {
    $("victoria-laurel").innerHTML = laurel("#E8B64C", true);
    $("victoria-titulo").textContent = nuevo === false ? "Listo, " + tag : "¡Estás dentro, " + tag + "!";
    $("victoria-texto").textContent = nuevo === false
      ? "Actualizamos tus datos y tus horarios."
      : "Guardamos tus horarios. Cuando arranque la liga te avisamos en el grupo contra quién juegas y cuándo coinciden.";
    $("juramento").hidden = true;
    var v = $("victoria");
    v.hidden = false;
    v.focus({ preventScroll: true });
    v.scrollIntoView({ behavior: CALMA ? "auto" : "smooth", block: "center" });
  }

  function editar() {
    var g = leer();
    if (g) {
      $("gamertag").value = g.tag || "";
      $("telefono").value = g.tel || "";
      $("en-grupo").checked = true;
      sel = {};
      Object.keys(g.disp || {}).forEach(function (d) { (g.disp[d] || []).forEach(function (h) { sel[d + "-" + h] = true; }); });
      pintarTodo();
    }
    $("victoria").hidden = true;
    $("juramento").hidden = false;
    $("gamertag").focus();
  }

  /* ---------- Datos públicos ---------- */
  var FMT = new Intl.DateTimeFormat("es-MX", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City"
  });
  var FASES = { liga: "Liga", cuartos: "Cuartos de final", semi: "Semifinal", final: "Final" };
  var ESTADOS = { confirmada: "Confirmado", por_confirmar: "Por confirmar", por_agendar: "Por agendar" };

  function cuando(p) {
    if (p.programada_para) return FMT.format(new Date(p.programada_para));
    return p.fase === "liga" ? "Jornada " + (p.jornada || "") : FASES[p.fase];
  }

  function franjas(comun) {
    var out = [];
    Object.keys(comun || {}).sort().forEach(function (d) {
      rangos(comun[d]).forEach(function (r) { out.push(DIAS[+d] + " " + r); });
    });
    return out;
  }

  function tabla(jug, partidas) {
    var por = {};
    jug.forEach(function (j) { por[j.id] = { id: j.id, nombre: j.gamertag, pj: 0, g: 0, p: 0, hist: [] }; });
    var liga = partidas.filter(function (p) { return p.fase === "liga"; });
    var jugadas = liga.filter(function (p) { return p.estado === "jugada"; });
    var h2h = {};
    jugadas.forEach(function (p) {
      var w = p.ganador, l = w === p.a ? p.b : p.a;
      if (!por[w] || !por[l]) return;
      por[w].pj++; por[w].g++; por[w].hist.push(true);
      por[l].pj++; por[l].p++; por[l].hist.push(false);
      h2h[w + "|" + l] = true;
    });
    var orden = Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) {
      if (b.g !== a.g) return b.g - a.g;
      if (h2h[a.id + "|" + b.id]) return -1;
      if (h2h[b.id + "|" + a.id]) return 1;
      if (a.p !== b.p) return a.p - b.p;
      return a.nombre.localeCompare(b.nombre, "es");
    });
    return { orden: orden, liga: liga, jugadas: jugadas };
  }

  function clasifican(n) { return n >= 8 ? 8 : n >= 4 ? 4 : 0; }

  function pintarTabla(jug, t) {
    var cuerpo = $("tabla-cuerpo");
    var yo = (leer() || {}).tag;
    if (!jug.length) {
      cuerpo.innerHTML = '<div class="vacio-caja"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">' + laurel("#E8B64C") + '</svg><p>Nadie se ha inscrito todavía. El primer nombre en el mármol puede ser el tuyo.</p><a class="boton boton--oro" href="#inscripcion">Inscribirme</a></div>';
      return;
    }
    if (!t.liga.length) {
      cuerpo.innerHTML = '<div class="vacio-caja" style="align-items:stretch;text-align:left"><p><b style="color:var(--oro-claro)">' + jug.length + (jug.length === 1 ? " guerrero inscrito" : " guerreros inscritos") + ".</b> La tabla se llena cuando arranque la liga.</p><div class=\"chips\">" +
        jug.map(function (j) { return '<span class="chip-jugador">' + esc(j.gamertag) + "</span>"; }).join("") + "</div></div>";
      return;
    }
    var k = clasifican(t.orden.length), hay = t.jugadas.length > 0;
    var colores = ["#E8B64C", "#C9D1DE", "#C98A4B"];
    var filas = t.orden.map(function (r, i) {
      var pos = i + 1;
      var lugar = hay && i < 3
        ? '<span class="medalla" title="' + pos + 'º lugar"><svg viewBox="0 0 64 64" aria-hidden="true">' + laurel(colores[i]) + '</svg><b style="color:' + colores[i] + '">' + pos + "</b></span>"
        : '<span class="lugar ' + (hay && i < k ? "lugar--dentro" : "lugar--fuera") + '">' + pos + "</span>";
      var racha = r.hist.slice(-5).map(function (w) { return w ? '<i class="g" title="Ganó">G</i>' : '<i class="p" title="Perdió">P</i>'; }).join("");
      var fila = '<tr class="' + (yo && yo.toLowerCase() === r.nombre.toLowerCase() ? "tu" : "") + '"><td class="pos">' + lugar + '</td><td class="izq nombre">' + esc(r.nombre) + "</td><td>" + r.pj + "</td><td>" + r.g + "</td><td>" + r.p + '</td><td class="pts">' + r.g + '</td><td class="izq"><span class="racha">' + (racha || '<span class="nota">Sin jugar</span>') + "</span></td></tr>";
      if (hay && k && i === k - 1 && t.orden.length > k) fila += '<tr class="corte"><td colspan="7"><span>Hasta aquí pasan a la eliminatoria</span></td></tr>';
      return fila;
    }).join("");
    cuerpo.innerHTML = '<div class="tabla-caja"><table class="tabla"><caption class="sr">Tabla general de la liga</caption><thead><tr><th scope="col">Lugar</th><th scope="col" class="izq">Jugador</th><th scope="col"><abbr title="Partidas jugadas">PJ</abbr></th><th scope="col"><abbr title="Ganadas">G</abbr></th><th scope="col"><abbr title="Perdidas">P</abbr></th><th scope="col">Puntos</th><th scope="col" class="izq">Últimas</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      '<div class="leyenda-tabla nota"><span>' + t.jugadas.length + " de " + t.liga.length + " duelos de liga jugados.</span><span>Empate en puntos: desempata el duelo directo.</span></div>";
  }

  function tarjetaDuelo(p, nombres) {
    var fr = franjas(p.comun);
    var comun = fr.length
      ? '<div class="duelo__comun"><span>Horarios en común</span><div class="chips">' + fr.map(function (f) { return '<span class="franja">' + f + "</span>"; }).join("") + "</div></div>"
      : '<p class="duelo__sin">No coinciden sus horarios: lo arreglamos en el grupo.</p>';
    return '<article class="duelo"><div class="duelo__cab"><span class="duelo__cuando">' + esc(cuando(p)) + '</span><span class="estado estado--' + p.estado + '">' + ESTADOS[p.estado] + "</span></div>" +
      (p.fase !== "liga" ? '<span class="fase">' + FASES[p.fase] + "</span>" : "") +
      '<div class="duelo__vs"><b>' + esc(nombres[p.a] || "?") + '</b><svg aria-hidden="true"><use href="#i-espadas"/></svg><b>' + esc(nombres[p.b] || "?") + "</b></div>" +
      comun + (p.nota ? '<p class="duelo__nota">' + esc(p.nota) + "</p>" : "") + "</article>";
  }

  function pintarDuelos(partidas, nombres) {
    var cuerpo = $("duelos-cuerpo");
    if (!partidas.length) {
      cuerpo.innerHTML = '<div class="vacio-caja"><svg width="48" height="48" aria-hidden="true" style="color:var(--terracota)"><use href="#i-espadas"/></svg><p>La liga arranca cuando cierre la inscripción. Aquí vas a ver contra quién te toca y en qué horas coinciden.</p></div>';
      return;
    }
    var pend = partidas.filter(function (p) { return p.estado !== "jugada"; }).sort(function (a, b) {
      if (a.programada_para && b.programada_para) return a.programada_para < b.programada_para ? -1 : 1;
      if (a.programada_para) return -1;
      if (b.programada_para) return 1;
      return (a.jornada || 99) - (b.jornada || 99);
    });
    var hechas = partidas.filter(function (p) { return p.estado === "jugada"; }).reverse();
    var html = [];
    if (pend.length) {
      html.push('<div class="bloque"><h3 class="subtitulo">Por jugar</h3><div class="duelos" id="lista-pend">' + pend.slice(0, 6).map(function (p) { return tarjetaDuelo(p, nombres); }).join("") + "</div>");
      if (pend.length > 6) html.push('<button type="button" class="boton boton--linea ver-mas" id="ver-mas">Ver los ' + pend.length + " duelos pendientes</button>");
      html.push("</div>");
    }
    if (hechas.length) {
      html.push('<div class="bloque"><h3 class="subtitulo">Resultados</h3><ul class="resultados">' + hechas.slice(0, 12).map(function (p) {
        var w = p.ganador, l = w === p.a ? p.b : p.a;
        return "<li><span><strong>" + esc(nombres[w]) + "</strong> venció a " + esc(nombres[l]) + '</span><span class="nota">' + esc(p.fase === "liga" ? "Jornada " + p.jornada : FASES[p.fase]) + "</span></li>";
      }).join("") + "</ul></div>");
    }
    cuerpo.innerHTML = html.join("");
    var vm = $("ver-mas");
    if (vm) vm.addEventListener("click", function () {
      $("lista-pend").innerHTML = pend.map(function (p) { return tarjetaDuelo(p, nombres); }).join("");
      vm.remove();
    });
  }

  function pintarMatriz(t) {
    var bloque = $("matriz-bloque");
    if (!t.liga.length) { bloque.hidden = true; return; }
    bloque.hidden = false;
    var res = {};
    t.liga.forEach(function (p) {
      if (p.estado === "jugada") {
        var l = p.ganador === p.a ? p.b : p.a;
        res[p.ganador + "|" + l] = "G"; res[l + "|" + p.ganador] = "P";
      } else { res[p.a + "|" + p.b] = "F"; res[p.b + "|" + p.a] = "F"; }
    });
    var cab = "<tr><th></th>" + t.orden.map(function (c) { return '<th scope="col" title="' + esc(c.nombre) + '">' + esc(c.nombre.slice(0, 3).toUpperCase()) + "</th>"; }).join("") + "</tr>";
    var filas = t.orden.map(function (r) {
      return '<tr><th scope="row" class="fila">' + esc(r.nombre) + "</th>" + t.orden.map(function (c) {
        if (r.id === c.id) return '<td class="m-x"><span class="sr">—</span></td>';
        var v = res[r.id + "|" + c.id];
        if (v === "G") return '<td class="m-g" title="' + esc(r.nombre) + " le ganó a " + esc(c.nombre) + '">G</td>';
        if (v === "P") return '<td class="m-p" title="' + esc(r.nombre) + " perdió con " + esc(c.nombre) + '">P</td>';
        return '<td class="m-f" title="Por jugar">•</td>';
      }).join("") + "</tr>";
    }).join("");
    $("matriz").innerHTML = '<table class="matriz"><caption class="sr">Resultados de todos contra todos</caption><thead>' + cab + "</thead><tbody>" + filas + "</tbody></table>";
  }

  function pintarLlave(t, partidas, nombres) {
    var n = t.orden.length, k = clasifican(n) || 8;
    var proyectar = t.jugadas.length > 0 && n >= 4;
    var fase = function (f) { return partidas.filter(function (p) { return p.fase === f; }).sort(function (a, b) { return (a.jornada || 0) - (b.jornada || 0); }); };
    var semilla = function (s) { return proyectar && t.orden[s - 1] ? t.orden[s - 1].nombre : s + "º de la tabla"; };
    var cruces = k === 8 ? [[1, 8], [4, 5], [2, 7], [3, 6]] : [[1, 4], [2, 3]];

    function caja(a, b, sa, sb, p) {
      var ga = p && p.estado === "jugada" ? (p.ganador === p.a ? "gana" : "gris") : "";
      var gb = p && p.estado === "jugada" ? (p.ganador === p.b ? "gana" : "gris") : "";
      return '<div class="cruce"><div class="' + ga + '">' + (sa ? "<i>" + sa + "</i>" : "") + "<span>" + esc(a) + '</span></div><div class="' + gb + '">' + (sb ? "<i>" + sb + "</i>" : "") + "<span>" + esc(b) + "</span></div></div>";
    }
    function ronda(nombre, clase, cajas) {
      var pares = [];
      for (var i = 0; i < cajas.length; i += 2) {
        pares.push('<div class="par' + (cajas.length === 1 ? " par--sola" : "") + '">' + cajas.slice(i, i + 2).join("") + "</div>");
      }
      return '<div class="ronda ' + clase + '"><div class="ronda__nombre">' + nombre + '</div><div class="ronda__partidos">' + pares.join("") + "</div></div>";
    }

    var html = [];
    var primera = k === 8 ? "cuartos" : "semi";
    var reales = fase(primera);
    html.push(ronda(k === 8 ? "Cuartos de final" : "Semifinales", "", cruces.map(function (c, i) {
      var p = reales[i];
      return p ? caja(nombres[p.a], nombres[p.b], c[0], c[1], p) : caja(semilla(c[0]), semilla(c[1]), c[0], c[1]);
    })));
    if (k === 8) {
      var semis = fase("semi");
      html.push(ronda("Semifinales", "", [0, 1].map(function (i) {
        var p = semis[i];
        var c1 = cruces[i * 2], c2 = cruces[i * 2 + 1];
        return p ? caja(nombres[p.a], nombres[p.b], "", "", p)
          : caja("Ganador " + c1[0] + "º–" + c1[1] + "º", "Ganador " + c2[0] + "º–" + c2[1] + "º");
      })));
    }
    var fin = fase("final")[0];
    html.push(ronda("Final", "ronda--final", [fin ? caja(nombres[fin.a], nombres[fin.b], "", "", fin) : caja("Ganador semifinal 1", "Ganador semifinal 2")]));
    var campeon = fin && fin.estado === "jugada" ? nombres[fin.ganador] : "Por definir";
    html.push('<div class="campeon"><div class="ronda__nombre">Campeón</div><div class="campeon__caja"><svg viewBox="0 0 64 64" aria-hidden="true">' + laurel("#E8B64C") + '<use href="#i-rayo" x="22" y="18" width="20" height="26" style="color:#F6D98A"/></svg><b class="oro-texto">' + esc(campeon) + "</b></div></div>");
    $("llave").innerHTML = html.join("");
    $("llave").style.minWidth = k === 8 ? "1080px" : "810px";

    if (proyectar && !reales.length) $("eli-intro").textContent = "Así quedarían los cruces si la liga terminara hoy. El 1º se enfrenta al último que clasifica, así los favoritos se cruzan hasta el final.";
  }

  function pintarVivo(jug, t, cfg) {
    var n = jug.length, txt;
    if (!n) txt = "Las inscripciones están abiertas. Sé el primero en entrar.";
    else {
      txt = "<b>" + n + "</b> " + (n === 1 ? "guerrero inscrito" : "guerreros inscritos");
      if (t.liga.length) txt += " y <b>" + t.jugadas.length + "</b> de " + t.liga.length + " duelos jugados";
      txt += ".";
    }
    if (cfg && cfg.cierre_inscripcion && !t.liga.length) {
      var f = new Date(cfg.cierre_inscripcion + "T12:00:00");
      txt += " Inscripciones hasta el " + f.toLocaleDateString("es-MX", { day: "numeric", month: "long" }) + ".";
    }
    $("vivo").innerHTML = txt;
  }

  function cargar() {
    return rpc("aom_publico").then(function (d) {
      var jug = d.jugadores || [], partidas = d.partidas || [], cfg = d.config || {};
      var nombres = {};
      jug.forEach(function (j) { nombres[j.id] = j.gamertag; });
      var t = tabla(jug, partidas);
      pintarVivo(jug, t, cfg);
      pintarTabla(jug, t);
      pintarDuelos(partidas, nombres);
      pintarMatriz(t);
      pintarLlave(t, partidas, nombres);
      if (cfg.grupo_url) {
        $("grupo-link").href = cfg.grupo_url;
        $("grupo-link").hidden = false;
        $("grupo-falta").hidden = true;
      }
    }).catch(function () {
      $("tabla-cuerpo").innerHTML = '<p class="aviso">No pudimos cargar la tabla. Recarga la página en un momento.</p>';
      $("duelos-cuerpo").innerHTML = "";
      pintarLlave({ orden: [], jugadas: [], liga: [] }, [], {});
    });
  }

  /* ---------- Arranque ---------- */
  cielo();
  rayos();
  construirRejilla();
  resumen();
  pintarLlave({ orden: [], jugadas: [], liga: [] }, [], {});
  ["gamertag", "telefono", "en-grupo"].forEach(function (id) {
    $(id).addEventListener("input", checar);
    $(id).addEventListener("change", checar);
  });
  document.querySelectorAll("[data-atajo]").forEach(function (b) {
    b.addEventListener("click", function () { atajo(b.dataset.atajo); });
  });
  $("juramento").addEventListener("submit", enviar);
  $("editar").addEventListener("click", editar);

  var previo = leer();
  if (previo && previo.tag) {
    $("victoria-laurel").innerHTML = laurel("#E8B64C", false);
    $("victoria-titulo").textContent = "Ya estás inscrito, " + previo.tag;
    $("victoria-texto").textContent = "Si cambió tu agenda, actualiza tus horarios con el mismo WhatsApp.";
    $("juramento").hidden = true;
    $("victoria").hidden = false;
  }

  cargar();
})();
