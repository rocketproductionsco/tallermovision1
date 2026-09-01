/*
 * main.js
 * -------
 * Arranca el sistema de partículas y el router, y registra las páginas
 * existentes. Para agregar la Página 3 más adelante:
 *
 *   1. crear js/pages/pagina3.js con TD.pages.createPagina3(...)
 *   2. incluir el <script> en index.html
 *   3. nav.register(TD.pages.createPagina3(field, nav));
 *
 * No hace falta tocar particles.js, navigation.js, portada.js ni sistemas.js.
 */
(function(){
  "use strict";

  const canvas=document.getElementById("td-canvas");
  const contentRoot=document.getElementById("td-content");

  const field=new TD.ParticleField(canvas);
  field.init();
  field.start();

  const nav=new TD.Navigator(contentRoot);

  // Barrido lateral SOLO al cambiar de página/temática.
  // Los estados internos de Página 2 siguen usando su viaje radial/vórtice.
  nav.onPageChange=(fromIndex,toIndex)=>{
    const direction=toIndex>fromIndex ? 1 : -1;
    field.playPageTravel(direction,900);
  };

  nav.register(TD.pages.createPortada(field, nav));
  nav.register(TD.pages.createSistemas(field, nav));
  nav.register(TD.pages.createInteractuar(field, nav));
  nav.register(TD.pages.createInput(field, nav));
  nav.register(TD.pages.createProceso(field, nav));
  nav.register(TD.pages.createOutput(field, nav));
  nav.register(TD.pages.createCiclo(field, nav));
  nav.register(TD.pages.createTouchDesigner(field, nav));
  nav.register(TD.pages.createNodos(field, nav));
  nav.register(TD.pages.createTiposOperadores(field, nav));
  nav.register(TD.pages.createPrimerSistema(field, nav));
  // Próximas páginas se registran aquí, en orden:
  // nav.register(TD.pages.createPagina3(field, nav));

  nav.init(0);

})();
