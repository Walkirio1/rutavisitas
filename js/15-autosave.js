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
  // Buscar si ya existe el archivo
  await ensureToken();
  const buscar = await gapi.client.drive.files.list({
    q: `name='jornada-actual.json' and '${root}' in parents and trashed=false`,
    fields:'files(id,name)',
    pageSize:1,
  });
  const existing = buscar.result.files && buscar.result.files[0];
  if(existing){
    // Update con PATCH multipart
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({name:'jornada-actual.json',mimeType:'application/json'})],{type:'application/json'}));
    form.append('file', new Blob([json],{type:'application/json'}));
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`,{
      method:'PATCH',
      headers:{'Authorization':'Bearer '+drv.accessToken},
      body: form,
    });
  }else{
    await driveUploadFile('jornada-actual.json','application/json',json,root);
  }
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
  const root = await driveGetRootFolderId();
  await ensureToken();
  const buscar = await gapi.client.drive.files.list({
    q: `name='jornada-actual.json' and '${root}' in parents and trashed=false`,
    fields:'files(id,name,modifiedTime)',
    pageSize:1,
  });
  const f = buscar.result.files && buscar.result.files[0];
  if(!f) return null;
  // Bajar contenido
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,{
    headers:{'Authorization':'Bearer '+drv.accessToken},
  });
  if(!resp.ok) throw new Error('No se pudo descargar');
  return await resp.json();
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
    const root = await driveGetRootFolderId();
    await ensureToken();
    const buscar = await gapi.client.drive.files.list({
      q: `name='jornada-actual.json' and '${root}' in parents and trashed=false`,
      fields:'files(id)',pageSize:1,
    });
    const f = buscar.result.files && buscar.result.files[0];
    if(f){
      await gapi.client.drive.files.delete({fileId:f.id});
    }
  }catch(e){console.error('borrarJornadaActual:',e);}
}
