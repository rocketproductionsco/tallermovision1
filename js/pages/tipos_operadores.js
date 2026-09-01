/*
 * Página 10 — TIPOS DE OPERADORES
 * Estados:
 * 0 introducción
 * 1 COMP
 * 2 TOP
 * 3 CHOP
 * 4 SOP
 * 5 POP
 * 6 MAT
 * 7 DAT
 * 8 CUSTOM
 *
 * Cambio de página = barrido lateral global.
 * Cambio de estado = viaje radial/vórtice.
 */
(function(TD){
  "use strict";
  TD.pages=TD.pages||{};

  const STATE_COUNT=10;
  const TRAVEL_MS=950;

  TD.pages.createTiposOperadores=function(particleField,navigator){
    let el=null, stateIndex=0, transitioning=false, travelTimer=null;

    function node(tag,cls,text){
      const n=document.createElement(tag);
      n.className=cls;
      if(text!==undefined) n.textContent=text;
      return n;
    }

    function show(n,on){
      if(n) n.classList.toggle("td-types-visible",!!on);
    }

    function onClick(){
      if(!el || transitioning) return;
      navigator.next();
    }

    function applyState(i){
      stateIndex=i;
      if(!el) return;
      el.querySelectorAll(".td-types-state").forEach((s,idx)=>{
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

    const families=[
      {
        key:"comp",
        code:"COMP",
        full:"Component Operators",
        analogy:"Una pieza reutilizable",
        detail:"Componentes · interfaces · estructuras",
        visual:"component"
      },
      {
        key:"top",
        code:"TOP",
        full:"Texture Operators",
        analogy:"La piel de una imagen",
        detail:"Imágenes · video · texturas",
        visual:"texture"
      },
      {
        key:"chop",
        code:"CHOP",
        full:"Channel Operators",
        analogy:"Valores que cambian",
        detail:"Señales · valores · tiempo",
        visual:"signal"
      },
      {
        key:"sop",
        code:"SOP",
        full:"Surface Operators",
        analogy:"La forma de un objeto",
        detail:"Geometría · superficies 3D",
        visual:"geometry"
      },
      {
        key:"pop",
        code:"POP",
        full:"Particle Operators",
        analogy:"Partículas que se mueven",
        detail:"Partículas · movimiento · simulación",
        visual:"particles"
      },
      {
        key:"mat",
        code:"MAT",
        full:"Material Operators",
        analogy:"Cómo se ve una superficie",
        detail:"Material · textura · sombreado",
        visual:"material"
      },
      {
        key:"dat",
        code:"DAT",
        full:"Data Operators",
        analogy:"Una hoja de datos",
        detail:"Texto · tablas · datos estructurados",
        visual:"table"
      },
      {
        key:"custom",
        code:"CUSTOM",
        full:"Custom Operators",
        analogy:"Una herramienta propia",
        detail:"Operadores personalizados",
        visual:"custom"
      }
    ];

    function makeVisual(type){
      const v=node("div",`td-types-visual td-types-${type}`);

      if(type==="component"){
        const panel=node("div","td-types-ui-panel");
        ["td-types-ui-dot","td-types-ui-line","td-types-ui-button"].forEach(c=>panel.appendChild(node("div",c)));
        v.appendChild(panel);
      } else if(type==="texture"){
        const grid=node("div","td-types-pixel-grid");
        for(let i=0;i<36;i++) grid.appendChild(node("i",i%2?"":"td-types-pixel-bright"));
        v.appendChild(grid);
      } else if(type==="signal"){
        const wave=node("div","td-types-wave");
        wave.innerHTML="<svg viewBox='0 0 520 170' preserveAspectRatio='none' aria-hidden='true'><path d='M0 90 C45 15 80 155 130 85 S215 15 260 90 S345 165 390 85 S475 15 520 90'/><path d='M0 112 C55 55 95 160 145 105 S225 55 275 112 S360 160 415 105 S480 55 520 112'/></svg>";
        v.appendChild(wave);
      } else if(type==="geometry"){
        const geo=node("div","td-types-geo");
        geo.innerHTML="<span class='g1'></span><span class='g2'></span><span class='g3'></span><span class='g4'></span><span class='g5'></span><span class='g6'></span>";
        v.appendChild(geo);
      } else if(type==="particles"){
        const cloud=node("div","td-types-particle-cloud");
        for(let i=0;i<22;i++) cloud.appendChild(node("i"));
        v.appendChild(cloud);
      } else if(type==="material"){
        const sphere=node("div","td-types-sphere");
        v.appendChild(sphere);
        v.appendChild(node("div","td-types-material-highlight"));
      } else if(type==="table"){
        const table=node("div","td-types-table");
        const vals=["12","04","87","03","51","22","A","B","C","19","73","06"];
        vals.forEach(x=>table.appendChild(node("span","",x)));
        v.appendChild(table);
      } else if(type==="custom"){
        const custom=node("div","td-types-custom-box");
        custom.appendChild(node("div","td-types-custom-core","CUSTOM"));
        custom.appendChild(node("div","td-types-custom-line l1"));
        custom.appendChild(node("div","td-types-custom-line l2"));
        v.appendChild(custom);
      }
      return v;
    }

    return {
      id:"tipos-operadores",

      mount(root){
        el=document.createElement("div");
        el.className="td-page td-types-page";

        const title=node("h2","td-types-title td-reveal-pending","TIPOS DE OPERADORES");
        const subtitle=node("p","td-types-subtitle td-reveal-pending","¿QUÉ TIPO DE INFORMACIÓN QUEREMOS PROCESAR?");

        const stage=node("div","td-types-stage");

        // Estado 0: introducción
        const intro=node("section","td-types-state td-types-intro");
        intro.appendChild(node("div","td-types-intro-mark","COMP · TOP · CHOP · SOP · POP · MAT · DAT"));
        intro.appendChild(node("p","td-types-intro-copy","Diferentes tipos de información se procesan de diferentes maneras."));
        stage.appendChild(intro);

        families.forEach(f=>{
          const s=node("section","td-types-state td-types-family");
          s.appendChild(makeVisual(f.visual));
          const text=node("div","td-types-family-text");
          text.appendChild(node("div","td-types-code",f.code));
          text.appendChild(node("div","td-types-full",f.full));
          text.appendChild(node("div","td-types-analogy",f.analogy));
          text.appendChild(node("div","td-types-detail",f.detail));
          s.appendChild(text);
          stage.appendChild(s);
        });

        // Estado final: todas las familias juntas.
        const all=node("section","td-types-state td-types-all");
        const allGrid=node("div","td-types-all-grid");
        families.forEach(f=>{
          const item=node("div","td-types-all-item");
          item.appendChild(node("div","td-types-all-code",f.code));
          item.appendChild(node("div","td-types-all-name",f.full.replace(" Operators","")));
          allGrid.appendChild(item);
        });
        all.appendChild(allGrid);
        all.appendChild(node("div","td-types-all-copy","DIFERENTES DATOS · DIFERENTES FORMAS DE PROCESARLOS"));
        stage.appendChild(all);

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
