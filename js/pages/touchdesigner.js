/*
 * Página 8 — TOUCHDESIGNER
 * ------------------------
 * Estados:
 * 0 presentación de la interfaz
 * 1 NETWORK
 * 2 PARAMETERS
 * 3 VIEWER
 * 4 todo conectado
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;

  TD.pages.createTouchDesigner=function(particleField,navigator){
    let el=null, stateIndex=0, transitioning=false, travelTimer=null;

    function onClick(){
      if(!el || transitioning) return;
      navigator.next();
    }

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,on){
      if(n) n.classList.toggle("td-td-visible",!!on);
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;

      const callouts=el.querySelectorAll(".td-td-callout");
      callouts.forEach(c=>{
        const target=c.getAttribute("data-state");
        show(c, target==="all" ? i===4 : Number(target)===i);
      });

      const arrows=el.querySelectorAll(".td-td-arrow-group");
      arrows.forEach(a=>{
        const target=a.getAttribute("data-state");
        show(a, target==="all" ? i===4 : Number(target)===i);
      });

      const caption=el.querySelector(".td-td-final");
      show(caption,i===4);
    }

    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer) clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{
        transitioning=false;
        travelTimer=null;
      },TRAVEL_MS);
    }

    return {
      id:"touchdesigner",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-touchdesigner-page";

        const title=node("h2","td-td-title td-reveal-pending","TOUCHDESIGNER");
        const subtitle=node("p","td-td-subtitle td-reveal-pending","LA HERRAMIENTA PARA CONSTRUIR ESTOS SISTEMAS");

        const frame=node("div","td-td-frame");
        const image=document.createElement("img");
        image.className="td-td-interface";
        image.src="assets/touchdesigner-interface.png";
        image.alt="Interfaz de TouchDesigner con la red de operadores, panel de parámetros y visor.";
        frame.appendChild(image);

        const overlay=document.createElementNS("http://www.w3.org/2000/svg","svg");
        overlay.classList.add("td-td-arrow-overlay");
        overlay.setAttribute("viewBox","0 0 100 100");
        overlay.setAttribute("preserveAspectRatio","none");
        overlay.setAttribute("aria-hidden","true");

        const defs=document.createElementNS("http://www.w3.org/2000/svg","defs");
        const marker=document.createElementNS("http://www.w3.org/2000/svg","marker");
        marker.setAttribute("id","tdTdArrowHead");
        marker.setAttribute("viewBox","0 0 10 10");
        marker.setAttribute("refX","9");
        marker.setAttribute("refY","5");
        marker.setAttribute("markerWidth","5");
        marker.setAttribute("markerHeight","5");
        marker.setAttribute("orient","auto-start-reverse");
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d","M 0 0 L 10 5 L 0 10 z");
        path.setAttribute("fill","rgba(245,245,245,.9)");
        marker.appendChild(path); defs.appendChild(marker); overlay.appendChild(defs);

        function arrow(cls,state,x1,y1,x2,y2){
          const g=document.createElementNS("http://www.w3.org/2000/svg","g");
          g.classList.add("td-td-arrow-group",cls);
          g.setAttribute("data-state",String(state));
          const line=document.createElementNS("http://www.w3.org/2000/svg","line");
          line.setAttribute("x1",x1); line.setAttribute("y1",y1);
          line.setAttribute("x2",x2); line.setAttribute("y2",y2);
          line.setAttribute("marker-end","url(#tdTdArrowHead)");
          g.appendChild(line); overlay.appendChild(g);
        }

        // Coordinates are relative to the image/frame.
        arrow("td-td-arrow-network",1,18,26,39,47);
        arrow("td-td-arrow-parameters",2,78,12,80,26);
        arrow("td-td-arrow-viewer",3,76,76,87,74);

        // In the final state, the three arrows remain visible together.
        arrow("td-td-arrow-network-final","all",18,26,39,47);
        arrow("td-td-arrow-parameters-final","all",78,12,80,26);
        arrow("td-td-arrow-viewer-final","all",76,76,87,74);

        frame.appendChild(overlay);

        function callout(state,cls,titleText,bodyText){
          const box=node("div",`td-td-callout ${cls}`);
          box.setAttribute("data-state",String(state));
          box.appendChild(node("div","td-td-callout-title",titleText));
          box.appendChild(node("div","td-td-callout-body",bodyText));
          frame.appendChild(box);
          return box;
        }

        callout(1,"td-td-callout-network","NETWORK","Aquí conectamos los operadores y construimos el sistema.");
        callout(2,"td-td-callout-parameters","PARAMETERS","Aquí modificamos cómo se comporta cada operador.");
        callout(3,"td-td-callout-viewer","VIEWER","Aquí vemos el resultado de lo que estamos construyendo.");
        callout("all","td-td-callout-network-final","NETWORK","Construimos.");
        callout("all","td-td-callout-parameters-final","PARAMETERS","Ajustamos.");
        callout("all","td-td-callout-viewer-final","VIEWER","Observamos.");

        const final=node("div","td-td-final");
        final.appendChild(node("p","td-td-final-main","CONSTRUIR · AJUSTAR · OBSERVAR"));
        final.appendChild(node("p","td-td-final-sub","Y VOLVER A CONSTRUIR."));
        frame.appendChild(final);

        el.append(title,subtitle,frame);
        root.appendChild(el);

        requestAnimationFrame(()=>{
          title.classList.add("td-reveal");
          setTimeout(()=>subtitle.classList.add("td-reveal"),180);
        });

        applyState(0);
        window.addEventListener("click",onClick);
      },

      unmount(root){
        if(travelTimer) clearTimeout(travelTimer);
        window.removeEventListener("click",onClick);
        travelTimer=null;
        transitioning=false;
        stateIndex=0;
        if(el && el.parentNode) el.parentNode.removeChild(el);
        el=null;
      },

      nextState(){
        if(transitioning) return true;
        if(stateIndex>=STATE_COUNT-1) return false;
        beginTravel(1,stateIndex+1);
        return true;
      },

      prevState(){
        if(transitioning) return true;
        if(stateIndex<=0) return false;
        beginTravel(-1,stateIndex-1);
        return true;
      }
    };
  };
})(window.TD=window.TD||{});
