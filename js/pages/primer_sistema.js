/*
 * Página 11 — NUESTRO PRIMER SISTEMA
 * Estados:
 * 0 introducción
 * 1 ¿QUÉ ENTRA?
 * 2 ¿QUÉ LE HACEMOS?
 * 3 ¿QUÉ SALE?
 * 4 síntesis
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=950;

  TD.pages.createPrimerSistema=function(particleField,navigator){
    let el=null,stateIndex=0,transitioning=false,travelTimer=null;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined)n.textContent=text;
      return n;
    }
    function show(n,on){if(n)n.classList.toggle("td-first-visible",!!on);}
    function applyState(i){
      stateIndex=i;
      if(!el)return;
      el.querySelectorAll(".td-first-state").forEach((s,idx)=>show(s,idx===i));
    }
    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer)clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{transitioning=false;travelTimer=null},TRAVEL_MS);
    }
    function onClick(){
      if(!el||transitioning)return;
      navigator.next();
    }

    return {
      id:"primer-sistema",
      mount(root){
        el=document.createElement("div");
        el.className="td-page td-first-system-page";

        const title=node("h2","td-first-title td-reveal-pending","NUESTRO PRIMER SISTEMA");
        const subtitle=node("p","td-first-subtitle td-reveal-pending","UN EJEMPLO MÍNIMO");
        const stage=node("div","td-first-stage");

        // Estado 0
        const intro=node("section","td-first-state td-first-intro");
        intro.appendChild(node("div","td-first-flow-mark","INPUT  →  PROCESO  →  OUTPUT"));
        intro.appendChild(node("p","td-first-question","¿PODEMOS HACER QUE ALGO ENTRE, CAMBIE Y SALGA?"));
        stage.appendChild(intro);

        // Estado 1
        const input=node("section","td-first-state td-first-question-state");
        input.appendChild(node("div","td-first-question-word","¿QUÉ ENTRA?"));
        input.appendChild(node("div","td-first-flow-line td-first-input-line"));
        input.appendChild(node("div","td-first-particle td-first-particle-input"));
        stage.appendChild(input);

        // Estado 2
        const process=node("section","td-first-state td-first-question-state");
        process.appendChild(node("div","td-first-question-word","¿QUÉ LE HACEMOS?"));
        const procLine=node("div","td-first-process-line");
        procLine.appendChild(node("span","td-first-proc-a"));
        procLine.appendChild(node("span","td-first-proc-b"));
        procLine.appendChild(node("span","td-first-proc-c"));
        process.appendChild(procLine);
        stage.appendChild(process);

        // Estado 3
        const output=node("section","td-first-state td-first-question-state");
        output.appendChild(node("div","td-first-question-word","¿QUÉ SALE?"));
        output.appendChild(node("div","td-first-flow-line td-first-output-line"));
        output.appendChild(node("div","td-first-particle td-first-particle-output"));
        stage.appendChild(output);

        // Estado 4
        const final=node("section","td-first-state td-first-final");
        const questions=node("div","td-first-questions");
        ["¿QUÉ ENTRA?","¿QUÉ LE HACEMOS?","¿QUÉ SALE?"].forEach(q=>questions.appendChild(node("div","td-first-final-q",q)));
        final.appendChild(questions);
        final.appendChild(node("div","td-first-final-copy","PENSAR EN SISTEMAS"));
        stage.appendChild(final);

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
        if(travelTimer)clearTimeout(travelTimer);
        window.removeEventListener("click",onClick);
        travelTimer=null;transitioning=false;stateIndex=0;
        if(el&&el.parentNode)el.parentNode.removeChild(el);
        el=null;
      },
      nextState(){
        if(transitioning)return true;
        if(stateIndex>=STATE_COUNT-1)return false;
        beginTravel(1,stateIndex+1);return true;
      },
      prevState(){
        if(transitioning)return true;
        if(stateIndex<=0)return false;
        beginTravel(-1,stateIndex-1);return true;
      }
    };
  };
})(window.TD=window.TD||{});
