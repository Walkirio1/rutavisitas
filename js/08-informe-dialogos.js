// Emails, informe, confirmaciones y avisos (toast)
// ── EMAILS
function addEmail(){
  const inp=document.getElementById('ein');
  const v=inp.value.trim();
  if(!v||!v.includes('@')){showToast('Email inválido',true);return;}
  if(emails.includes(v)){showToast('Ya está',true);return;}
  emails.push(v);inp.value='';lsSet(SK.emails,emails);renderChips();showToast('Agregado ✓');
}
function removeEmail(i){emails.splice(i,1);lsSet(SK.emails,emails);renderChips();}
function renderChips(){
  document.getElementById('chips').innerHTML=emails.map((e,i)=>
    `<span class="chip">${e}<button onclick="removeEmail(${i})">✕</button></span>`
  ).join('');
}

// ── INFORME
function renderRes(){
  const enRuta=puntos.filter(p=>sel.has(p.id));
  const hchos=enRuta.filter(p=>visits[p.id]&&visits[p.id].done).length;
  const rc=document.getElementById('resCard');
  if(!enRuta.length){rc.innerHTML='<div class="empty" style="padding:14px 0"><p>Seleccioná puntos primero.</p></div>';return;}
  rc.innerHTML=`<div style="margin-bottom:10px;display:flex;align-items:baseline;gap:8px">
    <span style="font-family:monospace;font-size:22px;font-weight:700;color:#60a5fa">${hchos}/${enRuta.length}</span>
    <span style="font-size:12px;color:var(--text-mute)">verificaciones completadas</span>
  </div>`+enRuta.map(p=>{
    const v=visits[p.id]||{};
    const irr=(v.planilla&&v.planilla.chC?v.planilla.chC.filter(Boolean).length:0)+(v.planilla&&v.planilla.chV?v.planilla.chV.filter(Boolean).length:0);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line-2)">
      <span>${v.done?'✅':'⏳'}</span>
      <div style="flex:1;font-size:11px">
        <div>${p.nombre}</div>
        <div style="font-size:10px;color:var(--text-mute)">${p.dir} · ID: ${p.id}</div>
      </div>
      ${v.done?`<span class="bdg ${irr?'rd':'gr'}">${irr?irr+' irreg.':'OK'}</span>`:''}
    </div>`;
  }).join('');
}

function buildMsg(){
  const enRuta=puntos.filter(p=>sel.has(p.id)||(visits[p.id]&&visits[p.id].done));
  const est=p=>estadoVisita(p.id);
  const hechas=enRuta.filter(p=>est(p)==='ok'),cerradas=enRuta.filter(p=>est(p)==='cerrado'),novis=enRuta.filter(p=>est(p)==='no'),pend=enRuta.filter(p=>!est(p));
  const irr=hechas.filter(p=>irregsDe((visits[p.id]||{}).planilla).length).length;
  const now=new Date(),total=enRuta.length,hechos=hechas.length+cerradas.length;
  const nombre=n=>(n||'').trim()||'Sin nombre';
  const linea=(p,i)=>{
    const v=visits[p.id]||{},pl=v.planilla,ir=irregsDe(pl),dir=[p.dir,p.localidad&&!new RegExp(p.localidad,'i').test(p.dir||'')?p.localidad:''].filter(Boolean).join(', ');
    return (i+1)+'. *'+nombre(p.nombre)+'*\n   📍 '+dir+(ir.length?'\n   ⚠️ '+ir.join(', '):'')+(pl&&pl.obs?'\n   📝 '+pl.obs.replace(/\s+/g,' ').slice(0,100)+(pl.obs.length>100?'…':''):'');
  };
  const bloque=(tit,lista)=>lista.length?'\n\n*'+tit+' ('+lista.length+')*\n'+lista.map(linea).join('\n'):'';
  return '📋 *INFORME DE VISITAS*\n📅 '+now.toLocaleDateString('es-AR')+' · '+now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
    +'\n━━━━━━━━━━━━━━'
    +'\n✅ *'+hechos+' de '+total+'* verificados'+(total?' ('+Math.round(hechos/total*100)+'%)':'')
    +(pend.length?'\n⏳ Pendientes: '+pend.length:'')
    +(novis.length?'\n🚫 No visitados: '+novis.length:'')
    +(cerradas.length?'\n🔴 Cerrados / no atendidos: '+cerradas.length:'')
    +(irr?'\n⚠️ Con irregularidades: '+irr:'')
    +'\n━━━━━━━━━━━━━━'
    +bloque('✅ HECHAS',hechas)+bloque('🔴 CERRADOS',cerradas)+bloque('🚫 NO VISITADOS',novis)+bloque('⏳ PENDIENTES',pend)
    +'\n\n_Enviado desde LogiMap_';
}
// Resumen + PDF rellenado de cada visita + fotos, todo junto en la hoja de compartir (WhatsApp, mail, Drive…). No necesita Google.
async function compartirInforme(){
  const ids=puntos.filter(p=>(sel.has(p.id)||(visits[p.id]&&visits[p.id].done))&&visits[p.id]&&visits[p.id].done&&visits[p.id].planilla).map(p=>p.id);
  if(!ids.length){showToast('Todavía no hay visitas hechas para mandar',true);return;}
  showToast('Preparando PDFs y fotos...');
  let files;
  try{files=await prepararArchivos(ids);}catch(e){console.error(e);showToast('No se pudieron preparar los archivos',true);return;}
  if(!files.length){showToast('No hay archivos para mandar',true);return;}
  const datos={title:'Informe de visitas · '+new Date().toLocaleDateString('es-AR'),text:buildMsg(),files};
  if(compartirArchivosOk()&&navigator.canShare(datos)){
    try{await navigator.share(datos);return;}
    catch(e){
      if(e&&e.name==='AbortError') return;
      _archivosListos=files;
      mostrarDlgEnvio(files.length+' archivo'+(files.length>1?'s':'')+' listo'+(files.length>1?'s':'')+'. Tocá para elegir cómo mandarlos.',[
        {txt:'📤 Compartir',cls:'ba',fn:async()=>{try{await navigator.share(datos);}catch(e2){if(!e2||e2.name!=='AbortError')descargarArchivos(files);}}},
        {txt:'⬇️ Descargar',cls:'bd',fn:()=>descargarArchivos(files)},
        {txt:'Cancelar',cls:'bd'}
      ]);
      return;
    }
  }
  descargarArchivos(files);
  showToast('Se descargaron los archivos. Adjuntalos al mail o al WhatsApp (en la compu).');
}
function sendWA(){window.open('https://wa.me/?text='+encodeURIComponent(buildMsg()),'_blank');}
function sendEmail(){
  if(!emails.length){showToast('Agregá destinatarios',true);return;}
  window.location.href='mailto:'+emails.join(',')+'?subject='+encodeURIComponent('Informe de visitas · '+new Date().toLocaleDateString('es-AR'))+'&body='+encodeURIComponent(buildMsg());
}

// ── CONFIRM DIALOG
let dlgNoCb=null;
function confirm2(msg,cb,cbNo){
  document.getElementById('dlgMsg').textContent=msg;
  dlgCb=cb;dlgNoCb=cbNo||null;document.getElementById('dlg').classList.add('show');
}
function dlgOk(){const f=dlgCb;dlgNoCb=null;closeDlg();if(f)f();}
function dlgNo(){const f=dlgNoCb;closeDlg();if(f)f();}
function closeDlg(){document.getElementById('dlg').classList.remove('show');dlgCb=null;}

// ── TOAST
// (toastTm ya declarado arriba)
// Escapa el texto y deja pasar sólo los íconos propios de la app (<svg class="ico" ...><use href="#i-xxx"/></svg>)
function htmlConIconos(msg){
  const esc=String(msg).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/&lt;svg class="ico" style="vertical-align:-2px"&gt;&lt;use href="#(i-[a-z-]+)"\/&gt;&lt;\/svg&gt;/g,
    '<svg class="ico" style="vertical-align:-2px"><use href="#$1"/></svg>');
}
function showToast(msg,err){
  if(toastTm)clearTimeout(toastTm);
  const t=document.getElementById('toast');
  t.innerHTML=htmlConIconos(msg);t.classList.toggle('err',!!err);
  t.classList.add('show');
  toastTm=setTimeout(()=>t.classList.remove('show'),err?3400:2400);
}
