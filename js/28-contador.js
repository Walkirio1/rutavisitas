// Contador anónimo de uso: cuenta instalaciones y usuarios activos sin saber quién es nadie.
// Manda un código al azar de esta instalación, la versión y 4 datos de sí/no. Nunca visitas, fotos, direcciones, mails ni ubicación.
const SK_CID='sube:cid',SK_CONTAR='sube:contar',SK_CPING='sube:cping';
const contarOn=()=>lsGet(SK_CONTAR)!==false;
function contadorId(){
  let id=lsGet(SK_CID);
  if(!id||typeof id!=='string'){
    const a=new Uint8Array(12);(window.crypto||{getRandomValues:x=>x.forEach((_,i)=>x[i]=Math.random()*256)}).getRandomValues(a);
    id=[...a].map(b=>b.toString(16).padStart(2,'0')).join('');lsSet(SK_CID,id);
  }
  return id;
}
async function contadorPing(){
  try{
    if(!contarOn()||!navigator.onLine) return;
    const ahora=Date.now(),ult=+lsGet(SK_CPING)||0;
    if(ahora-ult<6*3600*1000) return; // como mucho una vez cada 6 horas
    const f={
      app:!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true,
      pdf:modoPlanilla()==='pdf',
      equipo:!!equipo(),
      dupla:!!dupla(),
      google:lsGet(SK_MODO)==='google'
    };
    const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);
    const r=await fetch(dpBase()+'/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({i:contadorId(),v:APP_VERSION,f}),signal:c.signal,keepalive:true});
    clearTimeout(t);
    if(r.ok) lsSet(SK_CPING,ahora);
  }catch(e){/* sin conexión o servidor apagado: no pasa nada */}
}
function optContarCambio(on){lsSet(SK_CONTAR,!!on);showToast(on?'Gracias, nos ayuda a mejorar LogiMap':'Listo, no se cuenta tu uso');}
function contadorSync(){const e=document.getElementById('optContar');if(e) e.checked=contarOn();}
