// Constantes, fechas, almacenamiento, estado y fotos (IndexedDB)
// ── CONSTANTES
const CN_SUBE=["DOMICILIO INEXISTENTE","COMERCIO CERRADO","NO COMERCIALIZA SUBE","SIN SERVICIO DE CARGA","COBRO ADICIONAL","NO ENTREGA TICKET","TICKET CON OTRA DIRECCIÓN","SIN SEÑALÉTICA"];
const VN_SUBE=["COBRO ADICIONAL EN LA VENTA","SIN STOCK DE TARJETAS"];
// Listas activas (cambian según la planilla en uso: ver js/19-plantilla.js)
let CN=CN_SUBE.slice(),VN=VN_SUBE.slice(),TIT_A='Irregularidad de Carga',TIT_B='Irregularidad en la Venta';

// ── HELPERS FECHA
function hoy(){return new Date().toLocaleDateString('es-AR');}
function ahora(){return new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});}

// ── STORAGE (localStorage con prefijo)
const SK_ORDEN='sube:orden';
let ordenRuta=(function(){try{return JSON.parse(localStorage.getItem('sube:orden'))||[];}catch(e){return [];}})();
const SK={
  puntos:'sube:puntos',sel:'sube:sel',visits:'sube:visits',
  historial:'sube:historial',emails:'sube:emails',planillas:'sube:planillas',
  clientId:'sube:clientid',
  folderName:'sube:foldername',
  rootFolderId:'sube:rootfolderid',
  autosave:'sube:autosave',
  lastSync:'sube:lastsync',
  plDef:'sube:pldef',
};
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){showToast('Storage lleno: borrar historial viejo',true);}}
function lsDel(k){try{localStorage.removeItem(k);}catch{}}

// ── ESTADO
let puntos   = lsGet(SK.puntos)    || [];
let sel      = new Set(lsGet(SK.sel) || []);
let visits   = lsGet(SK.visits)    || {};

// ── FOTOS: se guardan aparte (IndexedDB, mucho más espacio que localStorage) y achicadas
let _fotosDB=null;
function fotosDB(){
  if(_fotosDB) return _fotosDB;
  _fotosDB=new Promise((res,rej)=>{
    try{
      const rq=indexedDB.open('sube-fotos',1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore('fotos');
      rq.onsuccess=()=>res(rq.result);
      rq.onerror=()=>rej(rq.error);
    }catch(e){rej(e);}
  });
  return _fotosDB;
}
async function fotoOp(modo,tipo,...args){
  // con límite de tiempo: si el navegador no deja usar IndexedDB (modo privado, etc.) nada queda colgado
  const limite=new Promise(res=>setTimeout(()=>res(null),5000));
  const op=(async()=>{
    try{
      const db=await fotosDB();
      return await new Promise((res,rej)=>{
        const st=db.transaction('fotos',modo).objectStore('fotos');
        const rq=st[tipo](...args);
        rq.onsuccess=()=>res(rq.result);
        rq.onerror=()=>rej(rq.error);
      });
    }catch(e){console.warn('fotos:',e);return null;}
  })();
  return Promise.race([op,limite]);
}
const fotoPut=(id,data)=>fotoOp('readwrite','put',data,String(id));
const fotoGet=id=>fotoOp('readonly','get',String(id));
const fotoDel=id=>fotoOp('readwrite','delete',String(id));
const fotosClear=()=>fotoOp('readwrite','clear');

// Ids de visitas cuya foto ya está CONFIRMADA en IndexedDB: sólo esas se sacan de localStorage
const fotosEnIDB=new Set();
async function guardarFotoSegura(id,data){
  const r=await fotoPut(id,data);
  if(r!==null&&r!==undefined){fotosEnIDB.add(String(id));return true;}
  return false;
}

// Guarda las visitas en localStorage sin las fotos que ya están a salvo en IndexedDB
function guardarVisits(){
  const limpio={};
  for(const [id,v] of Object.entries(visits)){
    if(v&&v.planilla){
      const {foto,...pl}=v.planilla;
      if(foto&&!fotosEnIDB.has(String(id))) limpio[id]=v; // sin confirmar: la foto se queda donde estaba
      else limpio[id]={...v,planilla:{...pl,tieneFoto:!!(foto||pl.tieneFoto)}};
    }else limpio[id]=v;
  }
  lsSet(SK.visits,limpio);
}
// Copia de las visitas sin fotos (para historial y para Drive)
function visitsSinFotos(src){
  const out={};
  for(const [id,v] of Object.entries(src||{})){
    if(v&&v.planilla){const {foto,...pl}=v.planilla;out[id]={...v,planilla:pl};}else out[id]=v;
  }
  return out;
}
// Al abrir: trae las fotos de IndexedDB y migra las que quedaron en localStorage de versiones anteriores
async function cargarFotosVisits(){
  let migrado=false;
  for(const [id,v] of Object.entries(visits)){
    const pl=v&&v.planilla;if(!pl) continue;
    if(pl.foto){
      if(await guardarFotoSegura(id,pl.foto)) migrado=true;   // sólo se libera de localStorage si se guardó bien
    }else if(pl.tieneFoto){
      const f=await fotoGet(id);
      if(f){pl.foto=f;fotosEnIDB.add(String(id));}
    }
  }
  if(migrado) guardarVisits();
  if(typeof renderV==='function') renderV();
}

// Achica la foto (máx. 1280 px, JPEG 72%): de 3-5 MB a ~150-250 KB
function comprimirFoto(file,maxLado=1280,calidad=.72){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const k=Math.min(1,maxLado/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement('canvas');
      c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg',calidad));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('No se pudo leer la foto'));};
    img.src=url;
  });
}
let historial= lsGet(SK.historial) || [];
let emails   = lsGet(SK.emails)    || [];
let planillas= lsGet(SK.planillas) || [];
let plDefId  = lsGet(SK.plDef) || null; // null = planilla oficial incluida

// modal state
let curId=null, plC={}, fotoData=null;
let dlgCb=null, histOpenIdx=null;
