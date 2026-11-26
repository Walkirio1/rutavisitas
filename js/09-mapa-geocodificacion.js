// Mapa (Leaflet) y geocodificación
// ═══════════════════════════════════════════════════════════
// ── MAPA Y GEOCODIFICACIÓN (OpenStreetMap + Georef AR / Nominatim, gratis y sin clave)
// ═══════════════════════════════════════════════════════════
let mapa = null;
let markersLayer = null;
let miUbicLayer = null;
let ubicando = null;      // índice en puntos[] del punto que se está ubicando a mano
let sinGeoAbierto = false;
let modoMarcar = false;     // true: tocar un pin lo marca/desmarca (azul); false: tocar un pin abre su info
let manualQ = {};          // texto escrito en el buscador manual, por índice de punto
let manualRes = {};        // resultados de la búsqueda manual, por índice de punto
let geocodingInProgress = false;

// Iconos SVG para los pins
function makeIcon(color){
  const svg=`<svg width="34" height="48" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 6.7 23.3 0 15 0 z" fill="${color}"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html:`<div class="pin-marker">${svg}</div>`,
    className:'',
    iconSize:[34,48],
    iconAnchor:[17,48],
    popupAnchor:[0,-44]
  });
}
const ICON_SEL = () => makeIcon('#3b82f6');   // azul: voy a visitarlo
const ICON_DEF = () => makeIcon('#94a3b8');   // gris: no en ruta
const ICON_DONE = () => makeIcon('#10b981');  // verde: visitado
const ICON_CERRADO = () => makeIcon('#ef4444'); // rojo: cerrado o no se visitó
// punto de partida: pin naranja con una banderita
let inicioId = lsGet('sube:inicio') || null;   // id del punto donde arranco (vacío = desde mi ubicación)
let modoInicio = false;                          // true: el próximo pin que se toca es el de partida
const ICON_INICIO = () => L.divIcon({
  html:`<div class="pin-marker" style="position:relative">${makeIcon('#f97316').options.html.replace('<div class="pin-marker">','').replace(/<\/div>$/,'')}<span style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:20px;line-height:1">🚩</span></div>`,
  className:'',iconSize:[34,48],iconAnchor:[17,48],popupAnchor:[0,-50]
});

// Estado de una visita: 'ok' (visitado), 'cerrado' (comercio cerrado / domicilio inexistente),
// 'no' (marcado como no visitado) o null (sin visitar)
function estadoVisita(id){
  const v=visits[id];if(!v) return null;
  if(v.noVisitado) return 'no';
  if(v.done){const c=(v.planilla&&v.planilla.chC)||[];return (c[0]||c[1]||(v.planilla&&v.planilla.cierra))?'cerrado':'ok';}
  return null;
}

// Inicializar mapa una sola vez
function initMapa(){
  if(mapa)return;
  // Default: Rosario, Argentina
  mapa = L.map('mapa',{zoomControl:true,attributionControl:true}).setView([-32.9442,-60.6505],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OSM'
  }).addTo(mapa);
  markersLayer = L.layerGroup().addTo(mapa);
  mapa.on('zoomend',marcarTapados);
  mapa.on('dragstart',()=>{_seguirAuto=false;_mapaArrastrado=true;});
  miUbicLayer = L.layerGroup().addTo(mapa);
  mapa.on('click',e=>{
    if(ubicando===null) return;
    const pt=puntos[ubicando];
    ubicando=null;
    mapa.getContainer().style.cursor='';
    if(!pt) return;
    pt.lat=e.latlng.lat;pt.lng=e.latlng.lng;pt.geoErr=null;pt.geoProbadas=null;
    lsSet(SK.puntos,puntos);
    showToast('✓ Ubicado: '+(pt.nombre||pt.dir));
    renderMapa();
  });
  // El contenedor puede estar oculto o sin tamaño cuando se crea: se recalcula cada vez que cambia de tamaño
  try{new ResizeObserver(()=>{if(mapa) mapa.invalidateSize();}).observe(document.getElementById('mapa'));}catch(e){}
  setTimeout(()=>mapa.invalidateSize(),200);
}
// Si el mapa quedó en blanco (sin tamaño o sin cuadros dibujados), lo redibuja: evita tener que cerrar y abrir la app
function repararMapa(intento){
  if(!mapa) return;
  const el=document.getElementById('mapa');
  if(!el||el.style.display==='none'||!el.offsetHeight) return;
  mapa.invalidateSize();
  const hay=el.querySelectorAll('.leaflet-tile-loaded').length;
  if(!hay&&(intento||0)<4){
    mapa.eachLayer(l=>{if(l.redraw) l.redraw();});
    setTimeout(()=>repararMapa((intento||0)+1),1500);
  }
}

// Renderizar markers en el mapa + lista de pendientes
function renderMapa(noFit){
  if(!mapa)return;
  markersLayer.clearLayers();

  const conGeo = puntos.filter(p=>p.lat&&p.lng);
  const sinGeo = puntos.filter(p=>!p.lat);

  // empty state
  document.getElementById('mapaVacio').style.display = puntos.length?'none':'block';
  document.getElementById('mapa').style.display = puntos.length?'block':'none';

  // leyenda con colores, cantidades y el interruptor de modo
  const nVisit=puntos.filter(p=>p.lat&&estadoVisita(p.id)==='ok').length;
  const nCerr=puntos.filter(p=>p.lat&&(estadoVisita(p.id)==='cerrado'||estadoVisita(p.id)==='no')).length;
  const nRuta=puntos.filter(p=>p.lat&&sel.has(p.id)&&!estadoVisita(p.id)).length;
  const nSin=conGeo.length-nVisit-nCerr-nRuta;
  const pt=(c)=>`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:4px;vertical-align:-1px"></span>`;
  const ley=document.getElementById('mapaLeyenda');
  if(ley) ley.innerHTML=`<span>${pt('#94a3b8')}Sin elegir ${nSin}</span><span>${pt('#3b82f6')}Voy ${nRuta}</span><span>${pt('#10b981')}Visitado ${nVisit}</span><span>${pt('#ef4444')}Cerrado / no visitado ${nCerr}</span>
    <button class="sm ${modoInicio||inicioId?'sma':'smh'}" style="margin-left:auto" onclick="toggleModoInicio()">${IC("flag")} ${modoInicio?'Tocá el punto…':(inicioId&&puntos.find(x=>x.id===inicioId)?'Arranco: '+escapeHtml((puntos.find(x=>x.id===inicioId).nombre||'').slice(0,18)):'Dónde arranco')}</button>
    <button class="sm ${modoMarcar?'sma':'smh'}" onclick="toggleModoMapa()">${modoMarcar?IC('check')+' Tocar = marcar':IC('info')+' Tocar = ver info'}</button>`;

  // lista de puntos sin geocodificar (el cartel se puede tocar para ver cuáles son)
  const pendList=document.getElementById('geoPendList');
  if(sinGeo.length&&puntos.length){
    const items=sinGeo.map(p=>{
      const i=puntos.indexOf(p);
      return `<div style="padding:8px 0;border-top:1px solid rgba(212,165,116,.2)">
        <div style="font-weight:700;color:var(--text)">${escapeHtml(p.nombre||'(sin nombre)')} <span style="color:var(--text-mute);font-weight:500">· ID ${escapeHtml(p.id)}</span></div>
        <div style="color:var(--text-soft);margin:2px 0">${escapeHtml(p.dir)}${p.localidad?' · '+escapeHtml(p.localidad):''}</div>
        <div style="color:var(--text-mute);margin-bottom:6px">Motivo: ${escapeHtml(p.geoErr||'pendiente de geocodificar')}${p.geoProbadas&&p.geoProbadas.length?'<br>Probé: '+escapeHtml(p.geoProbadas.join(' · ')):''}</div>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <input type="text" value="${escapeHtml(manualQ[i]!==undefined?manualQ[i]:(p.dir||''))}" placeholder="Corregí la dirección o escribí el nombre del lugar"
                 oninput="manualQ[${i}]=this.value" onkeydown="if(event.key==='Enter')buscarManual(${i})" style="flex:1;min-width:0"/>
          <button class="sm sma" onclick="buscarManual(${i})">🔎 Buscar</button>
        </div>
        ${htmlResultadosManual(i)}
        <button class="sm smh" onclick="ubicarManual(${i})">${IC("target")} Ubicar tocando el mapa</button>
      </div>`;
    }).join('');
    pendList.innerHTML=`<div class="geo-pend">
      <div onclick="toggleSinGeo()" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span>⚠️ <strong>${sinGeo.length}</strong> punto${sinGeo.length>1?'s':''} sin ubicación</span>
        <span style="text-decoration:underline">${sinGeoAbierto?'Ocultar ▲':'Ver cuáles ▼'}</span>
      </div>
      ${ubicando!==null?`<div style="margin-top:8px;padding:7px;background:rgba(16,185,129,.12);border-radius:8px;color:#10b981;font-weight:600">👆 Tocá el mapa donde está el punto. <a href="#" onclick="cancelarUbicar();return false" style="color:#10b981">Cancelar</a></div>`:''}
      ${sinGeoAbierto?`<div style="margin-top:8px">${items}</div>`:''}
    </div>`;
  }else{
    pendList.innerHTML='';
  }

  // markers
  const bounds=[];
  conGeo.forEach((p,i)=>{
    const enRuta = sel.has(p.id);
    const est = estadoVisita(p.id);
    const esInicio = inicioId===p.id && !est;
    const icon = est==='ok'?ICON_DONE():(est?ICON_CERRADO():(esInicio?ICON_INICIO():(enRuta?ICON_SEL():ICON_DEF())));
    // los colores (voy / visitado / cerrado) quedan por encima de los grises
    const prio = (est||enRuta||esInicio)?1:0;
    const marker = L.marker([p.lat,p.lng],{icon,zIndexOffset:prio*1000}).addTo(markersLayer);
    marker._puntoId=p.id;marker._prio=prio;
    const gmUrl = urlNavegar(p.lat,p.lng);
    const rub = typeof rubroDePunto==='function'?rubroDePunto(p):(p.tipo||'');
    const popup = `
      <div class="popup-title">${escapeHtml(p.nombre)}</div>
      ${rub?`<div class="popup-id" style="color:var(--text-soft);font-weight:600">🏪 ${escapeHtml(rub)}</div>`:''}
      <div class="popup-dir">${escapeHtml(p.dir)}</div>
      <div class="popup-id">ID: ${escapeHtml(p.id)}${p.localidad?' · '+escapeHtml(p.localidad):''}</div>
      <a href="${gmUrl}" target="_blank" rel="noopener" class="popup-btn gm"><svg class="ico" style="vertical-align:-2px"><use href="#i-nav"/></svg> Ir con ${NAV_APPS[appNav()].nombre}</a>
      <button class="popup-btn" style="margin-top:5px;background:${esInicio?'#f97316':''};color:${esInicio?'#fff':''}" onclick="fijarInicio('${p.id}')">${IC('flag')} ${esInicio?'Arrancás acá (quitar)':'Arrancar desde acá'}</button>
      <button class="popup-btn" style="margin-top:5px" onclick="toggleSelFromMap('${p.id}')">${enRuta?'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> En ruta':'<svg class="ico" style="vertical-align:-2px"><use href="#i-plus"/></svg> Agregar a ruta'}</button>
      <button class="popup-btn" style="margin-top:5px;${est==='ok'?'':'background:#10b981;color:#fff'}" onclick="toggleHechaFromMap('${p.id}')">${est==='ok'?'↩ Desmarcar hecha':'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> Marcar como hecha'}</button>
    `;
    if(modoInicio){
      marker.on('click',()=>fijarInicio(p.id));
    }else if(modoMarcar){
      marker.on('click',()=>marcarDesdeMapa(p.id));
    }else{
      marker.bindPopup(popup);
    }
    bounds.push([p.lat,p.lng]);
  });

  marcarTapados();

  // Al abrir el mapa priorizar la ubicación actual del auto si hay GPS reciente
  const tieneUbiReciente=typeof _ubi!=='undefined'&&_ubi&&Date.now()-_ubi.ts<5*60000;
  if(noFit){
    // sin reencuadrar
  }else if(tieneUbiReciente){
    _seguirAuto=true;_mapaArrastrado=false;
    mapa.setView([_ubi.lat,_ubi.lng],Math.max(mapa.getZoom()||16,16));
  }else if(bounds.length===1){
    mapa.setView(bounds[0],15);
  }else if(bounds.length>1){
    mapa.fitBounds(bounds,{padding:[40,40],maxZoom:15});
  }
  if(tieneUbiReciente){
    actualizarAutoMapa(_ubi.lat,_ubi.lng,_ubi.prec,_ubi.heading);
  }
}

function ubicarAutoAlAbrirMapa(){
  if(!mapa) return;
  _mapaArrastrado=false;
  if(typeof _ubi!=='undefined'&&_ubi&&Date.now()-_ubi.ts<5*60000){
    _seguirAuto=true;
    mapa.setView([_ubi.lat,_ubi.lng],Math.max(mapa.getZoom()||16,16));
    actualizarAutoMapa(_ubi.lat,_ubi.lng,_ubi.prec,_ubi.heading);
    return;
  }
  if(typeof _esIOS==='function'&&_esIOS()&&!lsGet('sube:proxok')) return;
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude,prec=pos.coords.accuracy||0,heading=pos.coords.heading;
    if(typeof _ubi!=='undefined') _ubi={lat,lng,prec,heading,ts:Date.now()};
    actualizarAutoMapa(lat,lng,prec,heading);
    if(mapa&&!_mapaArrastrado&&(typeof _tabPos==='undefined'||_tabPos===2)){
      _seguirAuto=true;
      mapa.setView([lat,lng],Math.max(mapa.getZoom()||16,16));
    }
  },()=>{},{enableHighAccuracy:true,maximumAge:60000,timeout:8000});
}

// ── AUTITO GPS EN TIEMPO REAL
let _autoMarker=null,_autoCirculo=null,_seguirAuto=false,_mapaArrastrado=false,_autoUltPos=null,_autoRumbo=0;
function calcularRumbo(aLat,aLng,bLat,bLng){
  const r=x=>x*Math.PI/180,dl=r(bLng-aLng),y=Math.sin(dl)*Math.cos(r(bLat)),
    x=Math.cos(r(aLat))*Math.sin(r(bLat))-Math.sin(r(aLat))*Math.cos(r(bLat))*Math.cos(dl);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function iconoAuto(deg){
  const d=Math.round(deg||0);
  const html=`<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;inset:0;transform:rotate(${d}deg);pointer-events:none">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><polygon points="22,1 27,10 17,10" fill="#2563eb" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>
    </div>
    <div style="width:30px;height:30px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(37,99,235,.55);display:flex;align-items:center;justify-content:center">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v7a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7zm2.2-4L6.3 10h11.4L16.8 7H7.2zM7.5 14a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm9 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/></svg>
    </div>
  </div>`;
  return L.divIcon({html,className:'',iconSize:[44,44],iconAnchor:[22,22],popupAnchor:[0,-22]});
}
function actualizarAutoMapa(lat,lng,acc,heading){
  if(!mapa||!miUbicLayer) return;
  let nuevoRumbo=_autoRumbo;
  if(Number.isFinite(heading)) nuevoRumbo=heading;
  else if(_autoUltPos&&typeof distM==='function'&&distM(_autoUltPos.lat,_autoUltPos.lng,lat,lng)>8){
    nuevoRumbo=calcularRumbo(_autoUltPos.lat,_autoUltPos.lng,lat,lng);
  }
  _autoUltPos={lat,lng};
  const rad=Math.max(15,Math.min(acc||25,120));
  if(_autoCirculo&&miUbicLayer.hasLayer(_autoCirculo)){
    _autoCirculo.setLatLng([lat,lng]);_autoCirculo.setRadius(rad);
  }else{
    _autoCirculo=L.circle([lat,lng],{radius:rad,color:'#3b82f6',weight:1,fillOpacity:.12}).addTo(miUbicLayer);
  }
  if(_autoMarker&&miUbicLayer.hasLayer(_autoMarker)){
    _autoMarker.setLatLng([lat,lng]);
    if(Math.abs(nuevoRumbo-_autoRumbo)>10){_autoRumbo=nuevoRumbo;_autoMarker.setIcon(iconoAuto(_autoRumbo));}
  }else{
    _autoRumbo=nuevoRumbo;
    _autoMarker=L.marker([lat,lng],{icon:iconoAuto(_autoRumbo),zIndexOffset:2000}).addTo(miUbicLayer).bindPopup('🚗 Tu posición en tiempo real');
  }
  if(_seguirAuto) mapa.panTo([lat,lng],{animate:true,duration:0.6});
}

// Resultados de la búsqueda manual de un punto
function htmlResultadosManual(i){
  const r=manualRes[i];
  if(r===undefined) return '';
  if(r==='buscando') return '<div style="color:var(--text-mute);margin-bottom:6px">⏳ Buscando…</div>';
  if(r==='sinred')   return '<div style="color:#f59e0b;margin-bottom:6px">Sin conexión: probá de nuevo en un momento</div>';
  if(!r.length)      return '<div style="color:#f59e0b;margin-bottom:6px">No encontré nada. Probá con otra forma de escribirla o tocá el mapa.</div>';
  return '<div style="margin-bottom:6px;color:var(--text-mute)">Elegí el correcto:'+r.map((x,j)=>
    `<button class="sm smh" style="display:block;width:100%;text-align:left;margin-top:5px;white-space:normal" onclick="elegirResultado(${i},${j})">📍 ${escapeHtml(x.label)}</button>`
  ).join('')+'</div>';
}

// Busca candidatos para un texto libre (dirección corregida o nombre del lugar) en Argentina
async function buscarCandidatos(texto,localidad){
  const out=[],vistos=new Set();
  let hubo=false;
  const add=(lat,lng,label)=>{
    lat=Number(lat);lng=Number(lng);
    if(!enRosario(lat,lng)) return;
    const k=lat.toFixed(4)+','+lng.toFixed(4),kl='t:'+String(label).trim().toLowerCase();
    if(vistos.has(k)||vistos.has(kl)) return; // mismo lugar o mismo texto: no repetir
    vistos.add(k);vistos.add(kl);out.push({lat,lng,label});
  };
  const {calle,altura}=partirDireccion(texto);
  const cands=calle?variantesCalle(calle):[];
  const loc=(localidad||'').trim();
  for(const c of cands.slice(0,4)){
      try{
        const url='https://apis.datos.gob.ar/georef/api/direcciones?max=3'+(loc?'&localidad_censal='+encodeURIComponent(loc):'')+'&direccion='+encodeURIComponent(c+(altura?' '+altura:''));
        const d=await fetchJson(url);hubo=true;
        for(const r of (d&&d.direcciones)||[]){
          const u=r.ubicacion;
          if(u){
            const loca=(r.localidad_censal&&r.localidad_censal.nombre)||loc;
            const prov=(r.provincia&&r.provincia.nombre)||'';
            add(u.lat,u.lon,(((r.calle&&r.calle.nombre)||c)+' '+((r.altura&&r.altura.valor)||altura)).trim()+[loca,prov].filter(Boolean).map(x=>', '+x).join(''));
          }
        }
      }catch(e){console.warn('manual georef:',e);}
  }
  const pedidos=['&q='+encodeURIComponent(texto+(loc?', '+loc:''))];
  if(cands[0]) pedidos.unshift('&street='+encodeURIComponent((altura?altura+' ':'')+cands[0])+(loc?'&city='+encodeURIComponent(loc):''));
  for(const extra of pedidos){
    try{
      await esperarOsm();
      const d=await fetchJson('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ar'+extra);hubo=true;
      for(const r of d||[]) add(parseFloat(r.lat),parseFloat(r.lon),(r.display_name||'').split(',').slice(0,4).join(','));
    }catch(e){console.warn('manual nominatim:',e);}
  }
  return {lista:out.slice(0,6),hubo};
}

async function buscarManual(i){
  const pt=puntos[i];if(!pt) return;
  const texto=(manualQ[i]!==undefined?manualQ[i]:pt.dir||'').trim();
  if(!texto){showToast('Escribí una dirección o un lugar',true);return;}
  manualRes[i]='buscando';renderMapa(true);
  const {lista,hubo}=await buscarCandidatos(texto,pt.localidad);
  manualRes[i]=lista.length?lista:(hubo?[]:'sinred');
  renderMapa(true);
}

// Al elegir un resultado el punto sale de "sin ubicación" y aparece en el mapa
function elegirResultado(i,j){
  const pt=puntos[i],x=manualRes[i]&&manualRes[i][j];
  if(!pt||!x) return;
  pt.lat=x.lat;pt.lng=x.lng;pt.geoErr=null;pt.geoProbadas=null;pt.geoUsada='manual: '+x.label;
  delete manualRes[i];delete manualQ[i];
  lsSet(SK.puntos,puntos);
  renderMapa();
  mapa.setView([pt.lat,pt.lng],17);
  showToast('✓ Ubicado en el mapa: '+(pt.nombre||pt.dir));
}

function toggleSinGeo(){sinGeoAbierto=!sinGeoAbierto;renderMapa(true);}

function ubicarManual(i){
  if(!puntos[i]) return;
  ubicando=i;
  mapa.getContainer().style.cursor='crosshair';
  showToast('Tocá el mapa donde está: '+(puntos[i].nombre||puntos[i].dir));
  renderMapa(true);
  document.getElementById('mapa').scrollIntoView({behavior:'smooth',block:'center'});
}

function cancelarUbicar(){
  ubicando=null;
  if(mapa)mapa.getContainer().style.cursor='';
  renderMapa(true);
}

// ── PUNTOS TAPADOS: si un pin queda tapado (≥85 %) por otro, el de abajo titila suave para saber que hay un comercio ahí atrás
function pulsoTapadosActivo(){return lsGet('sube:mkpulso')!==false;}
function marcarTapados(){
  if(!mapa||!markersLayer) return;
  const items=[];
  markersLayer.eachLayer(mk=>{
    if(mk._puntoId===undefined||!mk.getElement) return;
    const el=mk.getElement();if(!el) return;
    el.classList.remove('mk-tapado');
    items.push({el,p:mapa.latLngToLayerPoint(mk.getLatLng()),prio:mk._prio||0});
  });
  if(!pulsoTapadosActivo()) return;
  const W=34,H=48; // tamaño del pin
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const a=items[i],b=items[j],dx=Math.abs(a.p.x-b.p.x),dy=Math.abs(a.p.y-b.p.y);
    if(dx>=W||dy>=H) continue;
    if((W-dx)*(H-dy)/(W*H)<0.85) continue;
    // abajo queda el de menor prioridad (gris); si son iguales, el más al norte (Leaflet dibuja encima al de más al sur)
    const abajo=a.prio!==b.prio?(a.prio<b.prio?a:b):(a.p.y<=b.p.y?a:b);
    abajo.el.classList.add('mk-tapado');
  }
}
function togglePulsoTapados(){
  lsSet('sube:mkpulso',!pulsoTapadosActivo());
  marcarTapados();actualizarPulsoEst();
  showToast(pulsoTapadosActivo()?'Los puntos tapados titilan en el mapa':'Aviso de puntos tapados desactivado');
}
function actualizarPulsoEst(){const e=document.getElementById('pulsoEst');if(e)e.textContent=pulsoTapadosActivo()?'Activado · el pin de abajo titila':'Desactivado';}
