// Lista de visitas e historial
// ── RENDER VISITAS (con filtro: 'ruta' = todas las de ruta, 'hechas', 'pend')
// (filtroV ya declarado arriba)

function setFiltroV(f){
  // Tocar el mismo filtro NO lo apaga: queda en ese filtro. Para "ver todas" se toca "En ruta".
  filtroV = f;
  // Actualizar visual de las cards
  document.querySelectorAll('.sc[data-flt]').forEach(el=>{
    el.classList.toggle('act', el.dataset.flt===f);
  });
  renderV();
}

function renderV(){
  renderPendientes();
  const enRuta=puntos.filter(p=>sel.has(p.id));
  if(ordenRuta.length){const o=new Map(ordenRuta.map((id,i)=>[id,i]));enRuta.sort((a,b)=>(o.has(a.id)?o.get(a.id):1e9)-(o.has(b.id)?o.get(b.id):1e9));}
  const vEmpty=document.getElementById('vEmpty');
  const vlist=document.getElementById('vlist');
  const fltInfo=document.getElementById('fltInfoV');
  if(!enRuta.length){
    vEmpty.style.display='block';vlist.innerHTML='';
    if(fltInfo)fltInfo.style.display='none';
    return;
  }
  vEmpty.style.display='none';

  // Asegurar visual de filtro activa al renderizar
  document.querySelectorAll('.sc[data-flt]').forEach(el=>{
    el.classList.toggle('act', el.dataset.flt===filtroV);
  });

  // Aplicar filtro (manteniendo índice original del orden de ruta para numeración)
  const indexados = enRuta.map((p,i)=>({p, i:i+1}));
  let filtradas;
  if(filtroV==='hechas'){
    filtradas = indexados.filter(x => visits[x.p.id] && visits[x.p.id].done);
  }else if(filtroV==='pend'){
    filtradas = indexados.filter(x => !(visits[x.p.id] && visits[x.p.id].done));
  }else{
    filtradas = indexados; // 'ruta' = todas
  }

  // Mostrar info del filtro activo (excepto cuando son "todas")
  if(fltInfo){
    if(filtroV==='hechas' || filtroV==='pend'){
      const lbl = filtroV==='hechas' ? '<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> Solo hechas' : '<svg class="ico" style="vertical-align:-2px"><use href="#i-hourglass"/></svg> Solo pendientes';
      fltInfo.innerHTML = `${lbl} · mostrando <strong style="color:var(--text)">${filtradas.length}</strong> de ${enRuta.length}<span class="clr" onclick="setFiltroV('ruta')">Ver todas</span>`;
      fltInfo.style.display='block';
    }else{
      fltInfo.style.display='none';
    }
  }

  // Empty state del filtro
  if(!filtradas.length){
    vlist.innerHTML = `<div class="empty" style="padding:24px 14px"><span class="ei">${filtroV==='hechas'?'✅':'⏳'}</span><p>No hay visitas ${filtroV==='hechas'?'completadas':'pendientes'} todavía.</p></div>`;
    return;
  }

  vlist.innerHTML=filtradas.map(({p,i})=>{
    const v=visits[p.id]||{};const pl=v.planilla;
    const irregs=irregsDe(pl);
    return `<div class="vi${v.done?' dn':''}${(!p.lat&&!v.done)?' geo-err':''}">
      <div class="vh">
        <div class="vnum ${v.done?'vd':'vp'}">${i}</div>
        <div class="vb">
          <div class="va">${p.nombre}${!p.lat?' <span class="geo-tag err" style="vertical-align:middle"><svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> Sin mapa</span>':''}</div>
          <div class="vid2">${p.dir} · ID: ${p.id}</div>
          ${p.obs?`<div class="obs-corta" style="font-size:10px;color:var(--text-mute)">${escapeHtml(p.obs)}</div>`:''}
          ${pl&&!v.noVisitado?`<div style="font-size:11px;color:#10b981;margin-top:4px">📄 ${irregs.length} irregularidad${irregs.length!==1?'es':''}${irregs.length?': '+irregs.join(', '):''}</div>`:''}
          ${pl&&pl.obs?`<div class="obs-corta" style="font-size:10px;color:var(--text-mute);margin-top:2px">📝 ${escapeHtml(pl.obs)}</div>`:''}
        </div>
        ${v.done
          ?`<button class="vst ${estadoVisita(p.id)==='ok'?'vsd':(estadoVisita(p.id)==='no'?'vsn':'vsr')} vbtn" onclick="openPl('${p.id}')" aria-label="Abrir la planilla para modificarla">${estadoVisita(p.id)==='ok'?'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> Hecha ›':(estadoVisita(p.id)==='cerrado'?'✕ Cerrado ›':'✕ No visitada ›')}</button>`
          :`<span class="vst vsp">Pendiente</span>`}
      </div>
      ${!v.done?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <button class="sm smb" onclick="openPl('${p.id}')"><svg class="ico" style="vertical-align:-2px"><use href="#i-list"/></svg> Planilla</button>
        <button class="sm smh" onclick="markDone('${p.id}')"><svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> Marcar hecha</button>
        <button class="sm smh" onclick="marcarNoVisitado('${p.id}')">No se visitó</button>
      </div>`:`<div style="font-size:11px;color:${v.noVisitado?'var(--text-mute)':'#10b981'};margin-top:6px">${v.noVisitado?'No se visitó':'<svg class="ico" style="vertical-align:-2px"><use href="#i-check-circle"/></svg> Completada · '+(pl?pl.fecha+' '+pl.hora:'')}${v.envio&&v.envio.estado==='pendiente'?' · <span style="color:#f59e0b">☁️ Sin enviar'+(v.envio.local?' (copia en el celular)':'')+'</span>':''}</div>`}
    </div>`;
  }).join('');
}

// Un punto de la ruta que no se pudo visitar: queda en rojo en el mapa y en rojo en el Excel
function marcarNoVisitado(id){
  confirm2('¿Marcar este punto como NO visitado? Queda en rojo en el mapa y en el Excel.',function(){
    visits[id]={...(visits[id]||{}),done:true,noVisitado:true};
    guardarVisits();
    renderV();updStats();
    showToast('Marcado como no visitado');
    triggerAutosave();
  });
}

function markDone(id){
  if(!visits[id])visits[id]={};
  visits[id].done=true;if(!visits[id].fecha) visits[id].fecha=hoy();
  guardarVisits();
  renderV();updStats();showToast('Marcada como hecha ✓');
  triggerAutosave();
}

// ── HISTORIAL
function renderH(){
  if(typeof renderReporte==='function') renderReporte();
  const hlist=document.getElementById('hlist');
  const hEmpty=document.getElementById('hEmpty');
  const btnBH=document.getElementById('btnBorrarHist');
  if(!historial.length){hEmpty.style.display='block';hlist.innerHTML='';btnBH.style.display='none';return;}
  hEmpty.style.display='none';btnBH.style.display='';
  const totH=historial.reduce((a,h)=>a+(h.hechos||0),0),totP=historial.reduce((a,h)=>a+(h.total||0),0);
  const irr=historial.reduce((a,h)=>a+Object.values(h.visits||{}).filter(v=>v&&v.planilla&&((v.planilla.chC||[]).some(Boolean)||(v.planilla.chV||[]).some(Boolean))).length,0);
  const resumen=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;text-align:center">
    ${[[historial.length,'jornadas'],[totH,'visitas hechas'],[(totH/historial.length).toFixed(1),'por jornada'],[totP?Math.round(totH/totP*100)+'%':'–','cumplimiento']].map(([n,t])=>`<div class="sc" style="padding:9px 4px;cursor:default"><div style="font-size:17px;font-weight:800">${n}</div><div style="font-size:9.5px;color:var(--text-mute);margin-top:2px">${t}</div></div>`).join('')}
  </div>${irr?`<div style="font-size:11px;color:var(--text-mute);margin:-4px 0 12px;text-align:center">⚠️ ${irr} visita${irr>1?'s':''} con irregularidades marcadas</div>`:''}`;
  hlist.innerHTML=resumen+historial.map((h,i)=>{
    const open=histOpenIdx===i;
    const rows=(h.puntos||[]).map(p=>{
      const v=h.visits&&h.visits[p.id]||{};
      const pl=v.planilla;
      const irregs=irregsDe(pl);
      return `<div style="padding:7px 10px;background:var(--bg-2);border-radius:8px;margin-bottom:4px;border:1px solid var(--line)">
        <div style="display:flex;gap:6px">
          <span>${v.done?'✅':'⏳'}</span>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700">${p.nombre}</div>
            <div style="font-size:10px;color:var(--text-mute)">${p.dir} · ID: ${p.id}</div>
            ${irregs.length?`<div style="font-size:10px;color:#f59e0b;margin-top:2px">⚠️ ${irregs.join(', ')}</div>`:''}
            ${pl&&pl.obs?`<div class="obs-corta" style="font-size:10px;color:var(--text-mute);margin-top:1px">📝 ${escapeHtml(pl.obs)}</div>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
    return `<div>
      <div class="hrow" onclick="toggleHist(${i})">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">📅 ${h.fecha} · ${h.hora}</div>
          <div style="font-size:10px;color:var(--text-mute);margin-top:2px">${h.hechos}/${h.total} verificados</div>
        </div>
        <span class="bdg gr">${h.hechos} hechos</span>
        <span style="font-size:12px;color:var(--text-mute)">${open?'▲':'▼'}</span>
      </div>
      ${open?`<div style="margin-bottom:8px;padding-left:8px;border-left:2px solid rgba(59,130,246,.3)">
        ${rows}
        <button class="sm smr" style="font-size:10px;margin-top:4px" onclick="borrarJornada(${i})"><svg class="ico" style="vertical-align:-2px"><use href="#i-trash"/></svg> Borrar esta jornada</button>
      </div>`:''}
    </div>`;
  }).join('');
}

function toggleHist(i){histOpenIdx=histOpenIdx===i?null:i;renderH();}

function borrarJornada(i){
  confirm2('¿Borrar esta jornada del historial?',function(){
    historial=historial.filter((_,j)=>j!==i);
    lsSet(SK.historial,historial);
    histOpenIdx=null;renderH();showToast('Jornada borrada ✓');
  });
}

function borrarHistorial(){
  confirm2('¿Borrar TODO el historial? No se puede deshacer.',function(){
    historial=[];lsDel(SK.historial);renderH();showToast('Historial borrado ✓');
  });
}
