// Google Drive: inicio de sesión y pantalla de entrada
// ═══════════════════════════════════════════════════════════
// ── GOOGLE DRIVE: AUTH + UPLOAD + AUTOSAVE JORNADA
// ═══════════════════════════════════════════════════════════
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata openid email profile'; // drive.file: solo lo que crea la app; openid/email/profile: nombre, correo y foto del perfil
// Client ID público de la app (no es un secreto). Si está cargado, nadie tiene que pegarlo.
const GOOGLE_CLIENT_ID = '197847834069-dagdtb4k8mq45vakhipof65j0gf286ro.apps.googleusercontent.com';
const SK_DRV_USER='sube:drvuser', SK_DRV_ON='sube:drvon';
const SK_MODO='sube:modo'; // 'google' (con Drive) o 'local' (sin conexión): quien ya eligió no vuelve a ver la pantalla de entrada

const drv = {
  clientId: GOOGLE_CLIENT_ID || lsGet(SK.clientId) || '',
  folderName: lsGet(SK.folderName) || 'Verificaciones SUBE',
  rootFolderId: lsGet(SK.rootFolderId) || null,
  autosave: lsGet(SK.autosave) || false,
  lastSync: lsGet(SK.lastSync) || null,
  tokenClient: null,
  accessToken: null,
  tokenExpiry: 0,
  connected: false,
  user: null,
  gapiReady: false,
  gisReady: false,
  autosaveTimer: null,
  autosavePending: false,
};

// Esperar a que GAPI y GIS carguen
function waitForGoogleLibs(){
  return new Promise((resolve)=>{
    const check=()=>{
      const gapiOk = typeof gapi !== 'undefined';
      const gisOk = typeof google !== 'undefined' && google.accounts && google.accounts.oauth2;
      if(gapiOk && gisOk){
        if(!drv.gapiReady){
          gapi.load('client',async()=>{
            await gapi.client.init({discoveryDocs:['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']});
            drv.gapiReady=true;
            drv.gisReady=true;
            resolve();
          });
        }else{
          resolve();
        }
      }else{
        setTimeout(check,200);
      }
    };
    check();
  });
}

function saveClientId(){
  const v=document.getElementById('gClientId').value.trim();
  if(!v){showToast('Pegá el Client ID primero',true);return;}
  drv.clientId=v;lsSet(SK.clientId,v);
  showToast('Client ID guardado ✓');
  renderDriveTab();
}

function saveFolderName(){
  const v=document.getElementById('folderName').value.trim()||'Verificaciones SUBE';
  drv.folderName=v;lsSet(SK.folderName,v);
  // Resetear rootFolderId para que se vuelva a buscar/crear
  drv.rootFolderId=null;lsDel(SK.rootFolderId);
  showToast('Nombre de carpeta guardado ✓');
}

function toggleAutosave(chk){
  drv.autosave=chk.checked;
  lsSet(SK.autosave,drv.autosave);
  if(drv.autosave){
    if(!drv.connected){
      showToast('Conectá Drive primero',true);
      chk.checked=false;drv.autosave=false;
      lsSet(SK.autosave,false);
      return;
    }
    showToast('Auto-guardado activado ✓');
    triggerAutosave();
  }else{
    showToast('Auto-guardado desactivado');
  }
}

function initTokenClient(){
  if(drv.tokenClient) return;
  drv.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: drv.clientId,
    scope: DRIVE_SCOPE,
    error_callback: (err)=>{
      console.warn('oauth:',err);
      const m={popup_closed:'Cerraste la ventana de Google antes de terminar. Tocá "Entrar con Google" de nuevo.',
               popup_failed_to_open:'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio.'}[err&&err.type];
      if(m&&!drv.silentTry) errorGate(m);
      drv.silentTry=false;
    },
    callback: async (resp)=>{
      if(resp.error){
        console.error(resp);
        if(drv.silentTry){drv.silentTry=false;return;} // reconexión silenciosa fallida: no molestar
        const m=resp.error==='access_denied'
          ?'Google no dejó entrar con esta cuenta. Pedí que la agreguen como usuario de prueba de la app.'
          :'No se pudo entrar ('+resp.error+'). Probá de nuevo.';
        errorGate(m);showToast(m,true);
        return;
      }
      const silent=drv.silentTry; drv.silentTry=false;
      drv.accessToken = resp.access_token;
      drv.tokenExpiry = Date.now() + ((resp.expires_in||3600)*1000) - 60000;
      gapi.client.setToken({access_token: drv.accessToken});
      drv.connected = true;
      lsSet(SK_DRV_ON,true);lsSet(SK_MODO,'google');
      try{
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
          headers:{'Authorization':'Bearer '+drv.accessToken}
        }).then(r=>r.json());
        drv.user = userInfo.email || drv.user;
        if(drv.user) lsSet(SK_DRV_USER,drv.user);
        guardarPerfil(userInfo);
      }catch(e){console.warn('perfil de Google:',e);}
      // el auto-guardado de la jornada queda activado desde el primer ingreso
      if(lsGet(SK.autosave)===null){drv.autosave=true;lsSet(SK.autosave,true);}
      updateDriveBadge();
      renderDriveTab();
      if(!silent) showToast('✓ Conectado a Drive');
      checkJornadaActual();
      setTimeout(()=>reintentarPendientes(true),2500);
    }
  });
}

async function connectDrive(){
  if(!drv.clientId){showToast('Falta el Client ID de la app',true);return;}
  showToast('Conectando con Drive...');
  try{
    await Promise.race([waitForGoogleLibs(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('No cargó Google. Revisá tu internet y probá de nuevo.')),12000))]);
    initTokenClient();
    drv.silentTry=false;
    // 'select_account' solo si nunca se conectó; después reutiliza la cuenta
    drv.tokenClient.requestAccessToken(drv.user ? {prompt:'',login_hint:drv.user} : {prompt:'select_account'});
  }catch(e){
    console.error(e);
    errorGate(e.message);
    showToast('Error iniciando sesión: '+e.message,true);
  }
}

// ── PANTALLA DE ENTRADA: sin cuenta de Google conectada no se puede usar la app
function actualizarGate(){
  const g=document.getElementById('gate');if(!g) return;
  if(!lsGet(SK_MODO)){g.classList.remove('out');g.classList.add('show');document.documentElement.classList.remove('logged');}
  else if(g.classList.contains('show')&&!g.classList.contains('out')){g.classList.add('out');setTimeout(()=>g.classList.remove('show','out'),650);}
}
function entrarSinConectar(){
  lsSet(SK_MODO,'local');
  actualizarGate();renderPerfilBtn();
  showToast('Listo ✓ Tus visitas se guardan en este celular. Si querés copia en tu Drive, conectá Google desde tu perfil.');
}
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */
/* (se ejecuta al final, en js/99-arranque.js) */
function errorGate(msg){const e=document.getElementById('gateErr');if(e)e.textContent=msg||'';}
function entrarGate(){errorGate('');connectDrive();}
// Si la reconexión silenciosa falló al abrir, el primer toque la reintenta (con un toque el navegador no la bloquea)
let _toqueUsado=false;
/* (se ejecuta al final, en js/99-arranque.js) */

// Al abrir la app: si ya había iniciado sesión antes, reconecta sola (sin popups de consentimiento)
async function reconectarDrive(){
  if(!drv.clientId || !lsGet(SK_DRV_ON)) return;
  drv.user = lsGet(SK_DRV_USER) || null;
  try{
    await waitForGoogleLibs();
    initTokenClient();
    drv.silentTry=true;
    drv.tokenClient.requestAccessToken({prompt:'',login_hint:drv.user||undefined});
  }catch(e){console.error('reconectar:',e);}
}

function disconnectDrive(){
  if(drv.accessToken){
    try{google.accounts.oauth2.revoke(drv.accessToken,()=>{});}catch(e){}
  }
  drv.accessToken=null;drv.connected=false;drv.user=null;drv.tokenExpiry=0;
  lsDel(SK_DRV_ON);lsDel(SK_DRV_USER);
  updateDriveBadge();renderDriveTab();
  showToast('Desconectado de Drive');
}

async function ensureToken(){
  if(!drv.connected) throw new Error('No conectado a Drive');
  // Si el token está por vencer, pedirlo de nuevo silenciosamente
  if(Date.now() > drv.tokenExpiry){
    return new Promise((resolve,reject)=>{
      initTokenClient();
      drv.tokenClient.callback = (resp)=>{
        if(resp.error){reject(resp.error);return;}
        drv.accessToken=resp.access_token;
        drv.tokenExpiry=Date.now()+((resp.expires_in||3600)*1000)-60000;
        gapi.client.setToken({access_token:drv.accessToken});
        resolve();
      };
      drv.tokenClient.requestAccessToken({prompt:''});
    });
  }
}

function updateDriveBadge(){
  renderPerfilBtn();
  actualizarGate();
}

function renderDriveTab(){
  const cidCard=document.getElementById('cidCard');
  if(cidCard)cidCard.style.display=GOOGLE_CLIENT_ID?'none':'block';
  const inp=document.getElementById('gClientId');
  if(inp&&drv.clientId&&!inp.value)inp.value=drv.clientId;
  const fn=document.getElementById('folderName');
  if(fn)fn.value=drv.folderName;
  const chk=document.getElementById('autosaveChk');
  if(chk)chk.checked=drv.autosave;
  const info=document.getElementById('drvConnInfo');
  if(info){
    if(drv.connected){
      info.innerHTML=`✅ Conectado como <strong style="color:#10b981">${drv.user||'tu cuenta'}</strong>`;
      document.getElementById('btnConnect').style.display='none';
      document.getElementById('btnDisconnect').style.display='block';
    }else{
      info.innerHTML='🔴 No conectado. Tocá <strong>Entrar con Google</strong> y elegí tu cuenta.';
      document.getElementById('btnConnect').style.display='block';
      document.getElementById('btnDisconnect').style.display='none';
    }
  }
  const ls=document.getElementById('lastSyncInfo');
  if(ls){
    ls.textContent = drv.lastSync ? '⏱️ Última sincronización: '+drv.lastSync : '';
  }
}
