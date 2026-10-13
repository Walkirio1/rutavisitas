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
  if(n===2){initMapa();renderMapa();[60,300,900].forEach(ms=>setTimeout(()=>{if(_tabPos===2) repararMapa();},ms));}
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
        ? `<span class="geo-tag err" title="No se pudo ubicar: ${p.geoErr}"><svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> Sin ubicación</span>`
        : `<span class="geo-tag pen"><svg class="ico" style="vertical-align:-2px"><use href="#i-hourglass"/></svg> Pendiente</span>`;
    return `<div class="pi${s?' sel':''}${geoErr?' geo-err':''}">
      <div class="pnum">${i+1}</div>
      <div class="pb">
        <div class="pno">${p.nombre}</div>
        <div class="pd">📍 ${p.dir}</div>
        <div class="pid">ID: ${p.id}</div>
        ${p.obs?`<div class="pobs">ℹ️ ${p.obs}</div>`:''}
        <span class="ptag ${p.tipo.includes('Venta')?'tv':'tr'}">${p.tipo}</span>
        ${geoBadge}
        ${geoErr?`<div style="font-size:10px;color:#f59e0b;margin-top:3px">${p.geoErr}</div>`:''}
      </div>
      <button class="sm ${s?'smg':'smh'}" onclick="toggleSel('${p.id}')">${s?'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> En ruta':'+ Agregar'}</button>
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
  renderP();updStats();
  showToast(`✓ ${noSel.length} punto${noSel.length>1?'s':''} agregado${noSel.length>1?'s':''} a la ruta`);
  triggerAutosave();
}

function quitarTodosDeRuta(){
  const enRuta = puntos.filter(p=>sel.has(p.id)).length;
  if(!enRuta) return;
  confirm2(`¿Quitar los ${enRuta} puntos de la ruta? No se borran de la lista de puntos, solo de tu ruta del día.`,()=>{
    puntos.forEach(p=>sel.delete(p.id));
    lsSet(SK.sel,[...sel]);
    renderP();updStats();
    showToast(`Ruta vaciada (${enRuta} quitados)`);
    triggerAutosave();
  });
}

function toggleSel(id){
  const punto = puntos.find(p=>p.id===id);
  const agregando = !sel.has(id);
  if(agregando) sel.add(id); else sel.delete(id);
  lsSet(SK.sel,[...sel]);
  renderP();updStats();
  // Aviso especial si está agregando un punto sin ubicación
  if(agregando && punto && !punto.lat){
    showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> Agregado, pero este punto NO está en el mapa',true);
  }else{
    showToast(agregando?'Agregado a la ruta ✓':'Quitado de la ruta');
  }
  triggerAutosave();
}

// ── IMPORTAR EXCEL
function importXL(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws);
      // se guarda el Excel tal cual vino (todas las filas y columnas) para devolverlo actualizado
      const nuevos=rows.map(r=>({
        id:String(r['Ubicación ID']||r['ID']||''),
        nombre:String(r['Ubicación']||r['Nombre']||''),
        dir:(String(r['Dirección']||'')+' '+String(r['Numero']||'')).trim(),
        localidad:String(r['Localidad']||''),
        tipo:String(r['Tipo Centro']||''),
        obs:String(r['Observaciones']||''),
        lat:null,lng:null,geoErr:null,
      })).filter(r=>r.dir&&r.id);
      if(!nuevos.length){
        const cols=Object.keys(rows[0]||{});
        showToast(!rows.length?'El Excel no tiene filas: no se importó nada':'No encontré las columnas «Ubicación ID» y «Dirección»'+(cols.length?' (el archivo tiene: '+cols.slice(0,4).join(', ')+')':''),true);
        return;
      }
      try{lsSet('sube:excel',{name:file.name,aoa:XLSX.utils.sheet_to_json(ws,{header:1,defval:''}),ts:Date.now()});}catch(e){}
      const antes=puntos.length,repetidos=nuevos.filter(n=>puntos.some(p=>p.id===n.id)).length;
      // mantener lat/lng de puntos existentes si coincide ID
      puntos=[...puntos.filter(p=>!nuevos.find(n=>n.id===p.id)),...nuevos.map(n=>{
        const ex=puntos.find(p=>p.id===n.id);
        return ex&&ex.lat?{...n,lat:ex.lat,lng:ex.lng}:n;
      })];
      lsSet(SK.puntos,puntos);
      renderP();
      const nv=nuevos.length-repetidos;
      showToast(nuevos.length+(nuevos.length===1?' punto importado':' puntos importados')+' ✓'+(antes&&nv>0?' · se sumaron a los '+antes+' que ya tenías (para empezar de cero, usá Limpiar)':(repetidos?' · '+repetidos+' ya estaban y se actualizaron':'')));
      // arrancar geocodificación automática
      setTimeout(()=>geocodificarTodos(true),400);
      // autosave
      triggerAutosave();
    }catch(err){showToast('Error al leer el Excel',true);}
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}
