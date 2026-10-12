// Planillas guardadas y ventana de la planilla de visita
// ── PLANILLAS GUARDADAS
function setPlDef(id){
  plDefId=id||null;
  if(plDefId)lsSet(SK.plDef,plDefId);else lsDel(SK.plDef);
  aplicarPlantilla();renderPlanillas();showToast('Planilla predeterminada actualizada ✓');
}

function renderPlanillas(){
  const plList=document.getElementById('plList');
  const plEmpty=document.getElementById('plEmpty');
  document.getElementById('plCount').textContent=planillas.length?`(${planillas.length}/10)`:'';
  plEmpty.style.display='none';
  const fila=(nombre,sub,activa,onclick,extra,abajo)=>`
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:11px 13px;background:var(--bg-2);border:1px solid ${activa?'rgba(16,185,129,.5)':'var(--line-2)'};border-radius:11px;margin-bottom:6px">
      <span style="flex-shrink:0"><svg class="ico" style="width:30px;height:30px"><use href="#i-file"/></svg></span>
      <div style="flex:1;min-width:110px">
        <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(nombre)}</div>
        <div style="font-size:10px;color:var(--text-mute);margin-top:2px">${sub}</div>
      </div>
      ${activa?'<span style="font-size:11px;color:#10b981;font-weight:700;white-space:nowrap">✓ En uso</span>':`<button class="sm sma" onclick="${onclick}">Usar</button>`}
      ${extra||''}
      ${abajo?`<div style="flex-basis:100%;display:flex;gap:6px;flex-wrap:wrap">${abajo}</div>`:''}
    </div>`;
  const hayDef=plDefId&&planillas.some(x=>x.id===plDefId),modo=modoPlanilla();
  plList.innerHTML=
    fila('Planilla general','De la app · sin marca de empresa · editable',modo==='general','setPlModo(\'general\')','<button class="sm smh" onclick="editarPlantilla()">✏️ Editar</button>')+
    fila('Planilla oficial SUBE','Incluida en la app',modo==='sube',"setPlModo('sube')",'')+
    planillas.map(pl=>fila(pl.nombre,'Guardada el '+pl.fecha+(pl.campos?' · 🧩 '+pl.campos.length+' campos':(pl.firma?' · ✍️ con firma':'')),hayDef&&plDefId===pl.id,`setPlDef('${pl.id}')`,'',`<button class="sm sma" onclick="detectarYRevisar('${pl.id}')">✨ Detectar</button><button class="sm smh" onclick="abrirDisenador('${pl.id}')">🧩 Campos</button><button class="sm smh" onclick="abrirPosFirma('${pl.id}')">✍️ Firma</button>${planillas.some(o=>o.id!==pl.id&&o.campos&&o.campos.length)?`<button class="sm smh" onclick="cpAbrir('${pl.id}')">📋 Copiar</button>`:''}<button class="sm smr" onclick="borrarPlanilla('${pl.id}')">🗑️</button>`)).join('');
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
  setTimeout(()=>preguntarComoUsar(np[0].id),600);
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

  // marcas (por nombre, así editar la planilla después no las corre)
  const _ic=(pl&&pl.itemsC)||CN,_iv=(pl&&pl.itemsV)||VN;
  if(pl&&pl.chC) CN.forEach((n,i)=>{const k=_ic.indexOf(n);if(k>=0&&pl.chC[k])plC['c'+i]=true;});
  if(pl&&pl.chV) VN.forEach((n,i)=>{const k=_iv.indexOf(n);if(k>=0&&pl.chV[k])plC['v'+i]=true;});
  // encabezado: la planilla general no lleva marcas de ninguna empresa
  const gen=modoPlanilla()==='general';
  document.getElementById('plHizq').textContent=gen?plantilla().titulo:'SUBE';
  document.getElementById('plHizq').style.fontSize=gen?'18px':'';
  document.getElementById('plHder').innerHTML=gen?'Visita':'Planilla de<br>Verificaciones';
  document.getElementById('plLbId').textContent=gen?'ID':'ID PS';
  document.getElementById('plBoxId').style.display=gen?'none':''; // la planilla general no muestra el ID
  document.getElementById('plFotoSec').style.display=fotoModo()==='no'?'none':'';
  const conC=!!pdfConCampos(); // planilla PDF con campos propios: no se muestran las irregularidades de la oficial
  document.getElementById('plTitA').textContent=TIT_A;
  document.getElementById('plTitB').textContent=TIT_B;
  document.getElementById('plTitB').style.display=VN.length?'':'none';
  document.getElementById('plCarga').innerHTML=CN.map((n,i)=>
    `<div class="plr${plC['c'+i]?' on':''}" onclick="plT('c${i}',this)"><div class="plrn">${escapeHtml(n)}</div><div class="plck"><span class="plx">✕</span></div></div>`
  ).join('');
  ['plTitA','plCarga','plTitB','plVenta'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display=conC?'none':e.style.display;});
  document.getElementById('plVenta').innerHTML=VN.map((n,i)=>
    `<div class="plr${plC['v'+i]?' on':''}" onclick="plT('v${i}',this)"><div class="plrn">${escapeHtml(n)}</div><div class="plck"><span class="plx">✕</span></div></div>`
  ).join('');

  pintarCamposExtra(pl);
  document.getElementById('plF').value=(pl&&pl.fecha)||hoy();
  document.getElementById('plH').value=(pl&&pl.hora)||ahora();
  ubiAlAbrir(p,pl);
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
    fotoData=await sellarFoto(await comprimirFoto(file),puntos.find(x=>x.id===curId)); // con fecha, hora y ubicación
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
  if(modoPlanilla()==='general') return {b64:'GENERAL',nombre:'Planilla_General.pdf'};
  const plDef = plDefId && planillas.find(x=>x.id===plDefId);
  if(plDef) return {b64:plDef.b64,nombre:(plDef.nombre||'planilla')+'.pdf'};
  try{ return {b64:await planillaPredeterminadaB64(),nombre:'Planilla_Verificaciones.pdf'}; }
  catch(e){console.error('planilla predeterminada:',e);return {b64:null,nombre:'Planilla_Verificaciones.pdf'};}
}

// Deja el punto como si nunca se hubiera visitado (vuelve a "pendiente", sin color en el mapa)
function desmarcarHecha(id){
  delete visits[id];dpReportarVisita(id);
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
  if(yaHecha&&!confirmado&&!Object.values(plC).some(Boolean)&&!document.getElementById('plO').value.trim()&&!fotoData&&!Object.values(plExtra).some(Boolean)){
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
  if(fotoModo()==='no') fotoData=null;
  if(faltaCampoObligatorio()) return;
  const previa=visits[curId]&&visits[curId].planilla; // si se está editando una visita ya hecha, se conserva su fecha y hora
  if(!visits[curId])visits[curId]={};
  let pdfActivoB64 = null, pdfActivoNombre = 'Planilla_Verificaciones.pdf';
  if(drv.connected&&!soloGuardar){ const r=await pdfParaVisita(); pdfActivoB64=r.b64; pdfActivoNombre=r.nombre; }
  visits[curId]={done:true,planilla:{
    chC,chV,ti,extra:{...plExtra},extraDef:camposActivos().map(c=>({id:c.id,tipo:c.tipo,etiqueta:c.etiqueta,pos:c.pos||'final'})),itemsC:CN.slice(),itemsV:VN.slice(),titA:TIT_A,titB:TIT_B,cierra:camposActivos().some(c=>c.tipo==='tilde'&&c.cierra&&plExtra[c.id]==='Sí'),obs:document.getElementById('plO').value,
    rubro:document.getElementById('plR').value,
    foto:fotoData,fecha:previa?previa.fecha:hoy(),hora:previa?previa.hora:ahora(),
    ...ubiParaVisita(puntos.find(x=>x.id===curId),previa),
    driveFotoUrl:null,drivePdfUrl:null,
  }};
  guardarVisits();
  if(fotoData){ const idv=curId; guardarFotoSegura(idv,fotoData).then(ok=>{if(ok)guardarVisits();}); }
  else{ fotoDel(curId); fotosEnIDB.delete(String(curId)); }
  eqReportarVisita(curId);dpReportarVisita(curId);
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

// Copiar los campos de otra planilla (para planillas parecidas: no se prepara una por una)
let _cpDest=null;
function cpAbrir(id){
  _cpDest=id;const dest=planillas.find(p=>p.id===id);
  const fuentes=planillas.filter(p=>p.id!==id&&p.campos&&p.campos.length);
  document.getElementById('cpTxt').textContent='Elegí de cuál planilla copiar los campos para «'+dest.nombre+'».'+(dest.campos&&dest.campos.length?' Los que tiene ahora se reemplazan.':'')+' Después podés ajustarlos en 🧩 Campos.';
  document.getElementById('cpLista').innerHTML=fuentes.map(p=>`<button class="btn ba" onclick="cpHacer('${p.id}')">${escapeHtml(p.nombre)} · ${p.campos.length} campos</button>`).join('');
  document.getElementById('cpDlg').classList.add('show');
}
function cpCerrar(){document.getElementById('cpDlg').classList.remove('show');}
function cpHacer(idOrigen){
  const o=planillas.find(p=>p.id===idOrigen),d=planillas.find(p=>p.id===_cpDest);if(!o||!d) return;
  let n=0;d.campos=o.campos.map(c=>({...c,id:'c'+Date.now().toString(36)+(n++)}));
  // las sumas que apuntan a otros campos se reenlazan a las copias
  const mapa={};o.campos.forEach((c,i)=>{mapa[c.id]=d.campos[i].id;});
  d.campos.forEach(c=>{if(Array.isArray(c.suma)) c.suma=c.suma.map(x=>mapa[x]||x);});
  delete d.firma;lsSet(SK.planillas,planillas);cpCerrar();renderPlanillas();
  showToast('Campos copiados ✓ ('+d.campos.length+')');
}
