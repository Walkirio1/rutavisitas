// Versión, ajuste de pantalla iPhone, instalar como app, modo sin señal
// ── VERSIÓN (se ve en Configuración para saber qué versión está cargada)
const APP_VERSION='2026-10-12 · 70';
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
  instGuiaAbrir();
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

// Guía para instalar a mano (iPhone y celulares sin el botón automático de instalar)
function instGuiaAbrir(){
  const ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua),otro=/CriOS|FxiOS|EdgiOS/i.test(ua); // Chrome/Firefox/Edge en iPhone
  const paso=(n,ico,tx)=>`<div class="ig-p"><b>${n}</b><span class="ig-i">${ico}</span><div>${tx}</div></div>`;
  document.getElementById('instGuiaPasos').innerHTML=ios
    ?paso(1,'⬆️',otro?'Tocá el botón <b>Compartir</b> (el cuadrado con la flecha), arriba junto a la barra de direcciones.':'Tocá el botón <b>Compartir</b> (el cuadrado con la flecha), abajo en el centro de Safari.')
      +paso(2,'➕','Deslizá la lista y elegí <b>«Agregar a pantalla de inicio»</b>.')
      +paso(3,'✅','Tocá <b>«Agregar»</b>. ¡Listo! LogiMap aparece como una app.')
    :paso(1,'⋮','Abrí el menú <b>⋮</b> del navegador (arriba a la derecha).')
      +paso(2,'📲','Elegí <b>«Instalar app»</b> o <b>«Agregar a pantalla de inicio»</b>.')
      +paso(3,'✅','Confirmá. ¡Listo! LogiMap aparece como una app.');
  document.getElementById('instGuiaDlg').classList.add('show');
  const f=document.getElementById('instGuiaFlecha');
  f.style.display=ios&&!otro?'flex':'none'; // la flecha señala el botón Compartir de Safari (abajo)
}
function instGuiaCerrar(){document.getElementById('instGuiaDlg').classList.remove('show');document.getElementById('instGuiaFlecha').style.display='none';}
