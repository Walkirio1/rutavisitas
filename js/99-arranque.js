// Arranque: lo que se ejecuta al cargar la página, después de definir todas las funciones.
// (Estas instrucciones estaban sueltas entre las funciones; se juntan acá y mantienen su orden.)

aplicarPlantilla(); // listas de la planilla en uso (antes de dibujar nada)

// de 02-puntos.js
document.getElementById('fechaHdr').textContent=hoy();

// de 02-puntos.js
renderP();

// de 02-puntos.js
renderH();

// de 02-puntos.js
renderPlanillas();

// de 02-puntos.js
renderChips();

// de 02-puntos.js
updStats();

// de 02-puntos.js
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && document.getElementById('cfgPanel').classList.contains('show')) closeCfg();
});

// de 07-planillas.js
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && document.getElementById('ov').classList.contains('show')){
    closeOv();
  }
});

// de 10-tema-navegacion.js
try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(temaPref()==='auto')aplicarTema();});}catch(e){}

// de 10-tema-navegacion.js
aplicarTema();

// de 10-tema-navegacion.js
mostrarAppNav();

// de 10-tema-navegacion.js
actualizarIAEst();
actualizarPulsoEst();

// de 12-drive-sesion.js
document.addEventListener('click',()=>{
  if(_toqueUsado||drv.connected||!lsGet(SK_DRV_ON)||!drv.tokenClient) return;
  _toqueUsado=true;drv.silentTry=true;
  try{drv.tokenClient.requestAccessToken({prompt:'',login_hint:drv.user||undefined});}catch(e){}
},true);

// de 14-envios-pendientes.js
window.addEventListener('online',()=>setTimeout(()=>reintentarPendientes(true),2500));

// de 14-envios-pendientes.js
setInterval(()=>{if(drv.connected&&pendientesEnvio().length)reintentarPendientes(true);},60000);

// de 16-app-instalacion.js
document.getElementById('appVersion').textContent='Versión '+APP_VERSION;

// de 16-app-instalacion.js
ajustarAltoApp();

// de 16-app-instalacion.js
['resize','orientationchange','pageshow'].forEach(ev=>window.addEventListener(ev,ajustarAltoApp));

// de 16-app-instalacion.js
document.addEventListener('visibilitychange',()=>{if(!document.hidden)ajustarAltoApp();});

// de 16-app-instalacion.js
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_instalarEvt=e;});

// de 16-app-instalacion.js
window.addEventListener('appinstalled',()=>{_instalarEvt=null;const b=document.getElementById('btnInstalar');if(b)b.style.display='none';showToast('App instalada ✓');});

// de 16-app-instalacion.js
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){
  setTimeout(()=>{const b=document.getElementById('btnInstalar');if(b)b.style.display='none';},0);
}

// de 16-app-instalacion.js
setTimeout(()=>{
  const ya=navigator.standalone||window.matchMedia('(display-mode: standalone)').matches;
  const cerrado=lsGet('sube:instdismiss');
  if(ya||(cerrado&&Date.now()-cerrado<3*864e5)) return;
  document.getElementById('instBar').classList.add('show');
},2500);

// de 16-app-instalacion.js
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('sw:',e)));
}

// de 16-app-instalacion.js
setTimeout(()=>{
  updateDriveBadge();
  renderDriveTab();
  reconectarDrive();
  cargarFotosVisits();
  actualizarGate();
},300);

// de 16-app-instalacion.js
actualizarGate();

// de 26-equipo.js
eqInvitacionEnUrl();
setTimeout(()=>{eqRevisarRuta();eqVaciarCola();},2500);
window.addEventListener('online',()=>setTimeout(eqVaciarCola,2500));
setInterval(eqVaciarCola,60000);
setInterval(eqPosEnviar,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) setTimeout(eqPosEnviar,1500);});

// de 27-dupla.js
dpIniciar();
