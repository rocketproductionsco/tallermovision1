/*
 * Página 1 — Portada
 * ------------------
 * Solo contenido y wiring de esta página: texto + el click que dispara
 * el pulso visual y avanza. No toca la física de partículas directamente,
 * solo llama a la API pública del ParticleField (addPulse) y a la del
 * Navigator (next).
 */
(function(TD){
  "use strict";

  TD.pages = TD.pages || {};

  TD.pages.createPortada = function(particleField, navigator){
    let el=null;

    function onClick(e){
      particleField.addPulse(e.clientX, e.clientY);
      navigator.next(); // no-op silencioso si todavía no existe la página 2
    }

    return {
      id:"portada",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-portada";
        el.innerHTML=
          '<h1 class="td-title">TOUCHDESIGNER</h1>' +
          '<p class="td-subtitle">Electiva 2 · Ingeniería Multimedia</p>' +
          '<p class="td-footer">Clase 01 — Introducción al pensamiento visual</p>';
        root.appendChild(el);

        // La portada entra en silencio y revela el texto después de 5 s.
        // Cada elemento aparece con un pequeño desfase para que parezca que
        // las letras emergen del campo de partículas en lugar de aparecer de golpe.
        const title = el.querySelector(".td-title");
        const subtitle = el.querySelector(".td-subtitle");
        const footer = el.querySelector(".td-footer");
        title.classList.add("td-reveal-pending");
        subtitle.classList.add("td-reveal-pending");
        footer.classList.add("td-reveal-pending");

        window.setTimeout(() => {
          title.classList.add("td-reveal");
          window.setTimeout(() => subtitle.classList.add("td-reveal"), 380);
          window.setTimeout(() => footer.classList.add("td-reveal"), 760);
        }, 5000);

        window.addEventListener("click", onClick);
      },

      unmount(root){
        window.removeEventListener("click", onClick);
        if(el && el.parentNode) el.parentNode.removeChild(el);
        el=null;
      }
    };
  };

})(window.TD = window.TD || {});
