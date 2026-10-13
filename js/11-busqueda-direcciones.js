// Búsqueda de direcciones: fuerza Rosario y prueba variantes
// Geocodificar un punto via Google Geocoding API
// ── BÚSQUEDA DE DIRECCIONES: fuerza Rosario y prueba varias variantes del nombre de la calle
// Zona permitida (Rosario y Gran Rosario). Todo resultado fuera de esta caja se descarta.
const ROSARIO_BOX={latMin:-33.12,latMax:-32.78,lngMin:-60.92,lngMax:-60.48};
const enRosario=(lat,lng)=>lat>ROSARIO_BOX.latMin&&lat<ROSARIO_BOX.latMax&&lng>ROSARIO_BOX.lngMin&&lng<ROSARIO_BOX.lngMax;

// Títulos y tipos de calle que se sacan para probar variantes
const TITULOS=new Set(['dr','dra','doctor','doctora','gral','gl','general','cnel','coronel','tte','teniente','cap','capitan','brig','brigadier','ing','ingeniero','pres','presidente','gob','gobernador','alte','almirante','mons','monsenor','pbro','padre','fray','sgto','sargento','mtro','maestro','prof','profesor','don','dn','dip','diputado','sen','senador','min','ministro','arq','arquitecto','lic','licenciado','hno','hermano','cmte','comandante','cdte','sr','sra','dr','int','intendente']);
const TIPOS=new Set(['av','avda','avenida','bv','bvd','blvd','bulevar','boulevard','pje','pasaje','calle','ruta','autopista','diag','diagonal','cno','camino']);
const EXPANDIR={av:'avenida',avda:'avenida',bv:'bulevar',bvd:'bulevar',blvd:'bulevar',pje:'pasaje'};
// Palabras que solas no identifican una calle
const GENERICAS=new Set(['san','santa','del','de','la','las','los','el','y','sur','norte','este','oeste','bis','nueva','nuevo','viejo','vieja']);
const NOMBRES=new Set(['jose','juan','pedro','maria','carlos','luis','manuel','francisco','jorge','miguel','antonio','santiago','pablo','jesus','ricardo','roberto','alberto','eduardo','fernando','julio','hector','oscar','raul','mario','ramon','ernesto','enrique','rafael','rodolfo','horacio','hugo','armando','alfredo','alejandro','guillermo','domingo','angel','victor','ana','rosa','carmen','elena','laura','marta','julia']);

const sinAcentos=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
// Calles con fecha ("9 de Julio", "3 de Febrero"): un número + una palabra alcanzan para identificarlas
const esFecha=toks=>toks.some(t=>/^\d{1,2}$/.test(t))&&toks.some(t=>t.length>=3&&!/^\d+$/.test(t)&&t!=='de');
const esUtil=toks=>esFecha(toks)||toks.some(t=>t.length>=4&&!NOMBRES.has(t)&&!GENERICAS.has(t)&&!TITULOS.has(t)&&!TIPOS.has(t)&&!/^\d+$/.test(t))||(toks.length>=2&&toks.join('').length>=6&&toks.every(t=>!/^\d+$/.test(t))); // "Santa Fe", "San Luis": varias palabras cortas también identifican una calle

// "dr:pedro medrano 2870" → {calle:'dr pedro medrano', altura:'2870'}
function partirDireccion(dir){
  const t=sinAcentos(dir).toLowerCase().replace(/[.:;,()\/\\-]/g,' ').replace(/\bs\s*n\b/g,' ').replace(/\s+/g,' ').trim();
  const m=t.match(/^(.*\D)\s*(\d{1,6})\s*(?:bis)?$/);
  if(m) return {calle:m[1].trim(),altura:m[2]};
  return {calle:t,altura:''};
}

// Variantes del nombre de la calle, de la más específica a la más general
function variantesCalle(calle){
  const toks=calle.split(' ').filter(Boolean);
  const out=[];
  const add=a=>{const c=a.join(' ').trim();if(c&&!out.includes(c)&&esUtil(a))out.push(c);};
  add(toks.map(t=>EXPANDIR[t]||t));                       // completo (av → avenida)
  const base=toks.filter(t=>!TITULOS.has(t)&&!TIPOS.has(t)); // sin títulos ni tipo de calle
  add(base);
  for(let n=1;n<=2;n++) if(base.length-n>=1) add(base.slice(0,base.length-n)); // sin las últimas palabras ("san martin jose" → "san martin")
  for(let n=1;n<=2;n++) if(base.length-n>=1) add(base.slice(n));               // sin las primeras ("pedro medrano" → "medrano")
  return out;
}

// El nombre que devuelve el servicio tiene que compartir al menos una palabra clave con lo buscado
function coincide(devuelto,buscado){
  const d=new Set(sinAcentos(devuelto).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/));
  const bt=buscado.split(' ');
  if(esFecha(bt)) return bt.filter(t=>t!=='de').every(t=>d.has(t));
  const claves=bt.filter(t=>t.length>=4&&!NOMBRES.has(t)&&!GENERICAS.has(t)&&!TITULOS.has(t)&&!TIPOS.has(t));
  if(!claves.length) return bt.filter(t=>t.length>=2&&!/^\d+$/.test(t)).every(t=>d.has(t)); // calle de palabras cortas ("Santa Fe"): tienen que estar todas
  return claves.some(t=>d.has(t));
}

// Pide un JSON con reintentos. Un 4xx significa "sin resultados" (devuelve null); sólo los cortes
// de red, tiempos agotados, 429 y 5xx se reintentan y, si siguen, lanzan error.
async function fetchJson(url,reintentos=2){
  let ultimo;
  for(let i=0;i<=reintentos;i++){
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),12000);
    try{
      const r=await fetch(url,{signal:ctl.signal});
      if(r.status===429||r.status>=500) throw new Error('HTTP '+r.status);
      if(!r.ok) return null;
      return await r.json();
    }catch(e){
      ultimo=e;
      if(i<reintentos) await new Promise(res=>setTimeout(res,1500*(i+1)));
    }finally{clearTimeout(t);}
  }
  throw ultimo;
}

const _sleep=ms=>new Promise(r=>setTimeout(r,ms));
let _ultimaOsm=0;
async function esperarOsm(){ // Nominatim pide máx. 1 consulta por segundo
  const w=1100-(Date.now()-_ultimaOsm);
  if(w>0) await _sleep(w);
  _ultimaOsm=Date.now();
}

// 1º Georef (datos.gob.ar): muy bueno con calle + altura en Argentina
async function buscarGeoref(calle,altura,localidad){
  const url='https://apis.datos.gob.ar/georef/api/direcciones?max=5&provincia=Santa%20Fe&localidad_censal='+encodeURIComponent(localidad)+
            '&direccion='+encodeURIComponent(calle+(altura?' '+altura:''));
  const d=await fetchJson(url);
  for(const r of (d&&d.direcciones)||[]){
    const u=r.ubicacion;
    if(u&&u.lat!=null&&enRosario(u.lat,u.lon)&&coincide((r.calle&&r.calle.nombre)||'',calle)) return {lat:u.lat,lng:u.lon};
  }
  return null;
}

// 2º Nominatim (OpenStreetMap), acotado a Rosario
async function buscarNominatim(calle,altura){
  await esperarOsm();
  const b=ROSARIO_BOX;
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=ar&bounded=1'+
            '&viewbox='+[b.lngMin,b.latMax,b.lngMax,b.latMin].join(',')+
            '&street='+encodeURIComponent((altura?altura+' ':'')+calle)+'&city=Rosario&state=Santa%20Fe';
  const d=await fetchJson(url);
  for(const r of d||[]){
    const lat=parseFloat(r.lat),lng=parseFloat(r.lon);
    if(enRosario(lat,lng)&&coincide(r.display_name||'',calle)) return {lat,lng};
  }
  return null;
}

async function geocodeOne(p){
  const {calle,altura}=partirDireccion(p.dir||'');
  if(!calle) return {lat:null,lng:null,err:'Sin dirección',fuente:'georef',probadas:[]};
  const loc=(p.localidad||'Rosario').trim()||'Rosario';
  const cands=variantesCalle(calle);
  const probadas=cands.map(c=>c+(altura?' '+altura:''));
  let hubo=cands.length===0; // sin variantes útiles no se consultó la red: no es un problema de conexión
  for(const c of cands){
    for(const l of (loc.toLowerCase()==='rosario'?['Rosario']:[loc,'Rosario'])){
      try{
        const r=await buscarGeoref(c,altura,l);hubo=true;
        if(r) return {...r,err:null,fuente:'georef',usada:c+(altura?' '+altura:'')};
      }catch(e){console.warn('georef:',e);}
    }
  }
  for(const c of cands.slice(0,3)){
    try{
      const r=await buscarNominatim(c,altura);hubo=true;
      if(r) return {...r,err:null,fuente:'osm',usada:c+(altura?' '+altura:'')};
    }catch(e){console.warn('nominatim:',e);}
  }
  return {lat:null,lng:null,err:hubo?'No encontrada':'Sin conexión',fuente:'osm',probadas};
}

// Geocodificar todos los puntos pendientes
// Mantiene la pantalla encendida mientras se busca (si se apaga, el celular corta las conexiones)
let _wakeLock=null;
async function mantenerPantalla(on){
  try{
    if(on&&navigator.wakeLock&&!_wakeLock){
      _wakeLock=await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release',()=>{_wakeLock=null;});
    }else if(!on&&_wakeLock){await _wakeLock.release();_wakeLock=null;}
  }catch(e){/* no disponible: se sigue igual */}
}

// Si no hay red, espera hasta 30 s a que vuelva
async function esperarRed(){
  for(let i=0;i<30&&navigator.onLine===false;i++) await _sleep(1000);
  return navigator.onLine!==false;
}

async function geocodificarTodos(silent){
  if(geocodingInProgress){if(!silent)showToast('Ya hay un proceso en curso',true);return;}
  const pendientes=puntos.filter(p=>!p.lat);
  if(!pendientes.length){
    if(!silent)showToast('No hay puntos pendientes ✓');
    return;
  }

  geocodingInProgress=true;
  const prog=document.getElementById('geoProgress');
  const progN=document.getElementById('geoProgressN');
  if(prog){prog.classList.add('show');}
  mantenerPantalla(true);

  let ok=0,fail=0,cortado=false,sinRed=0;
  try{
    for(let i=0;i<pendientes.length;i++){
      const p=pendientes[i];
      if(progN)progN.textContent=(i+1)+'/'+pendientes.length;
      if(p.lat) continue; // ya resuelto (misma dirección repetida)

      if(!(await esperarRed())){cortado=true;break;}
      const res=await geocodeOne(p);

      // Se actualiza el punto y cualquier otro pendiente con la misma dirección
      const mismos=new Set([p,...puntos.filter(pp=>!pp.lat&&pp.dir===p.dir&&pp.localidad===p.localidad)]);
      if(res.lat){
        sinRed=0;
        mismos.forEach(t=>{t.lat=res.lat;t.lng=res.lng;t.geoErr=null;t.geoProbadas=null;t.geoUsada=res.usada||null;});
        ok+=mismos.size;
      }else if(res.err==='Sin conexión'){
        // un corte puntual no frena todo: este punto queda pendiente y se sigue con el siguiente
        mismos.forEach(t=>{t.geoErr='Sin conexión (volvé a tocar Geocodificar pendientes)';});
        if(++sinRed>=3){cortado=true;break;}
      }else{
        sinRed=0;
        mismos.forEach(t=>{t.geoErr=res.err;t.geoProbadas=res.probadas||null;});
        fail+=mismos.size;
      }
      lsSet(SK.puntos,puntos); // el avance se guarda siempre: si se corta, no se pierde lo hecho
      if(mapa&&(i%5===4))renderMapa(true);
      // Nominatim pide máx. 1 consulta por segundo; Georef tolera más
      await _sleep(res.fuente==='osm'?1100:150);
    }
  }catch(e){
    console.error('geocodificar:',e);cortado=true;
  }finally{
    lsSet(SK.puntos,puntos);
    if(prog)prog.classList.remove('show');
    geocodingInProgress=false;
    mantenerPantalla(false);
    if(mapa)renderMapa();
    renderP(); // la lista se entera sola de que ya hay ubicación
  }

  const quedan=puntos.filter(p=>!p.lat).length;
  let msg=`✓ ${ok} geocodificado${ok!==1?'s':''}`;
  if(fail)msg+=` · ${fail} sin ubicar`;
  if(cortado){
    showToast(`Se cortó la conexión (${ok} ubicados, ${quedan} pendientes). Tocá "Geocodificar pendientes" para seguir`,true);
  }else{
    showToast(msg);
  }
}

// Centrar mapa en mi ubicación
function centrarEnMiUbicacion(){
  if(!mapa){showToast('Abrí primero el mapa',true);return;}
  if(!navigator.geolocation||!window.isSecureContext){
    showToast('Este navegador no permite ubicación. Abrí la app en Chrome o Safari (no desde WhatsApp)',true);return;
  }
  showToast('Buscando tu ubicación...');
  const ok=pos=>{
    const ll=[pos.coords.latitude,pos.coords.longitude];
    miUbicLayer.clearLayers();
    L.circle(ll,{radius:pos.coords.accuracy||30,color:'#3b82f6',weight:1,fillOpacity:.12}).addTo(miUbicLayer);
    L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#ef4444',fillOpacity:1}).addTo(miUbicLayer).bindPopup('Tu ubicación');
    mapa.setView(ll,15);
    showToast('Centrado en tu ubicación ✓');
  };
  const fail=err=>{
    const msg={
      1:'Permiso denegado: tocá el candado junto a la dirección → Permisos → Ubicación → Permitir, y recargá',
      2:'No se detecta la posición: activá el GPS / Ubicación del celular',
      3:'Tardó demasiado: probá afuera o con mejor señal'
    }[err&&err.code]||'No se pudo obtener la ubicación';
    showToast(msg,true);
  };
  // 1º intento rápido (red/WiFi); si no, GPS de alta precisión con más tiempo
  navigator.geolocation.getCurrentPosition(ok,e1=>{
    if(e1&&e1.code===1){fail(e1);return;}
    navigator.geolocation.getCurrentPosition(ok,fail,{timeout:20000,enableHighAccuracy:true,maximumAge:0});
  },{timeout:8000,enableHighAccuracy:false,maximumAge:60000});
}

// Centrar para ver todos los puntos
function centrarEnPuntos(){
  if(!mapa)return;
  const conGeo=puntos.filter(p=>p.lat&&p.lng);
  if(!conGeo.length){showToast('No hay puntos en el mapa',true);return;}
  const bounds=conGeo.map(p=>[p.lat,p.lng]);
  if(bounds.length===1)mapa.setView(bounds[0],15);
  else mapa.fitBounds(bounds,{padding:[40,40],maxZoom:15});
}
