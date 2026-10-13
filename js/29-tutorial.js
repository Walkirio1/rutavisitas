// Guía rápida: 5 pantallas, se puede saltar. Sale sola la primera vez y queda en Ajustes → "Cómo se usa".
const SK_TUT='sube:tut';
const TUT_PASOS=[
  {ic:'📂',t:'Cargá tus puntos',d:'Importá tu Excel (ID, nombre, dirección y localidad), pegá una lista o sacale foto a una. Se ubican solos en el mapa. Todo queda guardado en tu celular y anda sin internet.'},
  {ic:'🗺️',t:'Armá tu ruta',d:'En el Mapa tocá los puntos que vas a visitar (quedan en azul). Con 🚩 Dónde arranco elegís la salida. «Ruta completa» los ordena y abre Google Maps.'},
  {ic:'✍️',t:'Hacé la visita',d:'En Visitas abrí un punto, completá la planilla, sacá las fotos y pedí la firma con el dedo. Al guardar, el PDF sale solo.'},
  {ic:'📤',t:'Mandá el informe',d:'En Informe compartí todo por WhatsApp o mail, con los PDF y las fotos, o bajá el Excel del día.'},
  {ic:'📄',t:'Usá la planilla de tu empresa',d:'En Ajustes cargá el PDF de tu empresa: la app detecta los campos y lo completa por vos en cada visita.'}
];
let _tutI=0;
function tutCss(){
  if(document.getElementById('tutCss')) return;
  const s=document.createElement('style');s.id='tutCss';
  s.textContent=`#tutDlg{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;padding:16px;background:var(--overlay,rgba(4,8,18,.88))}
#tutDlg.on{display:flex}
#tutDlg .tc{width:100%;max-width:380px;background:var(--glass,#0e1830);border:1px solid var(--line-2,rgba(255,255,255,.12));border-radius:22px;padding:26px 22px 18px;text-align:center;color:var(--text,#eaf0fb);box-shadow:var(--shadow-deep,0 20px 50px rgba(0,0,0,.6))}
#tutDlg .ti{font-size:54px;line-height:1;margin-bottom:10px}
#tutDlg .tt{font-size:20px;font-weight:800;margin-bottom:8px}
#tutDlg .td{font-size:15px;line-height:1.5;color:var(--text-soft,#b4c0d8);min-height:96px}
#tutDlg .tp{display:flex;gap:6px;justify-content:center;margin:14px 0}
#tutDlg .tp i{width:8px;height:8px;border-radius:50%;background:rgba(150,170,210,.35)}
#tutDlg .tp i.a{background:rgb(var(--acc,59,130,246));width:22px;border-radius:5px}
#tutDlg .tb{display:flex;gap:8px}
#tutDlg .tb button{flex:1;padding:13px 10px;border-radius:14px;border:0;font-weight:700;font-size:15px;cursor:pointer}
#tutDlg .tn{background:rgb(var(--acc,59,130,246));color:#fff}
#tutDlg .ts{background:transparent;color:var(--text-mute,#7f8fae)}`;
  document.head.appendChild(s);
}
function tutPintar(){
  const p=TUT_PASOS[_tutI],ult=_tutI===TUT_PASOS.length-1,d=document.getElementById('tutDlg');
  d.innerHTML=`<div class="tc" role="dialog" aria-label="Cómo se usa LogiMap"><div class="ti">${p.ic}</div><div class="tt">${p.t}</div><div class="td">${p.d}</div>
  <div class="tp">${TUT_PASOS.map((_,i)=>`<i class="${i===_tutI?'a':''}"></i>`).join('')}</div>
  <div class="tb">${ult?'':'<button class="ts" onclick="tutCerrar()">Saltar</button>'}<button class="tn" onclick="tutSig()">${ult?'¡Listo, a trabajar!':'Siguiente'}</button></div></div>`;
}
function tutAbrir(){
  tutCss();let d=document.getElementById('tutDlg');
  if(!d){d=document.createElement('div');d.id='tutDlg';document.body.appendChild(d);}
  _tutI=0;tutPintar();d.classList.add('on');
}
function tutSig(){if(_tutI>=TUT_PASOS.length-1) return tutCerrar();_tutI++;tutPintar();}
function tutCerrar(){lsSet(SK_TUT,1);const d=document.getElementById('tutDlg');if(d) d.classList.remove('on');}
// la primera vez: cuando ya entró a la app (no mientras se ve la pantalla de entrada)
(function(){
  if(lsGet(SK_TUT)) return;
  const t=setInterval(()=>{
    const g=document.getElementById('gate');
    if(lsGet(SK_MODO)&&(!g||!g.classList.contains('show'))){clearInterval(t);setTimeout(()=>{if(!lsGet(SK_TUT)) tutAbrir();},900);}
  },1200);
})();
