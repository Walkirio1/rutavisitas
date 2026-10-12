// Trabajar en dupla: dos personas comparten la misma jornada.
//  🚗 Navegante: arma la ruta en el mapa y avisa cuál es la siguiente parada.
//  🚶 Verificador: baja y completa la planilla; cada visita se ve al instante en el celu del navegante.
const SK_DUPLA='sube:dupla',SK_DPVISTO='sube:dpactual';
const dupla=()=>lsGet(SK_DUPLA)||null;
const dpBase=()=>lsGet('sube:srv')||SERVIDOR_URL;
const dpEsNavegante=()=>{const d=dupla();return !!d&&d.rol==='navegante';};
let _dpEs=null,_dpUltimo='',_dpPush=null;

async function dpApi(metodo,ruta,cuerpo){
  const d=dupla();if(!d) throw new Error('Sin dupla');
  return eqApi(metodo,ruta,cuerpo,{api:d.api,token:d.token});
}
// miniatura chica de tu foto (para que tu compañero te vea arriba)
function dpMiniatura(){
  const f=(typeof perfil==='function'&&perfil().foto)||'';if(!f) return Promise.resolve('');
  return new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=96;const s=Math.min(i.naturalWidth,i.naturalHeight);c.getContext('2d').drawImage(i,(i.naturalWidth-s)/2,(i.naturalHeight-s)/2,s,s,0,0,96,96);res(c.toDataURL('image/jpeg',.8));};i.onerror=()=>res('');i.src=f;});
}
const dpNombre=()=>((typeof perfil==='function'&&perfil().nombre)||'').trim()||'Yo';

// ── Crear la dupla o unirse con el código de 6 letras
async function dpCrear(){
  try{
    const r=await eqApi('POST','/api/dupla/crear',{nombre:dpNombre(),foto:await dpMiniatura(),rol:'navegante'},{api:dpBase()});
    lsSet(SK_DUPLA,{api:dpBase(),token:r.token,codigo:r.codigo,rol:r.rol,companero:null,version:0});
    if(_dpEs){_dpEs.close();_dpEs=null;}
    dpArrancar();dpPintarDlg();dpPintarCabecera();
  }catch(e){showToast(e.message==='Failed to fetch'?'No hay conexión con el servidor':e.message,true);}
}
async function dpUnirse(){
  const cod=(document.getElementById('dpCod').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(cod.length<6){showToast('Escribí el código de 6 letras de tu compañero',true);return;}
  try{
    const vieja=dupla();
    const r=await eqApi('POST','/api/unirse',{codigo:cod,nombre:dpNombre(),foto:await dpMiniatura()},{api:dpBase()});
    if(r.tipo!=='dupla'){showToast('Ese código no es de una dupla',true);return;}
    if(vieja){try{await dpApi('POST','/api/dupla/salir',{});}catch(e){}}
    lsSet(SK_DUPLA,{api:dpBase(),token:r.token,codigo:cod,rol:r.rol,companero:r.companero,version:0});
    if(_dpEs){_dpEs.close();_dpEs=null;} // se escucha la dupla nueva, no la que se dejó
    _dpUltimo='';dpArrancar();dpPintarDlg();dpPintarCabecera();showToast('Conectado con '+(r.companero?r.companero.nombre:'tu compañero')+' ✓');
    dpPull(true);
  }catch(e){showToast(e.message==='Failed to fetch'?'No hay conexión con el servidor':e.message,true);}
}
function dpSalir(){
  confirm2('¿Salir de la dupla? Dejan de compartir la jornada. Lo que ya tenés en tu celular se queda.',async()=>{
    try{await dpApi('POST','/api/dupla/salir',{});}catch(e){}
    if(_dpEs){_dpEs.close();_dpEs=null;}clearInterval(_dpPush);_dpPush=null;
    lsDel(SK_DUPLA);lsDel(SK_DPVISTO);dpPintarDlg();dpPintarCabecera();if(typeof renderPerfilEquipo==='function')renderPerfilEquipo();showToast('Saliste de la dupla');
  });
}
async function dpCambiarRol(rol){
  const d=dupla();if(!d||d.rol===rol) return;
  try{await dpApi('POST','/api/dupla/rol',{rol});d.rol=rol;if(d.companero)d.companero.rol=rol==='navegante'?'verificador':'navegante';lsSet(SK_DUPLA,d);dpPintarDlg();_dpUltimo='';showToast(rol==='navegante'?'Ahora navegás vos 🚗':'Ahora bajás vos a completar 🚶');}
  catch(e){showToast(e.message,true);}
}
function dpCompartir(){
  const d=dupla();if(!d) return;
  const t='Trabajemos en dupla en Verific. Abrí la app, entrá a tu perfil → Trabajar en dupla y escribí este código: '+d.codigo;
  if(navigator.share) navigator.share({title:'Dupla en Verific',text:t}).catch(()=>{});
  else navigator.clipboard&&navigator.clipboard.writeText(d.codigo).then(()=>showToast('Código copiado ✓'));
}

// ── Pantalla "Trabajar en dupla"
function dpAbrir(){
  document.getElementById('perfilDlg').classList.remove('show');
  document.getElementById('dpDlg').classList.add('show');
  if(!dupla()) dpCrear();else{dpPintarDlg();dpPull();}
}
function dpCerrar(){document.getElementById('dpDlg').classList.remove('show');}
function dpPintarDlg(){
  const box=document.getElementById('dpBox');if(!box) return;
  const d=dupla();
  if(!d){box.innerHTML='<div class="dp-t">Creando tu dupla…</div>';return;}
  const c=d.companero,av=c&&c.foto?`<img src="${c.foto}" alt="">`:escapeHtml((c&&c.nombre||'?').slice(0,1).toUpperCase());
  box.innerHTML=`
    <div class="dp-cod"><small>Tu código</small><b>${escapeHtml(d.codigo)}</b><button class="sm sma" onclick="dpCompartir()">📤 Mandarlo</button></div>
    <div class="dp-comp">${c?`<span class="dp-av">${av}</span><div><b>${escapeHtml(c.nombre)}</b><small>${c.rol==='navegante'?'🚗 Navegante':'🚶 Verificador'}</small></div>`:'<div class="dp-esp">⏳ Esperando a tu compañero…<small>Que escriba este código en su app, en Perfil → Trabajar en dupla.</small></div>'}</div>
    <div class="dp-t">Mi rol</div>
    <div class="dp-roles"><button class="${d.rol==='navegante'?'on':''}" onclick="dpCambiarRol('navegante')">🚗 Navegante<small>Mapa y ruta</small></button><button class="${d.rol==='verificador'?'on':''}" onclick="dpCambiarRol('verificador')">🚶 Verificador<small>Baja y completa</small></button></div>
    <div class="dp-t" style="margin-top:12px">¿Tu compañero ya tiene un código?</div>
    <div style="display:flex;gap:6px"><input id="dpCod" maxlength="6" autocapitalize="characters" placeholder="ABC123" style="flex:1;text-align:center;letter-spacing:.2em;font-weight:800;text-transform:uppercase"><button class="sm sma" onclick="dpUnirse()">Conectar</button></div>
    <button class="btn bd" style="margin-top:12px" onclick="dpSalir()">Salir de la dupla</button>`;
}
// foto del compañero al lado de la tuya, arriba
function dpPintarCabecera(){
  const b=document.getElementById('dupBtn');if(!b) return;
  const d=dupla();
  if(!d){b.style.display='none';return;}
  b.style.display='';const c=d.companero;
  b.classList.toggle('esp',!c);
  b.innerHTML=c&&c.foto?`<img src="${c.foto}" alt="">`:`<span>${c?escapeHtml((c.nombre||'?').slice(0,1).toUpperCase()):'🤝'}</span>`;
}

// ── Sincronización
function dpArrancar(){
  const d=dupla();if(!d) return;
  if(!_dpEs&&typeof EventSource!=='undefined'){
    try{_dpEs=new EventSource(d.api.replace(/\/$/,'')+'/api/eventos?t='+d.token);_dpEs.onmessage=()=>dpPull();}catch(e){}
  }
  if(!_dpPush) _dpPush=setInterval(dpEmpujar,4000);
}
async function dpPull(forzar){
  const d=dupla();if(!d||!navigator.onLine) return;
  try{
    const r=await dpApi('GET','/api/dupla');
    d.rol=r.yo.rol||d.rol;d.companero=r.companero;
    const nueva=forzar||r.version>(d.version||0);
    lsSet(SK_DUPLA,d);dpPintarCabecera();if(document.getElementById('dpDlg').classList.contains('show')) dpPintarDlg();
    if(nueva){d.version=r.version;lsSet(SK_DUPLA,d);dpAplicar(r.estado);}
  }catch(e){}
}
function dpAplicar(est){
  const d=dupla();if(!d||!est) return;
  let cambio=false;
  // el verificador recibe la ruta que arma el navegante
  if(d.rol==='verificador'&&Array.isArray(est.puntos)){
    const loc=new Map(puntos.map(p=>[String(p.id),p]));
    puntos=est.puntos.map(p=>{const x=loc.get(String(p.id));return {id:String(p.id),nombre:p.nombre||'',dir:p.dir||'',localidad:p.localidad||'',tipo:p.tipo||'',obs:x?x.obs||'':'',lat:p.lat!=null?p.lat:(x?x.lat:null),lng:p.lng!=null?p.lng:(x?x.lng:null),geoErr:x?x.geoErr:null};});
    sel=new Set((est.sel||[]).map(String));ordenRuta=(est.orden||[]).map(String);
    lsSet(SK.puntos,puntos);lsSet(SK.sel,[...sel]);lsSet(SK_ORDEN,ordenRuta);cambio=true;
    if(puntos.some(p=>p.lat==null&&!p.geoErr)&&typeof geocodificarTodos==='function') setTimeout(()=>geocodificarTodos(true),400);
  }
  // el navegante ve en su mapa lo que va completando el verificador
  if(d.rol==='navegante'&&est.visitas){
    Object.entries(est.visitas).forEach(([id,v])=>{
      if(!visits[id]||!visits[id].done){const f=new Date(v.ts);visits[id]={done:true,remoto:true,planilla:{fecha:f.toLocaleDateString('es-AR'),hora:f.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),cierra:v.estado==='cerrado',por:v.por||'',irr:!!v.irr}};cambio=true;}
      else if(visits[id].remoto&&visits[id].planilla&&visits[id].planilla.cierra!==(v.estado==='cerrado')){visits[id].planilla.cierra=v.estado==='cerrado';cambio=true;}
    });
    Object.keys(visits).forEach(id=>{if(visits[id]&&visits[id].remoto&&!est.visitas[id]){delete visits[id];cambio=true;}});
    if(cambio) guardarVisits();
  }
  if(cambio){renderP();renderV();updStats();if(typeof mapa!=='undefined'&&mapa&&typeof renderMapa==='function') renderMapa(true);}
  // "Próxima parada" que manda el navegante
  if(d.rol==='verificador'&&est.actual&&String(est.actual.ts)!==String(lsGet(SK_DPVISTO))){
    lsSet(SK_DPVISTO,String(est.actual.ts));
    const p=puntos.find(x=>String(x.id)===String(est.actual.id));
    if(p&&!(visits[p.id]&&visits[p.id].done)) mostrarDlgEnvio('📍 Próxima parada\n\n'+(p.nombre||p.dir)+'\n'+p.dir+(p.localidad?' · '+p.localidad:''),[{txt:'📝 Abrir la planilla',cls:'ba',fn:()=>openPl(p.id)},{txt:'Después',cls:'bd'}]);
  }
}
// el navegante sube sus cambios de ruta (puntos, marcados y orden)
async function dpEmpujar(){
  const d=dupla();if(!d||d.rol!=='navegante'||!navigator.onLine) return;
  const clave=JSON.stringify([puntos.map(p=>[p.id,p.nombre,p.dir,p.localidad,p.tipo,p.lat,p.lng]),[...sel],ordenRuta]);
  if(clave===_dpUltimo||(!puntos.length&&!_dpUltimo)) return; // no se sube una ruta vacía
  try{await dpApi('POST','/api/dupla/estado',{puntos:puntos,sel:[...sel],orden:ordenRuta});_dpUltimo=clave;}catch(e){}
}
// el navegante avisa cuál es la siguiente parada
async function dpAvisarParada(id){
  try{await dpApi('POST','/api/dupla/estado',{actual:id});showToast('Le avisé a tu compañero ✓');}catch(e){showToast('No pude avisarle: '+e.message,true);}
}
// el verificador informa cada visita hecha (o la deshace)
async function dpReportarVisita(id){
  const d=dupla();if(!d||d.rol!=='verificador') return;
  const v=visits[id],p=puntos.find(x=>String(x.id)===String(id))||{};
  try{
    if(v&&v.done&&v.planilla) await dpApi('POST','/api/dupla/estado',{visita:{id:String(id),estado:v.planilla.cierra?'cerrado':'ok',irr:typeof irregsDe==='function'&&irregsDe(v.planilla).length>0,nombre:p.nombre||p.dir||''}});
    else await dpApi('POST','/api/dupla/estado',{quitarVisita:String(id)});
  }catch(e){}
}
function dpIniciar(){
  dpPintarCabecera();
  if(dupla()){dpArrancar();setTimeout(()=>dpPull(true),1500);}
  window.addEventListener('online',()=>setTimeout(dpPull,1500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) dpPull();});
}
