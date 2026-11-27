// Listas guardadas de lugares (ej: Instituciones, Clubes, Escuelas)
const LISTA_ICONOS=['🏛️','🏫','⚽','🏪','🏥','🏢','📍','⭐'];
const LISTA_COLORES=['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
const LISTA_MAX=30;

function clonarPuntosLista(arr, meta){
  if(!Array.isArray(arr)) return [];
  const ic=(meta&&meta.icono)?String(meta.icono):'';
  const col=(meta&&meta.color)?String(meta.color):'';
  const nom=(meta&&meta.nombre)?String(meta.nombre):'';
  return arr.map(p=>({
    id:String(p&&p.id!==undefined?p.id:''),
    nombre:String((p&&p.nombre)||''),
    dir:String((p&&p.dir)||''),
    localidad:String((p&&p.localidad)||''),
    tipo:String((p&&p.tipo)||''),
    rubro:String((p&&p.rubro)||''),
    obs:String((p&&p.obs)||''),
    lat:typeof(p&&p.lat)==='number'&&Number.isFinite(p.lat)?p.lat:null,
    lng:typeof(p&&p.lng)==='number'&&Number.isFinite(p.lng)?p.lng:null,
    geoUsada:p&&p.geoUsada?String(p.geoUsada):null,
    geoErr:p&&p.geoErr?String(p.geoErr):null,
    listaIcono:ic||(p&&p.listaIcono?String(p.listaIcono):''),
    listaColor:col||(p&&p.listaColor?String(p.listaColor):''),
    listaNombre:nom||(p&&p.listaNombre?String(p.listaNombre):'')
  }));
}

function aplicarMetaListaAPuntos(lista){
  if(!lista||!Array.isArray(puntos)||!puntos.length) return;
  const ids=new Set((lista.puntos||[]).map(p=>p.id));
  const coincideActiva=listaActivaId===lista.id;
  let tocado=false;
  puntos.forEach(p=>{
    if(coincideActiva||ids.has(p.id)){
      p.listaIcono=lista.icono||'';
      p.listaColor=lista.color||'';
      p.listaNombre=lista.nombre||'';
      tocado=true;
    }
  });
  if(tocado){
    lsSet(SK.puntos,puntos);
    if(typeof mapa!=='undefined'&&mapa&&typeof renderMapa==='function') renderMapa(true);
  }
}

function guardarListasStorage(){
  lsSet(SK.listas,listasGuardadas);
  if(listaActivaId) lsSet(SK.listaActiva,listaActivaId);
  else lsDel(SK.listaActiva);
}

function listasCss(){
  if(typeof document==='undefined'||document.getElementById('listasCss')) return;
  const s=document.createElement('style');
  s.id='listasCss';
  s.textContent=`
.lst-box{margin:10px 0 12px;padding:10px 12px;border-radius:14px;background:var(--bg-2);border:1px solid var(--line-2)}
.lst-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.lst-tit{font-size:12px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px}
.lst-ac{display:flex;gap:6px;flex-wrap:wrap}
.lst-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.lst-bar{display:flex;gap:7px;overflow-x:auto;padding:2px 0 8px;margin-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.lst-bar::-webkit-scrollbar{display:none}
.lst-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;border:1.5px solid var(--line-2);background:var(--glass);color:var(--text);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:transform .12s,border-color .15s,background .15s}
.lst-chip:active{transform:scale(.97)}
.lst-chip .lst-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.lst-chip .lst-cnt{font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;background:rgba(148,163,184,.18);color:var(--text-soft)}
.lst-chip.on{border-color:var(--lc,#3b82f6);background:rgba(59,130,246,.14);box-shadow:0 0 0 1px rgba(59,130,246,.18)}
.lst-chip.on .lst-cnt{background:var(--lc,#3b82f6);color:#fff}
.lst-tip{margin-top:7px;font-size:11px;color:var(--text-mute);line-height:1.45}
.lst-pick{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 12px}
.lst-ic{width:38px;height:38px;border-radius:10px;border:1.5px solid var(--line-2);background:var(--bg-2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.lst-ic.on{border-color:#3b82f6;background:rgba(59,130,246,.18)}
.lst-col{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer}
.lst-col.on{border-color:var(--text);transform:scale(1.12)}
.lst-row{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:12px;background:var(--bg-2);border:1px solid var(--line-2);margin-bottom:7px;flex-wrap:wrap}
.lst-row-ic{font-size:20px;line-height:1;flex-shrink:0}
.lst-row-info{flex:1;min-width:130px}
.lst-row-nm{font-size:13px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.lst-row-sb{font-size:11px;color:var(--text-mute);margin-top:2px}
.lst-row-bt{display:flex;gap:5px;flex-wrap:wrap;flex-basis:100%}`;
  document.head.appendChild(s);
}

function htmlChipsListas(compacto){
  return listasGuardadas.map(l=>{
    const on=l.id===listaActivaId;
    const c=LISTA_COLORES.includes(l.color)?l.color:'#3b82f6';
    const n=Array.isArray(l.puntos)?l.puntos.length:0;
    return `<button type="button" class="lst-chip${on?' on':''}" data-lid="${escapeHtml(l.id)}" style="--lc:${c}">`+
      `<span class="lst-dot" style="background:${c}"></span>`+
      `<span>${escapeHtml(l.icono||'📍')} ${escapeHtml(l.nombre)}</span>`+
      `<span class="lst-cnt">${n}</span>`+
    `</button>`;
  }).join('');
}

function conectarClicksListas(cont, opts){
  if(!cont) return;
  cont.querySelectorAll('.lst-chip[data-lid]').forEach(btn=>{
    btn.addEventListener('click',()=>cargarListaGuardada(btn.dataset.lid, opts));
  });
}

function renderListas(){
  if(typeof document==='undefined') return;
  const wrap=document.getElementById('listasWrap');
  if(!wrap) return;
  const hayPuntos=Array.isArray(puntos)&&puntos.length>0;
  const hayListas=Array.isArray(listasGuardadas)&&listasGuardadas.length>0;
  if(!hayPuntos&&!hayListas){wrap.innerHTML='';return;}
  listasCss();
  const chips=hayListas?`<div class="lst-chips">${htmlChipsListas(false)}</div>`:'';
  const tip=!hayListas&&hayPuntos
    ?'<div class="lst-tip">Guardá esta lista (ej: Instituciones, Clubes, Escuelas) para abrirla en el mapa con 1 toque.</div>'
    :'';
  wrap.innerHTML=`<div class="lst-box">
    <div class="lst-hd">
      <span class="lst-tit">📁 Mis listas guardadas</span>
      <div class="lst-ac">
        ${hayPuntos?'<button type="button" class="sm sma" onclick="abrirGuardarLista()">+ Guardar lista</button>':''}
        ${hayListas?'<button type="button" class="sm smh" onclick="abrirGestionListas()">Gestionar</button>':''}
      </div>
    </div>
    ${chips}${tip}
  </div>`;
  conectarClicksListas(wrap, {});
}

function renderListasMapa(){
  if(typeof document==='undefined') return;
  const bar=document.getElementById('mapaListasBar');
  if(!bar) return;
  if(!Array.isArray(listasGuardadas)||!listasGuardadas.length){bar.innerHTML='';return;}
  listasCss();
  bar.innerHTML=`<div class="lst-bar" aria-label="Listas guardadas">${htmlChipsListas(true)}</div>`;
  conectarClicksListas(bar, {desdeMapa:true});
}

function puntosSonDeListaActiva(){
  if(!listaActivaId||!Array.isArray(listasGuardadas)) return false;
  const l=listasGuardadas.find(x=>x.id===listaActivaId);
  if(!l||!Array.isArray(l.puntos)||l.puntos.length!==puntos.length) return false;
  const ids=new Set(l.puntos.map(p=>p.id));
  return puntos.every(p=>ids.has(p.id));
}

function cargarListaGuardada(id, opts){
  const l=listasGuardadas.find(x=>x.id===id);
  if(!l) return false;
  const nuevos=clonarPuntosLista(l.puntos,{icono:l.icono,color:l.color,nombre:l.nombre});
  const aplicar=(modo)=>{
    if(modo==='reemplazar'){
      if(typeof reiniciarEstadoLocal==='function') reiniciarEstadoLocal({conservarExcel:false});
      puntos=nuevos;
      listaActivaId=l.id;
      lsSet(SK.puntos,puntos);
      lsSet(SK.listaActiva,listaActivaId);
      if(typeof renderP==='function') renderP();
      if(typeof renderV==='function') renderV();
      if(typeof updStats==='function') updStats();
      renderListas();
      renderListasMapa();
      if(typeof mapa!=='undefined'&&mapa&&typeof renderMapa==='function'){
        renderMapa();
        if(opts&&opts.desdeMapa&&puntos.some(p=>p.lat&&p.lng)&&typeof centrarEnPuntos==='function') centrarEnPuntos();
      }
      if(puntos.some(p=>!p.lat)&&typeof geocodificarTodos==='function'){
        setTimeout(()=>geocodificarTodos(true),300);
      }
      showToast(`Lista «${l.nombre}» cargada (${puntos.length} lugar${puntos.length===1?'':'es'}) ✓`);
    }else if(modo==='sumar'){
      const prev=puntos.slice();
      const mapPrev=new Map(prev.map(p=>[p.id,p]));
      const idsNuevos=new Set(nuevos.map(n=>n.id));
      const fusionados=nuevos.map(n=>{
        const ex=mapPrev.get(n.id);
        return (!n.lat&&ex&&ex.lat&&ex.lng)?{...n,lat:ex.lat,lng:ex.lng,geoUsada:ex.geoUsada||null}:n;
      });
      puntos=[...prev.filter(p=>!idsNuevos.has(p.id)),...fusionados];
      listaActivaId=null;
      lsSet(SK.puntos,puntos);
      lsDel(SK.listaActiva);
      if(typeof renderP==='function') renderP();
      if(typeof renderV==='function') renderV();
      if(typeof updStats==='function') updStats();
      renderListas();
      renderListasMapa();
      if(typeof mapa!=='undefined'&&mapa&&typeof renderMapa==='function') renderMapa();
      if(puntos.some(p=>!p.lat)&&typeof geocodificarTodos==='function'){
        setTimeout(()=>geocodificarTodos(true),300);
      }
      showToast(`Se sumaron ${nuevos.length} lugares de «${l.nombre}» ✓`);
    }
    if(typeof triggerAutosave==='function') triggerAutosave();
  };

  const nVis=visits?Object.keys(visits).length:0;
  if(!puntos.length||(nVis===0&&puntosSonDeListaActiva())){
    aplicar('reemplazar');
    return true;
  }
  if(typeof mostrarDlgEnvio==='function'){
    mostrarDlgEnvio(
      `Lista «${l.nombre}» (${nuevos.length} lugar${nuevos.length===1?'':'es'}).\n\nAhora tenés ${puntos.length} punto${puntos.length===1?'':'s'} en pantalla${nVis?` y ${nVis} visita${nVis===1?'':'s'} registrada${nVis===1?'':'s'}`:''}.`,
      [
        {txt:`Ver solo «${l.nombre}» en el mapa`,cls:'ba',fn:()=>aplicar('reemplazar')},
        {txt:'Sumar a los puntos actuales',cls:'bd',fn:()=>aplicar('sumar')},
        {txt:'Cancelar',cls:'bd'}
      ]
    );
    return true;
  }
  aplicar('reemplazar');
  return true;
}

function guardarListaComo(nombre, icono, color, idActualizar){
  const nm=String(nombre||'').trim();
  if(!nm){showToast('Escribí un nombre para la lista',true);return null;}
  const ic=LISTA_ICONOS.includes(icono)?icono:'📍';
  const col=LISTA_COLORES.includes(color)?color:'#3b82f6';
  const fecha=typeof hoy==='function'?hoy():new Date().toLocaleDateString('es-AR');

  if(idActualizar){
    const idx=listasGuardadas.findIndex(x=>x.id===idActualizar);
    if(idx<0) return null;
    const prev=listasGuardadas[idx];
    const meta={icono:ic,color:col,nombre:nm};
    const basePts=(listaActivaId===idActualizar&&puntos&&puntos.length)?puntos:prev.puntos;
    listasGuardadas[idx]={
      ...prev,
      nombre:nm,
      icono:ic,
      color:col,
      actualizada:fecha,
      puntos:clonarPuntosLista(basePts,meta)
    };
    if(listaActivaId===idActualizar||!listaActivaId) listaActivaId=idActualizar;
    guardarListasStorage();
    aplicarMetaListaAPuntos(listasGuardadas[idx]);
    renderListas();renderListasMapa();
    showToast(`Lista «${nm}» actualizada ✓`);
    return listasGuardadas[idx];
  }

  if(listasGuardadas.length>=LISTA_MAX){
    showToast(`Máximo ${LISTA_MAX} listas guardadas`,true);
    return null;
  }
  if(!puntos||!puntos.length){
    showToast('Primero cargá los puntos que querés guardar',true);
    return null;
  }
  const meta={icono:ic,color:col,nombre:nm};
  const nueva={
    id:'lst_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    nombre:nm,
    icono:ic,
    color:col,
    creada:fecha,
    actualizada:fecha,
    puntos:clonarPuntosLista(puntos,meta)
  };
  listasGuardadas=[nueva,...listasGuardadas];
  listaActivaId=nueva.id;
  guardarListasStorage();
  aplicarMetaListaAPuntos(nueva);
  renderListas();renderListasMapa();
  showToast(`Lista «${nm}» guardada (${nueva.puntos.length} lugares) ✓`);
  return nueva;
}

function actualizarListaConActuales(id){
  const l=listasGuardadas.find(x=>x.id===id);
  if(!l) return false;
  if(!puntos||!puntos.length){showToast('No hay puntos cargados para actualizar esta lista',true);return false;}
  l.puntos=clonarPuntosLista(puntos,{icono:l.icono,color:l.color,nombre:l.nombre});
  l.actualizada=typeof hoy==='function'?hoy():new Date().toLocaleDateString('es-AR');
  listaActivaId=l.id;
  guardarListasStorage();
  aplicarMetaListaAPuntos(l);
  renderListas();renderListasMapa();
  showToast(`«${l.nombre}» actualizada con ${l.puntos.length} lugares ✓`);
  return true;
}

function eliminarListaGuardada(id){
  const idx=listasGuardadas.findIndex(x=>x.id===id);
  if(idx<0) return false;
  const nom=listasGuardadas[idx].nombre;
  listasGuardadas.splice(idx,1);
  if(listaActivaId===id) listaActivaId=null;
  guardarListasStorage();
  renderListas();renderListasMapa();
  showToast(`Lista «${nom}» eliminada`);
  return true;
}

function listasSincronizarGeo(){
  if(!listaActivaId||!Array.isArray(listasGuardadas)||!Array.isArray(puntos)) return false;
  const l=listasGuardadas.find(x=>x.id===listaActivaId);
  if(!l||!Array.isArray(l.puntos)) return false;
  const mapAct=new Map(puntos.map(p=>[p.id,p]));
  let cambios=0;
  l.puntos=l.puntos.map(lp=>{
    const p=mapAct.get(lp.id);
    if(!p) return lp;
    if(p.lat!==lp.lat||p.lng!==lp.lng||p.geoErr!==lp.geoErr||p.geoUsada!==lp.geoUsada){
      cambios++;
      return {...lp,lat:p.lat??null,lng:p.lng??null,geoErr:p.geoErr||null,geoUsada:p.geoUsada||null};
    }
    return lp;
  });
  if(cambios){guardarListasStorage();return true;}
  return false;
}

function cerrarLstDlg(){
  const d=document.getElementById('lstDlg');
  if(d) d.classList.remove('show');
}

function abrirGuardarLista(idEditar){
  if(typeof document==='undefined') return;
  listasCss();
  const editando=idEditar?listasGuardadas.find(x=>x.id===idEditar):null;
  const activa=(!editando&&listaActivaId)?listasGuardadas.find(x=>x.id===listaActivaId):null;
  let d=document.getElementById('lstDlg');
  if(!d){d=document.createElement('div');d.id='lstDlg';d.className='dlg alto';document.body.appendChild(d);}
  const icInit=editando?editando.icono:(activa?activa.icono:LISTA_ICONOS[0]);
  const colInit=editando?editando.color:(activa?activa.color:LISTA_COLORES[0]);
  const nomInit=editando?editando.nombre:(activa?activa.nombre:'');
  d.innerHTML=`<div class="dlgw" style="max-width:390px;max-height:90vh;overflow-y:auto">
    <div style="font-weight:800;font-size:16px;margin-bottom:4px">${editando?'Editar lista':'Guardar lista de lugares'}</div>
    <div style="font-size:12px;color:var(--text-mute);margin-bottom:12px">${editando?`${editando.puntos.length} lugares guardados`:`Se guardan los ${puntos.length} lugares actuales con su ubicación en el mapa.`}</div>
    <label style="display:block;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:4px">Nombre de la lista</label>
    <input id="lstNomIn" type="text" class="pli" value="${escapeHtml(nomInit)}" placeholder="Ej: Instituciones, Clubes, Escuelas" style="width:100%;margin-bottom:11px"/>
    <label style="display:block;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:4px">Ícono</label>
    <div class="lst-pick" id="lstIcPick">${LISTA_ICONOS.map(ic=>`<button type="button" class="lst-ic${ic===icInit?' on':''}" data-ic="${ic}">${ic}</button>`).join('')}</div>
    <label style="display:block;font-size:11px;font-weight:700;color:var(--text-soft);margin-bottom:6px">Color</label>
    <div class="lst-pick" id="lstColPick">${LISTA_COLORES.map(c=>`<button type="button" class="lst-col${c===colInit?' on':''}" data-col="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}</div>
    <div style="display:grid;gap:8px;margin-top:8px">
      ${editando
        ?`<button type="button" class="btn ba" id="lstBtnSaveEdit">Guardar cambios</button>`
        :(activa
          ?`<button type="button" class="btn ba" id="lstBtnUpdate">Actualizar «${escapeHtml(activa.nombre)}»</button>
            <button type="button" class="btn bd" id="lstBtnNew">Guardar como lista nueva</button>`
          :`<button type="button" class="btn ba" id="lstBtnNew">Guardar lista</button>`)}
      <button type="button" class="btn bd" onclick="cerrarLstDlg()">Cancelar</button>
    </div>
  </div>`;
  let selIc=icInit,selCol=colInit;
  d.querySelectorAll('#lstIcPick .lst-ic').forEach(b=>b.addEventListener('click',()=>{
    selIc=b.dataset.ic;
    d.querySelectorAll('#lstIcPick .lst-ic').forEach(x=>x.classList.toggle('on',x===b));
  }));
  d.querySelectorAll('#lstColPick .lst-col').forEach(b=>b.addEventListener('click',()=>{
    selCol=b.dataset.col;
    d.querySelectorAll('#lstColPick .lst-col').forEach(x=>x.classList.toggle('on',x===b));
  }));
  const inp=d.querySelector('#lstNomIn');
  const bEdit=d.querySelector('#lstBtnSaveEdit');
  if(bEdit) bEdit.addEventListener('click',()=>{if(guardarListaComo(inp.value,selIc,selCol,editando.id))cerrarLstDlg();});
  const bUpd=d.querySelector('#lstBtnUpdate');
  if(bUpd) bUpd.addEventListener('click',()=>{if(guardarListaComo(inp.value,selIc,selCol,activa.id))cerrarLstDlg();});
  const bNew=d.querySelector('#lstBtnNew');
  if(bNew) bNew.addEventListener('click',()=>{if(guardarListaComo(inp.value,selIc,selCol,null))cerrarLstDlg();});
  d.classList.add('show');
  setTimeout(()=>{if(inp&&!inp.value)inp.focus();},60);
}

function abrirGestionListas(){
  if(typeof document==='undefined') return;
  listasCss();
  let d=document.getElementById('lstDlg');
  if(!d){d=document.createElement('div');d.id='lstDlg';d.className='dlg alto';document.body.appendChild(d);}
  const filas=listasGuardadas.length?listasGuardadas.map(l=>{
    const on=l.id===listaActivaId;
    const n=Array.isArray(l.puntos)?l.puntos.length:0;
    const conGeo=Array.isArray(l.puntos)?l.puntos.filter(p=>p.lat&&p.lng).length:0;
    return `<div class="lst-row" data-lid="${escapeHtml(l.id)}">
      <div class="lst-row-ic">${escapeHtml(l.icono||'📍')}</div>
      <div class="lst-row-info">
        <div class="lst-row-nm"><span>${escapeHtml(l.nombre)}</span>${on?'<span style="font-size:10px;color:#10b981;font-weight:700">✓ Activa</span>':''}</div>
        <div class="lst-row-sb">${n} lugar${n===1?'':'es'} · ${conGeo} en mapa · ${escapeHtml(l.actualizada||l.creada||'')}</div>
      </div>
      <div class="lst-row-bt">
        <button type="button" class="sm sma" data-act="cargar">Cargar</button>
        ${puntos&&puntos.length?'<button type="button" class="sm smb" data-act="act">Actualizar</button>':''}
        <button type="button" class="sm smh" data-act="edit">Editar</button>
        <button type="button" class="sm smr" data-act="del">🗑️</button>
      </div>
    </div>`;
  }).join(''):'<div class="empty" style="padding:20px 10px"><p>Todavía no tenés listas guardadas.</p></div>';
  d.innerHTML=`<div class="dlgw" style="max-width:410px;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-weight:800;font-size:16px">Mis listas guardadas (${listasGuardadas.length}/${LISTA_MAX})</div>
      <button type="button" class="sm smh" onclick="cerrarLstDlg()">Cerrar</button>
    </div>
    ${filas}
  </div>`;
  d.querySelectorAll('.lst-row[data-lid]').forEach(row=>{
    const id=row.dataset.lid;
    row.querySelector('[data-act="cargar"]')?.addEventListener('click',()=>{cerrarLstDlg();cargarListaGuardada(id);});
    row.querySelector('[data-act="act"]')?.addEventListener('click',()=>{
      const l=listasGuardadas.find(x=>x.id===id);
      const nom=l?l.nombre:'esta lista';
      if(typeof confirm2==='function') confirm2(`¿Reemplazar «${nom}» con los ${puntos.length} lugares que tenés cargados ahora?`,()=>{actualizarListaConActuales(id);abrirGestionListas();});
      else{actualizarListaConActuales(id);abrirGestionListas();}
    });
    row.querySelector('[data-act="edit"]')?.addEventListener('click',()=>abrirGuardarLista(id));
    row.querySelector('[data-act="del"]')?.addEventListener('click',()=>{
      const l=listasGuardadas.find(x=>x.id===id);
      const nom=l?l.nombre:'esta lista';
      if(typeof confirm2==='function') confirm2(`¿Eliminar la lista «${nom}»? No borra las jornadas del historial.`,()=>{eliminarListaGuardada(id);abrirGestionListas();});
      else{eliminarListaGuardada(id);abrirGestionListas();}
    });
  });
  d.classList.add('show');
}
