// Perfil de usuario: foto de Google (círculo arriba a la derecha) y ventana de perfil
const SK_PERFIL='sube:perfil';
function perfil(){return lsGet(SK_PERFIL)||{};}
function inicialesPerfil(p){return ((p.nombre||p.email||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'?').toUpperCase();}
function pintarAvatar(el,p){
  if(!el) return;
  el.innerHTML='';
  if(p.foto){const i=document.createElement('img');i.alt='';i.src=p.foto;i.referrerPolicy='no-referrer';el.appendChild(i);}
  else el.textContent=inicialesPerfil(p);
}
function renderPerfilBtn(){
  const b=document.getElementById('perfilBtn');if(!b) return;
  pintarAvatar(b.querySelector('.pav'),perfil());
  b.classList.toggle('off',!drv.connected);
  const pend=pendientesEnvio().length,d=b.querySelector('.pdot');
  d.textContent=pend||'';d.style.display=pend?'flex':'none';
}
// guarda nombre, correo y foto (la foto se guarda en el celular para que aparezca aunque no haya internet)
async function guardarPerfil(info){
  const prev=perfil();
  const p={nombre:info.name||prev.nombre||'',email:info.email||prev.email||drv.user||'',foto:prev.foto||'',fotoUrl:prev.fotoUrl||''};
  lsSet(SK_PERFIL,p);renderPerfilBtn();
  if(info.picture&&(info.picture!==prev.fotoUrl||!prev.foto)){
    p.fotoUrl=info.picture;
    try{
      const bl=await (await fetch(info.picture)).blob();
      p.foto=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(bl);});
    }catch(e){p.foto=info.picture;}
    lsSet(SK_PERFIL,p);renderPerfilBtn();
  }
}
function openPerfil(){
  const p=perfil(),conn=drv.connected;
  pintarAvatar(document.getElementById('perfilAv'),p);
  document.getElementById('perfilNom').textContent=p.nombre||'Mi cuenta';
  document.getElementById('perfilMail').textContent=p.email||drv.user||'';
  const est=document.getElementById('perfilEst');
  est.textContent=conn?'● Conectado a Google Drive':'● Sin conexión con Drive';
  est.classList.toggle('off',!conn);
  document.getElementById('perfilReco').style.display=conn?'none':'';
  const hechasHoy=Object.values(visits).filter(v=>v&&v.done).length;
  const totHist=historial.reduce((a,h)=>a+(h.hechos||0),0);
  document.getElementById('perfilStats').innerHTML=
    `<div><b>${hechasHoy}</b><span>hechas hoy</span></div><div><b>${historial.length}</b><span>jornadas</span></div><div><b>${totHist+hechasHoy}</b><span>visitas en total</span></div>`;
  const pl=plDefId&&planillas.find(x=>x.id===plDefId);
  document.getElementById('perfilInf').innerHTML=
    '📄 Planilla: <b>'+(pl?(pl.nombre||'mi planilla'):'la original incluida')+'</b><br>📁 Carpeta en Drive: <b>'+(drv.folderName||'')+'</b>'+(pendientesEnvio().length?'<br>⚠️ '+pendientesEnvio().length+' visita(s) sin enviar':'');
  document.getElementById('perfilDlg').classList.add('show');
}
function closePerfil(){document.getElementById('perfilDlg').classList.remove('show');}
function perfilIr(n){closePerfil();showTab(n);}
function perfilSalir(){
  closePerfil();
  confirm2('¿Cerrar sesión? Tus datos de hoy siguen en este celular. Para volver a usar Drive tenés que entrar con Google otra vez.',function(){
    disconnectDrive();
    document.documentElement.classList.remove('logged');
    lsDel(SK_PERFIL);renderPerfilBtn();
    actualizarGate();
  });
}
