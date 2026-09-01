/*
 * Página 2 — Pensar en sistemas
 * -----------------------------
 * Modelo mental INPUT → PROCESO → OUTPUT, revelado en 5 estados internos
 * (ver Navigator.next()/prev(): esta página expone nextState()/prevState(),
 * así que las flechas/space/enter/click primero avanzan estados aquí, y
 * solo pasan a la página 3 cuando ya no queda ningún estado interno).
 *
 * Igual que portada.js: esta página solo conoce la API pública del
 * ParticleField (setAnchor/link/addPulse) y del Navigator (next). No
 * implementa su propio sistema de teclado ni de click "paralelo" — todo
 * pasa por el mismo mecanismo central.
 */
(function(TD){
  "use strict";

  TD.pages = TD.pages || {};

  // Los tres nodos del sistema, en fracción de pantalla (0..1).
  const ANCHORS={
    input:   {label:"INPUT",   nx:.16, ny:.52},
    proceso: {label:"PROCESO", nx:.50, ny:.46},
    output:  {label:"OUTPUT",  nx:.84, ny:.52}
  };

  // Conceptos satélite: offset relativo a su anchor (también en fracción de pantalla).
  const CONCEPTS={
    input:[
      {text:"CÁMARA", dx:-.045, dy:-.135},
      {text:"AUDIO",  dx:.085,  dy:-.10},
      {text:"MOUSE",  dx:-.09,  dy:.115},
      {text:"DATOS",  dx:.075,  dy:.135}
    ],
    proceso:[
      {text:"TRANSFORMAR", dx:-.11, dy:-.135},
      {text:"COMBINAR",    dx:.115, dy:-.115},
      {text:"ANALIZAR",    dx:-.115,dy:.125},
      {text:"GENERAR",     dx:.105, dy:.145}
    ],
    output:[
      {text:"IMAGEN",      dx:-.10, dy:-.165},
      {text:"VIDEO",       dx:.02,  dy:-.185},
      {text:"3D",          dx:.115, dy:-.13},
      {text:"LUZ",         dx:-.12, dy:.115},
      {text:"SONIDO",      dx:.005, dy:.175},
      {text:"INTERACCIÓN", dx:.135, dy:.09}
    ]
  };

  const STATE_COUNT=5; // 0:input 1:proceso 2:output 3:sistema completo 4:cierre
  const TRAVEL_MS=1000; // duración del "viaje" entre estados (0.8-1.2s pedido)

  TD.pages.createSistemas = function(particleField, navigator){
    let el=null;
    let stateIndex=0;
    let els=null;
    let transitioning=false; // bloquea nextState/prevState mientras dura el viaje
    let travelTimer=null;
    const revealTimers=new WeakMap();

    function pct(n){ return (n*100).toFixed(2)+"%"; }

    function makeNode(tag, className, left, top){
      const node=document.createElement(tag);
      node.className=className;
      if(left!==undefined) node.style.left=pct(left);
      if(top!==undefined) node.style.top=pct(top);
      node.classList.add("td-reveal-pending");
      return node;
    }

    // Revela/oculta un elemento de forma segura frente a navegación rápida
    // hacia adelante y atrás (cancela un reveal pendiente si se retrocede
    // antes de que dispare).
    function setRevealed(node, revealed, delay){
      const pending=revealTimers.get(node);
      if(pending) window.clearTimeout(pending);
      if(revealed){
        const id=window.setTimeout(()=>node.classList.add("td-reveal"), delay||0);
        revealTimers.set(node, id);
      } else {
        node.classList.remove("td-reveal");
      }
    }

    // Atenuación con !important vía JS: necesaria porque la animación de
    // reveal (CSS Animations) pisa un opacity puesto por style normal.
    // null = sin atenuar (vuelve al valor de la animación).
    function setDim(node, value){
      if(value===null || value===undefined){
        node.style.removeProperty("opacity");
      } else {
        node.style.setProperty("opacity", String(value), "important");
      }
    }

    function buildAnchor(key){
      const a=ANCHORS[key];
      const wrap=makeNode("p","td-anchor",a.nx,a.ny);
      const label=document.createElement("span");
      label.className="td-anchor-label";
      label.textContent=a.label;
      wrap.appendChild(label);
      return wrap;
    }

    function buildConcepts(key){
      const a=ANCHORS[key];
      return CONCEPTS[key].map(c=>{
        const node=makeNode("p","td-concept", a.nx+c.dx, a.ny+c.dy);
        node.textContent=c.text;
        return node;
      });
    }

    function onClick(e){
      particleField.addPulse(e.clientX, e.clientY);
      navigator.next();
    }

    // Recalcula TODO el estado visual a partir del índice absoluto — así
    // avanzar y retroceder son perfectamente simétricos, sin importar
    // desde qué estado se venga.
    function applyState(i){
      setRevealed(els.title, i>=0, 0);

      setRevealed(els.anchor.input, i>=0, 300);
      els.concepts.input.forEach((n,idx)=>setRevealed(n, i>=0, 560+idx*140));
      particleField.setAnchor("input", ANCHORS.input.nx, ANCHORS.input.ny, {visible:i>=0});

      setRevealed(els.anchor.proceso, i>=1, 0);
      els.concepts.proceso.forEach((n,idx)=>setRevealed(n, i>=1, 260+idx*140));
      particleField.setAnchor("proceso", ANCHORS.proceso.nx, ANCHORS.proceso.ny, {visible:i>=1});
      particleField.link("input","proceso", {progress:i>=1?1:0, visible:i>=1});

      setRevealed(els.anchor.output, i>=2, 0);
      els.concepts.output.forEach((n,idx)=>setRevealed(n, i>=2, 260+idx*120));
      particleField.setAnchor("output", ANCHORS.output.nx, ANCHORS.output.ny, {visible:i>=2});
      particleField.link("proceso","output", {progress:i>=2?1:0, visible:i>=2});

      // Estado 3: la red completa queda al frente; los conceptos satélite
      // se atenúan para que la lectura sea INPUT → PROCESO → OUTPUT y entra
      // el tagline.
      const conceptDim = i>=3 ? .30 : null;
      [...els.concepts.input, ...els.concepts.proceso, ...els.concepts.output]
        .forEach(n=>setDim(n, i>=4 ? .12 : conceptDim));
      setRevealed(els.tagline, i>=3, 500);

      // Estado 4: cierre — toda la red baja de intensidad y el texto final
      // se convierte en el foco de la página.
      const netDim = i>=4 ? .12 : null;
      setDim(els.title, netDim);
      setDim(els.anchor.input, netDim);
      setDim(els.anchor.proceso, netDim);
      setDim(els.anchor.output, netDim);
      setDim(els.tagline, netDim);
      setRevealed(els.closing, i>=4, 700);
      els.focus.classList.toggle("td-focus-overlay--active", i>=4);
    }

    // Dispara el "viaje" (empuje radial + tinte + glow, ver particles.js)
    // y aplica el nuevo estado de inmediato: los elementos nuevos emergen
    // mientras el campo todavía está en movimiento, en vez de esperar a
    // que el viaje termine. El bloqueo se libera solo, pasado TRAVEL_MS.
    function beginTravel(direction, newIndex){
      transitioning=true;
      particleField.playTravel(direction, TRAVEL_MS);
      stateIndex=newIndex;
      applyState(stateIndex);
      if(travelTimer) window.clearTimeout(travelTimer);
      travelTimer=window.setTimeout(()=>{
        transitioning=false;
        travelTimer=null;
      }, TRAVEL_MS);
    }

    return {
      id:"sistemas",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-sistemas";
        root.appendChild(el);

        els={
          // Capa de enfoque del cierre: puramente visual, sin reveal-pending
          // (no es texto que aparece, es un fondo que se oscurece/desenfoca).
          focus:document.createElement("div"),
          title:makeNode("p","td-sys-title"),
          anchor:{
            input:buildAnchor("input"),
            proceso:(()=>{
              const node=buildAnchor("proceso");
              node.classList.add("td-anchor-proceso");
              return node;
            })(),
            output:buildAnchor("output")
          },
          concepts:{
            input:buildConcepts("input"),
            proceso:buildConcepts("proceso"),
            output:buildConcepts("output")
          },
          tagline:makeNode("p","td-tagline"),
          closing:makeNode("p","td-closing")
        };

        els.focus.className="td-focus-overlay";
        els.title.textContent="PENSAR EN SISTEMAS";
        els.tagline.textContent="CREAR · CONECTAR · EXPERIMENTAR";
        els.closing.innerHTML=
          "No pensamos primero en el resultado.<br>" +
          "Pensamos en cómo construir el sistema que lo produce.";

        // El overlay va primero: en el mismo contexto de apilamiento pinta
        // debajo de todo lo que se agregue después (título, anchors,
        // conceptos, tagline y el texto de cierre quedan encima suyo).
        el.appendChild(els.focus);
        el.appendChild(els.title);
        el.appendChild(els.anchor.input);
        el.appendChild(els.anchor.proceso);
        el.appendChild(els.anchor.output);
        [...els.concepts.input, ...els.concepts.proceso, ...els.concepts.output]
          .forEach(n=>el.appendChild(n));
        el.appendChild(els.tagline);
        el.appendChild(els.closing);

        stateIndex=0;
        applyState(stateIndex);

        window.addEventListener("click", onClick);
      },

      unmount(root){
        window.removeEventListener("click", onClick);
        if(travelTimer){ window.clearTimeout(travelTimer); travelTimer=null; }
        transitioning=false;
        particleField.clearAnchors();
        if(el && el.parentNode) el.parentNode.removeChild(el);
        el=null; els=null; stateIndex=0;
      },

      // Avanza/retrocede un estado y dispara el "viaje" (particleField.playTravel)
      // como capa temporal — no cambia cómo se calcula el estado en sí,
      // applyState(i) sigue siendo la única fuente de verdad.
      nextState(){
        if(transitioning) return true; // absorbe clicks/teclas mientras viaja
        if(stateIndex>=STATE_COUNT-1) return false; // ya en el cierre -> pasa a la página siguiente
        beginTravel(1, stateIndex+1);
        return true;
      },

      prevState(){
        if(transitioning) return true;
        if(stateIndex<=0) return false; // ya en el primer estado -> vuelve a la página anterior
        beginTravel(-1, stateIndex-1);
        return true;
      }
    };
  };

})(window.TD = window.TD || {});
