// Tema claro/oscuro y navegación (siguiente punto, ruta optimizada)
// ── TEMA: claro / oscuro / automático (sigue al celular)
const TEMAS={auto:'Automático (como el celular)',claro:'Claro',oscuro:'Oscuro'};
function temaPref(){const t=lsGet('sube:tema');return TEMAS[t]?t:'claro';}
function aplicarTema(){
  const t=temaPref();
  const oscuro=t==='oscuro'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme',oscuro?'dark':'light');
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',oscuro?'#070d1b':'#e9f0fb');
  const e=document.getElementById('temaActual');if(e)e.textContent='Usando: '+TEMAS[t]+' (tocá para cambiar)';
  if(typeof mapa!=='undefined'&&mapa) setTimeout(()=>mapa.invalidateSize(),100);
}
function elegirTema(){
  mostrarDlgEnvio('¿Qué tema querés? El claro se lee mejor al sol; el oscuro es más cómodo de noche.',
    Object.keys(TEMAS).map(k=>({txt:(temaPref()===k?'✓ ':'')+TEMAS[k],cls:temaPref()===k?'ba':'bd',fn:()=>{lsSet('sube:tema',k);aplicarTema();}})).concat([{txt:'Cancelar',cls:'bd'}]));
}
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */

// ── NAVEGACIÓN: "Siguiente punto" y ruta completa. Se abre la app de mapas del celular; si el celular
// está conectado a Apple CarPlay o Android Auto, la navegación aparece también en la pantalla del auto.
const NAV_APPS={
  google:{nombre:'Google Maps',url:(la,lo)=>`https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=driving`},
  apple:{nombre:'Apple Maps',url:(la,lo)=>`https://maps.apple.com/?daddr=${la},${lo}&dirflg=d`},
  waze:{nombre:'Waze',url:(la,lo)=>`https://waze.com/ul?ll=${la},${lo}&navigate=yes`},
};
function appNav(){const a=lsGet('sube:nav');return NAV_APPS[a]?a:'google';}
function urlNavegar(la,lo){return NAV_APPS[appNav()].url(la,lo);}
function mostrarAppNav(){const e=document.getElementById('navActual');if(e)e.textContent='Usando: '+NAV_APPS[appNav()].nombre+' (tocá para cambiar)';}
function elegirAppNav(){
  mostrarDlgEnvio('¿Con qué app querés navegar? Funciona también en la pantalla del auto (Apple CarPlay / Android Auto) si el celular está conectado.',
    Object.keys(NAV_APPS).map(k=>({txt:(appNav()===k?'✓ ':'')+NAV_APPS[k].nombre,cls:appNav()===k?'ba':'bd',fn:()=>{lsSet('sube:nav',k);mostrarAppNav();showToast('Navegación con '+NAV_APPS[k].nombre);}})).concat([{txt:'Cancelar',cls:'bd'}]));
}
/* (se ejecuta al final, en js/99-arranque.js) *//* (se ejecuta al final, en js/99-arranque.js) */

function distKm(a,b,c,d){
  const R=6371,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
  const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
let _ultimaUbic=null;
function ubicacionActual(){
  return new Promise(res=>{
    if(!navigator.geolocation){res(_ultimaUbic);return;}
    const ok=pos=>{_ultimaUbic={lat:pos.coords.latitude,lng:pos.coords.longitude};res(_ultimaUbic);};
    navigator.geolocation.getCurrentPosition(ok,()=>navigator.geolocation.getCurrentPosition(ok,()=>res(_ultimaUbic),{timeout:15000,enableHighAccuracy:true}),{timeout:7000,enableHighAccuracy:false,maximumAge:60000});
  });
}
// Puntos de la ruta que faltan visitar (azules) y tienen ubicación
const faltanVisitar=()=>puntos.filter(p=>p.lat&&sel.has(p.id)&&!estadoVisita(p.id));

let _saltados=new Set();
async function siguientePunto(){
  const faltan=faltanVisitar();
  if(!faltan.length){showToast(sel.size?'¡Ruta completa! No quedan puntos por visitar ✓':'Marcá puntos en azul en el mapa primero',true);return;}
  showToast('Buscando el más cercano...');
  const yo=await ubicacionActual();
  let cand=faltan.filter(p=>!_saltados.has(p.id));
  if(!cand.length){_saltados=new Set();cand=faltan;}
  let p,msg;
  if(yo){
    cand.sort((x,y)=>distKm(yo.lat,yo.lng,x.lat,x.lng)-distKm(yo.lat,yo.lng,y.lat,y.lng));
    p=cand[0];
    const km=distKm(yo.lat,yo.lng,p.lat,p.lng);
    msg=`➡️ ${p.nombre||p.dir}\n📍 ${p.dir}${p.localidad?' · '+p.localidad:''}\n🚗 a ${km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km'} (en línea recta) · quedan ${faltan.length}`;
  }else{
    p=cand[0];
    msg=`➡️ ${p.nombre||p.dir}\n📍 ${p.dir}${p.localidad?' · '+p.localidad:''}\nNo pude ver tu ubicación: te muestro el primero de tu ruta. Quedan ${faltan.length}.`;
  }
  if(mapa) mapa.setView([p.lat,p.lng],16);
  mostrarDlgEnvio(msg,[
    {txt:'🧭 Navegar con '+NAV_APPS[appNav()].nombre,cls:'ba',fn:()=>{window.open(urlNavegar(p.lat,p.lng),'_blank');}},
    ...(cand.length>1?[{txt:'Otro punto',cls:'bd',fn:()=>{_saltados.add(p.id);siguientePunto();}}]:[]),
    {txt:'Cerrar',cls:'bd'}
  ]);
}

// Ruta completa en Google Maps (es la única app que admite varias paradas): se ordena por cercanía
// Ordena las paradas: vecino más cercano + mejora 2-opt (camino abierto desde "start")
function optimizarOrden(start,pts){
  const d=(a,b)=>distKm(a.lat,a.lng,b.lat,b.lng);
  const resto=pts.slice(),ruta=[];let pos=start;
  while(resto.length){let k=0,m=Infinity;resto.forEach((q,i)=>{const x=d(pos,q);if(x<m){m=x;k=i;}});const n=resto.splice(k,1)[0];ruta.push(n);pos=n;}
  const P=[start,...ruta];let mejora=true,vueltas=0;
  while(mejora&&vueltas++<30){
    mejora=false;
    for(let i=1;i<P.length-1;i++)for(let j=i+1;j<P.length;j++){
      const a=P[i-1],b=P[i],c=P[j],e=P[j+1];
      const antes=d(a,b)+(e?d(c,e):0),desp=d(a,c)+(e?d(b,e):0);
      if(desp+1e-9<antes){P.splice(i,j-i+1,...P.slice(i,j+1).reverse());mejora=true;}
    }
  }
  return P.slice(1);
}
// estimación: distancia en línea recta x1,35 (calles), 25 km/h promedio en ciudad, 8 min por visita
function estimarRuta(start,orden){
  let km=0,pos=start;orden.forEach(q=>{km+=distKm(pos.lat,pos.lng,q.lat,q.lng);pos=q;});
  km*=1.35;const min=Math.round(km/25*60+orden.length*8);
  return {km,min};
}
function fmtMin(m){return m>=60?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min':m+' min';}
async function rutaCompleta(){
  const faltan=faltanVisitar();
  if(!faltan.length){showToast(sel.size?'¡Ruta completa! No quedan puntos por visitar ✓':'Marcá puntos en azul en el mapa primero',true);return;}
  showToast('Optimizando la ruta...');
  const yo=await ubicacionActual();
  const start=yo?{lat:yo.lat,lng:yo.lng}:{lat:faltan[0].lat,lng:faltan[0].lng};
  const todo=optimizarOrden(start,faltan);
  const est=estimarRuta(start,todo);
  // el orden queda guardado: la lista de Visitas se muestra en este orden
  const hechos=puntos.filter(p=>sel.has(p.id)&&!faltan.includes(p)).map(p=>p.id);
  ordenRuta=[...hechos,...todo.map(p=>p.id)];lsSet(SK_ORDEN,ordenRuta);renderV();
  const orden=todo.slice(0,10); // Google Maps admite hasta 10 paradas por enlace
  const dest=orden[orden.length-1],via=orden.slice(0,-1).map(p=>p.lat+','+p.lng).join('|');
  const url='https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+dest.lat+','+dest.lng+(via?'&waypoints='+encodeURIComponent(via):'');
  const lista=todo.slice(0,15).map((p,i)=>`${i+1}. ${p.nombre||p.dir}`).join('\n')+(todo.length>15?`\n… y ${todo.length-15} más`:'');
  mostrarDlgEnvio(`🗺️ Ruta optimizada: ${todo.length} parada${todo.length>1?'s':''}\n≈ ${est.km.toFixed(1)} km · ≈ ${fmtMin(est.min)} (manejo + 8 min por visita)\n\n${lista}${todo.length>orden.length?`\n\nGoogle Maps lleva ${orden.length} paradas por vez; cuando termines tocá "Ruta completa" de nuevo.`:''}`,[
    {txt:'🧭 Abrir en Google Maps',cls:'ba',fn:()=>{window.open(url,'_blank');}},
    {txt:'Cerrar',cls:'bd'}
  ]);
}

function toggleModoMapa(){
  modoMarcar=!modoMarcar;
  showToast(modoMarcar?'Tocá un punto para marcarlo en azul':'Tocá un punto para ver su información');
  renderMapa(true);
}

// Tocar un pin: lo marca (azul) o lo desmarca. Los ya visitados (rojo) no se tocan.
function marcarDesdeMapa(id){
  const p=puntos.find(x=>x.id===id);
  if(!p) return;
  if(visits[id]&&visits[id].done){
    showToast((estadoVisita(id)==='ok'?'✓ Ya visitado: ':'✕ Cerrado / no visitado: ')+(p.nombre||p.dir));
    return;
  }
  const agregando=!sel.has(id);
  if(agregando) sel.add(id); else sel.delete(id);
  lsSet(SK.sel,[...sel]);
  renderP();updStats();
  renderMapa(true);
  showToast((agregando?'🔵 Voy: ':'Quitado: ')+(p.nombre||p.dir)+' · '+sel.size+' en ruta');
  triggerAutosave();
}

function toggleSelFromMap(id){
  toggleSel(id);
  renderMapa(true); // refresca colores de pin sin mover el mapa
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
