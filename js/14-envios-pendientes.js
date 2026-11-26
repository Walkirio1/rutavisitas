// Envíos pendientes y guardar en el celular
// ── ENVÍOS PENDIENTES: lo que se guardó en la app pero no llegó a Drive
function marcarEnvio(id,estado,motivo){
  const v=visits[id];if(!v) return;
  v.envio={estado,motivo:motivo||null,ts:Date.now(),local:estado==='pendiente'?!!(v.envio&&v.envio.local):false};
  guardarVisits();
  renderV();updateDriveBadge();
}
function pendientesEnvio(){
  return Object.keys(visits).filter(id=>{const v=visits[id];return v&&v.done&&!v.remoto&&v.planilla&&v.envio&&v.envio.estado==='pendiente';});
}
function marcarVisitasSinEnviarAlConectar(){
  let n=0;
  for(const [id,v] of Object.entries(visits)){
    if(v&&v.done&&!v.remoto&&!v.noVisitado&&v.planilla&&!v.planilla.drivePdfUrl&&(!v.envio||!v.envio.estado)){
      v.envio={estado:'pendiente',motivo:'Guardada sin conexión con Drive',ts:Date.now(),local:false};
      n++;
    }
  }
  if(n){guardarVisits();renderV();updateDriveBadge();}
  return n;
}
function renderPendientes(){
  const box=document.getElementById('vPendientes');if(!box) return;
  const n=pendientesEnvio().length;
  if(!n){box.innerHTML='';return;}
  box.innerHTML=`<div class="pend-bar">
    <div>⚠️ <strong>${n}</strong> visita${n>1?'s':''} guardada${n>1?'s':''} en la app pero <strong>sin enviar a Drive</strong>. No se perdió nada.</div>
    <div class="pb-btns">
      <button class="sm sma" onclick="reintentarPendientes()">${IC("refresh")} Reintentar</button>
      <button class="sm smh" onclick="guardarEnCelular()">${IC("folder")} Guardar en el celular</button>
    </div>
  </div>`;
}

// Cuadro con botones (envío fallido, archivos listos...)
function mostrarDlgEnvio(msg,botones){
  document.getElementById('envioMsg').textContent=msg;
  const cont=document.getElementById('envioBtns');cont.innerHTML='';
  botones.forEach(b=>{
    const el=document.createElement('button');
    el.className='btn '+(b.cls||'bd');el.textContent=b.txt;
    el.addEventListener('click',()=>{document.getElementById('envioDlg').classList.remove('show');if(b.fn)b.fn();});
    cont.appendChild(el);
  });
  document.getElementById('envioDlg').classList.add('show');
}
function avisarNoEnviado(id){
  const p=puntos.find(x=>x.id===id);
  mostrarDlgEnvio(`La visita de «${(p&&(p.nombre||p.dir))||id}» se guardó en la app, pero NO se envió a Drive. No se perdió nada: podés reintentar o guardarla en el celular.`,[
    {txt:'Reintentar ahora',cls:'ba',fn:()=>reintentarPendientes()},
    {txt:'Guardar en el celular',cls:'bd',fn:()=>guardarEnCelular([id])},
    {txt:'Más tarde',cls:'bd'}
  ]);
}

let _avisoRecoMostrado=false,_envioOkPendiente=null;
function modalBloqueanteAbierto(){
  return ['ov','firmaDlg','updDlg'].some(id=>{const e=document.getElementById(id);return e&&e.classList&&e.classList.contains('show');});
}
function avisarReconectarParaPendientes(forzar){
  const n=pendientesEnvio().length;
  if(!n||navigator.onLine===false) return;
  if(!forzar&&_avisoRecoMostrado) return;
  if(modalBloqueanteAbierto()) return;
  _avisoRecoMostrado=true;
  mostrarDlgEnvio(`☁️ Tenés ${n} visita${n>1?'s':''} guardada${n>1?'s':''} sin enviar a Google Drive.\n\nTocá el botón para conectar Google y subir los PDF y fotos ahora.`,[
    {txt:'Conectar Google y enviar ahora',cls:'ba',fn:()=>{_avisoRecoMostrado=false;connectDrive();}},
    {txt:'Guardar en el celular',cls:'bd',fn:()=>guardarEnCelular()},
    {txt:'Más tarde',cls:'bd'}
  ]);
}
function avisarEnvioCompletoDrive(enviadas){
  if(!enviadas||!enviadas.length) return;
  if(modalBloqueanteAbierto()){
    _envioOkPendiente=(_envioOkPendiente||[]).concat(enviadas);
    showToast('✓ Todo enviado a Drive ('+enviadas.length+')');
    return;
  }
  const n=enviadas.length;
  const lista=enviadas.slice(0,5).map(t=>'• '+t).join('\n')+(n>5?'\n• … y '+(n-5)+' más':'');
  const carpeta=(typeof drv!=='undefined'&&drv.folderName)?'\n\nCarpeta en Drive: '+drv.folderName:'';
  const msg='✅ ¡Listo! Se envi'+(n===1?'ó 1 visita':'aron '+n+' visitas')+' a tu Google Drive (PDF y fotos).\n\n'+lista+carpeta;
  mostrarDlgEnvio(msg,[{txt:'Entendido',cls:'ba'}]);
}

let _reintentando=false;
async function reintentarPendientes(silent){
  if(_reintentando) return;
  const ids=pendientesEnvio();
  if(!ids.length){if(!silent)showToast('No hay nada pendiente ✓');return;}
  if(navigator.onLine===false){if(!silent)showToast('Sin internet: se reintenta solo cuando vuelva',true);return;}
  if(!drv.connected){
    if(!silent) connectDrive();
    else if(lsGet(SK_DRV_ON)||lsGet(SK_MODO)==='google') avisarReconectarParaPendientes(false);
    return;
  }
  _reintentando=true;const enviadas=[];let authErr=false;
  try{
    try{await ensureToken();}catch(e){authErr=true;}
    if(!authErr){
      if(!silent)showToast('Enviando '+ids.length+'...');
      const pdf=await pdfParaVisita();
      for(const id of ids){
        const punto=puntos.find(p=>p.id===id),v=visits[id];
        if(!punto||!v||!v.planilla) continue;
        if(v.planilla.tieneFoto&&!v.planilla.foto){const f=await fotoGet(id);if(f)v.planilla.foto=f;}
        if(await subirVisitaADrive(punto,v,pdf.b64,pdf.nombre)) enviadas.push(punto.nombre||punto.dir||id);
        else{if(v.envio&&v.envio.motivo==='Sesión de Google vencida') authErr=true;break;} // si una falla, probablemente no hay señal o venció la sesión
      }
    }
  }catch(e){console.error('reintentar:',e);}
  finally{_reintentando=false;}
  renderPendientes();renderV();updateDriveBadge();
  if(authErr){avisarReconectarParaPendientes(!silent);return;}
  const quedan=pendientesEnvio().length;
  if(enviadas.length&&!quedan){
    _avisoRecoMostrado=false;
    if(typeof triggerAutosave==='function') triggerAutosave();
    showToast('✓ Todo enviado a Drive');
    avisarEnvioCompletoDrive(enviadas);
  }else if(enviadas.length&&quedan){
    showToast('Se enviaron '+enviadas.length+', quedan '+quedan+' pendientes',true);
  }else if(!silent&&quedan){
    showToast(quedan+' siguen sin enviar. Probá de nuevo o guardalas en el celular',true);
  }
}
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */

// ── GUARDAR EN EL CELULAR: foto + planilla rellenada → hoja de compartir ("Guardar en Archivos") o descarga
function b64ABlob(b64,tipo){
  const bin=atob(b64.replace(/^data:[^,]+,/,'').replace(/\s/g,''));
  const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:tipo});
}
let _archivosListos=null;
async function prepararArchivos(ids){
  const files=[];const usados=new Set();const pdf=await pdfParaVisita();
  for(const id of ids){
    const punto=puntos.find(p=>p.id===id),v=visits[id];
    if(!punto||!v||!v.planilla) continue;
    if(v.planilla.tieneFoto&&!v.planilla.foto){const f=await fotoGet(id);if(f)v.planilla.foto=f;}
    let base=nombreVisita(punto);
    if(usados.has(base.toLowerCase())) base+=' ('+id+')'; usados.add(base.toLowerCase()); // sin repetir nombres dentro del mismo envío
    if(v.planilla.foto&&fotoModo()==='aparte') files.push(new File([b64ABlob(v.planilla.foto,'image/jpeg')],base+' (foto).jpg',{type:'image/jpeg'}));
    if(pdf.b64){
      let b=pdf.b64;
      try{b=await rellenarPlanillaPDF(pdf.b64,punto,v);}catch(e){console.warn('pdf en blanco:',e);}
      files.push(new File([b64ABlob(b,'application/pdf')],base+'.pdf',{type:'application/pdf'}));
    }
  }
  return files;
}
function descargarArchivos(files){
  files.forEach((f,i)=>setTimeout(()=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
  },i*500));
  showToast('Descargando '+files.length+' archivo'+(files.length>1?'s':'')+'… quedan en Descargas');
}
function marcarCopiaLocal(ids){
  ids.forEach(id=>{if(visits[id]&&visits[id].envio){visits[id].envio.local=true;}});
  guardarVisits();renderV();
}
async function compartirListos(){
  const files=_archivosListos;if(!files||!files.length) return;
  try{
    await navigator.share({files,title:'Visitas SUBE'});
    showToast('✓ Elegí "Guardar en Archivos" para dejarlas en el celular');
  }catch(e){if(!e||e.name!=='AbortError'){console.warn(e);descargarArchivos(files);}}
}
async function guardarEnCelular(ids){
  ids=ids||pendientesEnvio();
  if(!ids.length){showToast('No hay nada pendiente ✓');return;}
  showToast('Preparando archivos...');
  let files;
  try{files=await prepararArchivos(ids);}catch(e){console.error(e);showToast('No se pudieron preparar los archivos',true);return;}
  if(!files.length){showToast('No hay archivos para guardar',true);return;}
  _archivosListos=files;marcarCopiaLocal(ids);
  if(compartirArchivosOk()&&navigator.canShare({files})){
    try{
      await navigator.share({files,title:'Visitas SUBE'});
      showToast('✓ Elegí "Guardar en Archivos" para dejarlas en el celular');
      return;
    }catch(e){
      if(e&&e.name==='AbortError') return; // el usuario cerró la hoja
      // el navegador pide un toque nuevo para compartir: se ofrece un botón
      mostrarDlgEnvio(files.length+' archivo'+(files.length>1?'s':'')+' listo'+(files.length>1?'s':'')+'. Tocá para guardarlos en el celular.',[
        {txt:'Guardar en el celular',cls:'ba',fn:compartirListos},
        {txt:'⬇️ Descargar',cls:'bd',fn:()=>descargarArchivos(files)},
        {txt:'Cancelar',cls:'bd'}
      ]);
      return;
    }
  }
  descargarArchivos(files);
}
