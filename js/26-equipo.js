// Equipos: el verificador se une con una invitación, recibe la ruta que le asigna su jefe y le informa cada visita hecha.
// (El servidor está en /servidor; el PDF y las fotos siguen yendo al Drive de cada uno.)
const SERVIDOR_URL='https://hivemind.tail38381c.ts.net'; // servidor de Verific (rutas por calles y equipos)
const SK_EQ='sube:eq',SK_EQCOLA='sube:eqcola',SK_EQVISTO='sube:eqvisto';
const equipo=()=>lsGet(SK_EQ)||null;

async function eqApi(metodo,ruta,cuerpo,eq){
  const e=eq||equipo();if(!e) throw new Error('Sin equipo');
  const r=await fetch(e.api.replace(/\/$/,'')+ruta,{method:metodo,headers:{'Content-Type':'application/json',...(e.token?{Authorization:'Bearer '+e.token}:{})},body:cuerpo?JSON.stringify(cuerpo):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||'No se pudo conectar con el equipo');
  return j;
}
// acepta el enlace de invitación completo o solo el código (si ya hay un servidor guardado)
function eqLeerInvitacion(txt){
  txt=String(txt||'').trim();let codigo='',api='';
  try{const u=new URL(txt);codigo=u.searchParams.get('e')||'';api=u.searchParams.get('s')||'';}catch(e){codigo=txt.toUpperCase().replace(/[^A-Z0-9]/g,'');}
  return {codigo,api};
}
async function eqUnirse(codigo,api){
  const nombre=(perfil&&perfil().nombre)||'';
  const r=await eqApi('POST','/api/unirse',{codigo,nombre},{api});
  lsSet(SK_EQ,{api,token:r.token,equipo:r.equipo,codigo,nombre:r.nombre});
  showToast('Te uniste a «'+r.equipo+'» ✓');renderPerfilEquipo();
  eqRevisarRuta(true);
}
async function eqUnirseDesdeCampo(){
  const {codigo,api}=eqLeerInvitacion(document.getElementById('eqInv').value);
  if(!codigo||!api){showToast('Pegá el enlace de invitación que te mandó tu jefe',true);return;}
  try{await eqUnirse(codigo,api);}catch(e){showToast(e.message,true);}
}
function eqSalir(){
  confirm2('¿Salir del equipo? Tus visitas ya hechas quedan como están.',()=>{lsDel(SK_EQ);lsDel(SK_EQCOLA);lsDel(SK_EQVISTO);renderPerfilEquipo();showToast('Saliste del equipo');});
}
function renderPerfilEquipo(){
  const box=document.getElementById('perfilEq');if(!box) return;
  const e=equipo();
  box.innerHTML=e
    ?`<div class="popc-t">Equipo</div><div class="peq-n">👥 ${escapeHtml(e.equipo)}</div><div style="display:grid;gap:6px"><label class="popc-f"><span>📍 Compartir mi posición con el equipo<small>Tu jefe te ve en el mapa mientras tenés la app abierta</small></span><input type="checkbox" id="eqPos" onchange="eqPosCambio(this.checked)"${eqPosOn()?' checked':''}><i class="popc-sw"></i></label><button class="sm sma" onclick="eqTraerRuta()">📥 Traer mi ruta de hoy</button><button class="sm smh" onclick="eqSalir()">Salir del equipo</button></div>`
    :`<div class="popc-t">Equipo (opcional)</div><input type="text" id="eqInv" placeholder="Pegá la invitación de tu jefe" autocomplete="off" style="width:100%;font-size:13px;text-align:center;border-radius:12px;padding:9px 10px;border:1px solid rgba(120,150,200,.4)"><button class="sm smh" style="margin-top:6px" onclick="eqUnirseDesdeCampo()">👥 Unirme al equipo</button>`;
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
// cada visita hecha se informa al panel del jefe (si no hay señal, queda en cola)
function eqReportarVisita(id){
  const e=equipo();if(!e) return;
  const v=visits[id],pl=v&&v.planilla;if(!pl) return;
  const p=puntos.find(x=>String(x.id)===String(id))||{};
  const g=pl.gps;
  const item={punto_id:String(id),nombre:p.nombre||'',localidad:p.localidad||'',estado:pl.cierra?'cerrado':'ok',ts:Date.now(),lat:g?g.lat:(p.lat||null),lng:g?g.lng:(p.lng||null),dist:pl.dist!=null?pl.dist:null,dur:pl.durMin||null,irr:irregsDe(pl).length>0};
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
  confirm2('👥 Te invitaron a un equipo. ¿Unirte? Tu jefe va a ver cuántas visitas hacés y vas a poder recibir tus rutas.',()=>eqUnirse(codigo.toUpperCase(),api).catch(e=>showToast(e.message,true)));
}

// posición en vivo para el mapa del jefe (opcional, apagada por defecto; solo con la app abierta)
const eqPosOn=()=>!!lsGet('sube:eqpos');
async function eqPosEnviar(){
  if(!equipo()||!eqPosOn()||document.hidden||!navigator.onLine) return;
  const g=await ubiPos(8000);if(!g) return;
  try{await eqApi('POST','/api/posicion',{lat:g.lat,lng:g.lng,prec:g.prec});}catch(e){}
}
async function eqPosCambio(on){
  lsSet('sube:eqpos',on);
  if(on){showToast('Activado: tu jefe te ve en el mapa mientras usás la app');eqPosEnviar();}
  else{try{await eqApi('POST','/api/posicion',{off:true});}catch(e){}showToast('Ya no compartís tu posición');}
}
