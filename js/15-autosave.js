// Auto-guardado de la jornada
// --- AUTOSAVE JORNADA-ACTUAL.JSON ---
function triggerAutosave(){
  if(!drv.autosave || !drv.connected) return;
  // Debounce: si hay muchos cambios seguidos, espera 2s
  drv.autosavePending = true;
  if(drv.autosaveTimer) clearTimeout(drv.autosaveTimer);
  drv.autosaveTimer = setTimeout(()=>{
    guardarJornadaActualEnDrive().catch(e=>{
      console.error('autosave:',e);
    });
  },2000);
}

const JORNADA_ARCH='jornada-actual.json';
// quita del Drive visible el archivo viejo (ahora el respaldo está oculto)
async function borrarJornadaVisible(root){
  try{
    const b=await gapi.client.drive.files.list({q:`name='${JORNADA_ARCH}' and '${root}' in parents and trashed=false`,fields:'files(id)',pageSize:5});
    for(const f of (b.result.files||[])) await gapi.client.drive.files.delete({fileId:f.id});
  }catch(e){}
}

async function guardarJornadaActualEnDrive(){
  if(!drv.connected) return;
  const root = await driveGetRootFolderId();
  const jornada = {
    fecha: hoy(),
    hora: ahora(),
    timestamp: Date.now(),
    puntos: puntos,
    sel: [...sel],
    visits: visitsSinFotos(visits), // las fotos se envían aparte; la jornada en Drive no las lleva
  };
  const json = JSON.stringify(jornada);
  await ensureToken();
  // el respaldo va a la carpeta oculta de la app (no se ve en el Drive); hace falta el permiso drive.appdata
  const buscar = await gapi.client.drive.files.list({q:`name='${JORNADA_ARCH}' and trashed=false`,spaces:'appDataFolder',fields:'files(id)',pageSize:1}).catch(e=>e);
  if(buscar&&buscar.status&&buscar.status>=400){
    if(!drv.avisoAppData){drv.avisoAppData=true;showToast('Para el respaldo oculto cerrá sesión y volvé a entrar con Google',true);}
    return;
  }
  const existing=buscar.result.files&&buscar.result.files[0];
  const form=new FormData();
  form.append('metadata',new Blob([JSON.stringify(existing?{name:JORNADA_ARCH,mimeType:'application/json'}:{name:JORNADA_ARCH,mimeType:'application/json',parents:['appDataFolder']})],{type:'application/json'}));
  form.append('file',new Blob([json],{type:'application/json'}));
  const r=await fetch(existing?`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:existing?'PATCH':'POST',headers:{'Authorization':'Bearer '+drv.accessToken},body:form});
  if(!r.ok) throw new Error('No se pudo guardar el respaldo ('+r.status+')');
  borrarJornadaVisible(root); // el archivo que antes se veía en el Drive se quita
  const now = new Date().toLocaleString('es-AR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'});
  drv.lastSync = now;
  lsSet(SK.lastSync,now);
  drv.autosavePending = false;
  updateDriveBadge();
  const ls=document.getElementById('lastSyncInfo');
  if(ls)ls.textContent='⏱️ Última sincronización: '+now;
}

async function guardarJornadaAhora(){
  if(!drv.connected){showToast('Conectá Drive primero',true);return;}
  showToast('Guardando jornada...');
  try{
    await guardarJornadaActualEnDrive();
    showToast('✓ Jornada guardada en Drive');
  }catch(e){
    console.error(e);
    showToast('Error guardando jornada',true);
  }
}

async function cargarJornadaDesdeDrive(){
  if(!drv.connected) return null;
  await ensureToken();
  const bajar=async f=>{
    const resp=await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,{headers:{'Authorization':'Bearer '+drv.accessToken}});
    if(!resp.ok) throw new Error('No se pudo descargar');
    return await resp.json();
  };
  const oc=await gapi.client.drive.files.list({q:`name='${JORNADA_ARCH}' and trashed=false`,spaces:'appDataFolder',fields:'files(id)',pageSize:1}).catch(()=>null);
  const f1=oc&&oc.result&&oc.result.files&&oc.result.files[0];
  if(f1) return await bajar(f1);
  // respaldo viejo, el que se veía en el Drive
  const root=await driveGetRootFolderId();
  const bv=await gapi.client.drive.files.list({q:`name='${JORNADA_ARCH}' and '${root}' in parents and trashed=false`,fields:'files(id)',pageSize:1});
  const f2=bv.result.files&&bv.result.files[0];
  return f2?await bajar(f2):null;
}

function aplicarJornada(j){
  if(!j || !j.puntos) return;
  puntos = j.puntos||[];
  sel = new Set(j.sel||[]);
  visits = j.visits||{};
  lsSet(SK.puntos,puntos);
  lsSet(SK.sel,[...sel]);
  guardarVisits();
  cargarFotosVisits();
  renderP();renderV();updStats();
  if(mapa) renderMapa();
  showToast('Jornada cargada ✓');
}

async function checkJornadaActual(){
  // Solo ofrecer si hay archivo en Drive y la jornada local está vacía o es más vieja
  try{
    const j = await cargarJornadaDesdeDrive();
    if(!j) return;
    const localVacia = !puntos.length && Object.keys(visits).length===0;
    const driveMasNueva = !localVacia && j.timestamp && j.timestamp > 0 &&
      (puntos.length !== (j.puntos||[]).length || JSON.stringify([...sel].sort()) !== JSON.stringify((j.sel||[]).sort()));

    if(localVacia){
      confirm2(`📂 Hay una jornada guardada en Drive del ${j.fecha} ${j.hora||''} con ${(j.puntos||[]).length} puntos. ¿Cargarla?`,()=>aplicarJornada(j));
    }else if(driveMasNueva){
      confirm2(`⚠️ La jornada en Drive (${j.fecha} ${j.hora||''}) es diferente a la local. ¿Reemplazar la local con la de Drive?`,()=>aplicarJornada(j));
    }
  }catch(e){console.error('checkJornadaActual:',e);}
}

async function cargarJornadaDesdeManual(){
  if(!drv.connected){showToast('Conectá Drive primero',true);return;}
  showToast('Buscando jornada en Drive...');
  try{
    const j = await cargarJornadaDesdeDrive();
    if(!j){showToast('No hay jornada guardada en Drive',true);return;}
    confirm2(`📂 Jornada del ${j.fecha} ${j.hora||''} con ${(j.puntos||[]).length} puntos. ¿Cargar y reemplazar la local?`,()=>aplicarJornada(j));
  }catch(e){
    console.error(e);
    showToast('Error cargando jornada',true);
  }
}

async function borrarJornadaActualDrive(){
  if(!drv.connected) return;
  try{
    await ensureToken();
    const oc=await gapi.client.drive.files.list({q:`name='${JORNADA_ARCH}' and trashed=false`,spaces:'appDataFolder',fields:'files(id)',pageSize:5}).catch(()=>null);
    for(const f of ((oc&&oc.result&&oc.result.files)||[])) await gapi.client.drive.files.delete({fileId:f.id});
    await borrarJornadaVisible(await driveGetRootFolderId());
  }catch(e){console.error('borrarJornadaActual:',e);}
}
