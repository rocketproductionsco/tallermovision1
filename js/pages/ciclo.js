/*
 * Página 7 — EL CICLO
 * --------------------
 * Estados:
 * 0 EL CICLO — pregunta
 * 1 INPUT
 * 2 PROCESO
 * 3 OUTPUT
 * 4 EL CICLO VIVO
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;

  TD.pages.createCiclo=function(particleField,navigator){
    let el=null, stateIndex=0, transitioning=false, travelTimer=null, raf=0, lastT=0;

    function onClick(){
      if(!el) return;
      navigator.next();
    }

    function node(tag,cls,text){
      const n=document.createElement(tag); n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }
    function show(n,on){ if(n) n.classList.toggle("td-ciclo-visible",!!on); }

    function applyState(i){
      stateIndex=i;
      if(!el) return;
      show(el.querySelector(".td-ciclo-linear"), i>=1 && i<=3);
      show(el.querySelector(".td-ciclo-input"), i>=1 && i<=4);
      show(el.querySelector(".td-ciclo-proceso"), i>=2 && i<=4);
      show(el.querySelector(".td-ciclo-output"), i>=3 && i<=4);
      show(el.querySelector(".td-ciclo-live"), i>=4);
      if(i<4){
        el.classList.remove("td-ciclo-live-mode");
      }else{
        el.classList.add("td-ciclo-live-mode");
      }
    }

    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer) clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{
        transitioning=false; travelTimer=null;
      },TRAVEL_MS);
    }

    function animationLoop(t){
      if(!el) return;
      const dt=Math.min(40,lastT?t-lastT:16.67);
      lastT=t;
      raf=requestAnimationFrame(animationLoop);
    }

    return {
      id:"ciclo",
      mount(root){
        el=document.createElement("div");
        el.className="td-page td-ciclo-page";

        const title=node("h2","td-ciclo-title td-reveal-pending","EL CICLO");
        const subtitle=node("p","td-ciclo-subtitle td-reveal-pending","¿Y SI EL RESULTADO VOLVIERA A SER EL COMIENZO?");

        const linear=node("div","td-ciclo-linear");
        const input=node("div","td-ciclo-input","INPUT");
        const proceso=node("div","td-ciclo-proceso","PROCESO");
        const output=node("div","td-ciclo-output","OUTPUT");
        const arrow1=node("div","td-ciclo-arrow td-ciclo-arrow-1","→");
        const arrow2=node("div","td-ciclo-arrow td-ciclo-arrow-2","→");
        linear.append(input,arrow1,proceso,arrow2,output);

        const live=node("div","td-ciclo-live");
        const ring=node("div","td-ciclo-ring");
        const rin=node("div","td-ciclo-ring-label td-ciclo-ring-input","INPUT");
        const rpr=node("div","td-ciclo-ring-label td-ciclo-ring-proceso","PROCESO");
        const rou=node("div","td-ciclo-ring-label td-ciclo-ring-output","OUTPUT");
        const a1=node("div","td-ciclo-ring-arrow td-ciclo-ring-a1","›");
        const a2=node("div","td-ciclo-ring-arrow td-ciclo-ring-a2","›");
        const a3=node("div","td-ciclo-ring-arrow td-ciclo-ring-a3","›");
        const back=node("div","td-ciclo-ring-back","↺");
        ring.append(rin,rpr,rou,a1,a2,a3,back);
        live.append(ring);

        const closing=node("div","td-ciclo-closing");
        closing.append(
          node("p","td-ciclo-closing-main","LA INTERACCIÓN NO TERMINA."),
          node("p","td-ciclo-closing-sub","El resultado puede convertirse en un nuevo input.")
        );

        el.append(title,subtitle,linear,live,closing);
        root.appendChild(el);

        requestAnimationFrame(()=>{
          title.classList.add("td-reveal");
          setTimeout(()=>subtitle.classList.add("td-reveal"),180);
        });
        applyState(0);
        lastT=performance.now();
        raf=requestAnimationFrame(animationLoop);
        window.addEventListener("click",onClick);
      },
      unmount(root){
        if(travelTimer) clearTimeout(travelTimer);
        if(raf) cancelAnimationFrame(raf);
        window.removeEventListener("click",onClick);
        travelTimer=null; raf=0; transitioning=false; stateIndex=0;
        if(el && el.parentNode) el.parentNode.removeChild(el);
        el=null;
      },
      nextState(){
        if(transitioning) return true;
        if(stateIndex>=STATE_COUNT-1) return false;
        beginTravel(1,stateIndex+1); return true;
      },
      prevState(){
        if(transitioning) return true;
        if(stateIndex<=0) return false;
        beginTravel(-1,stateIndex-1); return true;
      }
    };
  };
})(window.TD=window.TD||{});
