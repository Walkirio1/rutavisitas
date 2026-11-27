// Estado de la interfaz, arranque, pestañas, panel de ajustes, lista de puntos, importar Excel
// ── ESTADO UI (declarado antes del init para evitar temporal dead zone)
let filtroGeoP = false;   // filtro de pestaña Puntos: si true, muestra solo los sin geocodificar
let filtroV = 'ruta';     // filtro de pestaña Visitas: 'ruta' | 'hechas' | 'pend'
let toastTm = null;       // timer del toast

// ── INIT
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */ /* (se ejecuta al final, en js/99-arranque.js) */ /* (se ejecuta al final, en js/99-arranque.js) */ /* (se ejecuta al final, en js/99-arranque.js) */ /* (se ejecuta al final, en js/99-arranque.js) */

// ── TABS
function showTab(n){
  // Marcar tab visible "on" sólo si es 0,1,2 (las que quedan en la barra)
  const pos=n<3?n:3; // las pantallas del menú de ajustes (3-6) cuentan como "Ajustes"
  _tabPos=pos;
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('on',i===pos));
  document.querySelector('.tabs').style.setProperty('--i',pos);
  document.querySelectorAll('.pnl').forEach((p,i)=>p.classList.toggle('on',i===n));
  // Mostrar barra "Volver a Configuración" sólo en paneles del menú config (3-6)
  const bar=document.getElementById('backCfgBar');
  if(bar) bar.classList.toggle('show', n>=3);
  document.body.classList.toggle('sin-inst',n===2||n>=3); // el cartel de instalar no tapa el mapa ni Ajustes
  if(n===1){renderV();updStats();}
  if(n===2){initMapa();renderMapa();if(typeof ubicarAutoAlAbrirMapa==='function')ubicarAutoAlAbrirMapa();[60,300,900].forEach(ms=>setTimeout(()=>{if(_tabPos===2) repararMapa();},ms));}
  if(n===5){renderDriveTab();}
  if(n===6) renderRes();
}

// ── PANEL DE CONFIGURACIÓN (slide-in) ──
let _tabPos=0;
function ponerPastilla(pos){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('on',i===pos));
  document.querySelector('.tabs').style.setProperty('--i',pos);
}
function openCfg(){
  document.body.classList.add('sin-inst');
  ponerPastilla(3);
  document.getElementById('cfgOverlay').classList.add('show');
  document.getElementById('cfgPanel').classList.add('show');
}
function closeCfg(){
  ponerPastilla(_tabPos);
  document.body.classList.toggle('sin-inst',_tabPos>=2);
  document.getElementById('cfgOverlay').classList.remove('show');
  document.getElementById('cfgPanel').classList.remove('show');
}
function openFromCfg(n){
  closeCfg();
  // Pequeño delay para que se vea la animación de cierre antes de cambiar el panel
  setTimeout(()=>showTab(n), 180);
}
// Cerrar el panel con ESC
/* (se ejecuta al final, en js/99-arranque.js) */

// ── RENDER PUNTOS
// (filtroGeoP ya declarado arriba)

// búsqueda tolerante: sin tildes ni mayúsculas, varias palabras (todas deben estar) y una letra de error en palabras largas ("Corrientez" encuentra "Corrientes")
const _bn=t=>String(t==null?'':t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function _dist1(a,b){ // ¿difieren en como mucho una letra (cambiada, sobrante o faltante)?
  if(a===b) return true;if(Math.abs(a.length-b.length)>1) return false;
  let i=0;while(i<a.length&&i<b.length&&a[i]===b[i]) i++;
  if(a.length===b.length) return a.slice(i+1)===b.slice(i+1);
  return a.length>b.length?a.slice(i+1)===b.slice(i):b.slice(i+1)===a.slice(i);
}
function coincideBusqueda(p,q){
  const texto=_bn(p.nombre+' '+p.dir+' '+(p.localidad||'')+' '+p.id),pals=texto.split(/[^a-z0-9]+/).filter(Boolean);
  return _bn(q).split(/\s+/).filter(Boolean).every(w=>texto.includes(w)||(w.length>=5&&pals.some(x=>x.length>=4&&_dist1(w,x.slice(0,w.length+1))||_dist1(w,x))));
}
function renderP(){
  if(typeof renderListas==='function') renderListas();
  const q=(document.getElementById('qin')||{value:''}).value;
  let list = q.trim() ? puntos.filter(p=>coincideBusqueda(p,q)) : puntos;
  if(filtroGeoP) list = list.filter(p=>p.geoErr || (!p.lat && !p.geoErr)); // sin ubicación
  document.getElementById('cntBadge').textContent=list.length;
  document.getElementById('btnLimpiar').style.display=puntos.length?'':'none';
  document.getElementById('sbWrap').style.display=puntos.length?'':'none';
  document.getElementById('pVacio').style.display=puntos.length?'none':'block';

  // Banner de puntos sin ubicación
  const sinGeo = puntos.filter(p=>p.geoErr || (!p.lat && !p.geoErr));
  const warnEl = document.getElementById('geoWarnP');
  if(warnEl){
    if(sinGeo.length && puntos.length){
      const txt = filtroGeoP
        ? `Mostrando solo los <strong>${sinGeo.length}</strong> puntos sin ubicación. <strong>Ver todos</strong>`
        : `Hay <strong>${sinGeo.length}</strong> punto${sinGeo.length>1?'s':''} sin ubicación en el mapa. <strong>Ver cuáles</strong>`;
      warnEl.innerHTML = `<span class="gw-ic"><svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg></span><span class="gw-tx">${txt}</span><span class="gw-ar">${filtroGeoP?'<svg class="ico" style="vertical-align:-2px"><use href="#i-close"/></svg>':'<svg class="ico" style="vertical-align:-2px"><use href="#i-arrow-right"/></svg>'}</span>`;
      warnEl.style.display='flex';
    }else{
      warnEl.style.display='none';
    }
  }

  // Botones bulk
  const bulk=document.getElementById('bulkActions');
  const btnAdd=document.getElementById('btnAddAll');
  const btnRem=document.getElementById('btnRemoveAll');
  if(puntos.length){
    bulk.style.display='flex';
    const noSel = puntos.filter(p=>!sel.has(p.id)).length;
    const siSel = puntos.length - noSel;
    btnAdd.style.display = noSel>0 ? '' : 'none';
    btnAdd.innerHTML = noSel===puntos.length ? '<svg class="ico" style="vertical-align:-2px"><use href="#i-plus"/></svg> Cargar todas a la ruta' : `<svg class="ico" style="vertical-align:-2px"><use href="#i-plus"/></svg> Cargar ${noSel} restantes`;
    btnRem.style.display = siSel>0 ? '' : 'none';
    btnRem.innerHTML = siSel===puntos.length ? '<svg class="ico" style="vertical-align:-2px"><use href="#i-minus"/></svg> Quitar todas' : `<svg class="ico" style="vertical-align:-2px"><use href="#i-minus"/></svg> Quitar ${siSel} de la ruta`;
  }else{
    bulk.style.display='none';
  }

  const plist=document.getElementById('plist');
  if(!list.length){
    plist.innerHTML = filtroGeoP ? '<div class="empty" style="padding:24px 14px"><span class="ei"><svg class="ico" style="vertical-align:-2px"><use href="#i-check-circle"/></svg></span><p>No hay puntos sin ubicación.</p></div>' : '';
    document.getElementById('pEmpty').style.display=(puntos.length&&!filtroGeoP)?'block':'none';
    return;
  }
  document.getElementById('pEmpty').style.display='none';
  plist.innerHTML=list.map((p,i)=>{
    const s=sel.has(p.id);
    const geoOk = p.lat && p.lng;
    const geoErr = !!p.geoErr;
    const geoPen = !geoOk && !geoErr;
    const geoBadge = geoOk
      ? `<span class="geo-tag ok" title="Ubicación en mapa"><svg class="ico" style="vertical-align:-2px"><use href="#i-pin"/></svg> En mapa</span>`
      : geoErr
        ? `<span class="geo-tag err" title="No se pudo ubicar: ${escapeHtml(p.geoErr)}"><svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> Sin ubicación</span>`
        : `<span class="geo-tag pen"><svg class="ico" style="vertical-align:-2px"><use href="#i-hourglass"/></svg> Pendiente</span>`;
    return `<div class="pi${s?' sel':''}${geoErr?' geo-err':''}">
      <div class="pnum">${i+1}</div>
      <div class="pb">
        <div class="pno">${escapeHtml(p.nombre)}</div>
        <div class="pd">${IC("pin")} ${escapeHtml(p.dir)}</div>
        <div class="pid">ID: ${escapeHtml(p.id)}</div>
        ${p.obs?`<div class="pobs">${IC("info")} ${escapeHtml(p.obs)}</div>`:''}
        <span class="ptag ${(p.tipo||'').includes('Venta')?'tv':'tr'}">${escapeHtml(p.tipo)}</span>
        ${geoBadge}
        ${geoErr?`<div style="font-size:10px;color:#f59e0b;margin-top:3px">${escapeHtml(p.geoErr)}</div>`:''}
      </div>
      <button class="sm ${s?'smg':'smh'}" data-id="${escapeHtml(p.id)}" onclick="toggleSel(this.dataset.id)">${s?'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> En ruta':'+ Agregar'}</button>
    </div>`;
  }).join('');
}

function toggleFiltroGeoP(){
  filtroGeoP = !filtroGeoP;
  renderP();
}

function agregarTodosARuta(){
  const noSel = puntos.filter(p=>!sel.has(p.id));
  if(!noSel.length){showToast('Ya están todos en la ruta');return;}
  noSel.forEach(p=>sel.add(p.id));
  lsSet(SK.sel,[...sel]);
  renderP();updStats();if(typeof proxActualizar==='function') proxActualizar();
  showToast(`✓ ${noSel.length} punto${noSel.length>1?'s':''} agregado${noSel.length>1?'s':''} a la ruta`);
  triggerAutosave();
}

function quitarTodosDeRuta(){
  const enRuta = puntos.filter(p=>sel.has(p.id)).length;
  if(!enRuta) return;
  confirm2(`¿Quitar los ${enRuta} puntos de la ruta? No se borran de la lista de puntos, solo de tu ruta del día.`,()=>{
    puntos.forEach(p=>sel.delete(p.id));
    lsSet(SK.sel,[...sel]);
    renderP();updStats();if(typeof proxActualizar==='function') proxActualizar();
    showToast(`Ruta vaciada (${enRuta} quitados)`);
    triggerAutosave();
  });
}

function toggleSel(id){
  const punto = puntos.find(p=>p.id===id);
  const agregando = !sel.has(id);
  if(agregando) sel.add(id); else sel.delete(id);
  lsSet(SK.sel,[...sel]);
  renderP();updStats();if(typeof proxActualizar==='function') proxActualizar();
  // Aviso especial si está agregando un punto sin ubicación
  if(agregando && punto && !punto.lat){
    showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> Agregado, pero este punto NO está en el mapa',true);
  }else{
    showToast(agregando?'Agregado a la ruta ✓':'Quitado de la ruta');
  }
  triggerAutosave();
}

// ── IMPORTAR EXCEL / CSV FLEXIBLE
function _normCol(s){
  return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}
function parsearFilasExcel(aoa, idsExistentes){
  const raw=(aoa||[]).filter(r=>Array.isArray(r)&&r.some(c=>String(c==null?'':c).trim()!==''));
  if(!raw.length) return {nuevos:[],aoaConId:[]};

  const H_ID=new Set(['ubicacion id','id','codigo','cod','legajo','#']);
  const H_NOM=new Set(['ubicacion','nombre','lugar','institucion','escuela','club','comercio','local','cliente','entidad','establecimiento','razon social','descripcion','titulo']);
  const H_DIR=new Set(['direccion','domicilio','domicilio real','domicilio legal','calle','dir','address']);
  const H_NUM=new Set(['numero','altura','nro','num','puerta']);
  const H_LOC=new Set(['localidad','ciudad','barrio','municipio','partido','zona','distrito']);
  const H_TIPO=new Set(['tipo centro','tipo','categoria','clase','nivel']);
  const H_RUBRO=new Set(['rubro','actividad','subrubro','giro','ramo','especialidad']);
  const H_OBS=new Set(['observaciones','obs','notas','nota','comentarios','comentario','detalle','detalles','referencia']);
  const H_EXTRA=new Set(['provincia','telefono','tel','celular','contacto','horario','responsable','email','mail']);
  const ALL_H=new Set([...H_ID,...H_NOM,...H_DIR,...H_NUM,...H_LOC,...H_TIPO,...H_RUBRO,...H_OBS,...H_EXTRA]);

  const esDir=v=>{
    const s=String(v==null?'':v).trim();
    return s.length>=4&&(/[a-záéíóúñ]{3,}.*\d+/i.test(s)||/\b(av|bv|blvd|calle|pasaje|pje|ruta|esq)\b/i.test(s));
  };

  const ncols=Math.max(...raw.map(r=>r.length));
  const norm0=raw[0].map(_normCol);
  const tieneEnc=norm0.some(h=>ALL_H.has(h));
  const datos=tieneEnc?raw.slice(1):raw;
  if(!datos.length) return {nuevos:[],aoaConId:[]};

  let iId=-1,iNom=-1,iDir=-1,iNum=-1,iLoc=-1,iTipo=-1,iRubro=-1,iObs=-1;
  const extraCols=[];

  if(tieneEnc){
    const find=(set,skip)=>norm0.findIndex((h,idx)=>(!skip||!skip.has(idx))&&set.has(h));
    iId=find(H_ID);
    iNom=find(H_NOM,new Set([iId].filter(x=>x>=0)));
    iDir=find(H_DIR,new Set([iId].filter(x=>x>=0)));
    iNum=find(H_NUM,new Set([iId,iDir].filter(x=>x>=0)));
    iLoc=find(H_LOC,new Set([iId].filter(x=>x>=0)));
    iTipo=find(H_TIPO,new Set([iId].filter(x=>x>=0)));
    iRubro=find(H_RUBRO,new Set([iId].filter(x=>x>=0)));
    iObs=find(H_OBS,new Set([iId].filter(x=>x>=0)));

    const usadosCol=new Set([iId,iNom,iDir,iNum,iLoc,iTipo,iRubro,iObs].filter(x=>x>=0));
    if(iDir<0){
      let bestCol=-1,bestScore=0;
      for(let c=0;c<ncols;c++){
        if(usadosCol.has(c)) continue;
        const sc=datos.reduce((a,r)=>a+(esDir(r[c])?1:0),0);
        if(sc>bestScore){bestScore=sc;bestCol=c;}
      }
      if(bestCol<0){
        for(let c=0;c<ncols;c++){
          if(c===iId||c===iNum||c===iLoc||c===iTipo||c===iRubro||c===iObs) continue;
          const sc=datos.reduce((a,r)=>a+(esDir(r[c])?1:0),0);
          if(sc>bestScore){bestScore=sc;bestCol=c;}
        }
      }
      if(bestCol>=0){
        iDir=bestCol;
        usadosCol.add(iDir);
      }else if(iNom<0){
        const disp=[];
        for(let c=0;c<ncols;c++) if(!usadosCol.has(c)&&datos.some(r=>String(r[c]??'').trim()!=='')) disp.push(c);
        if(disp.length){iNom=disp[0];usadosCol.add(iNom);}
        if(disp.length>1){iDir=disp[1];usadosCol.add(iDir);}
      }
    }
    if(iNom<0){
      for(let c=0;c<ncols;c++){
        if(!usadosCol.has(c)&&datos.some(r=>String(r[c]??'').trim()!=='')){iNom=c;usadosCol.add(c);break;}
      }
    }
    for(let c=0;c<ncols;c++){
      const tit=String(raw[0][c]??'').trim();
      if(tit&&!usadosCol.has(c)) extraCols.push({c,tit});
    }
  }else{
    if(ncols===1){
      iNom=0;iDir=0;
    }else{
      let bestCol=-1,bestScore=0;
      for(let c=0;c<ncols;c++){
        const sc=datos.reduce((a,r)=>a+(esDir(r[c])?1:0),0);
        if(sc>bestScore){bestScore=sc;bestCol=c;}
      }
      if(bestScore>0){
        iDir=bestCol;
        for(let c=0;c<ncols;c++) if(c!==iDir){iNom=c;break;}
      }else{
        iNom=0;iDir=1;
      }
      for(let c=0;c<ncols;c++){
        if(c===iNom||c===iDir) continue;
        if(iLoc<0) iLoc=c;
        else extraCols.push({c,tit:''});
      }
    }
  }

  const idsUsados=new Set(Array.from(idsExistentes||[]).map(x=>String(x)));
  let autoN=1;
  const sigAutoId=()=>{while(idsUsados.has('P'+autoN))autoN++;const v='P'+autoN++;idsUsados.add(v);return v;};

  const origTieneColId=tieneEnc&&iId>=0;
  const hdrAoa=tieneEnc
    ? Array.from({length:ncols},(_,c)=>String(raw[0][c]??''))
    : Array.from({length:ncols},(_,c)=>{
        if(ncols===1) return 'Dirección';
        if(c===iNom) return 'Ubicación';
        if(c===iDir) return 'Dirección';
        if(c===iLoc) return 'Localidad';
        return 'Dato '+(c+1);
      });

  const nuevos=[];
  const filasOut=[];

  for(const row of datos){
    const g=idx=>idx>=0?String(row[idx]??'').trim():'';
    const rawNom=g(iNom);
    const dirBase=g(iDir);
    const num=g(iNum);
    const rawDir=(dirBase+(num?' '+num:'')).trim();
    if(!rawDir&&!rawNom) continue;

    let id=g(iId);
    if(!id||idsUsados.has(id)) id=sigAutoId();
    else idsUsados.add(id);

    const nombre=rawNom||rawDir;
    const dir=rawDir||rawNom;
    const localidad=g(iLoc);
    const tipo=g(iTipo);
    const rubro=g(iRubro);
    const extras=extraCols.map(({c,tit})=>{
      const val=g(c);if(!val) return '';
      return tit?(tit+': '+val):val;
    }).filter(Boolean);
    const obs=[g(iObs),...extras].filter(Boolean).join(' · ');

    nuevos.push({id,nombre,dir,localidad,tipo,rubro,obs,lat:null,lng:null,geoErr:null});

    const rowPad=Array.from({length:ncols},(_,c)=>row[c]??'');
    if(origTieneColId){
      rowPad[iId]=id;
      filasOut.push(rowPad);
    }else{
      filasOut.push([id,...rowPad]);
    }
  }

  if(!nuevos.length) return {nuevos:[],aoaConId:[]};
  const aoaConId=origTieneColId?[hdrAoa,...filasOut]:[['ID',...hdrAoa],...filasOut];
  return {nuevos,aoaConId};
}

function importXL(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      const prevIds=new Set(puntos.map(p=>String(p.id)));
      const {nuevos,aoaConId}=parsearFilasExcel(aoa,prevIds);
      if(!nuevos.length){
        showToast('El archivo no tiene datos o direcciones para importar',true);
        return;
      }
      const conGeoDe=(prev,n)=>{
        const ex=prev.find(p=>p.id===n.id)||prev.find(p=>p.dir&&n.dir&&p.dir.toLowerCase()===n.dir.toLowerCase()&&(p.localidad||'').toLowerCase()===(n.localidad||'').toLowerCase());
        return ex&&ex.lat&&ex.lng?{...n,lat:ex.lat,lng:ex.lng,geoUsada:ex.geoUsada||null}:n;
      };
      const aplicarImport=(modo)=>{
        try{lsSet('sube:excel',{name:file.name,aoa:aoaConId,ts:Date.now()});}catch(e){}
        const prev=puntos.slice();
        if(modo==='reemplazar'){
          const nuevosGeo=nuevos.map(n=>conGeoDe(prev,n));
          if(typeof reiniciarEstadoLocal==='function') reiniciarEstadoLocal({conservarExcel:true});
          puntos=nuevosGeo;
          lsSet(SK.puntos,puntos);
          renderP();renderV();updStats();
          if(typeof renderMapa==='function'&&mapa) renderMapa();
          showToast(nuevos.length+(nuevos.length===1?' lugar importado':' lugares importados')+' (lista nueva) ✓');
        }else{
          const antes=puntos.length,repetidos=nuevos.filter(n=>puntos.some(p=>p.id===n.id)).length;
          // mantener lat/lng de puntos existentes si coincide ID o dirección
          puntos=[...puntos.filter(p=>!nuevos.find(n=>n.id===p.id)),...nuevos.map(n=>conGeoDe(prev,n))];
          if(typeof limpiarVisitasHuerfanas==='function') limpiarVisitasHuerfanas();
          lsSet(SK.puntos,puntos);
          renderP();renderV();updStats();
          if(typeof renderMapa==='function'&&mapa) renderMapa(true);
          const nv=nuevos.length-repetidos;
          showToast(nuevos.length+(nuevos.length===1?' lugar importado':' lugares importados')+' ✓'+(antes&&nv>0?' · se sumaron a los '+antes+' que ya tenías':(repetidos?' · '+repetidos+' ya estaban y se actualizaron':'')));
        }
        // arrancar geocodificación automática
        setTimeout(()=>geocodificarTodos(true),400);
        // autosave
        triggerAutosave();
      };
      if(puntos.length>0 && typeof mostrarDlgEnvio==='function'){
        const nVis=Object.keys(visits).length;
        mostrarDlgEnvio(
          `Tenés ${puntos.length} punto${puntos.length===1?'':'s'} cargado${puntos.length===1?'':'s'}${nVis?` y ${nVis} visita${nVis===1?'':'s'} registrada${nVis===1?'':'s'}`:''}.\n\n¿Cómo querés cargar este archivo (${nuevos.length} lugar${nuevos.length===1?'':'es'})?`,
          [
            {txt:'Empezar lista nueva (limpiar anteriores)',cls:'ba',fn:()=>aplicarImport('reemplazar')},
            {txt:'Sumar a la lista actual',cls:'bd',fn:()=>aplicarImport('sumar')},
            {txt:'Cancelar',cls:'bd'}
          ]
        );
        return;
      }
      // si no había puntos cargados pero quedaron visitas huérfanas viejas, se limpian antes de cargar
      if(!puntos.length && Object.keys(visits).length && typeof limpiarVisitasHuerfanas==='function'){
        limpiarVisitasHuerfanas();
      }
      aplicarImport('sumar');
    }catch(err){showToast('Error al leer el archivo',true);}
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}
