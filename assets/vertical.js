/* Verticales de /plataformas/: personalización, formulario y flotante.
 *
 * ?problema=<clave>  sube ese módulo (y su tarjeta) al primer lugar. Así el
 *                    correo de una clínica con aseguradoras abre en
 *                    aseguradoras. Claves: data-mod de cada sección; los
 *                    alias de abajo aceptan cómo se escribe en un correo.
 * El formulario no va a ningún servidor: arma el mensaje y abre WhatsApp
 * (o el correo). Nada de datos de pacientes en el camino.
 */
(function () {
  var ALIAS = {
    seguros: "seguros", aseguradoras: "seguros", aseguradora: "seguros", cartapase: "seguros",
    sesiones: "sesiones", paquetes: "sesiones",
    leads: "leads", marketing: "leads", captacion: "leads",
    cancelaciones: "cancelaciones", citas: "cancelaciones",
    evolucion: "evolucion", progreso: "evolucion",
    ejercicios: "ejercicios", casa: "ejercicios",
    multidisciplinario: "multidisciplinario", equipo: "multidisciplinario",
    sucursales: "sucursales", sedes: "sucursales",
    portal: "portal", familia: "portal"
  };
  var track = function (ev, det) { if (window.bdTrack) window.bdTrack(ev, det); };

  // ---------- ?problema= ----------
  var q = new URLSearchParams(location.search);
  var clave = ALIAS[(q.get("problema") || "").toLowerCase().replace(/[^a-z]/g, "")];
  if (clave) {
    var mods = document.querySelectorAll("[data-mod]");
    var primero = mods[0], elegido = document.querySelector('[data-mod="' + clave + '"]');
    if (elegido && primero && elegido !== primero) primero.parentNode.insertBefore(elegido, primero);
    if (elegido) elegido.classList.add("destacado");

    var card = document.querySelector('[data-card="' + clave + '"]');
    if (card && card.parentNode.firstElementChild !== card) card.parentNode.insertBefore(card, card.parentNode.firstElementChild);
  }

  // ---------- celular: tarjetas restantes detrás de un botón ----------
  var mas = document.getElementById("pcardsMas");
  if (mas) mas.addEventListener("click", function () {
    document.getElementById("pcards").classList.remove("compacta");
    mas.remove();
    track("clic", "problemas:ver-mas");
  });

  // ---------- formulario → WhatsApp o correo ----------
  var form = document.getElementById("vform");
  if (form) {
    var empezado = false;
    form.addEventListener("focusin", function () {
      if (!empezado) { empezado = true; track("clic", "form:empezado"); }
    });
    function mensaje() {
      var v = function (n) { return (form.elements[n].value || "").trim(); };
      var partes = ["Hola Bodgar. Vi la página de " + (form.dataset.giro || "plataformas") + "."];
      if (v("nombre")) partes.push("Soy " + v("nombre") + (v("clinica") ? ", de " + v("clinica") : "") + ".");
      else if (v("clinica")) partes.push("Escribo de " + v("clinica") + ".");
      if (v("sitio")) partes.push("Sitio: " + v("sitio"));
      partes.push("Lo que queremos dejar de hacer a mano: " + v("proceso"));
      return partes.join("\n");
    }
    function valido() {
      var ok = (form.elements.proceso.value || "").trim().length >= 5;
      form.querySelector(".aviso").hidden = ok;
      if (!ok) form.elements.proceso.focus();
      return ok;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valido()) return;
      track("clic", "form:whatsapp");
      window.open("https://wa.me/525527149106?text=" + encodeURIComponent(mensaje()), "_blank", "noopener");
    });
    var porCorreo = document.getElementById("vformCorreo");
    if (porCorreo) porCorreo.addEventListener("click", function (e) {
      e.preventDefault();
      if (!valido()) return;
      track("clic", "form:correo");
      location.href = "mailto:bodgar@bodgar.dev?subject=" + encodeURIComponent("Revisar mi proceso") +
        "&body=" + encodeURIComponent(mensaje());
    });
  }

  // ---------- flotante: fuera del hero y antes del cierre ----------
  var flota = document.getElementById("waFlota");
  var hero = document.querySelector(".hero");
  var cierre = document.querySelector(".final");
  if (flota && hero && cierre) {
    var medir = function () {
      var alto = window.innerHeight || document.documentElement.clientHeight;
      var mostrar = hero.getBoundingClientRect().bottom < alto * 0.25 &&
        cierre.getBoundingClientRect().top > alto * 0.85;
      if (mostrar === !flota.hidden) return;
      flota.hidden = !mostrar;
      if (mostrar) requestAnimationFrame(function () { flota.classList.add("visible"); });
      else flota.classList.remove("visible");
    };
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir, { passive: true });
    medir();
  }
})();
