/*
 * Página 9 — LOS NODOS
 * Estados:
 * 0 presentación
 * 1 INPUT
 * 2 PROCESO
 * 3 OUTPUT
 * 4 ENTRA → SE TRANSFORMA → SALE
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;

  TD.pages.createNodos=function(particleField,navigator){
    let el=null, stateIndex=0, transitioning=false, travelTimer=null;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,on){
      if(n) n.classList.toggle("td-nodos-visible",!!on);
    }

    function onClick(){
      if(!el || transitioning) return;
      navigator.next();
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;

      el.querySelectorAll(".td-nodos-state").forEach((s,idx)=>{
        show(s,idx===i);
      });
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
      id:"nodos",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-nodos-page";

        const title=node("h2","td-nodos-title td-reveal-pending","LOS NODOS");
        const subtitle=node("p","td-nodos-subtitle td-reveal-pending","¿CÓMO SE CONSTRUYE UNA RED?");

        const stage=node("div","td-nodos-stage");

        // Estado 1: presentación
        const s0=node("section","td-nodos-state td-nodos-intro");
        s0.appendChild(node("div","td-nodos-intro-mark","NODO"));
        s0.appendChild(node("p","td-nodos-intro-copy","Una unidad que recibe, transforma o genera información."));
        stage.appendChild(s0);

        // Helper para los estados con una captura.
        function screenshotState(index, imageName, label, copy){
          const s=node("section","td-nodos-state td-nodos-image-state");
          const media=node("div","td-nodos-media");
          const img=document.createElement("img");
          img.className="td-nodos-image";
          img.src=`assets/${imageName}`;
          img.alt=`Ejemplo de ${label} en TouchDesigner`;
          media.appendChild(img);

          const caption=node("div","td-nodos-caption");
          caption.appendChild(node("div","td-nodos-caption-title",label));
          caption.appendChild(node("div","td-nodos-caption-copy",copy));
          s.append(media,caption);
          stage.appendChild(s);
        }

        screenshotState(
          1,
          "node-input.png",
          "INPUT",
          "Una fuente introduce información al sistema."
        );

        screenshotState(
          2,
          "node-proceso.png",
          "PROCESO",
          "Los nodos transforman, combinan o preparan la información."
        );

        screenshotState(
          3,
          "node-output.png",
          "OUTPUT",
          "El resultado de la operación sale del sistema."
        );

        // Estado 5: síntesis
        const s4=node("section","td-nodos-state td-nodos-synthesis");
        const flow=node("div","td-nodos-flow");

        [
          ["node-input.png","INPUT"],
          ["node-proceso.png","PROCESO"],
          ["node-output.png","OUTPUT"]
        ].forEach((item,idx)=>{
          const card=node("div","td-nodos-card");
          const img=document.createElement("img");
          img.src=`assets/${item[0]}`;
          img.alt=item[1];
          card.appendChild(img);
          card.appendChild(node("div","td-nodos-card-label",item[1]));
          flow.appendChild(card);
          if(idx<2) flow.appendChild(node("div","td-nodos-flow-arrow","→"));
        });

        s4.appendChild(flow);
        s4.appendChild(node("div","td-nodos-synthesis-copy","ENTRA  →  SE TRANSFORMA  →  SALE"));
        stage.appendChild(s4);

        el.append(title,subtitle,stage);
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
