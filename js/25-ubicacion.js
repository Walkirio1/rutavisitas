// Prueba de visita: ubicación y hora en cada visita y en las fotos + reportes (hoy / semana / mes)
const ubiOn=()=>!!lsGet('sube:ubi'),selloOn=()=>!!lsGet('sube:sello'); // opciones del usuario (apagadas por defecto)
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
  if(!gps) return {clase:'no',txt:'Sin ubicación registrada'};
  if(!punto||!punto.lat||!punto.lng) return {clase:'ok',txt:'Ubicación registrada'};
  const d=distM(gps.lat,gps.lng,punto.lat,punto.lng);
  if(d<=150) return {clase:'ok',txt:'✅ En el local · a '+fmtDist(d),d};
  if(d<=500) return {clase:'cerca',txt:'Cerca del local · a '+fmtDist(d),d};
  return {clase:'lejos',txt:'⚠️ Lejos del local · a '+fmtDist(d),d};
}

// al abrir la planilla de una visita: se empieza a tomar la ubicación y a contar el tiempo
function ubiAlAbrir(punto,pl){
  _tIni=Date.now();
  const b=document.getElementById('plUbi');if(!b) return;
  if(!ubiOn()){b.className='plubi';b.textContent='';return;}
  if(pl&&pl.gps){const e=ubiEstado(pl.gps,punto);b.className='plubi '+e.clase;b.textContent=e.txt;return;}
  b.className='plubi';b.textContent='Buscando tu ubicación…';
  ubiPos().then(g=>{if(curId!==(punto&&punto.id)) return;const e=ubiEstado(g,punto);b.className='plubi '+e.clase;b.textContent=e.txt;});
}
// datos que se guardan con la visita
function ubiParaVisita(punto,previa){
  const gps=previa&&previa.gps?previa.gps:(!ubiOn()?null:_ubi&&Date.now()-_ubi.ts<30*60000?{..._ubi}:null);
  const o={gps};
  if(gps&&punto&&punto.lat&&punto.lng) o.dist=distM(gps.lat,gps.lng,punto.lat,punto.lng);
  o.durMin=previa&&previa.durMin!=null?previa.durMin:(_tIni?Math.max(1,Math.round((Date.now()-_tIni)/60000)):null);
  return o;
}

// sello en la foto: fecha, hora y coordenadas
async function sellarFoto(dataUrl,punto){
  if(!selloOn()) return dataUrl;
  try{
    const g=ubiOn()?await ubiPos(4000):null;
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=dataUrl;});
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const x=c.getContext('2d');x.drawImage(img,0,0);
    const f=Math.max(12,Math.round(c.width/42)),l1=hoy()+' '+ahora()+(punto&&punto.nombre?' · '+punto.nombre:''),
      l2=g?''+g.lat+', '+g.lng+(g.prec?' (±'+g.prec+' m)':''):'';
    const h=l2?f*2.9:f*1.9;
    x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,c.height-h,c.width,h);
    x.fillStyle='#fff';x.font='600 '+f+'px system-ui,sans-serif';x.textBaseline='top';
    x.fillText(l1.slice(0,70),f*.6,c.height-h+f*.45);
    if(l2){x.font=f+'px system-ui,sans-serif';x.fillText(l2,f*.6,c.height-h+f*1.6);}
    return c.toDataURL('image/jpeg',.8);
  }catch(e){console.warn('sello de la foto:',e);return dataUrl;}
}

// ── Reportes
let _repPer='hoy';
function repFecha(s){const m=String(s||'').match(/(\d+)\/(\d+)\/(\d+)/);return m?new Date(+m[3],+m[2]-1,+m[1]):null;}
function repRegistros(){
  const out=[];
  Object.entries(visits).forEach(([id,v])=>{if(v&&v.done&&!v.noVisitado) out.push({id,p:puntos.find(x=>x.id===id)||{},pl:v.planilla||{fecha:v.fecha||hoy()}});}); // también las marcadas hechas sin abrir la planilla
  historial.forEach(h=>Object.entries(h.visits||{}).forEach(([id,v])=>{if(v&&v.done&&!v.noVisitado) out.push({id,p:(h.puntos||[]).find(x=>x.id===id)||{},pl:v.planilla||{fecha:v.fecha||h.fecha}});}));
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
  return `📋 Resumen (${tit})\n✅ Visitas hechas: ${d.n}\n🔴 Cerrados / no atendidos: ${d.cerr}\n⚠️ Con irregularidades: ${d.irr}${d.conGps?`\n📍 Con ubicación: ${d.conGps} (${Math.round(d.enLocal/d.conGps*100)}% en el local)`:''}${d.prom?`\n⏱️ Tiempo promedio por visita: ${d.prom} min`:''}${d.loc.length?'\n🏘️ '+d.loc.map(([k,n])=>k+' '+n).join(' · '):''}`;
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
      <div><b>${d.conGps?Math.round(d.enLocal/d.conGps*100)+'%':'–'}</b><span>verificadas en el local</span></div>
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

// opciones (en el perfil)
async function optUbiCambio(on){
  lsSet('sube:ubi',on);
  if(on){showToast('Activado: te va a pedir permiso de ubicación');const g=await ubiPos(9000);if(!g) showToast('No se pudo tomar la ubicación: revisá el permiso del navegador',true);}
}
function optSelloCambio(on){lsSet('sube:sello',on);showToast(on?'Las fotos nuevas llevan fecha y hora':'Sello desactivado');}

// ── Rubro / tipo de negocio del punto (también lo recupera del Excel ya guardado sin reimportar)
const _RX_RUBRO=/^(rubro|actividad|subrubro|giro|categor[ií]a|ramo|clase|tipo\s*(de\s*)?(negocio|comercio|local|establecimiento))$/i;
let _rubExcelTs=null,_rubExcelMap=null;
function rubroDesdeExcel(id){
  if(id==null) return '';
  const ex=lsGet('sube:excel');
  if(!ex||!Array.isArray(ex.aoa)||ex.aoa.length<2) return '';
  if(_rubExcelTs!==ex.ts||!_rubExcelMap){
    _rubExcelTs=ex.ts;_rubExcelMap=new Map();
    const cab=(ex.aoa[0]||[]).map(h=>String(h==null?'':h).trim());
    let cId=cab.findIndex(h=>/^(ubicaci[oó]n\s*id|id)$/i.test(h));if(cId<0) cId=0;
    const cRub=cab.findIndex(h=>_RX_RUBRO.test(h));
    if(cRub>=0){
      for(let i=1;i<ex.aoa.length;i++){
        const r=ex.aoa[i]||[];const k=String(r[cId]==null?'':r[cId]).trim();const v=String(r[cRub]==null?'':r[cRub]).trim();
        if(k&&v) _rubExcelMap.set(k,v);
      }
    }
  }
  return _rubExcelMap.get(String(id).trim())||'';
}
function rubroSoloDePunto(p){return String((p&&p.rubro)||rubroDesdeExcel(p&&p.id)||(p&&p.tipo)||'').trim();}
function rubroDePunto(p){
  const r=String((p&&p.rubro)||rubroDesdeExcel(p&&p.id)||'').trim();
  const t=String((p&&p.tipo)||'').trim();
  if(r&&t&&r.toLowerCase()!==t.toLowerCase()) return r+' · '+t;
  return r||t;
}
function textoParada(p,titulo){
  const rub=rubroDePunto(p);
  const lineas=[titulo,'',(p&& (p.nombre||p.dir))||''];
  if(rub) lineas.push('🏪 '+rub);
  lineas.push('📍 '+((p&&p.dir)||'')+(p&&p.localidad?' · '+p.localidad:''));
  if(p&&p.obs) lineas.push('📝 '+p.obs);
  return lineas.join('\n');
}

// ── Aviso automático al acercarse (≤160 m) a un punto de la ruta
const PROX_M=160,PROX_SALIR_M=300,PROX_COOLDOWN_MS=5*60000;
const proxOn=()=>lsGet('sube:prox')!==false; // activado por defecto
let _proxWatch=null,_proxEstado='off',_proxCercano=null,_proxUltimoFixTs=0,_proxGuard=null,_proxReintento=null,_proxAudio=null;
const _proxAvisados=new Map();

function _proxDesbloquearAudio(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC) return;
    if(!_proxAudio) _proxAudio=new AC();
    if(_proxAudio.state==='suspended') _proxAudio.resume().catch(()=>{});
  }catch(e){}
}
if(typeof document!=='undefined'&&document.addEventListener){
  ['pointerdown','click','touchstart'].forEach(ev=>document.addEventListener(ev,_proxDesbloquearAudio,{once:true,passive:true}));
}
function proxSonar(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC) return;
    if(!_proxAudio) _proxAudio=new AC();
    if(_proxAudio.state==='suspended') _proxAudio.resume().catch(()=>{});
    const t0=_proxAudio.currentTime;
    [[880,0,0.14],[1175,0.16,0.14]].forEach(([freq,off,dur])=>{
      const osc=_proxAudio.createOscillator(),gain=_proxAudio.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,t0+off);
      gain.gain.setValueAtTime(0.001,t0+off);
      gain.gain.exponentialRampToValueAtTime(0.22,t0+off+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001,t0+off+dur);
      osc.connect(gain);gain.connect(_proxAudio.destination);
      osc.start(t0+off);osc.stop(t0+off+dur+0.02);
    });
  }catch(e){}
}

function proxMarcarVisto(id){_proxAvisados.set(String(id),{ts:Date.now(),lejos:false});}
function proxFueAvisadoReciente(id){
  const st=_proxAvisados.get(String(id));
  return !!st&&(!st.lejos||(Date.now()-st.ts)<PROX_COOLDOWN_MS);
}

function renderProxBar(){
  const bar=document.getElementById('proxBar');if(!bar) return;
  const faltan=typeof faltanVisitar==='function'?faltanVisitar():[];
  if(!proxOn()||!faltan.length){bar.style.display='none';return;}
  bar.style.display='flex';
  let bg='var(--bg-2)',bd='var(--line-2)',col='var(--text)',tx='';
  if(_proxEstado==='denegado'){
    bg='rgba(245,158,11,.14)';bd='rgba(245,158,11,.5)';col='#b45309';
    tx='📡 Radar sin permiso GPS · Tocá acá para activar';
  }else if(_proxEstado==='activo'&&_proxCercano){
    const {p,d}=_proxCercano;
    const acc=typeof dpEsNavegante==='function'&&dpEsNavegante()?'tocá para avisar':'tocá para abrir';
    tx='📡 Próximo: '+(p.nombre||p.dir)+' · a '+fmtDist(d)+' · '+acc;
    if(d<=PROX_M){bg='rgba(16,185,129,.15)';bd='rgba(16,185,129,.55)';col='#047857';}
    else if(d<=350){bg='rgba(59,130,246,.12)';bd='rgba(59,130,246,.45)';col='#1d4ed8';}
  }else{
    tx='📡 Radar buscando GPS… (tocá para activar)';
  }
  bar.style.background=bg;bar.style.borderColor=bd;bar.style.color=col;
  bar.textContent=tx;
}

function proxDetener(){
  if(_proxWatch!==null&&navigator.geolocation){try{navigator.geolocation.clearWatch(_proxWatch);}catch(e){}}
  _proxWatch=null;
  if(_proxGuard){clearInterval(_proxGuard);_proxGuard=null;}
  if(_proxReintento){clearTimeout(_proxReintento);_proxReintento=null;}
  if(_proxEstado!=='denegado') _proxEstado='off';
  _proxCercano=null;
  renderProxBar();
}
function proxReiniciar(){_proxAvisados.clear();_proxCercano=null;_proxUltimoFixTs=0;proxActualizar();renderProxBar();}

function proxForzarPedido(){
  _proxDesbloquearAudio();
  if(!navigator.geolocation||!window.isSecureContext){showToast('Este navegador no permite ubicación',true);return;}
  _proxEstado='buscando';renderProxBar();
  navigator.geolocation.getCurrentPosition(
    pos=>{proxEvaluar(pos.coords.latitude,pos.coords.longitude,pos.coords.accuracy);proxActualizar(true);},
    err=>{
      if(err&&err.code===1){_proxEstado='denegado';proxDetener();showToast('Activá el permiso de Ubicación para el radar automático',true);}
      else{_proxEstado='error';renderProxBar();proxActualizar(true);}
    },
    {enableHighAccuracy:true,maximumAge:0,timeout:12000}
  );
}
function proxBarClick(){
  _proxDesbloquearAudio();
  if(_proxEstado!=='activo'||!_proxCercano){proxForzarPedido();return;}
  if(typeof dpEsNavegante==='function'&&dpEsNavegante()) dpAvisarParada(_proxCercano.p.id);
  else openPl(_proxCercano.p.id);
}

function proxEvaluar(lat,lng,acc){
  if(acc&&acc>250) return;
  _proxUltimoFixTs=Date.now();
  _proxEstado='activo';
  _ubi={lat:+lat.toFixed(6),lng:+lng.toFixed(6),prec:Math.round(acc||0),ts:Date.now()};
  if(typeof _ultimaUbic!=='undefined') _ultimaUbic={lat,lng};
  const faltan=typeof faltanVisitar==='function'?faltanVisitar():[];
  if(!faltan.length){proxDetener();return;}
  for(const [id,st] of _proxAvisados.entries()){
    const p=faltan.find(x=>String(x.id)===id);
    if(p&&distM(lat,lng,p.lat,p.lng)>PROX_SALIR_M) st.lejos=true;
  }
  let masCerca=null,mejor=null;
  for(const p of faltan){
    const d=distM(lat,lng,p.lat,p.lng);
    if(!masCerca||d<masCerca.d) masCerca={p,d,acc};
    if(!proxFueAvisadoReciente(p.id)&&d<=PROX_M&&(!mejor||d<mejor.d)) mejor={p,d};
  }
  _proxCercano=masCerca;
  renderProxBar();
  if(!mejor) return;
  if(typeof dpEsNavegante==='function'&&dpEsNavegante()){
    proxMarcarVisto(mejor.p.id);
    proxSonar();
    try{if(navigator.vibrate)navigator.vibrate([180,80,180]);}catch(e){}
    if(typeof dpAvisarParadaAuto==='function') dpAvisarParadaAuto(mejor.p.id,mejor.p.nombre||mejor.p.dir,mejor.d,rubroDePunto(mejor.p));
    return;
  }
  const abierto=document.querySelector('.ov.show, .dlg.show, .firma-full.show');
  if(abierto){
    if(document.getElementById('ov').classList.contains('show')&&curId===mejor.p.id) proxMarcarVisto(mejor.p.id);
    return;
  }
  proxMarcarVisto(mejor.p.id);
  proxSonar();
  try{if(navigator.vibrate)navigator.vibrate([180,80,180]);}catch(e){}
  mostrarDlgEnvio(
    textoParada(mejor.p,'📍 Estás llegando (a '+fmtDist(mejor.d)+')'),
    [{txt:'Abrir la planilla',cls:'ba',fn:()=>openPl(mejor.p.id)},{txt:'Después',cls:'bd'}]
  );
}

function proxActualizar(forzar){
  if(!proxOn()||!navigator.geolocation||!window.isSecureContext||!(typeof faltanVisitar==='function'&&faltanVisitar().length)){
    proxDetener();return;
  }
  if(forzar&&_proxWatch!==null){try{navigator.geolocation.clearWatch(_proxWatch);}catch(e){}_proxWatch=null;}
  if(_proxWatch===null){
    if(_proxEstado==='off'||_proxEstado==='error'||forzar) _proxEstado='buscando';
    renderProxBar();
    _proxWatch=navigator.geolocation.watchPosition(
      pos=>proxEvaluar(pos.coords.latitude,pos.coords.longitude,pos.coords.accuracy),
      err=>{
        if(err&&err.code===1){_proxEstado='denegado';proxDetener();return;}
        if(err&&(err.code===2||err.code===3)){
          if(_proxWatch!==null&&navigator.geolocation){try{navigator.geolocation.clearWatch(_proxWatch);}catch(e){}}
          _proxWatch=null;_proxEstado='buscando';renderProxBar();
          if(!_proxReintento) _proxReintento=setTimeout(()=>{_proxReintento=null;proxActualizar();},3000);
        }
      },
      {enableHighAccuracy:true,maximumAge:2000,timeout:10000}
    );
  }else{
    renderProxBar();
  }
  if(!_proxGuard){
    _proxGuard=setInterval(()=>{
      if(document.hidden||!proxOn()||_proxEstado==='denegado'||!(typeof faltanVisitar==='function'&&faltanVisitar().length)) return;
      if(_proxWatch===null) proxActualizar();
      if(Date.now()-_proxUltimoFixTs>7000&&navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
          pos=>proxEvaluar(pos.coords.latitude,pos.coords.longitude,pos.coords.accuracy),
          ()=>{},
          {enableHighAccuracy:false,maximumAge:4000,timeout:4000}
        );
      }
    },5000);
  }
}

function optProxCambio(on){
  lsSet('sube:prox',on);
  if(on&&_proxEstado==='denegado') _proxEstado='buscando';
  proxActualizar(on);
  renderProxBar();
  showToast(on?'Aviso automático al llegar activado (160 m) ✓':'Aviso automático al llegar desactivado');
}
