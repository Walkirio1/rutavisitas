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
  const enRuta=puntos.filter(p=>sel.has(p.id));
  const hchos=enRuta.filter(p=>visits[p.id]&&visits[p.id].done).length;
  const now=new Date();
  return '📋 *VERIFICACIONES SUBE*\n📅 '+now.toLocaleDateString('es-AR')+' · '+now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+'\n✅ '+hchos+'/'+enRuta.length+' puntos verificados\n\n'
    +enRuta.map((p,i)=>{
      const v=visits[p.id]||{};
      const irregs=v.planilla?CN.filter((_,j)=>v.planilla.chC&&v.planilla.chC[j]).concat(VN.filter((_,j)=>v.planilla.chV&&v.planilla.chV[j])):[];
      return (i+1)+'. '+p.nombre+' · ID:'+p.id+'\n   📍 '+p.dir+'\n   '+(v.done?'✓ Verificado':'<svg class="ico" style="vertical-align:-2px"><use href="#i-hourglass"/></svg> Pendiente')+(irregs.length?'\n   ⚠️ '+irregs.join(', '):'')+(v.planilla&&v.planilla.obs?'\n   📝 '+v.planilla.obs:'');
    }).join('\n\n')+'\n\n_Planillas adjuntas._';
}
function sendWA(){window.open('https://wa.me/?text='+encodeURIComponent(buildMsg()),'_blank');}
function sendEmail(){
  if(!emails.length){showToast('Agregá destinatarios',true);return;}
  window.location.href='mailto:'+emails.join(',')+'?subject=Verificaciones SUBE&body='+encodeURIComponent(buildMsg());
}

// ── CONFIRM DIALOG
function confirm2(msg,cb){
  document.getElementById('dlgMsg').textContent=msg;
  dlgCb=cb;document.getElementById('dlg').classList.add('show');
}
function dlgOk(){if(dlgCb)dlgCb();closeDlg();}
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
  toastTm=setTimeout(()=>t.classList.remove('show'),3000);
}
