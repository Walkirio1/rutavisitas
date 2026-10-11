// Planillas guardadas y ventana de la planilla de visita
// ── PLANILLAS GUARDADAS
function setPlDef(id){
  plDefId=id||null;
  if(plDefId)lsSet(SK.plDef,plDefId);else lsDel(SK.plDef);
  renderPlanillas();showToast('Planilla predeterminada actualizada ✓');
}

function renderPlanillas(){
  const plList=document.getElementById('plList');
  const plEmpty=document.getElementById('plEmpty');
  document.getElementById('plCount').textContent=planillas.length?`(${planillas.length}/10)`:'';
  plEmpty.style.display='none';
  const fila=(nombre,sub,activa,onclick,extra)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--bg-2);border:1px solid ${activa?'rgba(16,185,129,.5)':'var(--line-2)'};border-radius:11px;margin-bottom:6px">
      <span style="flex-shrink:0"><svg class="ico" style="width:30px;height:30px"><use href="#i-file"/></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(nombre)}</div>
        <div style="font-size:10px;color:var(--text-mute);margin-top:2px">${sub}</div>
      </div>
      ${activa?'<span style="font-size:11px;color:#10b981;font-weight:700">✓ En uso</span>':`<button class="sm sma" onclick="${onclick}">Usar</button>`}
      ${extra||''}
    </div>`;
  const hayDef=plDefId&&planillas.some(x=>x.id===plDefId);
  plList.innerHTML=
    fila('Planilla oficial SUBE','Incluida en la app',!hayDef,'setPlDef(null)','')+
    planillas.map(pl=>fila(pl.nombre,'Guardada el '+pl.fecha,hayDef&&plDefId===pl.id,`setPlDef('${pl.id}')`,`<button class="sm smr" onclick="borrarPlanilla('${pl.id}')">🗑️</button>`)).join('');
}

let nuevaPdfB64=null;
function loadNuevaPdf(input){
  const file=input.files[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith('.pdf')){showToast('Solo archivos PDF',true);return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const bytes=new Uint8Array(e.target.result);let bin='';
    bytes.forEach(b=>bin+=String.fromCharCode(b));
    nuevaPdfB64=btoa(bin);
    document.getElementById('pdfNombreFile').textContent=file.name;
    document.getElementById('pdfDropZone').style.display='none';
    document.getElementById('pdfOkZone').style.display='block';
    const nm=document.getElementById('nuevaPlNombre');
    if(!nm.value) nm.value=file.name.replace(/\.pdf$/i,'').replace(/_/g,' ');
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}

function quitarNuevaPdf(){
  nuevaPdfB64=null;
  document.getElementById('pdfDropZone').style.display='';
  document.getElementById('pdfOkZone').style.display='none';
}

function guardarNuevaPlanilla(){
  if(!nuevaPdfB64){showToast('Elegí un PDF primero',true);return;}
  const nombre=document.getElementById('nuevaPlNombre').value.trim();
  if(!nombre){showToast('Escribí un nombre',true);return;}
  if(planillas.length>=10){showToast('Máximo 10 planillas',true);return;}
  const np=[{id:'pl_'+Date.now(),nombre,b64:nuevaPdfB64,fecha:hoy()},...planillas].slice(0,10);
  planillas=np;lsSet(SK.planillas,planillas);
  nuevaPdfB64=null;
  document.getElementById('nuevaPlNombre').value='';
  document.getElementById('pdfDropZone').style.display='';
  document.getElementById('pdfOkZone').style.display='none';
  renderPlanillas();showToast(`Planilla "${nombre}" guardada ✓`);
}

function borrarPlanilla(id){
  confirm2('¿Eliminar esta planilla guardada?',function(){
    planillas=planillas.filter(p=>p.id!==id);
    if(plDefId===id){plDefId=null;lsDel(SK.plDef);}
    lsSet(SK.planillas,planillas);
    renderPlanillas();showToast('Planilla eliminada ✓');
  });
}

// ── MODAL PLANILLA VISITA
function openPl(id){
  curId=id;plC={};fotoData=null;
  const p=puntos.find(x=>x.id===id)||{};
  const v=visits[id]||{};const pl=v.planilla;

  // checkboxes
  document.getElementById('plCarga').innerHTML=CN.map((n,i)=>
    `<div class="plr${pl&&pl.chC&&pl.chC[i]?' on':''}" onclick="plT('c${i}',this)"><div class="plrn">${n}</div><div class="plck"><span class="plx">✕</span></div></div>`
  ).join('');
  document.getElementById('plVenta').innerHTML=VN.map((n,i)=>
    `<div class="plr${pl&&pl.chV&&pl.chV[i]?' on':''}" onclick="plT('v${i}',this)"><div class="plrn">${n}</div><div class="plck"><span class="plx">✕</span></div></div>`
  ).join('');
  if(pl&&pl.chC) CN.forEach((_,i)=>{if(pl.chC[i])plC['c'+i]=true;});
  if(pl&&pl.chV) VN.forEach((_,i)=>{if(pl.chV[i])plC['v'+i]=true;});

  document.getElementById('plF').value=(pl&&pl.fecha)||hoy();
  document.getElementById('plH').value=(pl&&pl.hora)||ahora();
  document.getElementById('plI').value=p.id||'';
  document.getElementById('plD').value=p.dir||'';
  document.getElementById('plR').value=(pl&&pl.rubro)||p.tipo||'';
  document.getElementById('plO').value=(pl&&pl.obs)||'';

  // foto
  fotoData=(pl&&pl.foto)||null;
  const fp=document.getElementById('fotoPrev');
  document.getElementById('fotoBtnLbl').style.display=fotoData?'none':'block';
  fp.style.display=fotoData?'block':'none';
  if(fotoData)fp.src=fotoData;
  document.getElementById('fotoOk').style.display=fotoData?'block':'none';
  document.getElementById('fotoQuit').style.display=fotoData?'block':'none';

  // Con Drive conectado el botón también envía: se llama "Enviar"
  const bg=document.getElementById('btnGuardarVisita');
  const bs=document.getElementById('btnSoloGuardar');
  if(bs) bs.style.display=drv.connected?'':'none'; // sin Drive, el botón principal ya solo guarda
  if(bg) bg.innerHTML=drv.connected?(v.done?'☁️ Reenviar':'☁️ Enviar visita'):'💾 Guardar visita';

  const bd=document.getElementById('btnDesmarcar');
  if(bd) bd.style.display=v.done?'':'none'; // solo si ya estaba marcada como hecha

  document.getElementById('ov').classList.add('show');
  document.body.style.overflow='hidden';
}

function plT(k,el){plC[k]=!plC[k];el.classList.toggle('on',plC[k]);}

async function loadFoto(input){
  const file=input.files[0];if(!file)return;
  showToast('Procesando foto...');
  try{
    fotoData=await comprimirFoto(file);
  }catch(e){
    // si el navegador no puede achicarla, se usa la original
    fotoData=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.readAsDataURL(file);});
  }
  const fp=document.getElementById('fotoPrev');fp.src=fotoData;fp.style.display='block';
  document.getElementById('fotoBtnLbl').style.display='none';
  document.getElementById('fotoOk').style.display='block';
  document.getElementById('fotoQuit').style.display='block';
  showToast('Foto cargada ✓');
  input.value='';
}

function quitarFoto(){
  fotoData=null;
  document.getElementById('fotoPrev').style.display='none';
  document.getElementById('fotoPrev').src='';
  document.getElementById('fotoBtnLbl').style.display='block';
  document.getElementById('fotoOk').style.display='none';
  document.getElementById('fotoQuit').style.display='none';
}

// PDF activo: la planilla elegida como predeterminada en Configuración, o la oficial incluida
async function pdfParaVisita(){
  const plDef = plDefId && planillas.find(x=>x.id===plDefId);
  if(plDef) return {b64:plDef.b64,nombre:(plDef.nombre||'planilla')+'.pdf'};
  try{ return {b64:await planillaPredeterminadaB64(),nombre:'Planilla_Verificaciones.pdf'}; }
  catch(e){console.error('planilla predeterminada:',e);return {b64:null,nombre:'Planilla_Verificaciones.pdf'};}
}

// Deja el punto como si nunca se hubiera visitado (vuelve a "pendiente", sin color en el mapa)
function desmarcarHecha(id){
  delete visits[id];
  fotoDel(id);fotosEnIDB.delete(String(id));
  guardarVisits();
  closeOv();renderV();updStats();
  if(typeof mapa!=='undefined'&&mapa) renderMapa(true);
  showToast('Quedó como no visitada ↩');
  triggerAutosave();
}
function confirmarDesmarcar(){
  confirm2('¿Dejar este punto como NO visitado? Se borra la planilla y la foto guardadas en la app (lo que ya se envió a tu Drive no se borra).',function(){desmarcarHecha(curId);});
}

async function guardarVisita(soloGuardar,confirmado){
  const modoLocal=lsGet(SK_MODO)==='local'&&!drv.connected;
  if(modoLocal) soloGuardar=true; // sin cuenta de Google no hay envío a Drive
  // Editando una visita ya hecha y sin nada marcado ni escrito: probablemente se marcó por error
  const yaHecha=visits[curId]&&visits[curId].done;
  if(yaHecha&&!confirmado&&!Object.values(plC).some(Boolean)&&!document.getElementById('plO').value.trim()&&!fotoData){
    mostrarDlgEnvio('No hay nada marcado en la planilla, ni observaciones ni foto.\n\n¿Esta visita no se hizo (por ejemplo, te confundiste de dirección)?',[
      {txt:'↩ Sí, dejarla como no visitada',cls:'ba',fn:()=>desmarcarHecha(curId)},
      {txt:'No, guardarla como hecha (sin irregularidades)',cls:'bd',fn:()=>guardarVisita(soloGuardar,true)},
      {txt:'Volver a la planilla',cls:'bd'}
    ]);
    return;
  }
  const chC=CN.map((_,i)=>!!plC['c'+i]);
  const chV=VN.map((_,i)=>!!plC['v'+i]);
  const ti=chC.filter(Boolean).length+chV.filter(Boolean).length;
  const previa=visits[curId]&&visits[curId].planilla; // si se está editando una visita ya hecha, se conserva su fecha y hora
  if(!visits[curId])visits[curId]={};
  let pdfActivoB64 = null, pdfActivoNombre = 'Planilla_Verificaciones.pdf';
  if(drv.connected&&!soloGuardar){ const r=await pdfParaVisita(); pdfActivoB64=r.b64; pdfActivoNombre=r.nombre; }
  visits[curId]={done:true,planilla:{
    chC,chV,ti,obs:document.getElementById('plO').value,
    rubro:document.getElementById('plR').value,
    foto:fotoData,fecha:previa?previa.fecha:hoy(),hora:previa?previa.hora:ahora(),
    driveFotoUrl:null,drivePdfUrl:null,
  }};
  guardarVisits();
  if(fotoData){ const idv=curId; guardarFotoSegura(idv,fotoData).then(ok=>{if(ok)guardarVisits();}); }
  else{ fotoDel(curId); fotosEnIDB.delete(String(curId)); }
  renderV();updStats();closeOv();showToast(soloGuardar?'Visita guardada (sin enviar) ✓':'Visita guardada ✓');

  // Enviar a Drive; si no se puede, queda pendiente y se avisa
  const idv=curId;
  const punto = puntos.find(p=>p.id===idv);
  if(soloGuardar){
    // solo guardada en la app: no se envía ni queda pendiente
    if(modoLocal) mostrarDlgEnvio('Visita guardada en la app. ¿Querés guardar también el PDF y la foto en el celular?',[
      {txt:'📂 Guardar en el celular',cls:'ba',fn:()=>guardarEnCelular([idv])},
      {txt:'Más tarde',cls:'bd'}
    ]);
  }else if(punto){
    if(drv.connected){
      subirVisitaADrive(punto, visits[idv], pdfActivoB64, pdfActivoNombre)
        .then(ok=>{if(!ok)avisarNoEnviado(idv);})
        .catch(e=>{console.error('Error subiendo a Drive:',e);marcarEnvio(idv,'pendiente','Error de envío');avisarNoEnviado(idv);});
    }else{
      marcarEnvio(idv,'pendiente','Sin conexión con Drive');
      avisarNoEnviado(idv);
    }
  }
  // Autosave de jornada
  triggerAutosave();
}

function closeOv(){
  document.getElementById('ov').classList.remove('show');
  document.body.style.overflow='';
}
// Cerrar la planilla con ESC (en PC)
/* (se ejecuta al final, en js/99-arranque.js) */
