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
  const p={nombre:prev.editado?prev.nombre:(info.name||prev.nombre||''),email:info.email||prev.email||drv.user||'',foto:prev.foto||'',fotoUrl:prev.fotoUrl||'',editado:!!prev.editado,emailEmpresa:prev.emailEmpresa||''};
  lsSet(SK_PERFIL,p);renderPerfilBtn();
  if(!prev.editado&&info.picture&&(info.picture!==prev.fotoUrl||!prev.foto)){
    p.fotoUrl=info.picture;
    try{
      const bl=await (await fetch(info.picture)).blob();
      p.foto=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(bl);});
    }catch(e){p.foto=info.picture;}
    lsSet(SK_PERFIL,p);renderPerfilBtn();
  }
}
const G_SVG='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
function openPerfil(){
  const p=perfil(),conn=drv.connected,modo=lsGet(SK_MODO);
  pintarAvatar(document.getElementById('perfilAv'),p);
  document.getElementById('perfilNom').value=p.nombre||'';
  document.getElementById('perfilMail').textContent=p.email||drv.user||(modo==='local'?'Sin cuenta de Google':'');
  const est=document.getElementById('perfilEst');
  est.textContent=conn?'● Conectado a Google Drive':(modo==='local'?'● Modo sin conexión':'● Sin conexión con Drive');
  est.classList.toggle('off',!conn);
  const reco=document.getElementById('perfilReco');
  reco.innerHTML=G_SVG+'<span>'+(modo==='local'?'Conectar con Google':'Reconectar con Google')+'</span>';
  reco.style.display=conn?'none':'';
  document.getElementById('perfilSinCon').style.display=conn?'':'none';
  document.getElementById('perfilEmpresa').value=p.emailEmpresa||'';
  document.getElementById('perfilEnviarEmp').style.display=(conn&&p.emailEmpresa)?'':'none';
  const hechasHoy=Object.values(visits).filter(v=>v&&v.done).length;
  const totHist=historial.reduce((a,h)=>a+(h.hechos||0),0);
  document.getElementById('perfilStats').innerHTML=
    `<div><b>${hechasHoy}</b><span>hechas hoy</span></div><div><b>${historial.length}</b><span>jornadas</span></div><div><b>${totHist+hechasHoy}</b><span>visitas en total</span></div>`;
  document.getElementById('perfilInf').innerHTML=
    '📄 Planilla: <b>'+nombrePlanillaActiva()+'</b>'+(conn?'<br>📁 Carpeta en Drive: <b>'+(drv.folderName||'')+'</b>':'<br>💾 Tus visitas quedan en este celular')+(pendientesEnvio().length?'<br>⚠️ '+pendientesEnvio().length+' visita(s) sin enviar':'');
  document.getElementById('perfilDlg').classList.add('show');
}
function perfilGuardarEmpresa(v){
  v=(v||'').trim();
  if(v&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){showToast('Ese correo no es válido',true);return;}
  const p=perfil();p.emailEmpresa=v;lsSet(SK_PERFIL,p);
  document.getElementById('perfilEnviarEmp').style.display=(drv.connected&&v)?'':'none';
  showToast(v?'Correo de la empresa guardado ✓':'Correo de la empresa quitado');
}
function perfilGuardarNombre(v){
  const p=perfil();p.nombre=(v||'').trim();p.editado=true;lsSet(SK_PERFIL,p);renderPerfilBtn();
  showToast('Nombre guardado ✓');
}
async function perfilCambiarFoto(input){
  const file=input.files[0];input.value='';if(!file) return;
  try{
    const url=URL.createObjectURL(file);
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
    const s=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement('canvas');c.width=c.height=200;
    c.getContext('2d').drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,200,200);
    URL.revokeObjectURL(url);
    const p=perfil();p.foto=c.toDataURL('image/jpeg',.85);p.editado=true;lsSet(SK_PERFIL,p);
    pintarAvatar(document.getElementById('perfilAv'),p);renderPerfilBtn();showToast('Foto actualizada ✓');
  }catch(e){showToast('No se pudo usar esa foto',true);}
}
function perfilSeguirSinConexion(){
  confirm2('¿Desconectar Google y seguir sin conexión? Tus visitas quedan solo en este celular (no se envían a Drive). Podés volver a conectar cuando quieras.',function(){
    closePerfil();disconnectDrive();lsSet(SK_MODO,'local');renderPerfilBtn();
    showToast('Seguís sin conexión');
  });
}
function closePerfil(){document.getElementById('perfilDlg').classList.remove('show');}
function perfilIr(n){closePerfil();showTab(n);}
function perfilSalir(){
  closePerfil();
  confirm2('¿Cerrar sesión? Tus datos de hoy siguen en este celular. Para volver a usar Drive tenés que entrar con Google otra vez.',function(){
    disconnectDrive();lsDel(SK_MODO);
    document.documentElement.classList.remove('logged');
    lsDel(SK_PERFIL);renderPerfilBtn();
    actualizarGate();
  });
}
