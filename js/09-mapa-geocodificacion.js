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
  mapa = L.map('mapa',{zoomControl:true,attributionControl:false}).setView([-32.9442,-60.6505],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OSM'
  }).addTo(mapa);
  markersLayer = L.layerGroup().addTo(mapa);
  mapa.on('zoomend',marcarTapados);
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
  // Pequeño delay para que el contenedor calcule bien el tamaño
  setTimeout(()=>mapa.invalidateSize(),200);
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
    <button class="sm ${modoMarcar?'sma':'smh'}" style="margin-left:auto" onclick="toggleModoMapa()">${modoMarcar?'🔵 Tocar = marcar':'ℹ️ Tocar = ver info'}</button>`;

  // lista de puntos sin geocodificar (el cartel se puede tocar para ver cuáles son)
  const pendList=document.getElementById('geoPendList');
  if(sinGeo.length&&puntos.length){
    const items=sinGeo.map(p=>{
      const i=puntos.indexOf(p);
      return `<div style="padding:8px 0;border-top:1px solid rgba(212,165,116,.2)">
        <div style="font-weight:700;color:var(--text)">${escapeHtml(p.nombre||'(sin nombre)')} <span style="color:var(--text-mute);font-weight:500">· ID ${escapeHtml(p.id)}</span></div>
        <div style="color:var(--text-soft);margin:2px 0">📍 ${escapeHtml(p.dir)}${p.localidad?' · '+escapeHtml(p.localidad):''}</div>
        <div style="color:var(--text-mute);margin-bottom:6px">Motivo: ${escapeHtml(p.geoErr||'pendiente de geocodificar')}${p.geoProbadas&&p.geoProbadas.length?'<br>Probé: '+escapeHtml(p.geoProbadas.join(' · ')):''}</div>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <input type="text" value="${escapeHtml(manualQ[i]!==undefined?manualQ[i]:(p.dir||''))}" placeholder="Corregí la dirección o escribí el nombre del lugar"
                 oninput="manualQ[${i}]=this.value" onkeydown="if(event.key==='Enter')buscarManual(${i})" style="flex:1;min-width:0"/>
          <button class="sm sma" onclick="buscarManual(${i})">🔎 Buscar</button>
        </div>
        ${htmlResultadosManual(i)}
        <button class="sm smh" onclick="ubicarManual(${i})">📍 Ubicar tocando el mapa</button>
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
    const icon = est==='ok'?ICON_DONE():(est?ICON_CERRADO():(enRuta?ICON_SEL():ICON_DEF()));
    // los colores (voy / visitado / cerrado) quedan por encima de los grises
    const prio = (est||enRuta)?1:0;
    const marker = L.marker([p.lat,p.lng],{icon,zIndexOffset:prio*1000}).addTo(markersLayer);
    marker._puntoId=p.id;marker._prio=prio;
    const gmUrl = urlNavegar(p.lat,p.lng);
    const popup = `
      <div class="popup-title">${escapeHtml(p.nombre)}</div>
      <div class="popup-dir">📍 ${escapeHtml(p.dir)}</div>
      <div class="popup-id">ID: ${escapeHtml(p.id)}${p.localidad?' · '+escapeHtml(p.localidad):''}</div>
      <a href="${gmUrl}" target="_blank" rel="noopener" class="popup-btn gm"><svg class="ico" style="vertical-align:-2px"><use href="#i-nav"/></svg> Ir con ${NAV_APPS[appNav()].nombre}</a>
      <button class="popup-btn" style="margin-top:5px" onclick="toggleSelFromMap('${p.id}')">${enRuta?'<svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg> En ruta':'<svg class="ico" style="vertical-align:-2px"><use href="#i-plus"/></svg> Agregar a ruta'}</button>
    `;
    if(modoMarcar){
      marker.on('click',()=>marcarDesdeMapa(p.id));
    }else{
      marker.bindPopup(popup);
    }
    bounds.push([p.lat,p.lng]);
  });

  marcarTapados();

  // Auto-fit a los bounds si hay markers (no al abrir/cerrar el cartel)
  if(noFit){
    // sin reencuadrar
  }else if(bounds.length===1){
    mapa.setView(bounds[0],15);
  }else if(bounds.length>1){
    mapa.fitBounds(bounds,{padding:[40,40],maxZoom:15});
  }
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

// Busca candidatos para un texto libre (dirección corregida o nombre del lugar), siempre dentro de Rosario
async function buscarCandidatos(texto,localidad){
  const out=[],vistos=new Set();
  let hubo=false;
  const add=(lat,lng,label)=>{
    if(lat==null||lng==null||!enRosario(lat,lng)) return;
    const k=lat.toFixed(4)+','+lng.toFixed(4);
    if(vistos.has(k)) return;
    vistos.add(k);out.push({lat,lng,label});
  };
  const {calle,altura}=partirDireccion(texto);
  const cands=calle?variantesCalle(calle):[];
  // primero en la localidad del punto (Funes, Roldán…); Rosario solo si ahí no aparece nada
  const loc=(localidad||'Rosario').trim()||'Rosario',locs=loc.toLowerCase()==='rosario'?['Rosario']:[loc,'Rosario'];
  for(const l of locs){
    if(out.length) break;
    for(const c of cands.slice(0,4)){
      try{
        const url='https://apis.datos.gob.ar/georef/api/direcciones?max=3&provincia=Santa%20Fe&localidad_censal='+encodeURIComponent(l)+'&direccion='+encodeURIComponent(c+(altura?' '+altura:''));
        const d=await fetchJson(url);hubo=true;
        for(const r of (d&&d.direcciones)||[]){
          const u=r.ubicacion;
          if(u){
            const loca=(r.localidad_censal&&r.localidad_censal.nombre)||l;
            add(u.lat,u.lon,(((r.calle&&r.calle.nombre)||c)+' '+((r.altura&&r.altura.valor)||altura)).trim()+', '+loca+', Santa Fe');
          }
        }
      }catch(e){console.warn('manual georef:',e);}
    }
  }
  const b=ROSARIO_BOX,vb=[b.lngMin,b.latMax,b.lngMax,b.latMin].join(',');
  const pedidos=['&q='+encodeURIComponent(texto+', '+loc+', Santa Fe')];
  if(cands[0]) pedidos.unshift('&street='+encodeURIComponent((altura?altura+' ':'')+cands[0])+'&city='+encodeURIComponent(loc)+'&state=Santa%20Fe');
  for(const extra of pedidos){
    try{
      await esperarOsm();
      const d=await fetchJson('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ar&bounded=1&viewbox='+vb+extra);hubo=true;
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
