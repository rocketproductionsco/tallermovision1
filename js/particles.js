/*
 * ParticleField
 * -------------
 * Campo de partículas/nodos con profundidad (bokeh), movimiento propio
 * orgánico y perturbación de "viento" al pasar el mouse (no magnética:
 * las partículas se apartan y son arrastradas en la dirección del cursor,
 * nunca atraídas hacia él).
 *
 * Este módulo es autónomo: no sabe nada de páginas ni de navegación.
 * Expone start()/stop()/destroy() y addPulse(x,y) para que otras partes
 * de la app (por ejemplo, un click de navegación) puedan disparar un
 * pulso visual sin acoplarse a la física interna.
 */
(function(TD){
  "use strict";

  class ParticleField{
    constructor(canvas, opts){
      this.canvas=canvas;
      this.ctx=canvas.getContext("2d");
      this.nodes=[];
      this.pulses=[];
      this.anchors=new Map(); // "id" -> {nx,ny,r,alpha,targetAlpha,pulsePhase}  (posición en fracción de pantalla)
      this.links=[];          // {key,aId,bId,progress,targetProgress,alpha,targetAlpha}
      this.travel=null;       // viaje radial/vórtice entre estados internos
      this.pageTravel=null;   // {dir,start,duration,distance,progress} — barrido entre páginas
      this._travelK=0;        // 0..1, envolvente del viaje radial (para _draw)
      this.running=false;
      this.last=0;
      this.W=0; this.H=0; this.dpr=1;

      this.mouse={x:-9999,y:-9999,px:-9999,py:-9999,active:false,dirx:0,diry:0,speed:0};

      this.opts=Object.assign({
        density:3600,      // px^2 por nodo aprox. (menor = más nodos)
        minNodes:260,
        maxNodes:380,
        accentColor:"227,59,53" // rojo sutil, como "r,g,b"
      }, opts||{});

      this._onResize=this._onResize.bind(this);
      this._onMouseMove=this._onMouseMove.bind(this);
      this._onMouseLeave=this._onMouseLeave.bind(this);
      this._frame=this._frame.bind(this);
    }

    // ---------- ciclo de vida ----------

    init(){
      this._resize();
      this._makeNodes();
      window.addEventListener("resize", this._onResize);
      window.addEventListener("mousemove", this._onMouseMove);
      window.addEventListener("mouseleave", this._onMouseLeave);
    }

    start(){
      if(this.running) return;
      this.running=true;
      this.last=0;
      requestAnimationFrame(this._frame);
    }

    stop(){
      this.running=false;
    }

    destroy(){
      this.stop();
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("mousemove", this._onMouseMove);
      window.removeEventListener("mouseleave", this._onMouseLeave);
    }

    // ---------- API pública ----------

    /** Dispara una onda/pulso visual en coordenadas de pantalla (clientX/clientY). */
    addPulse(clientX, clientY){
      const rect=this.canvas.getBoundingClientRect();
      this.pulses.push({
        x:clientX-rect.left,
        y:clientY-rect.top,
        r:0,
        alpha:.55
      });
    }

    /*
     * Anchors: puntos focales fijos (en fracción de pantalla 0..1) que el
     * campo de partículas trata como parte del sistema — brillan como un
     * nodo más, atraen muy levemente a las partículas cercanas, y pueden
     * conectarse entre sí con link(). Pensado para páginas de contenido
     * (INPUT/PROCESO/OUTPUT, familias de operadores, etc.) que necesitan
     * que sus conceptos se vean integrados al lenguaje visual, no como
     * texto flotando aparte.
     *
     * setAnchor(id, nx, ny, {visible, r}) — crea o mueve/actualiza un ancla.
     * removeAnchor(id) / clearAnchors() — limpia (clearAnchors también borra los links).
     */
    setAnchor(id, nx, ny, opts){
      opts=opts||{};
      const existing=this.anchors.get(id);
      if(existing){
        existing.nx=nx; existing.ny=ny;
        if(opts.r!==undefined) existing.r=opts.r;
        existing.targetAlpha = opts.visible===false ? 0 : 1;
        return;
      }
      this.anchors.set(id,{
        nx,ny,
        r: opts.r!==undefined ? opts.r : 9,
        alpha:0,
        targetAlpha: opts.visible===false ? 0 : 1,
        pulsePhase: Math.random()*Math.PI*2
      });
    }

    removeAnchor(id){
      this.anchors.delete(id);
      this.links=this.links.filter(l=>l.aId!==id && l.bId!==id);
    }

    clearAnchors(){
      this.anchors.clear();
      this.links=[];
    }

    /*
     * link(aId, bId, {progress, visible}) — crea o actualiza la conexión
     * animada entre dos anchors. progress (0..1) es hacia dónde debe crecer
     * la línea; el propio ParticleField anima el recorrido cuadro a cuadro
     * (no salta de golpe), y dibuja un pulso viajando por la punta mientras
     * crece — así la conexión se siente parte del sistema, no una línea SVG
     * puesta encima.
     */
    link(aId, bId, opts){
      opts=opts||{};
      const key=aId+"->"+bId;
      let l=this.links.find(x=>x.key===key);
      if(!l){
        l={key,aId,bId,progress:0,alpha:0,targetProgress:0,targetAlpha:0};
        this.links.push(l);
      }
      if(opts.progress!==undefined) l.targetProgress=opts.progress;
      l.targetAlpha = opts.visible===false ? 0 : 1;
      return l;
    }

    unlink(aId,bId){
      const key=aId+"->"+bId;
      this.links=this.links.filter(x=>x.key!==key);
    }

    /*
     * playTravel(direction, duration) — dispara una capa TEMPORAL de
     * "viaje" a través del campo: un empuje radial (centro -> bordes para
     * direction=1, bordes -> centro para direction=-1) cuya fuerza escala
     * con la profundidad z de cada partícula, así las cercanas se mueven
     * más rápido que las lejanas (parallax real). No es un modo aparte:
     * es solo un término adicional que se suma a la física existente
     * durante `duration` ms y luego se apaga solo — el resorte de cada
     * partícula hace que todo vuelva a su movimiento normal sin más
     * intervención. No modifica el estado permanente del campo.
     */
    playTravel(direction, duration){
      this.travel={
        dir: direction<0 ? -1 : 1,
        start: performance.now(),
        duration: duration || 1000
      };
    }

    /*
     * playPageTravel(direction, duration, distance) — barrido HORIZONTAL
     * exclusivo para cambios de página/temática.
     *
     * A diferencia de playTravel(), aquí NO hay vórtice ni empuje radial:
     * todo el campo se traslada lateralmente como una cámara recorriendo
     * el mismo universo. El desplazamiento se aplica tanto a x como a bx
     * para que el resorte siga al nuevo sector y no "rebote" al terminar.
     * Los estados internos de una página nunca llaman este método.
     */
    playPageTravel(direction, duration, distance){
      const d=direction<0 ? -1 : 1;
      this.pageTravel={
        dir:d,
        start:performance.now(),
        duration:duration || 900,
        distance:distance || this.W*0.85,
        progress:0
      };
    }

    // ---------- eventos ----------

    _onResize(){
      this._resize();
      this._makeNodes();
    }

    _onMouseMove(e){
      this.mouse.x=e.clientX;
      this.mouse.y=e.clientY;
      this.mouse.active=true;
    }

    _onMouseLeave(){
      this.mouse.active=false;
      this.mouse.speed=0;
    }

    // ---------- setup ----------

    _resize(){
      const rect=this.canvas.getBoundingClientRect();
      this.dpr=Math.min(window.devicePixelRatio||1,2);
      this.W=rect.width;
      this.H=rect.height;
      this.canvas.width=this.W*this.dpr;
      this.canvas.height=this.H*this.dpr;
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    }

    _rand(a,b){ return a+Math.random()*(b-a); }

    _makeNodes(){
      const {W,H}=this;
      const count=Math.max(
        this.opts.minNodes,
        Math.min(this.opts.maxNodes, Math.floor((W*H)/this.opts.density))
      );
      this.nodes=[];
      for(let i=0;i<count;i++){
        // pseudo-profundidad: z=0 fondo (lejos), z=1 primer plano (cerca)
        const z=Math.pow(Math.random(),2.15);
        const r=0.4+Math.pow(z,1.15)*8.6;
        const x=this._rand(-30,W+30), y=this._rand(-30,H+30);
        this.nodes.push({
          x,y,bx:x,by:y,z,r,
          phase:this._rand(0,Math.PI*2),
          driftX:this._rand(.35,1.25),
          driftY:this._rand(.3,1.05),
          vx:0,vy:0,
          seed:Math.random()*100
        });
      }
    }

    // ---------- física ----------

    _update(t,dt){
      const m=this.mouse;
      if(m.active){
        const mdx=m.x-m.px, mdy=m.y-m.py;
        const mlen=Math.hypot(mdx,mdy);
        if(mlen>0.05){
          m.dirx=mdx/mlen; m.diry=mdy/mlen;
          m.speed=Math.min(mlen,42);
        } else {
          m.speed*=0.86; // si el mouse se detiene, el viento se apaga rápido
        }
        m.px=m.x; m.py=m.y;
      }

      const rect=this.canvas.getBoundingClientRect();
      const mx=m.x-rect.left, my=m.y-rect.top;
      const {W,H}=this;

      // Envolvente del viaje: sube y baja suave a lo largo de `duration`
      // (0 -> 1 -> 0), y se autodesactiva sola al terminar.
      let travelK=0, travelDir=0;
      if(this.travel){
        const elapsed=t-this.travel.start;
        if(elapsed>=this.travel.duration){
          this.travel=null;
        } else if(elapsed>=0){
          const ph=elapsed/this.travel.duration;
          travelK=Math.sin(ph*Math.PI);
          travelDir=this.travel.dir;
        }
      }
      this._travelK=travelK; // _draw() lo lee para el glow/tamaño/tinte

      // Barrido lateral EXCLUSIVO entre páginas.
      // Se calcula como desplazamiento acumulado con una curva suave:
      // el campo mantiene su densidad durante TODO el recorrido.
      let pageDx=0;
      let pageTravelK=0;
      if(this.pageTravel){
        const elapsed=t-this.pageTravel.start;
        const raw=Math.max(0,Math.min(1,elapsed/this.pageTravel.duration));
        const eased=raw*raw*(3-2*raw); // smoothstep
        pageDx=this.pageTravel.dir*this.pageTravel.distance*(eased-this.pageTravel.progress);
        this.pageTravel.progress=eased;
        pageTravelK=Math.sin(raw*Math.PI);

        if(raw>=1){
          this.pageTravel=null;
        }
      }
      this._pageTravelK=pageTravelK;

      for(const p of this.nodes){
        // Movimiento propio, lento y orgánico
        const speed=.28+p.z*1.30;
        let tx=p.bx
          + Math.sin(t*.00045*p.driftX+p.phase)*24*speed
          + Math.cos(t*.00026+p.seed)*11*p.z;
        let ty=p.by
          + Math.cos(t*.00040*p.driftY+p.phase)*22*speed
          + Math.sin(t*.00031+p.seed)*10*p.z;

        // Viaje: empuje radial (centro->bordes al avanzar, bordes->centro
        // al retroceder) que escala con la profundidad, para que las
        // partículas cercanas viajen más rápido que las lejanas.
        if(travelK>0){
          const dcx=p.x-W/2, dcy=p.y-H/2;
          const dc=Math.hypot(dcx,dcy)||1;
          const push=travelDir*travelK*(16+p.z*54);
          p.vx += (dcx/dc)*push*dt;
          p.vy += (dcy/dc)*push*dt;
        }

        // Barrido de página: traslado lateral directo del campo.
        // También movemos la "casa" bx para que el resorte no lo devuelva.
        if(pageDx!==0){
          p.x+=pageDx;
          p.bx+=pageDx;
        }

        // Viento: el cursor ESPANTA los nodos (alejamiento), nunca los atrae.
        // Se suma arrastre en la dirección del movimiento + turbulencia leve.
        if(m.active && m.speed>0.15){
          const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
          const R=175+p.z*95;
          if(d<R && d>0.5){
            const fall=Math.pow(1-d/R,1.7);
            const nx=dx/d, ny=dy/d;
            const flow=m.speed*(0.105+p.z*0.065)*fall;
            const repel=m.speed*(0.62+p.z*0.38)*fall;
            const turb=Math.sin(t*.0045+p.seed*2.1)*0.35;
            const txp=-ny, typ=nx;
            p.vx += (nx*repel + m.dirx*flow + txp*repel*turb)*dt*10;
            p.vy += (ny*repel + m.diry*flow + typ*repel*turb)*dt*10;
          }
        }

        // Resorte hacia el objetivo: hace que, al soltar, vuelva suave a su sitio
        const k=.20+p.z*.34;
        p.vx += (tx-p.x)*k*dt;
        p.vy += (ty-p.y)*k*dt;

        // Fricción
        p.vx*=Math.pow(.92,dt*60);
        p.vy*=Math.pow(.92,dt*60);

        const vmax=1.8+p.z*2.4;
        const vlen=Math.hypot(p.vx,p.vy);
        if(vlen>vmax){
          p.vx=p.vx/vlen*vmax;
          p.vy=p.vy/vlen*vmax;
        }

        p.x+=p.vx;
        p.y+=p.vy;

        // Wrap: la "casa" (bx,by) se mueve junto con el nodo para que el
        // resorte nunca tenga que tirar en línea recta desde el lado viejo.
        if(p.x<-50){p.x=W+50;p.bx+=W+100;}
        if(p.x>W+50){p.x=-50;p.bx-=W+100;}
        if(p.y<-50){p.y=H+50;p.by+=H+100;}
        if(p.y>H+50){p.y=-50;p.by-=H+100;}
      }

      // Pulsos de click
      for(let i=this.pulses.length-1;i>=0;i--){
        const pu=this.pulses[i];
        pu.r+=220*dt;
        pu.alpha-=dt*0.9;
        if(pu.alpha<=0) this.pulses.splice(i,1);
      }

      // Anchors/links: interpolación suave hacia su estado objetivo
      // (nada de saltos — así "aparecer" y "conectar" se sienten fluidos).
      for(const a of this.anchors.values()){
        a.alpha += (a.targetAlpha-a.alpha)*Math.min(1,dt*2.2);
      }
      for(const l of this.links){
        l.progress += (l.targetProgress-l.progress)*Math.min(1,dt*1.8);
        l.alpha += (l.targetAlpha-l.alpha)*Math.min(1,dt*2.2);
      }

      // Atracción muy leve de las partículas ambiente hacia los anchors
      // visibles — distinta del viento del mouse: constante, débil, no
      // depende del cursor. Da la sensación de que el campo "abraza" los
      // conceptos en vez de tenerlos flotando encima.
      if(this.anchors.size){
        for(const a of this.anchors.values()){
          if(a.alpha<0.03) continue;
          const ax=a.nx*W, ay=a.ny*H;
          for(const p of this.nodes){
            const dx=ax-p.x, dy=ay-p.y, d=Math.hypot(dx,dy);
            const R=220;
            if(d<R && d>1){
              const fall=Math.pow(1-d/R,2);
              const pull=0.03*fall*a.alpha*(0.4+p.z*0.6);
              p.vx += (dx/d)*pull*dt*10;
              p.vy += (dy/d)*pull*dt*10;
            }
          }
        }
      }
    }

    _buildEdges(){
      const K=3; // cada nodo se conecta a sus 3 vecinos más cercanos -> triángulos
      const edges=new Map();
      const nodes=this.nodes;
      for(let i=0;i<nodes.length;i++){
        const a=nodes[i];
        const cand=[];
        for(let j=0;j<nodes.length;j++){
          if(i===j) continue;
          const b=nodes[j];
          const d=Math.hypot(a.x-b.x,a.y-b.y);
          const threshold=72+(a.z+b.z)*82;
          if(d<threshold) cand.push({j,d,threshold});
        }
        cand.sort((p,q)=>p.d-q.d);
        for(const {j,d,threshold} of cand.slice(0,K)){
          const key=i<j?(i+"_"+j):(j+"_"+i);
          if(!edges.has(key)) edges.set(key,{i,j,d,threshold});
        }
      }
      return edges;
    }

    // ---------- render ----------

    _draw(){
      const ctx=this.ctx, {W,H}=this;
      const m=this.mouse;
      const rect=this.canvas.getBoundingClientRect();
      const mx=m.x-rect.left, my=m.y-rect.top;

      ctx.clearRect(0,0,W,H);

      // Mezcla blanco/gris -> rojo muy tenue -> blanco/gris para la malla
      // ambiente, según la envolvente del viaje. tk*0.3 acota el máximo
      // de mezcla para que el rojo quede como acento, no como dominante.
      const tk=this._travelK||0;
      const edgeMix=tk*0.3;
      const edgeR=Math.round(215+(227-215)*edgeMix);
      const edgeG=Math.round(215+(59-215)*edgeMix);
      const edgeB=Math.round(215+(53-215)*edgeMix);

      const edges=this._buildEdges();
      for(const {i,j,d,threshold} of edges.values()){
        const a=this.nodes[i], b=this.nodes[j];
        const depth=(a.z+b.z)/2;
        const nearMouse=m.active &&
          (Math.hypot(mx-a.x,my-a.y)<150 || Math.hypot(mx-b.x,my-b.y)<150);
        const alpha=(0.03+depth*.09)*(1-d/threshold);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=nearMouse
          ? `rgba(${this.opts.accentColor},${Math.min(.24,alpha*3.0)})`
          : `rgba(${edgeR},${edgeG},${edgeB},${alpha})`;
        ctx.lineWidth=.45+depth*.65;
        ctx.stroke();
      }

      for(const p of this.nodes){
        const near=m.active && Math.hypot(mx-p.x,my-p.y)<125;
        // Durante el viaje, las partículas cercanas (z alto) crecen un
        // poco — efecto puramente visual, no toca el radio físico p.r.
        const travelBoost=1+tk*p.z*0.32;
        const rr=p.r*(near?1.16:1)*travelBoost;

        // Halo bokeh: mucho más ancho y difuso en primer plano (z alto),
        // compacto y nítido al fondo (z bajo) — vende la profundidad.
        const haloMult=3.2+p.z*3.6;
        const coreFrac=0.82-p.z*0.34;

        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr*haloMult);
        g.addColorStop(0, near?`rgba(${this.opts.accentColor},.40)`:`rgba(225,225,225,${.10+p.z*.20})`);
        g.addColorStop(.30, near?`rgba(${this.opts.accentColor},.13)`:`rgba(225,225,225,${.035+p.z*.075})`);
        g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(p.x,p.y,rr*haloMult,0,Math.PI*2);ctx.fill();

        ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,rr*coreFrac),0,Math.PI*2);
        ctx.fillStyle=near?`rgba(${this.opts.accentColor},.70)`:`rgba(235,235,235,${.20+p.z*.28})`;
        ctx.fill();
      }

      for(const pu of this.pulses){
        ctx.beginPath();
        ctx.arc(pu.x,pu.y,pu.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${this.opts.accentColor},${Math.max(0,pu.alpha*0.6)})`;
        ctx.lineWidth=1.4;
        ctx.stroke();
      }

      // Links entre anchors: línea que crece hacia el objetivo + un pulso
      // viajando en la punta mientras avanza, como una señal recorriendo
      // el sistema (no una línea estática puesta encima).
      for(const l of this.links){
        if(l.alpha<=0.01) continue;
        const a=this.anchors.get(l.aId), b=this.anchors.get(l.bId);
        if(!a || !b) continue;
        const ax=a.nx*W, ay=a.ny*H, bx=b.nx*W, by=b.ny*H;
        const ex=ax+(bx-ax)*l.progress, ey=ay+(by-ay)*l.progress;

        // Halo rojo suave detrás de la línea: ancho, difuso, baja opacidad.
        // Durante el viaje (tk) el glow crece un poco y regresa solo al
        // terminar — la línea "participa" del viaje sin volverse láser.
        ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ex,ey);
        ctx.strokeStyle=`rgba(${this.opts.accentColor},${0.16*l.alpha*(1+tk*0.7)})`;
        ctx.lineWidth=5;
        ctx.shadowColor=`rgba(${this.opts.accentColor},${0.35*l.alpha*(1+tk*0.7)})`;
        ctx.shadowBlur=14+tk*10;
        ctx.stroke();
        ctx.shadowBlur=0;

        // Línea nítida encima, más gruesa y presente que antes.
        ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ex,ey);
        ctx.strokeStyle=`rgba(${this.opts.accentColor},${0.62*l.alpha})`;
        ctx.lineWidth=2.0;
        ctx.stroke();

        if(l.progress>0.02 && l.progress<1){
          ctx.beginPath();ctx.arc(ex,ey,2.2,0,Math.PI*2);
          ctx.fillStyle=`rgba(${this.opts.accentColor},${0.9*l.alpha})`;
          ctx.fill();
        }
      }

      // Anchors: mismo lenguaje bokeh que los nodos ambiente, pero fijos,
      // con un pulso propio muy leve (respiración) para que se sientan vivos.
      for(const a of this.anchors.values()){
        if(a.alpha<=0.01) continue;
        const ax=a.nx*W, ay=a.ny*H;
        const breathe=1+Math.sin(this.last*.0018+a.pulsePhase)*0.06;
        const rr=a.r*breathe;
        const haloMult=5.2;

        const g=ctx.createRadialGradient(ax,ay,0,ax,ay,rr*haloMult);
        g.addColorStop(0, `rgba(${this.opts.accentColor},${0.28*a.alpha})`);
        g.addColorStop(.30, `rgba(${this.opts.accentColor},${0.09*a.alpha})`);
        g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(ax,ay,rr*haloMult,0,Math.PI*2);ctx.fill();

        ctx.beginPath();ctx.arc(ax,ay,Math.max(.8,rr*.42),0,Math.PI*2);
        ctx.fillStyle=`rgba(245,245,245,${0.85*a.alpha})`;
        ctx.fill();
      }
    }

    _frame(t){
      if(!this.running) return;
      const dt=Math.min((t-this.last)/1000,.033)||.016;
      this.last=t;
      this._update(t,dt);
      this._draw();
      requestAnimationFrame(this._frame);
    }
  }

  TD.ParticleField=ParticleField;

})(window.TD = window.TD || {});
