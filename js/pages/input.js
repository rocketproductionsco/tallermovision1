/*
 * Página 4 — INPUT
 * ----------------
 * Cinco estados internos, acumulativos:
 * 0 INPUT
 * 1 MOVIMIENTO
 * 2 SONIDO
 * 3 IMAGEN
 * 4 DATOS
 *
 * Los estados internos usan el viaje radial/vórtice de ParticleField.
 * El barrido lateral sigue reservado exclusivamente para cambios de página.
 */
(function(TD){
  "use strict";

  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;

  TD.pages.createInput=function(particleField,navigator){
    let el=null;
    let stateIndex=0;
    let transitioning=false;
    let travelTimer=null;
    let raf=0;
    let dataTimer=null;
    let mouseX=window.innerWidth*.5;
    let mouseY=window.innerHeight*.5;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,on){
      if(n) n.classList.toggle("td-input-visible",!!on);
    }

    function pct(v){ return Math.max(0,Math.min(100,v)); }

    function updateFireflyTarget(){
      if(!el) return;
      const fly=el.querySelector(".td-input-firefly");
      if(!fly) return;

      if(stateIndex===1){
        fly.style.setProperty("--fx",`${mouseX}px`);
        fly.style.setProperty("--fy",`${mouseY}px`);
      }else{
        const target=el.querySelector(".td-input-movement-anchor");
        if(target){
          const r=target.getBoundingClientRect();
          // Al quedar la luciérnaga en reposo, se coloca a la DERECHA de
          // MOVIMIENTO, no encima de la palabra. El margen evita que el glow
          // invada las letras.
          fly.style.setProperty("--fx",`${r.right+42}px`);
          fly.style.setProperty("--fy",`${r.top+r.height*.5}px`);
        }
      }
    }

    function fireflyLoop(){
      if(!el) return;
      updateFireflyTarget();
      raf=requestAnimationFrame(fireflyLoop);
    }

    function onMouseMove(e){
      mouseX=e.clientX;
      mouseY=e.clientY;
    }

    function randomChar(){
      const chars="0123456789ABCDEFXYZ#$%&";
      return chars[Math.floor(Math.random()*chars.length)];
    }

    function startData(){
      stopData();
      const cells=el.querySelectorAll(".td-input-data-cell");
      const tick=()=>cells.forEach(c=>{
        if(Math.random()<.72) c.textContent=randomChar();
        c.style.opacity=(.42+Math.random()*.58).toFixed(2);
      });
      tick();
      dataTimer=setInterval(tick,180);
    }

    function stopData(){
      if(dataTimer) clearInterval(dataTimer);
      dataTimer=null;
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;

      show(el.querySelector(".td-input-movement-group"),i>=1);
      show(el.querySelector(".td-input-sound-group"),i>=2);
      show(el.querySelector(".td-input-image-group"),i>=3);
      show(el.querySelector(".td-input-data-group"),i>=4);
      show(el.querySelector(".td-input-firefly"),i>=1);

      const central=el.querySelector(".td-input-core");
      if(central) central.classList.toggle("td-input-core--active",i===0);

      if(i>=4) startData(); else stopData();
      updateFireflyTarget();
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

    function onClick(e){
      particleField.addPulse(e.clientX,e.clientY);
      navigator.next();
    }

    return {
      id:"input",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-input-page";

        const title=node("h2","td-input-title td-reveal-pending","INPUT");
        const subtitle=node("p","td-input-subtitle td-reveal-pending","¿QUÉ PUEDE PERCIBIR UN SISTEMA?");

        const core=node("div","td-input-core td-input-visible","INPUT");

        // MOVIMIENTO
        const movement=node("div","td-input-movement-group");
        const movementLabel=node("p","td-input-label td-input-movement-anchor","MOVIMIENTO");
        movement.appendChild(movementLabel);

        const firefly=node("div","td-input-firefly");
        firefly.setAttribute("aria-hidden","true");
        for(let i=0;i<7;i++){
          const trail=node("span","td-input-firefly-trail");
          trail.style.setProperty("--trail-i",i);
          firefly.appendChild(trail);
        }
        firefly.appendChild(node("span","td-input-firefly-core"));

        // SONIDO
        const sound=node("div","td-input-sound-group");
        sound.appendChild(node("p","td-input-label td-input-sound-label","SONIDO"));
        const wave=document.createElementNS("http://www.w3.org/2000/svg","svg");
        wave.setAttribute("viewBox","0 0 260 80");
        wave.setAttribute("aria-hidden","true");
        wave.classList.add("td-input-wave");
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d","M4 40 C20 8 36 8 52 40 S84 72 100 40 S132 8 148 40 S180 72 196 40 S228 8 256 40");
        path.classList.add("td-input-wave-path");
        wave.appendChild(path);
        sound.appendChild(wave);

        // IMAGEN
        const image=node("div","td-input-image-group");
        image.appendChild(node("p","td-input-label td-input-image-label","IMAGEN"));
        const pixel=document.createElement("div");
        pixel.className="td-input-pixel-orb";
        for(let i=0;i<25;i++) pixel.appendChild(node("span","td-input-pixel"));
        image.appendChild(pixel);

        // DATOS
        const data=node("div","td-input-data-group");
        data.appendChild(node("p","td-input-label td-input-data-label","DATOS"));
        const matrix=document.createElement("div");
        matrix.className="td-input-data-matrix";
        for(let i=0;i<16;i++) matrix.appendChild(node("span","td-input-data-cell",randomChar()));
        data.appendChild(matrix);

        el.appendChild(title);
        el.appendChild(subtitle);
        el.appendChild(core);
        el.appendChild(movement);
        el.appendChild(sound);
        el.appendChild(image);
        el.appendChild(data);
        el.appendChild(firefly);
        root.appendChild(el);

        requestAnimationFrame(()=>{
          title.classList.add("td-reveal");
          setTimeout(()=>subtitle.classList.add("td-reveal"),180);
        });

        applyState(0);
        window.addEventListener("mousemove",onMouseMove);
        window.addEventListener("click",onClick);
        raf=requestAnimationFrame(fireflyLoop);
      },

      unmount(root){
        window.removeEventListener("mousemove",onMouseMove);
        window.removeEventListener("click",onClick);
        if(travelTimer) clearTimeout(travelTimer);
        stopData();
        if(raf) cancelAnimationFrame(raf);
        travelTimer=null;
        raf=0;
        transitioning=false;
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

})(window.TD=window.TD||{});
