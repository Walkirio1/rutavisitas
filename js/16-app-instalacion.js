// Versión, ajuste de pantalla iPhone, instalar como app, modo sin señal
// ── VERSIÓN (se ve en Configuración para saber qué versión está cargada)
const APP_VERSION='2026-10-11 · 61';
/* (se ejecuta al final, en js/99-arranque.js) */

// ── iPhone (app instalada): la altura automática a veces no llega al borde inferior
function ajustarAltoApp(){
  const app=document.querySelector('.app');
  if(!app) return;
  const vertical=window.matchMedia('(orientation:portrait)').matches;
  if(navigator.standalone===true && vertical){
    const h=Math.max(window.innerHeight,screen.height)+'px';
    app.style.bottom='auto';
    app.style.height=h;
    document.documentElement.style.height=document.body.style.height=h;
  }else{
    app.style.bottom='';app.style.height='';
    document.documentElement.style.height=document.body.style.height='';
  }
}
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */

// ── INSTALAR COMO APP + MODO SIN SEÑAL
let _instalarEvt=null;
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */
function cerrarInstBar(recordar){
  document.getElementById('instBar').classList.remove('show');
  if(recordar) lsSet('sube:instdismiss2',Date.now());
}
// Aviso para instalar: una vez, unos segundos después de abrir; si lo cierran no vuelve por 14 días
/* (se ejecuta al final, en js/99-arranque.js) */

async function instalarApp(){
  if(_instalarEvt){
    _instalarEvt.prompt();
    await _instalarEvt.userChoice.catch(()=>{});
    _instalarEvt=null;
    return;
  }
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  confirm2(ios
    ? 'En iPhone: tocá el botón Compartir (cuadrado con flecha) de Safari y elegí "Agregar a pantalla de inicio".'
    : 'En Android: abrí el menú ⋮ de Chrome y elegí "Instalar app" o "Agregar a pantalla de inicio".',()=>{});
}
/* (se ejecuta al final, en js/99-arranque.js) */

// Refrescar estado de Drive al iniciar
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */

// Fuerza la última versión: borra la copia guardada de la app (no toca tus datos ni los mapas sin señal) y recarga
async function actualizarAhora(){
  lsDel('sube:instdismiss2'); // el aviso de instalar vuelve a mostrarse
  showToast('Buscando la última versión…');
  try{
    if('serviceWorker' in navigator){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));}
    if(window.caches){const ks=await caches.keys();await Promise.all(ks.filter(k=>/^sube-v\d+/.test(k)).map(k=>caches.delete(k)));}
  }catch(e){console.warn('actualizar:',e);}
  setTimeout(()=>location.reload(),600);
}
