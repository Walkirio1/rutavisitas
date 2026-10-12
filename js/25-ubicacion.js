// Prueba de visita: ubicación y hora en cada visita y en las fotos + reportes (hoy / semana / mes)
let _ubi=null,_tIni=0; // última posición conocida y momento en que se abrió la planilla

function ubiPos(maxMs=7000){
  return new Promise(res=>{
    if(!navigator.geolocation){res(null);return;}
    let listo=false;const fin=p=>{if(!listo){listo=true;res(p);}};
    const t=setTimeout(()=>fin(_ubi&&Date.now()-_ubi.ts<10*60000?_ubi:null),maxMs);
    navigator.geolocation.getCurrentPosition(p=>{
      _ubi={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),prec:Math.round(p.coords.accuracy||0),ts:Date.now()};
      clearTimeout(t);fin(_ubi);
    },()=>{clearTimeout(t);fin(null);},{enableHighAccuracy:true,timeout:maxMs,maximumAge:60000});
  });
}
function distM(a,b,c,d){
  const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
  const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h)));
}
const fmtDist=m=>m<1000?m+' m':(m/1000).toFixed(1).replace('.',',')+' km';
// qué tan cerca del local se registró la visita
function ubiEstado(gps,punto){
  if(!gps) return {clase:'no',txt:'📍 Sin ubicación registrada'};
  if(!punto||!punto.lat||!punto.lng) return {clase:'ok',txt:'📍 Ubicación registrada'};
  const d=distM(gps.lat,gps.lng,punto.lat,punto.lng);
  if(d<=150) return {clase:'ok',txt:'✅ En el local · a '+fmtDist(d),d};
  if(d<=500) return {clase:'cerca',txt:'📍 Cerca del local · a '+fmtDist(d),d};
  return {clase:'lejos',txt:'⚠️ Lejos del local · a '+fmtDist(d),d};
}

// al abrir la planilla de una visita: se empieza a tomar la ubicación y a contar el tiempo
function ubiAlAbrir(punto,pl){
  _tIni=Date.now();
  const b=document.getElementById('plUbi');if(!b) return;
  if(pl&&pl.gps){const e=ubiEstado(pl.gps,punto);b.className='plubi '+e.clase;b.textContent=e.txt;return;}
  b.className='plubi';b.textContent='📍 Buscando tu ubicación…';
  ubiPos().then(g=>{if(curId!==(punto&&punto.id)) return;const e=ubiEstado(g,punto);b.className='plubi '+e.clase;b.textContent=e.txt;});
}
// datos que se guardan con la visita
function ubiParaVisita(punto,previa){
  const gps=previa&&previa.gps?previa.gps:(_ubi&&Date.now()-_ubi.ts<30*60000?{..._ubi}:null);
  const o={gps};
  if(gps&&punto&&punto.lat&&punto.lng) o.dist=distM(gps.lat,gps.lng,punto.lat,punto.lng);
  o.durMin=previa&&previa.durMin!=null?previa.durMin:(_tIni?Math.max(1,Math.round((Date.now()-_tIni)/60000)):null);
  return o;
}

// sello en la foto: fecha, hora y coordenadas
async function sellarFoto(dataUrl,punto){
  try{
    const g=await ubiPos(4000);
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=dataUrl;});
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const x=c.getContext('2d');x.drawImage(img,0,0);
    const f=Math.max(12,Math.round(c.width/42)),l1=hoy()+' '+ahora()+(punto&&punto.nombre?' · '+punto.nombre:''),
      l2=g?'📍 '+g.lat+', '+g.lng+(g.prec?' (±'+g.prec+' m)':''):'📍 sin ubicación';
    const h=f*2.9;
    x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,c.height-h,c.width,h);
    x.fillStyle='#fff';x.font='600 '+f+'px system-ui,sans-serif';x.textBaseline='top';
    x.fillText(l1.slice(0,70),f*.6,c.height-h+f*.45);
    x.font=f+'px system-ui,sans-serif';x.fillText(l2,f*.6,c.height-h+f*1.6);
    return c.toDataURL('image/jpeg',.8);
  }catch(e){console.warn('sello de la foto:',e);return dataUrl;}
}

// ── Reportes
let _repPer='hoy';
function repFecha(s){const m=String(s||'').match(/(\d+)\/(\d+)\/(\d+)/);return m?new Date(+m[3],+m[2]-1,+m[1]):null;}
function repRegistros(){
  const out=[];
  Object.entries(visits).forEach(([id,v])=>{if(v&&v.done&&v.planilla) out.push({id,p:puntos.find(x=>x.id===id)||{},pl:v.planilla});});
  historial.forEach(h=>Object.entries(h.visits||{}).forEach(([id,v])=>{if(v&&v.done&&v.planilla) out.push({id,p:(h.puntos||[]).find(x=>x.id===id)||{},pl:v.planilla});}));
  return out;
}
function repDatos(per){
  const dias={hoy:1,semana:7,mes:30}[per]||1,hasta=new Date();hasta.setHours(23,59,59,999);
  const desde=new Date();desde.setHours(0,0,0,0);desde.setDate(desde.getDate()-(dias-1));
  const r=repRegistros().filter(x=>{const d=repFecha(x.pl.fecha);return d&&d>=desde&&d<=hasta;});
  const cerr=r.filter(x=>x.pl.cierra).length,irr=r.filter(x=>irregsDe(x.pl).length).length;
  const conGps=r.filter(x=>x.pl.gps).length,enLocal=r.filter(x=>x.pl.dist!=null&&x.pl.dist<=150).length;
  const durs=r.map(x=>x.pl.durMin).filter(n=>n>0),prom=durs.length?Math.round(durs.reduce((a,b)=>a+b,0)/durs.length):null;
  const loc={};r.forEach(x=>{const k=x.p.localidad||'Sin localidad';loc[k]=(loc[k]||0)+1;});
  return {n:r.length,ok:r.length-cerr,cerr,irr,conGps,enLocal,prom,loc:Object.entries(loc).sort((a,b)=>b[1]-a[1]).slice(0,5),dias};
}
function repTexto(per){
  const d=repDatos(per),tit={hoy:'hoy',semana:'últimos 7 días',mes:'últimos 30 días'}[per];
  return `📋 Resumen (${tit})\n✅ Visitas hechas: ${d.n}\n🔴 Cerrados / no atendidos: ${d.cerr}\n⚠️ Con irregularidades: ${d.irr}\n📍 Con ubicación: ${d.conGps}${d.n?` (${Math.round(d.conGps/d.n*100)}%)`:''}${d.prom?`\n⏱️ Tiempo promedio por visita: ${d.prom} min`:''}${d.loc.length?'\n🏘️ '+d.loc.map(([k,n])=>k+' '+n).join(' · '):''}`;
}
function renderReporte(){
  const box=document.getElementById('hReporte');if(!box) return;
  const d=repDatos(_repPer);
  box.innerHTML=`<div class="rep">
    <div class="rep-per">${[['hoy','Hoy'],['semana','7 días'],['mes','30 días']].map(([k,n])=>`<button class="${_repPer===k?'on':''}" onclick="_repPer='${k}';renderReporte()">${n}</button>`).join('')}</div>
    <div class="rep-g">
      <div><b>${d.n}</b><span>visitas hechas</span></div>
      <div><b>${d.cerr}</b><span>cerrados</span></div>
      <div><b>${d.irr}</b><span>con irregularidades</span></div>
      <div><b>${d.n?Math.round(d.enLocal/d.n*100)+'%':'–'}</b><span>verificadas en el local</span></div>
    </div>
    ${d.prom?`<div class="rep-l">⏱️ ${d.prom} min por visita en promedio</div>`:''}
    ${d.loc.length?`<div class="rep-l">🏘️ ${d.loc.map(([k,n])=>escapeHtml(k)+' <b>'+n+'</b>').join(' · ')}</div>`:''}
    ${d.n?`<button class="sm sma" style="margin-top:8px" onclick="repCompartir()">📤 Compartir resumen</button>`:'<div class="rep-l">Todavía no hay visitas en este período.</div>'}
  </div>`;
}
async function repCompartir(){
  const t=repTexto(_repPer);
  try{if(navigator.share){await navigator.share({title:'Resumen de visitas',text:t});return;}}catch(e){if(e&&e.name==='AbortError') return;}
  try{await navigator.clipboard.writeText(t);showToast('Resumen copiado ✓');}catch(e){showToast('No se pudo compartir',true);}
}
