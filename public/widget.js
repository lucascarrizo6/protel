(function () {
  var currentScript = document.currentScript;

  if (!currentScript) {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("/widget.js") !== -1) {
        currentScript = scripts[i];
        break;
      }
    }
  }

  if (!currentScript) {
    console.error("[Protel widget] No se pudo encontrar el <script> del widget.");
    return;
  }

  var hotelSlug = currentScript.getAttribute("data-hotel");

  if (!hotelSlug) {
    console.error("[Protel widget] Falta el atributo data-hotel en el <script>.");
    return;
  }

  var origin;
  try {
    origin = new URL(currentScript.src).origin;
  } catch (error) {
    console.error("[Protel widget] No se pudo determinar el origen del script.");
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/reservar/" + encodeURIComponent(hotelSlug) + "?embed=true";
  iframe.style.width = "100%";
  iframe.style.height = "700px";
  iframe.style.border = "none";
  iframe.setAttribute("title", "Reservar habitación");

  currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
})();
