/*
 * Página 6 — OUTPUT
 * -----------------
 * Estados:
 * 0 OUTPUT
 * 1 IMAGEN
 * 2 SONIDO
 * 3 LUZ
 * 4 MOVIMIENTO
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;

  TD.pages.createOutput=function(particleField,navigator){
    let el=null, stateIndex=0, transitioning=false, travelTimer=null, raf=0;
    let mouseX=window.innerWidth*.5, mouseY=window.innerHeight*.5;
    let wavePhase=0, waveKick=0;
    let moveX=0, moveV=0, moveRest=0, lastT=0;

    function node(tag,cls,text){
      const n=document.createElement(tag); n.className=cls;
      if(text!==undefined) n.textContent=text; return n;
    }
    function show(n,on){ if(n) n.classList.toggle("td-output-visible",!!on); }

    function onMouseMove(e){ mouseX=e.clientX; mouseY=e.clientY; }

    function buildPixelMatrix(host){
      for(let i=0;i<49;i++){
        const p=node("span","td-output-pixel-cell");
        p.style.setProperty("--i",i);
        host.appendChild(p);
      }
    }

    function buildWaves(svg){
      const specs=[
        ["td-output-wave-a","M4 54 C24 18 44 18 64 54 S104 90 124 54 S164 18 184 54 S224 90 244 54 S284 18 304 54 S344 90 364 54",1.0],
        ["td-output-wave-b","M4 54 C30 30 54 30 80 54 S130 78 156 54 S206 30 232 54 S282 78 308 54 S358 30 384 54",.72],
        ["td-output-wave-c","M4 54 C18 44 32 44 46 54 S74 64 88 54 S116 44 130 54 S158 64 172 54 S200 44 214 54 S242 64 256 54 S284 44 298 54 S326 64 340 54 S368 44 384 54",.48]
      ];
      specs.forEach(([cls,d,amp],i)=>{
        const p=document.createElementNS("http://www.w3.org/2000/svg","path");
        p.setAttribute("d",d); p.classList.add(cls,"td-output-wave-path");
        p.style.setProperty("--amp",amp); p.style.setProperty("--wi",i);
        svg.appendChild(p);
      });
    }

    function waveLoop(dt){
      wavePhase+=dt*.0012;
      waveKick*=Math.pow(.003,dt/1000);
      const paths=el.querySelectorAll(".td-output-wave-path");
      paths.forEach((p,i)=>{
        p.style.setProperty("--phase",`${(wavePhase*(i+1)*28+waveKick*(i+1)*60).toFixed(2)}px`);
        p.style.setProperty("--wscale",`${1+Math.sin(wavePhase*(i+1)*1.7)*.045 + waveKick*.08}`);
      });
    }

    function imageLoop(){
      const group=el.querySelector(".td-output-image-group");
      if(!group || stateIndex<1) return;
      const r=group.getBoundingClientRect();
      const cx=r.left+r.width*.63, cy=r.top+r.height*.5;
      const cells=group.querySelectorAll(".td-output-pixel-cell");
      cells.forEach((c,i)=>{
        const col=i%7,row=Math.floor(i/7);
        const x=r.left+34+col*24, y=r.top+18+row*24;
        const dx=mouseX-x,dy=mouseY-y,dist=Math.hypot(dx,dy), influence=Math.max(0,1-dist/125);
        const jitter=(Math.random()-.5)*influence*4;
        const scale=1+influence*.85;
        c.style.transform=`translate(${dx*.018*influence+jitter}px,${dy*.018*influence+jitter}px) scale(${scale})`;
        c.style.opacity=(.28+influence*.68).toFixed(2);
      });
    }

    function lightLoop(){
      const light=el.querySelector(".td-output-light");
      if(!light || stateIndex<3) return;
      const r=light.getBoundingClientRect();
      const cx=r.left+r.width/2,cy=r.top+r.height/2;
      const d=Math.hypot(mouseX-cx,mouseY-cy);
      const inf=Math.max(0,1-d/180);
      const flicker=inf*(.72+.28*Math.sin(performance.now()*.028));
      light.style.setProperty("--light-intensity",flicker.toFixed(3));
    }

    function movementLoop(dt){
      const obj=el.querySelector(".td-output-motion-object");
      const zone=el.querySelector(".td-output-motion-zone");
      if(!obj||!zone||stateIndex<4) return;
      const r=zone.getBoundingClientRect();
      const center=r.left+r.width/2;
      const influence=Math.max(0,1-Math.abs(mouseX-center)/(r.width*.55));
      const target=(mouseX-center)*.42*influence;
      const spring=.0048, damping=.92;
      moveV+=(target-moveX)*spring*dt;
      moveV*=Math.pow(damping,dt/16.67);
      moveX+=moveV*dt;
      const limit=r.width*.38;
      moveX=Math.max(-limit,Math.min(limit,moveX));
      const sway=Math.sin(performance.now()*.0038)*2.5;
      obj.style.transform=`translate(calc(-50% + ${moveX.toFixed(1)}px),${sway.toFixed(1)}px)`;
    }

    function animationLoop(t){
      if(!el) return;
      const dt=Math.min(32,lastT?t-lastT:16.67); lastT=t;
      waveLoop(dt); imageLoop(); lightLoop(); movementLoop(dt);
      raf=requestAnimationFrame(animationLoop);
    }

    function resetInteractiveState(){
      wavePhase=0; waveKick=0; moveX=0; moveV=0;
      if(!el) return;
      const cells=el.querySelectorAll(".td-output-pixel-cell");
      cells.forEach(c=>{c.style.transform="translate(0,0) scale(1)";c.style.opacity=".42"});
      const light=el.querySelector(".td-output-light"); if(light) light.style.setProperty("--light-intensity","0");
      const obj=el.querySelector(".td-output-motion-object"); if(obj) obj.style.transform="translate(-50%,0)";
      const paths=el.querySelectorAll(".td-output-wave-path"); paths.forEach(p=>p.style.setProperty("--phase","0px"));
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;
      show(el.querySelector(".td-output-image-group"),i>=1);
      show(el.querySelector(".td-output-sound-group"),i>=2);
      show(el.querySelector(".td-output-light-group"),i>=3);
      show(el.querySelector(".td-output-motion-group"),i>=4);
      show(el.querySelector(".td-output-synthesis"),i>=4);
      resetInteractiveState();
    }

    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer) clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{transitioning=false;travelTimer=null},TRAVEL_MS);
    }

    function onClick(e){
      if(!el || transitioning) return;
      const waveBox=el.querySelector(".td-output-wave-zone");
      if(stateIndex===2 && waveBox && waveBox.contains(e.target)){
        waveKick=1;
        const paths=el.querySelectorAll(".td-output-wave-path");
        paths.forEach((p,i)=>{
          p.style.setProperty("--kick-angle",`${(Math.random()-.5)*18}deg`);
          p.style.setProperty("--kick-scale",`${.84+Math.random()*.36}`);
        });
        particleField.addPulse(e.clientX,e.clientY);
        return;
      }
      particleField.addPulse(e.clientX,e.clientY);
      navigator.next();
    }

    return {
      id:"output",
      mount(root){
        el=document.createElement("div"); el.className="td-page td-output-page";
        const title=node("h2","td-output-title td-reveal-pending","OUTPUT");
        const subtitle=node("p","td-output-subtitle td-reveal-pending","¿QUÉ DEVUELVE EL SISTEMA?");

        const image=node("div","td-output-image-group");
        image.appendChild(node("p","td-output-label","IMAGEN"));
        const matrix=node("div","td-output-pixel-matrix"); buildPixelMatrix(matrix); image.appendChild(matrix);

        const sound=node("div","td-output-sound-group");
        sound.appendChild(node("p","td-output-label","SONIDO"));
        const waveZone=node("div","td-output-wave-zone");
        const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
        svg.setAttribute("viewBox","0 0 390 108"); svg.setAttribute("aria-hidden","true"); svg.classList.add("td-output-wave");
        buildWaves(svg); waveZone.appendChild(svg); sound.appendChild(waveZone);

        const lightGroup=node("div","td-output-light-group");
        lightGroup.appendChild(node("p","td-output-label","LUZ"));
        const lightZone=node("div","td-output-light-zone");
        const light=node("div","td-output-light"); lightZone.appendChild(light); lightGroup.appendChild(lightZone);

        const motion=node("div","td-output-motion-group");
        motion.appendChild(node("p","td-output-label","MOVIMIENTO"));
        const motionZone=node("div","td-output-motion-zone");
        const rest=node("div","td-output-motion-rest");
        const spring=node("div","td-output-spring");
        const obj=node("div","td-output-motion-object"); motionZone.appendChild(rest); motionZone.appendChild(spring); motionZone.appendChild(obj); motion.appendChild(motionZone);

        const synth=node("div","td-output-synthesis");
        synth.appendChild(node("div","td-output-flow","IMAGEN · SONIDO · LUZ · MOVIMIENTO"));
        synth.appendChild(node("p","td-output-synthesis-text","El sistema devuelve una respuesta."));

        el.append(title,subtitle,image,sound,lightGroup,motion,synth); root.appendChild(el);
        requestAnimationFrame(()=>{title.classList.add("td-reveal");setTimeout(()=>subtitle.classList.add("td-reveal"),180)});
        applyState(0);
        window.addEventListener("mousemove",onMouseMove);
        window.addEventListener("click",onClick);
        lastT=performance.now(); raf=requestAnimationFrame(animationLoop);
      },
      unmount(root){
        window.removeEventListener("mousemove",onMouseMove); window.removeEventListener("click",onClick);
        if(travelTimer) clearTimeout(travelTimer); if(raf) cancelAnimationFrame(raf);
        travelTimer=null; raf=0; transitioning=false; stateIndex=0; if(el && el.parentNode) el.parentNode.removeChild(el); el=null;
      },
      nextState(){ if(transitioning) return true; if(stateIndex>=STATE_COUNT-1) return false; beginTravel(1,stateIndex+1); return true; },
      prevState(){ if(transitioning) return true; if(stateIndex<=0) return false; beginTravel(-1,stateIndex-1); return true; }
    };
  };
})(window.TD=window.TD||{});
