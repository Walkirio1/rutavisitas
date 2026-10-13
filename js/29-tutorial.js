// Guía rápida: 5 pantallas, se puede saltar. Sale sola la primera vez y queda en Ajustes → "Cómo se usa".
const SK_TUT='sube:tut';
const TUT_PASOS=[
  {ic:'<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',t:'Cargá tus puntos',d:'Importá tu Excel (ID, nombre, dirección y localidad), pegá una lista o sacale foto a una. Se ubican solos en el mapa. Todo queda guardado en tu celular y anda sin internet.'},
  {ic:'<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',t:'Armá tu ruta',d:'En el Mapa tocá los puntos que vas a visitar (quedan en azul). Con «Dónde arranco» elegís la salida. «Ruta completa» los ordena y abre Google Maps.'},
  {ic:'<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',t:'Hacé la visita',d:'En Visitas abrí un punto, completá la planilla, sacá las fotos y pedí la firma con el dedo. Al guardar, el PDF sale solo.'},
  {ic:'<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0l-4 4m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',t:'Mandá el informe',d:'En Informe compartí todo por WhatsApp o mail, con los PDF y las fotos, o bajá el Excel del día.'},
  {ic:'<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h6"/></svg>',t:'Usá la planilla de tu empresa',d:'En Ajustes cargá el PDF de tu empresa: la app detecta los campos y lo completa por vos en cada visita.'}
];
let _tutI=0;
function tutCss(){
  if(document.getElementById('tutCss')) return;
  const s=document.createElement('style');s.id='tutCss';
  s.textContent=`#tutDlg{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;padding:16px;background:var(--overlay,rgba(4,8,18,.88))}
#tutDlg.on{display:flex}
#tutDlg .tc{width:100%;max-width:380px;background:var(--glass,#0e1830);border:1px solid var(--line-2,rgba(255,255,255,.12));border-radius:22px;padding:26px 22px 18px;text-align:center;color:var(--text,#eaf0fb);box-shadow:var(--shadow-deep,0 20px 50px rgba(0,0,0,.6))}
#tutDlg .ti{line-height:0;margin-bottom:14px;color:rgb(var(--acc,29,78,216))}
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
