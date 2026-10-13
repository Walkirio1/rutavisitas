// Equipos: el verificador se une con una invitación, recibe la ruta que le asigna su jefe y le informa cada visita hecha.
// (El servidor está en /servidor; el PDF y las fotos siguen yendo al Drive de cada uno.)
const SERVIDOR_URL='https://hivemind.tail38381c.ts.net'; // servidor de Verific (rutas por calles y equipos)
const SK_EQ='sube:eq',SK_EQCOLA='sube:eqcola',SK_EQVISTO='sube:eqvisto';
const equipo=()=>lsGet(SK_EQ)||null;

async function eqApi(metodo,ruta,cuerpo,eq){
  const e=eq||equipo();if(!e) throw new Error('Sin equipo');
  const c=new AbortController(),t=setTimeout(()=>c.abort(),10000); // si el servidor no contesta, no se queda esperando
  try{
    const r=await fetch(e.api.replace(/\/$/,'')+ruta,{method:metodo,signal:c.signal,headers:{'Content-Type':'application/json',...(e.token?{Authorization:'Bearer '+e.token}:{})},body:cuerpo?JSON.stringify(cuerpo):undefined});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||'No se pudo conectar con el equipo');
    return j;
  }catch(err){
    if(err&&err.name==='AbortError') throw new Error('El servidor no responde');
    throw err;
  }finally{clearTimeout(t);}
}
// acepta el enlace de invitación completo o solo el código (si ya hay un servidor guardado)
function eqLeerInvitacion(txt){
  txt=String(txt||'').trim();let codigo='',api='';
  try{const u=new URL(txt);codigo=u.searchParams.get('e')||'';api=u.searchParams.get('s')||'';}catch(e){codigo=txt.toUpperCase().replace(/[^A-Z0-9]/g,'');}
  return {codigo,api};
}
async function eqUnirse(codigo,api){
  const nombre=(perfil&&perfil().nombre)||'';
  const foto=typeof dpMiniatura==='function'?await dpMiniatura():'';
  const r=await eqApi('POST','/api/unirse',{codigo,nombre,foto},{api});
  lsSet(SK_EQ,{api,token:r.token,equipo:r.equipo,codigo,nombre:r.nombre});
  showToast('Te uniste a «'+r.equipo+'» ✓');renderPerfilEquipo();
  eqRevisarRuta(true);
  if(!eqPosOn()) setTimeout(()=>confirm2('📍 ¿Querés que tu jefe vea dónde estás y tu recorrido del día? Solo se comparte mientras tenés la app abierta, y lo podés apagar en tu Perfil.',()=>{eqPosCambio(true);renderPerfilEquipo();}),2500);
}
async function eqUnirseDesdeCampo(){
  const {codigo,api}=eqLeerInvitacion(document.getElementById('eqInv').value);
  if(!codigo||!api){showToast('Pegá el enlace de invitación que te mandó tu jefe',true);return;}
  try{await eqUnirse(codigo,api);}catch(e){showToast(e.message,true);}
}
function eqSalir(){
  if(typeof closePerfil==='function') closePerfil();
  confirm2('¿Salir del equipo? Tus visitas ya hechas quedan como están.',()=>{lsDel(SK_EQ);lsDel(SK_EQCOLA);lsDel(SK_EQVISTO);renderPerfilEquipo();showToast('Saliste del equipo');});
}
function renderPerfilEquipo(){
  const box=document.getElementById('perfilEq');if(!box) return;
  const e=equipo(),d=typeof dupla==='function'?dupla():null;
  if(e) box.innerHTML=`<div class="popc-t">Equipo</div><div class="peq-n">👥 ${escapeHtml(e.equipo)}</div><div style="display:grid;gap:6px"><label class="popc-f"><span>📍 Compartir mi posición con el equipo<small>Tu jefe te ve en el mapa mientras tenés la app abierta</small></span><input type="checkbox" id="eqPos" onchange="eqPosCambio(this.checked)"${eqPosOn()?' checked':''}><i class="popc-sw"></i></label><button class="sm sma" onclick="eqTraerRuta()">📥 Traer mi ruta de hoy</button><button class="sm smh" onclick="eqSalir()">Salir del equipo</button></div>`;
  else if(d) box.innerHTML=`<div class="popc-t">Dupla</div><button class="sm sma" style="width:100%" onclick="dpAbrir()">🤝 Mi dupla${d.companero?' con '+escapeHtml(d.companero.nombre):' (esperando compañero)'}</button>`;
  else box.innerHTML=`<div class="popc-t">Trabajo en grupo · Beta</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><button class="sm smh" onclick="eqMostrarInvitacion()">👥 Unirme al equipo</button><button class="sm sma" onclick="dpAbrir()">🤝 Trabajar en dupla</button></div><div id="eqInvBox" style="display:none;margin-top:8px"><input type="text" id="eqInv" placeholder="Pegá la invitación" autocomplete="off" style="width:100%;font-size:13px;text-align:center;border-radius:12px;padding:9px 10px;border:1px solid rgba(120,150,200,.4)"><button class="sm sma" style="margin-top:6px;width:100%" onclick="eqUnirseDesdeCampo()">Unirme</button></div>`;
}
function eqMostrarInvitacion(){
  const b=document.getElementById('eqInvBox');b.style.display=b.style.display==='none'?'':'none';
  if(b.style.display===''){const i=document.getElementById('eqInv');i.focus();
    // si copió la invitación, se pega sola
    try{navigator.clipboard.readText().then(t=>{if(!i.value&&/[?&]e=/.test(t||'')) i.value=t.trim();},()=>{});}catch(e){}}
}
// trae los puntos asignados y los suma a la ruta
async function eqTraerRuta(silencioso){
  try{
    const r=await eqApi('GET','/api/mi-ruta');
    if(!r.puntos.length){if(!silencioso)showToast('Todavía no te asignaron una ruta para hoy');return 0;}
    let n=0;
    r.puntos.forEach(p=>{
      if(!puntos.find(x=>String(x.id)===String(p.id))){puntos.push({id:String(p.id),nombre:p.nombre||'',dir:p.dir||'',localidad:p.localidad||'',tipo:p.tipo||'',obs:'',lat:p.lat||null,lng:p.lng||null,geoErr:null});n++;}
      sel.add(String(p.id));
    });
    lsSet(SK.puntos,puntos);lsSet(SK.sel,[...sel]);renderP();updStats();if(typeof renderMapa==='function'&&mapa) renderMapa();
    lsSet(SK_EQVISTO,r.fecha+':'+r.puntos.map(p=>p.id).join(','));
    showToast('Ruta de hoy: '+r.puntos.length+' puntos ✓');
    if(n&&typeof geocodificarTodos==='function') setTimeout(()=>geocodificarTodos(true),400);
    closePerfil();showTab(0);
    return r.puntos.length;
  }catch(e){if(!silencioso) showToast(e.message,true);return 0;}
}
// al abrir la app: si el jefe asignó una ruta nueva, se ofrece traerla
async function eqRevisarRuta(forzar){
  const e=equipo();if(!e||!navigator.onLine) return;
  try{
    const r=await eqApi('GET','/api/mi-ruta');
    const clave=r.fecha+':'+r.puntos.map(p=>p.id).join(',');
    if(!r.puntos.length||(!forzar&&lsGet(SK_EQVISTO)===clave)) return;
    confirm2('📥 '+r.nombre+', tu jefe te asignó '+r.puntos.length+' punto'+(r.puntos.length>1?'s':'')+' para hoy. ¿Traerlos a tu ruta?',()=>eqTraerRuta(),()=>lsSet(SK_EQVISTO,clave));
  }catch(err){}
}
// nombre y foto de tu perfil, para que el jefe te vea con tu nombre y tu cara (se reenvía si los cambiás)
async function eqPerfilSync(){
  const e=equipo();if(!e||!navigator.onLine) return;
  const nombre=((typeof perfil==='function'&&perfil().nombre)||'').trim(),foto=typeof dpMiniatura==='function'?await dpMiniatura():'';
  const clave=e.token+'|'+nombre+'|'+foto.length+'|'+foto.slice(-40);
  if(lsGet('sube:eqperfil')===clave) return;
  try{await eqApi('POST','/api/miembro-perfil',{nombre,foto});lsSet('sube:eqperfil',clave);}catch(err){}
}
// nombre del compañero de dupla (vacío si trabaja solo): el jefe ve a la dupla como una sola unidad
const eqCompanero=()=>{try{const d=dupla();return (d&&d.companero&&d.companero.nombre)||'';}catch(e){return '';}};
async function eqDuplaAvisar(){
  const e=equipo();if(!e||!navigator.onLine) return;
  const con=eqCompanero(),clave=e.token+'|'+con;
  if(lsGet('sube:eqdupla')===clave) return;
  try{await eqApi('POST','/api/miembro-dupla',{con});lsSet('sube:eqdupla',clave);}catch(err){}
}
// el navegante informa al jefe lo que hizo el verificador (el celular del verificador puede no estar en el equipo)
function eqReportarRemota(id,v){
  const e=equipo();if(!e) return;
  const p=puntos.find(x=>String(x.id)===String(id))||{};
  const item={punto_id:String(id),nombre:p.nombre||(v&&v.nombre)||'',localidad:p.localidad||'',estado:v&&v.estado==='cerrado'?'cerrado':'ok',ts:(v&&v.ts)||Date.now(),lat:p.lat||null,lng:p.lng||null,dist:null,dur:null,irr:!!(v&&v.irr),dupla_con:eqCompanero()};
  const cola=(lsGet(SK_EQCOLA)||[]).filter(x=>x.punto_id!==item.punto_id);cola.push(item);lsSet(SK_EQCOLA,cola);
  eqVaciarCola();
}
// cada visita hecha se informa al panel del jefe (si no hay señal, queda en cola)
function eqReportarVisita(id){
  const e=equipo();if(!e) return;
  const v=visits[id],pl=v&&v.planilla;if(!pl) return;
  const p=puntos.find(x=>String(x.id)===String(id))||{};
  const g=pl.gps;
  const item={punto_id:String(id),nombre:p.nombre||'',localidad:p.localidad||'',estado:pl.cierra?'cerrado':'ok',ts:Date.now(),lat:g?g.lat:(p.lat||null),lng:g?g.lng:(p.lng||null),dist:pl.dist!=null?pl.dist:null,dur:pl.durMin||null,irr:irregsDe(pl).length>0,dupla_con:eqCompanero()};
  const cola=(lsGet(SK_EQCOLA)||[]).filter(x=>x.punto_id!==item.punto_id);cola.push(item);lsSet(SK_EQCOLA,cola);
  eqVaciarCola();
}
let _eqEnvio=false;
async function eqVaciarCola(){
  if(_eqEnvio||!equipo()||!navigator.onLine) return;
  _eqEnvio=true;
  try{
    let cola=lsGet(SK_EQCOLA)||[];
    while(cola.length){
      try{await eqApi('POST','/api/visita',cola[0]);cola=cola.slice(1);lsSet(SK_EQCOLA,cola);}catch(e){break;}
    }
  }finally{_eqEnvio=false;}
}
// invitación por enlace: ?e=CODIGO&s=https://servidor
function eqInvitacionEnUrl(){
  const q=new URLSearchParams(location.search),codigo=q.get('e'),api=q.get('s');
  if(!codigo||!api) return;
  history.replaceState(null,'',location.pathname);
  if(equipo()) return;
  const enApp=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(enApp) return confirm2('👥 Te invitaron a un equipo. ¿Unirte? Tu jefe va a ver cuántas visitas hacés y vas a poder recibir tus rutas.',()=>eqUnirse(codigo.toUpperCase(),api).catch(e=>showToast(e.message,true)));
  // abierto en el navegador: puede unirse acá, o copiar la invitación para pegarla en la app instalada
  const inv=location.origin+location.pathname+'?e='+encodeURIComponent(codigo)+'&s='+encodeURIComponent(api);
  confirm2('👥 Te invitaron a un equipo. Tocá «Sí, confirmar» para unirte desde esta ventana. Si usás LogiMap instalada en el celular, tocá «Cancelar»: te copio la invitación y la pegás en la app (Perfil → Unirme al equipo).',
    ()=>eqUnirse(codigo.toUpperCase(),api).catch(e=>showToast(e.message,true)),
    ()=>{try{navigator.clipboard.writeText(inv).then(()=>showToast('Invitación copiada ✓ Abrí LogiMap → Perfil → Unirme al equipo'),()=>showToast('No pude copiarla: pedile el enlace a tu jefe',true));}catch(e){showToast('No pude copiarla',true);}});
}

// posición en vivo para el mapa del jefe (opcional, apagada por defecto; solo con la app abierta)
const eqPosOn=()=>!!lsGet('sube:eqpos');
// pide la posición: primero con GPS y, si no llega (adentro, sin señal), con la ubicación aproximada
function eqPosPedir(){
  return new Promise(res=>{
    if(!navigator.geolocation) return res({err:'Este celular no permite usar la ubicación'});
    const pedir=(alta,ms,sig)=>navigator.geolocation.getCurrentPosition(
      p=>{_ubi={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),prec:Math.round(p.coords.accuracy||0),ts:Date.now()};res({pos:_ubi});},
      er=>{if(er.code===1) return res({err:'Permiso de ubicación denegado: activalo en los ajustes del navegador (candado → Permisos → Ubicación) y recargá'});
        if(sig) return sig();res({err:'No pude obtener tu ubicación (probá afuera o con el GPS prendido)'});},
      {enableHighAccuracy:alta,timeout:ms,maximumAge:120000});
    pedir(true,12000,()=>pedir(false,15000,null));
  });
}
async function eqPosEnviar(manual){
  if(!equipo()||!eqPosOn()||!navigator.onLine) return;
  if(document.hidden&&!manual) return;
  const r=await eqPosPedir();
  if(!r.pos){if(manual===true) showToast(r.err,true);return;}
  try{await eqApi('POST','/api/posicion',{lat:r.pos.lat,lng:r.pos.lng,prec:r.pos.prec});if(manual===true) showToast('Tu jefe ya te ve en el mapa ✓');}
  catch(e){if(manual===true) showToast('No pude avisarle a tu jefe: '+e.message,true);}
}
async function eqPosCambio(on){
  lsSet('sube:eqpos',on);
  if(on){showToast('Buscando tu ubicación…');eqPosEnviar(true);}
  else{try{await eqApi('POST','/api/posicion',{off:true});}catch(e){}showToast('Ya no compartís tu posición');}
}
