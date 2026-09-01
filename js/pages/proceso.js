/*
 * Página 5 — PROCESO
 * ------------------
 * Cinco estados internos:
 * 0 PROCESO
 * 1 TRANSFORMAR — serpiente en movimiento + alimento
 * 2 TRANSFORMACIÓN — busca, come y el crecimiento viaja hacia la cola
 * 3 CRECER — secuencia rápida de varias comidas
 * 4 SÍNTESIS — INPUT → DATO → PROCESO → CAMBIO
 *
 * El cambio entre estados usa el vórtice de ParticleField.
 * El barrido lateral sigue reservado para cambios de página.
 */
(function(TD){
  "use strict";

  TD.pages=TD.pages||{};

  const STATE_COUNT=5;
  const TRAVEL_MS=1000;
  const SNAKE_SEGMENTS=15;
  const FOOD_R=10;

  TD.pages.createProceso=function(particleField,navigator){
    let el=null;
    let stateIndex=0;
    let transitioning=false;
    let travelTimer=null;
    let raf=0;
    let snake=null;
    let food=null;
    let growthTimer=null;
    let rapidTimer=null;
    let rapidCount=0;
    let rapidFoods=[];
    let rapidTarget=0;
    let reducedMotion=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,on){ if(n) n.classList.toggle("td-proceso-visible",!!on); }

    function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

    function rand(a,b){ return a+Math.random()*(b-a); }

    function getBounds(){
      const arena=el && el.querySelector(".td-proceso-arena");
      if(!arena) return {x:0,y:0,w:Math.max(320,window.innerWidth*.8),h:Math.max(220,window.innerHeight*.55)};
      // IMPORTANTE: snakeHost y foodNode están posicionados dentro de .td-proceso-arena,
      // por lo que sus coordenadas deben ser LOCALES al arena, no coordenadas de viewport.
      return {x:0,y:0,w:arena.clientWidth,h:arena.clientHeight};
    }

    function createSnake(){
      const b=getBounds();
      const cx=b.x+b.w*.5;
      const cy=b.y+b.h*.55;
      const spacing=28;
      const segments=[];
      for(let i=0;i<SNAKE_SEGMENTS;i++){
        segments.push({x:cx-(SNAKE_SEGMENTS-1-i)*spacing,y:cy});
      }
      snake={segments,heading:0.02,baseSpeed:0.7,target:null,growth:0,visible:true};
      renderSnake();
    }

    function renderSnake(){
      if(!el||!snake) return;
      const host=el.querySelector(".td-proceso-snake");
      if(!host) return;
      while(host.firstChild) host.removeChild(host.firstChild);
      snake.segments.forEach((s,i)=>{
        const d=node("span","td-proceso-segment");
        const scale=i===snake.segments.length-1 ? 1.22 : 0.84 + i/snake.segments.length*.18;
        d.style.left=`${s.x}px`;
        d.style.top=`${s.y}px`;
        d.style.setProperty("--scale",scale.toFixed(3));
        d.style.setProperty("--i",i);
        host.appendChild(d);
      });
    }

    function placeFood(){
      const b=getBounds();
      const head=snake && snake.segments[snake.segments.length-1];
      let x,y;
      for(let tries=0;tries<30;tries++){
        x=rand(b.x+55,b.x+b.w-55);
        y=rand(b.y+55,b.y+b.h-55);
        if(!head || Math.hypot(x-head.x,y-head.y)>b.w*.22) break;
      }
      food={x,y,active:true};
      const f=el.querySelector(".td-proceso-food");
      if(f){
        f.style.left=`${x}px`;
        f.style.top=`${y}px`;
        f.classList.remove("td-proceso-food--off");
      }
    }

    function resetFood(){
      food=null;
      const f=el && el.querySelector(".td-proceso-food");
      if(f) f.classList.add("td-proceso-food--off");
    }

    function resetSnake(){
      stopGrowth();
      stopRapid();
      createSnake();
      if(stateIndex>=1) placeFood(); else resetFood();
    }

    function stopGrowth(){
      if(growthTimer) clearInterval(growthTimer);
      growthTimer=null;
    }

    function stopRapid(){
      if(rapidTimer) clearInterval(rapidTimer);
      rapidTimer=null;
      rapidCount=0;
      rapidFoods=[];
      rapidTarget=0;
      const host=el && el.querySelector(".td-proceso-foods");
      if(host) host.innerHTML="";
    }

    function createRapidFoods(count=7){
      stopRapid();
      const b=getBounds();
      const host=el && el.querySelector(".td-proceso-foods");
      if(!host) return;
      const head=snake && snake.segments[snake.segments.length-1];
      for(let i=0;i<count;i++){
        let x=b.x+70,y=b.y+70;
        for(let tries=0;tries<40;tries++){
          x=rand(b.x+60,b.x+b.w-60);
          y=rand(b.y+60,b.y+b.h-60);
          if(!head || Math.hypot(x-head.x,y-head.y)>90) break;
        }
        const f=node("div","td-proceso-food td-proceso-rapid-food");
        f.style.left=`${x}px`;
        f.style.top=`${y}px`;
        host.appendChild(f);
        rapidFoods.push({x,y,active:true,node:f});
      }
      rapidTarget=0;
    }

    function consumeRapidFood(){
      const item=rapidFoods[rapidTarget];
      if(!item || !item.active) return;
      item.active=false;
      item.node.classList.add("td-proceso-food--off");
      growOne();
      rapidTarget++;
      if(rapidTarget>=rapidFoods.length){
        setTimeout(()=>{ if(stateIndex===3) createRapidFoods(7); },180);
      }
    }

    function setFoodGlow(on){
      const f=el && el.querySelector(".td-proceso-food");
      if(!f) return;
      f.classList.toggle("td-proceso-food--off",!on);
      if(food) food.active=on;
    }

    function growOne(){
      if(!snake) return;
      const last=snake.segments[snake.segments.length-1];
      const prev=snake.segments[snake.segments.length-2] || last;
      const dx=last.x-prev.x, dy=last.y-prev.y;
      const len=Math.hypot(dx,dy)||1;
      const extra={x:last.x+dx/len*26,y:last.y+dy/len*26};
      snake.segments.push(extra);
      renderSnake();
    }

    function eatAndPropagate(){
      if(!snake||!food) return;
      setFoodGlow(false);
      stopGrowth();
      const headIndex=snake.segments.length-1;
      let step=0;
      growthTimer=setInterval(()=>{
        // Visualmente el crecimiento viaja desde la cabeza hacia la cola:
        // cada pulso agranda el segmento correspondiente y después se normaliza.
        const idx=headIndex-step;
        const segs=el.querySelectorAll(".td-proceso-segment");
        if(segs[idx]) segs[idx].classList.add("td-proceso-segment--growth");
        step++;
        if(step>headIndex){
          stopGrowth();
          for(let i=0;i<2;i++) growOne();
          renderSnake();
        }
      },70);
    }

    function moveSnake(){
      if(!snake||!snake.visible) return;
      const b=getBounds();
      const head=snake.segments[snake.segments.length-1];

      if(stateIndex===2 && food && food.active){
        const dx=food.x-head.x, dy=food.y-head.y;
        const target=Math.atan2(dy,dx);
        let diff=Math.atan2(Math.sin(target-snake.heading),Math.cos(target-snake.heading));
        snake.heading+=clamp(diff,-0.045,0.045);
      }else if(stateIndex===3 && rapidFoods.length){
        const item=rapidFoods[rapidTarget];
        if(item && item.active){
          const dx=item.x-head.x, dy=item.y-head.y;
          const target=Math.atan2(dy,dx);
          let diff=Math.atan2(Math.sin(target-snake.heading),Math.cos(target-snake.heading));
          snake.heading+=clamp(diff,-0.16,0.16);
        }
      }else{
        snake.heading += Math.sin(performance.now()*.00035)*.0025;
      }

      const speed=stateIndex===0 ? .32 : stateIndex===1 ? .95 : stateIndex===2 ? 1.5 : 3.25;
      const nx=head.x+Math.cos(snake.heading)*speed;
      const ny=head.y+Math.sin(snake.heading)*speed;
      // Margen real para que la cabeza nunca atraviese el borde del área.
      const pad=30;
      if(nx<b.x+pad || nx>b.x+b.w-pad) snake.heading=Math.PI-snake.heading;
      if(ny<b.y+pad || ny>b.y+b.h-pad) snake.heading=-snake.heading;

      const nh={x:clamp(head.x+Math.cos(snake.heading)*speed,b.x+pad,b.x+b.w-pad),y:clamp(head.y+Math.sin(snake.heading)*speed,b.y+pad,b.y+b.h-pad)};
      for(let i=0;i<snake.segments.length-1;i++){
        snake.segments[i].x += (snake.segments[i+1].x-snake.segments[i].x)*.18;
        snake.segments[i].y += (snake.segments[i+1].y-snake.segments[i].y)*.18;
      }
      snake.segments[snake.segments.length-1]=nh;

      if(stateIndex===3 && rapidFoods.length){
        const item=rapidFoods[rapidTarget];
        if(item && item.active && Math.hypot(nh.x-item.x,nh.y-item.y)<34){
          consumeRapidFood();
        }
      }else if(food && food.active && Math.hypot(nh.x-food.x,nh.y-food.y)<28){
        eatAndPropagate();
      }
      renderSnake();
    }

    function rapidSequence(){
      stopGrowth();
      createRapidFoods(7);
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;
      show(el.querySelector(".td-proceso-transform-group"),i>=1);
      show(el.querySelector(".td-proceso-synthesis"),i>=4);
      const title=el.querySelector(".td-proceso-state-title");
      const text=el.querySelector(".td-proceso-question");
      const labels=["","TRANSFORMAR","TRANSFORMAR","CRECER",""];
      const questions=["","","","",""];
      if(title) title.textContent=labels[i]||"";
      if(text) text.textContent=questions[i]||"";

      if(i===0){
        resetSnake();
        resetFood();
      }else if(i===1){
        stopGrowth(); stopRapid(); createSnake(); placeFood();
      }else if(i===2){
        stopRapid();
        if(!snake) createSnake();
        if(!food||!food.active) placeFood();
      }else if(i===3){
        if(!snake) createSnake();
        rapidSequence();
      }else if(i===4){
        stopGrowth(); stopRapid();
      }
    }

    function beginTravel(direction,nextIndex){
      transitioning=true;
      particleField.playTravel(direction,TRAVEL_MS);
      applyState(nextIndex);
      if(travelTimer) clearTimeout(travelTimer);
      travelTimer=setTimeout(()=>{transitioning=false;travelTimer=null;},TRAVEL_MS);
    }

    function onClick(e){
      if(!el) return;
      particleField.addPulse(e.clientX,e.clientY);
      navigator.next();
    }

    function loop(){
      if(!el) return;
      if(!reducedMotion) moveSnake();
      raf=requestAnimationFrame(loop);
    }

    return {
      id:"proceso",
      mount(root){
        el=document.createElement("div");
        el.className="td-page td-proceso-page";

        const title=node("h2","td-proceso-title td-reveal-pending","PROCESO");
        const subtitle=node("p","td-proceso-subtitle td-reveal-pending","¿QUÉ SUCEDE CON LA INFORMACIÓN?");
        const stateTitle=node("p","td-proceso-state-title");
        const arena=node("div","td-proceso-arena");
        const snakeHost=node("div","td-proceso-snake");
        const foodNode=node("div","td-proceso-food td-proceso-food--off");
        const foodsHost=node("div","td-proceso-foods");
        const transformGroup=node("div","td-proceso-transform-group");
        transformGroup.appendChild(stateTitle);
        const hint=node("p","td-proceso-hint","EL SISTEMA CAMBIA");
        transformGroup.appendChild(hint);

        const synthesis=node("div","td-proceso-synthesis");
        synthesis.appendChild(node("div","td-proceso-flow","INPUT  →  DATO  →  PROCESO  →  CAMBIO"));
        synthesis.appendChild(node("p","td-proceso-synthesis-text","El proceso transforma la información en un cambio."));

        arena.appendChild(snakeHost);
        arena.appendChild(foodNode);
        arena.appendChild(foodsHost);
        el.appendChild(title);
        el.appendChild(subtitle);
        el.appendChild(transformGroup);
        el.appendChild(arena);
        el.appendChild(synthesis);
        root.appendChild(el);

        requestAnimationFrame(()=>{
          title.classList.add("td-reveal");
          setTimeout(()=>subtitle.classList.add("td-reveal"),180);
        });

        createSnake();
        applyState(0);
        window.addEventListener("click",onClick);
        raf=requestAnimationFrame(loop);
      },
      unmount(root){
        window.removeEventListener("click",onClick);
        if(travelTimer) clearTimeout(travelTimer);
        stopGrowth();
        stopRapid();
        if(raf) cancelAnimationFrame(raf);
        travelTimer=null; raf=0; transitioning=false; snake=null; food=null;
        if(el&&el.parentNode) el.parentNode.removeChild(el);
        el=null; stateIndex=0;
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
