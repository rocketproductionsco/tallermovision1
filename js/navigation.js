/*
 * Navigator
 * ---------
 * Router mínimo de páginas. Cada página es un objeto:
 *   { id, mount(root), unmount(root) }
 *
 * Opcionalmente, una página puede tener ESTADOS INTERNOS (varios pasos
 * antes de avanzar a la siguiente página). Para eso expone:
 *   nextState() -> boolean   // true si avanzó de estado, false si ya estaba en el último
 *   prevState() -> boolean   // true si retrocedió de estado, false si ya estaba en el primero
 * Si una página no define estos métodos (como la portada), next()/prev()
 * pasan directo a la página siguiente/anterior, igual que antes.
 *
 * Se registran en orden con register() y se navega con next()/prev()/goTo().
 * No sabe nada del sistema de partículas: cada página recibe lo que
 * necesita (por ejemplo el ParticleField) al construirse, no aquí.
 *
 * Flechas ← → , Space y Enter quedan cableadas por defecto.
 * Página 2, 3... se agregan después con otro nav.register(...) — no hay
 * que tocar esta clase para eso.
 */
(function(TD){
  "use strict";

  class Navigator{
    constructor(root){
      this.root=root;
      this.pages=[];
      this.current=-1;
      this.onPageChange=null;
      this._onKey=this._onKey.bind(this);
    }

    register(page){
      this.pages.push(page);
    }

    init(startIndex){
      window.addEventListener("keydown", this._onKey);
      this.goTo(startIndex||0);
    }

    destroy(){
      window.removeEventListener("keydown", this._onKey);
    }

    goTo(index){
      if(index<0 || index>=this.pages.length) return false; // fuera de rango: no-op
      if(index===this.current) return true;

      if(this.current>=0){
        const prev=this.pages[this.current];
        if(prev.unmount) prev.unmount(this.root);
      }

      const previous=this.current;
      this.current=index;
      const page=this.pages[this.current];
      if(page.mount) page.mount(this.root);

      // Hook opcional para efectos de transición entre PÁGINAS.
      // Los estados internos nunca pasan por aquí, por lo que no disparan
      // el barrido lateral.
      if(previous>=0 && typeof this.onPageChange==="function"){
        this.onPageChange(previous,index);
      }
      return true;
    }

    next(){
      const page=this.pages[this.current];
      if(page && typeof page.nextState==="function"){
        if(page.nextState()) return true; // se movió a un estado interno
      }
      return this.goTo(this.current+1);
    }

    prev(){
      const page=this.pages[this.current];
      if(page && typeof page.prevState==="function"){
        if(page.prevState()) return true; // retrocedió a un estado interno
      }
      return this.goTo(this.current-1);
    }

    _onKey(e){
      if(e.code==="ArrowRight" || e.code==="Space" || e.code==="Enter"){
        e.preventDefault();
        this.next();
      } else if(e.code==="ArrowLeft"){
        e.preventDefault();
        this.prev();
      }
    }
  }

  TD.Navigator=Navigator;

})(window.TD = window.TD || {});

