/* Demos en vivo de /plataformas.
 *
 * Son las mismas mecánicas que corren en las landings de los tres productos,
 * reescritas en JS plano: sin framework, sin build y sin GIF. Un GIF pesa
 * megas, se pixela y miente en cuanto el producto cambia; esto son unos KB y
 * es la mecánica de verdad.
 *
 * Cada demo se arranca sólo cuando entra en pantalla y se detiene al salir:
 * tres temporizadores corriendo en una pestaña de fondo gastan batería del
 * teléfono de alguien que ya no está mirando.
 */
(function () {
  'use strict';

  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Monta el demo la primera vez que entra en pantalla y a partir de ahí sólo
     lo arranca y lo para. Montar en cada entrada duplicaría el DOM: quien baja,
     sube y vuelve a bajar acabaría con dieciséis filas en una tabla de ocho. */
  function alEntrar(nodo, montar) {
    var ctrl = null, corriendo = false;
    function asegurar() { if (!ctrl) ctrl = montar() || {}; }

    if (!('IntersectionObserver' in window)) {
      asegurar();
      if (ctrl.start) ctrl.start();
      return;
    }

    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          asegurar();
          if (!corriendo && ctrl.start) { ctrl.start(); corriendo = true; }
        } else if (corriendo && ctrl.stop) {
          ctrl.stop();
          corriendo = false;
        }
      });
    }, { threshold: 0.15 });

    io.observe(nodo);
  }

  /* ===================== 1. Padel Crown — la tabla viva ==================== */

  var PAREJAS = [
    ['p1', 'Rivera / Solís'], ['p2', 'Cantú / Mejía'],
    ['p3', 'Del Valle / Otero'], ['p4', 'Barrera / Quintana'],
    ['p5', 'Escobar / Lira'], ['p6', 'Navarro / Peña'],
    ['p7', 'Alcántara / Vega'], ['p8', 'Fuentes / Zamora']
  ];

  /* El guion real de la landing de Padel Crown: los marcadores en el orden en
     que se capturan. No están escritos los puestos, sólo los resultados; el
     orden sale de sumarlos, igual que en un torneo. */
  var GUION = [
    ['p1', 'p2', 4, 2], ['p3', 'p5', 3, 3], ['p4', 'p6', 6, 0], ['p7', 'p8', 2, 4],
    ['p1', 'p4', 3, 3], ['p3', 'p8', 5, 1], ['p5', 'p2', 5, 1], ['p6', 'p7', 4, 2]
  ];

  var ALTO = 44, CLASIFICAN = 4, MS_PASO = 2600;

  function tablaEn(paso) {
    var st = {}, i;
    for (i = 0; i < PAREJAS.length; i++) st[PAREJAS[i][0]] = { id: PAREJAS[i][0], nom: PAREJAS[i][1], pj: 0, saldo: 0 };
    var jugados = GUION.slice(0, paso);
    jugados.forEach(function (m) {
      var A = st[m[0]], B = st[m[1]];
      A.pj++; B.pj++; A.saldo += m[2] - m[3]; B.saldo += m[3] - m[2];
    });
    var orden = PAREJAS.map(function (p) { return st[p[0]]; });
    orden.sort(function (x, y) {
      if (y.saldo !== x.saldo) return y.saldo - x.saldo;
      // Empate a saldo: manda el partido entre ellas, si ya se jugó.
      for (var k = 0; k < jugados.length; k++) {
        var m = jugados[k];
        if ((m[0] === x.id && m[1] === y.id) || (m[0] === y.id && m[1] === x.id)) {
          var gx = m[0] === x.id ? m[2] : m[3], gy = m[0] === x.id ? m[3] : m[2];
          if (gx !== gy) return gy - gx;
        }
      }
      return 0;
    });
    return orden;
  }

  function demoTabla(raiz) {
    var pista = raiz.querySelector('[data-pista]');
    var prog = raiz.querySelector('[data-prog]');
    var filas = {};

    PAREJAS.forEach(function (p) {
      var el = document.createElement('div');
      el.className = 'pc-fila';
      el.innerHTML = '<span class="pos"></span><span class="nom"></span>' +
                     '<span class="pj"></span><span class="saldo"></span>';
      el.querySelector('.nom').textContent = p[1];
      pista.appendChild(el);
      filas[p[0]] = el;
    });

    pista.style.height = PAREJAS.length * ALTO + 'px';
    raiz.querySelector('.pc-corte').style.top = CLASIFICAN * ALTO + 'px';

    function pintar(paso) {
      var t = tablaEn(paso), jug = 0;
      t.forEach(function (f, i) {
        var el = filas[f.id];
        el.style.transform = 'translateY(' + i * ALTO + 'px)';
        el.classList.toggle('dentro', i < CLASIFICAN);
        el.querySelector('.pos').textContent = i + 1;
        el.querySelector('.pj').textContent = f.pj;
        var s = el.querySelector('.saldo');
        s.textContent = (f.saldo > 0 ? '+' : '') + f.saldo;
        s.className = 'saldo' + (f.saldo > 0 ? ' pos' : f.saldo < 0 ? ' neg' : '');
        jug += f.pj;
      });
      jug = jug / 2;
      prog.textContent = jug === 0 ? 'Por empezar' : jug + ' de ' + GUION.length + ' partidos';
    }

    if (quieto) { pintar(GUION.length); return {}; }

    var paso = 0, id = null;
    pintar(0);

    function tick() {
      paso = paso >= GUION.length ? 0 : paso + 1;
      pintar(paso);
      id = setTimeout(tick, paso === 0 ? 1400 : MS_PASO);
    }

    return {
      start: function () { if (id === null) id = setTimeout(tick, 1400); },
      stop: function () { clearTimeout(id); id = null; }
    };
  }

  /* ================== 2. Pasas.mx — la pista, jugable ===================== */

  var RESPUESTA = 66;
  var PISTAS = [
    'Empieza por el total. Son 3 ranuras y cada una guarda 27 bloques.',
    '3 × 27 = 81 bloques en total. Ahora quítale los que sacaste.',
    'La operación completa es: 81 − 15'
  ];
  var SOLUCION = ['3 × 27 = 81 bloques en total', '81 − 15 = 66 bloques'];

  function demoPistas(raiz) {
    var input = raiz.querySelector('[data-resp]');
    var revisar = raiz.querySelector('[data-revisar]');
    var pedir = raiz.querySelector('[data-pedir]');
    var lista = raiz.querySelector('[data-pistas]');
    var fb = raiz.querySelector('[data-fb]');
    var usadas = 0, resuelto = false;

    function soltarPista() {
      if (usadas >= PISTAS.length) return;
      var p = document.createElement('p');
      p.className = 'px-pista';
      p.textContent = PISTAS[usadas];
      lista.appendChild(p);
      usadas++;
      pedir.textContent = usadas < PISTAS.length
        ? '💡 Otra pista (' + (PISTAS.length - usadas) + ')'
        : 'Ver la respuesta completa';
    }

    function soltarSolucion() {
      SOLUCION.forEach(function (linea) {
        var p = document.createElement('p');
        p.className = 'px-pista px-sol';
        p.textContent = linea;
        lista.appendChild(p);
      });
      pedir.disabled = true;
      pedir.textContent = 'Ya viste todas las pistas';
    }

    pedir.addEventListener('click', function () {
      if (resuelto) return;
      if (usadas < PISTAS.length) soltarPista();
      else soltarSolucion();
    });

    revisar.addEventListener('click', function () {
      if (resuelto) return;
      var v = parseInt(String(input.value).replace(/[^0-9-]/g, ''), 10);
      if (isNaN(v)) { fb.className = 'px-fb'; fb.textContent = 'Escribe un número.'; return; }
      if (v === RESPUESTA) {
        resuelto = true;
        fb.className = 'px-fb ok';
        fb.textContent = '¡Correcto! Así se siente el producto.';
        pedir.disabled = true;
      } else {
        fb.className = 'px-fb no';
        fb.textContent = 'No es. Te dejo una pista — no la respuesta.';
        // Fallar consume la MISMA lista que pedir, en orden: es lo que hace el producto.
        if (usadas < PISTAS.length) soltarPista(); else soltarSolucion();
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); revisar.click(); }
    });
  }

  /* ================ 3. Consulta — el hueco que se libera solo ============== */

  var HORAS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
  var OCUPADAS = { '09:00': 1, '12:00': 1 };
  var FANTASMA = '11:00';

  function demoHuecos(raiz) {
    var grid = raiz.querySelector('[data-slots]');
    var log = raiz.querySelector('[data-log]');
    var celdas = {};

    HORAS.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'cs-slot ' + (OCUPADAS[h] ? 'ocupado' : 'libre');
      el.innerHTML = '<span class="h"></span><span class="e"></span>';
      el.querySelector('.h').textContent = h;
      el.querySelector('.e').textContent = OCUPADAS[h] ? 'Ocupado' : 'Libre';
      grid.appendChild(el);
      celdas[h] = el;
    });

    function estado(h, clase, etiqueta) {
      var el = celdas[h];
      el.className = 'cs-slot ' + clase;
      el.querySelector('.e').textContent = etiqueta;
    }

    if (quieto) {
      estado(FANTASMA, 'libre', 'Libre');
      log.innerHTML = 'Las 11:00 se apartaron y no se pagaron. ' +
        'El proceso nocturno <b>las liberó solo</b>, sin que nadie se acordara.';
      return {};
    }

    var temporizadores = [], intervalo = null;
    function espera(ms, fn) { temporizadores.push(setTimeout(fn, ms)); }

    function limpiar() {
      temporizadores.forEach(clearTimeout);
      temporizadores = [];
      if (intervalo) { clearInterval(intervalo); intervalo = null; }
    }

    function vuelta() {
      estado(FANTASMA, 'libre', 'Libre');
      log.innerHTML = '&nbsp;';

      espera(1200, function () {
        estado(FANTASMA, 'apartado', 'Apartado');
        log.innerHTML = 'Alguien aparta las <b>11:00</b> y no termina de pagar.';
      });

      espera(2600, function () {
        var restante = 8;
        intervalo = setInterval(function () {
          restante--;
          if (restante <= 0) { clearInterval(intervalo); intervalo = null; return; }
          celdas[FANTASMA].querySelector('.e').textContent = 'Libera en 0:0' + restante;
        }, 700);
      });

      espera(8200, function () {
        estado(FANTASMA, 'libre recien', 'Libre');
        log.innerHTML = 'El proceso nocturno <b>lo liberó solo</b>. ' +
          'Nadie tuvo que acordarse, y el horario no se perdió.';
      });

      espera(13000, vuelta);
    }

    return {
      start: function () { limpiar(); vuelta(); },
      stop: limpiar
    };
  }

  /* ---------------------------- arranque ---------------------------------- */

  var MONTAR = { tabla: demoTabla, pistas: demoPistas, huecos: demoHuecos };

  document.querySelectorAll('[data-demo]').forEach(function (raiz) {
    var fn = MONTAR[raiz.getAttribute('data-demo')];
    if (!fn) return;
    if (raiz.getAttribute('data-demo') === 'pistas') { fn(raiz); return; } // interactiva, no cíclica
    alEntrar(raiz, function () { return fn(raiz); });
  });
})();

/* Selector de giro de la tabla de traducción.
 *
 * La tabla comparaba cinco industrias a la vez. En escritorio eso es el
 * argumento —"lo mismo, con otro nombre"— pero en un teléfono eran cinco
 * columnas que había que arrastrar de lado, justo en el momento en que el
 * visitante tiene que verse a sí mismo. Le pedía trabajo donde había que
 * dárselo hecho.
 *
 * Ahora elige su giro: en escritorio la tabla sigue entera y su columna se
 * destaca, así que la comparación no se pierde; en pantalla angosta la tabla
 * desaparece y queda una sola columna hablándole a él.
 */
(function () {
  'use strict';

  var chips = document.querySelector('[data-giros]');
  var destino = document.querySelector('[data-xsingle]');
  var tabla = document.querySelector('.xtable');
  if (!chips || !destino || !tabla) return;

  /* Qué es cada fila. En la tabla el encabezado de columna da el contexto;
     en una sola columna no hay con qué comparar, así que la fila se nombra. */
  var FILAS = [
    ['Lo que se agenda',              ['Canchas y horarios', 'Sillones y gabinetes', 'Consultorios y terapeutas', 'Aulas y profesores', 'Abogados y audiencias']],
    ['Cómo entra el dinero',     ['Inscripción con cobro', 'Cita con anticipo', 'Paquete de sesiones', 'Inscripción y colegiatura', 'Iguala mensual']],
    ['Lo que tu cliente necesita saber', ['«Tu cancha va 40 min tarde»', '«El doctor va retrasado»', 'Recordatorio de sesión', 'Aviso de cambio de salón', 'Aviso de término']],
    ['Lo que se anota después',  ['Resultado en cancha', 'Nota clínica en el sillón', 'Nota de sesión', 'Calificación y asistencia', 'Avance del expediente']],
    ['Lo que queda guardado',         ['Ranking entre organizadores', 'Historial entre sedes', 'Expediente del paciente', 'Expediente del alumno', 'Historial del caso']],
    ['A dónde va el dinero',     ['Comisión al club', 'Cobro directo al consultorio', 'Cobro directo a la clínica', 'Cobro directo a la escuela', 'Cobro directo al despacho']]
  ];

  var NOMBRE = ['un torneo', 'un consultorio', 'una clínica', 'una escuela', 'un despacho'];

  function elegir(i) {
    // Estado de los botones.
    var botones = chips.querySelectorAll('.giro');
    for (var k = 0; k < botones.length; k++) {
      var activo = Number(botones[k].getAttribute('data-giro')) === i;
      botones[k].classList.toggle('on', activo);
      botones[k].setAttribute('aria-pressed', activo ? 'true' : 'false');
    }

    // La columna elegida se destaca; las otras se atenúan pero siguen ahí.
    tabla.setAttribute('data-foco', String(i + 1));

    // Una sola columna, para pantalla angosta.
    var html = '<p class="xsingle-intro">En <b>' + NOMBRE[i] + '</b>, lo mismo se llama así:</p>';
    for (var f = 0; f < FILAS.length; f++) {
      html += '<div class="xrow"><span class="mono xrow-lbl"></span><span class="xrow-val"></span></div>';
    }
    destino.innerHTML = html;
    var filas = destino.querySelectorAll('.xrow');
    for (var j = 0; j < FILAS.length; j++) {
      filas[j].querySelector('.xrow-lbl').textContent = FILAS[j][0];
      filas[j].querySelector('.xrow-val').textContent = FILAS[j][1][i];
      filas[j].style.setProperty('--d', (j * 45) + 'ms');
    }
  }

  chips.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.giro') : null;
    if (b) elegir(Number(b.getAttribute('data-giro')));
  });

  // Arranca en consultorio: es el giro más cercano a quien llega a esta página.
  elegir(1);
})();
