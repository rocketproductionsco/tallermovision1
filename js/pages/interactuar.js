/*
 * Página 3 — ¿Qué es interactuar?
 * --------------------------------
 * Cuatro estados internos:
 * 0 pregunta
 * 1 animación
 * 2 reacción
 * 3 interacción
 *
 * Los cambios internos usan el mismo viaje radial/vórtice de Página 2.
 * Al salir de la página, Navigator dispara el barrido lateral global.
 */
(function(TD){
  "use strict";

  TD.pages = TD.pages || {};

  const STATE_COUNT=4;
  const TRAVEL_MS=1000;

  TD.pages.createInteractuar=function(particleField,navigator){
    let el=null;
    let stateIndex=0;
    let transitioning=false;
    let travelTimer=null;
    let pulseTimer=null;
    let questionTimer=null;
    let lightOn=false;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,visible){
      n.classList.toggle("td-interact-visible",visible);
    }

    function setReactionLight(on){
      lightOn=!!on;
      const light=el && el.querySelector(".td-reaction-light");
      if(light) light.classList.toggle("td-reaction-light--on", lightOn);
    }

    function onWheel(e){
      if(stateIndex!==2 || transitioning) return;
      setReactionLight(true);
    }

    function applyState(i){
      stateIndex=i;

      // Título y pregunta permanecen como marco de la experiencia.
      show(el.querySelector(".td-int-title"),true);

      const question=el.querySelector(".td-int-question");
      if(questionTimer) clearTimeout(questionTimer);
      questionTimer=null;
      question.classList.remove("td-interact-visible");

      if(i===1) question.textContent="¿EL SISTEMA CAMBIA SOLO?";
      if(i===2) question.textContent="¿QUÉ PROVOCA EL CAMBIO?";
      if(i===3) question.textContent="¿CÓMO SE INFLUYEN?";

      // La luz pertenece únicamente al estado REACCIÓN. Al entrar de nuevo
      // en este estado vuelve apagada y puede activarse otra vez con scroll.
      setReactionLight(false);

      const cards=el.querySelectorAll(".td-int-state");
      cards.forEach((card,idx)=>show(card,idx===i-1));

      const cycle=el.querySelector(".td-int-cycle");
      show(cycle,i===3);

      const kicker=el.querySelector(".td-int-kicker");
      if(i===0) kicker.textContent="UNA ACCIÓN NO SIEMPRE ES UNA INTERACCIÓN";
      if(i===1) kicker.textContent="ANIMACIÓN";
      if(i===2) kicker.textContent="REACCIÓN";
      if(i===3) kicker.textContent="INTERACCIÓN";

      // La pregunta entra poco después de que termina el viaje.
      // No esperamos otro segundo completo: debe sentirse ligada a la llegada
      // de la cámara y nunca adelantarse a la siguiente escena.
      if(i>0){
        questionTimer=setTimeout(()=>{
          if(stateIndex===i && question) question.classList.add("td-interact-visible");
          questionTimer=null;
        },150);
      }
    }

    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer) clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{
        transitioning=false;
        lightOn=false;
        travelTimer=null;
      },TRAVEL_MS);
    }

    function onClick(e){
      particleField.addPulse(e.clientX,e.clientY);
      navigator.next();
    }

    return {
      id:"interactuar",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-interactuar";

        const title=node("h2","td-int-title td-reveal-pending","¿QUÉ ES INTERACTUAR?");
        const kicker=node("p","td-int-kicker td-reveal-pending");
        const question=node("p","td-int-question","¿EL SISTEMA CAMBIA SOLO?");

        const stage=node("div","td-int-stage");

        // Estado 1: ANIMACIÓN
        const animation=node("section","td-int-state td-int-animation");
        animation.appendChild(node("div","td-int-visual td-int-visual-animation"));
        animation.appendChild(node("h3","td-int-state-title","ANIMACIÓN"));
        animation.appendChild(node("p","td-int-state-copy","El sistema cambia con el tiempo, aunque nadie intervenga."));
        animation.appendChild(node("p","td-int-example","Ejemplo: una forma que se mueve sola."));

        // Estado 2: REACCIÓN
        const reaction=node("section","td-int-state td-int-reaction");
        reaction.appendChild(node("div","td-int-visual td-int-visual-reaction"));
        const reactionLight=node("div","td-reaction-light");
        reactionLight.setAttribute("aria-hidden","true");
        reaction.appendChild(reactionLight);
        reaction.appendChild(node("h3","td-int-state-title","REACCIÓN"));
        reaction.appendChild(node("p","td-int-state-copy","El sistema recibe un estímulo y responde."));
        reaction.appendChild(node("p","td-int-example","Ejemplo: hago click y una luz se enciende."));

        // Estado 3: INTERACCIÓN
        const interaction=node("section","td-int-state td-int-interaction");
        interaction.appendChild(node("div","td-int-visual td-int-visual-interaction"));
        interaction.appendChild(node("h3","td-int-state-title","INTERACCIÓN"));
        interaction.appendChild(node("p","td-int-state-copy","La respuesta modifica lo que hacemos después: aparece un ciclo."));
        interaction.appendChild(node("p","td-int-example","Acción → respuesta → nueva acción → nueva respuesta."));

        stage.appendChild(animation);
        stage.appendChild(reaction);
        stage.appendChild(interaction);

        const cycle=node("div","td-int-cycle");
        cycle.innerHTML=
          '<span class="td-int-cycle-node td-int-cycle-input">ACCIÓN</span>'+
          '<span class="td-int-cycle-arrow">→</span>'+
          '<span class="td-int-cycle-node">RESPUESTA</span>'+
          '<span class="td-int-cycle-arrow">→</span>'+
          '<span class="td-int-cycle-node">NUEVA ACCIÓN</span>';

        el.appendChild(title);
        el.appendChild(kicker);
        el.appendChild(question);
        el.appendChild(stage);
        el.appendChild(cycle);
        root.appendChild(el);

        // El título aparece con el mismo lenguaje de la Página 2.
        requestAnimationFrame(()=>{
          title.classList.add("td-reveal");
          kicker.classList.add("td-reveal");
        });

        applyState(0);
        window.addEventListener("click",onClick);
        window.addEventListener("wheel",onWheel,{passive:true});
      },

      unmount(root){
        window.removeEventListener("click",onClick);
        window.removeEventListener("wheel",onWheel);
        if(travelTimer) clearTimeout(travelTimer);
        if(pulseTimer) clearTimeout(pulseTimer);
        if(questionTimer) clearTimeout(questionTimer);
        travelTimer=null;
        pulseTimer=null;
        questionTimer=null;
        transitioning=false;
        lightOn=false;
        if(el && el.parentNode) el.parentNode.removeChild(el);
        el=null;
        stateIndex=0;
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

})(window.TD = window.TD || {});
