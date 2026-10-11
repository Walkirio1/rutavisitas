// Lista de direcciones desde una foto (OCR) y lector con IA (apagado)
// ── LECTOR CON IA (letra a mano): usa la clave que cada persona pega en Ajustes (queda solo en su celular)
const SK_IA='sube:iakey';
const FUNC_IA=false; // lector con IA: se deja apagado; se activará más adelante para quienes quieran la versión paga
const PROMPT_IA='Esta foto es una lista de direcciones de la ciudad de Rosario, Argentina (puede estar escrita a mano). Transcribila: una dirección por línea, en formato "Calle Altura" (por ejemplo "Pedro Medrano 2870"). Si una línea trae un ID o un nombre de local, ponelo antes separado con " ; " (ID ; nombre ; dirección). No numeres las líneas, no agregues explicaciones ni texto extra: solo las líneas. Si no podés leer una palabra, escribí tu mejor intento.';
async function fotoParaIA(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
    const r=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*r);c.height=Math.round(img.naturalHeight*r);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.85).split(',')[1];
  }finally{URL.revokeObjectURL(url);}
}
async function leerConIA(file,key){
  const b64=await fotoParaIA(file);
  if(key.startsWith('AIza')){
    let ult=null;
    for(const m of ['gemini-2.5-flash','gemini-2.0-flash','gemini-flash-latest']){
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent?key='+encodeURIComponent(key),{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:'image/jpeg',data:b64}},{text:PROMPT_IA}]}]})});
      if(r.status===404){ult=r;continue;}
      if(!r.ok) throw new Error(errorIA(r.status));
      const d=await r.json();
      return ((d.candidates||[])[0]?.content?.parts||[]).map(x=>x.text||'').join('\n');
    }
    throw new Error(errorIA(ult?ult.status:0));
  }
  const r=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-sonnet-5-5',max_tokens:1500,messages:[{role:'user',content:[
      {type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},{type:'text',text:PROMPT_IA}]}]})});
  if(!r.ok) throw new Error(errorIA(r.status));
  const d=await r.json();
  return (d.content||[]).map(x=>x.text||'').join('\n');
}
function errorIA(st){
  if(st===401||st===403||st===400) return 'La clave no sirve o no tiene permiso. Revisala en Ajustes → Lector con IA.';
  if(st===429) return 'Se pasó el límite de uso de la clave. Probá en un rato.';
  if(st===402) return 'La clave no tiene saldo.';
  return 'El servicio de IA no respondió (código '+st+').';
}
function configurarIA(){
  closeCfg();
  const act=lsGet(SK_IA);
  const k=prompt('Lector con IA para letra a mano.\n\nPegá tu clave:\n• Gratis: de Google AI Studio (empieza con AIza)\n• O de Anthropic (empieza con sk-ant-)\n\nQueda guardada solo en este celular. Dejá vacío para quitarla.',act||'');
  if(k===null) return;
  const v=k.trim();
  if(!v){lsDel(SK_IA);actualizarIAEst();showToast('Lector con IA desactivado');return;}
  if(!/^(AIza|sk-ant-)/.test(v)){showToast('Esa clave no parece válida (AIza… o sk-ant-…)',true);return;}
  lsSet(SK_IA,v);actualizarIAEst();showToast('Lector con IA activado ✓');
}
function actualizarIAEst(){const b=document.getElementById('btnIA');if(b&&FUNC_IA)b.style.display='';const e=document.getElementById('iaEst');if(e)e.textContent=lsGet(SK_IA)?'Activado ✓ (lee letra a mano)':'Sin activar · tocá para configurar';}

// ── LISTA DE DIRECCIONES DESDE UNA FOTO (OCR en el celular con Tesseract, gratis)
let _tessP=null;
function cargarTesseract(){
  if(window.Tesseract) return Promise.resolve();
  if(_tessP) return _tessP;
  _tessP=new Promise((res,rej)=>{
    const sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    sc.onload=res;sc.onerror=()=>{_tessP=null;rej(new Error('No se pudo cargar el lector. Revisá tu internet.'));};
    document.head.appendChild(sc);
  });
  return _tessP;
}
// achica y mejora el contraste (gris + auto-niveles) para que lea mejor
async function prepararFotoOCR(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
    const m=2200,r=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*r);c.height=Math.round(img.naturalHeight*r);
    const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height),a=d.data;
    const h=new Uint32Array(256);
    for(let i=0;i<a.length;i+=4){const g=(a[i]*.3+a[i+1]*.59+a[i+2]*.11)|0;a[i]=a[i+1]=a[i+2]=g;h[g]++;}
    const tot=c.width*c.height;let lo=0,hi=255,ac=0;
    for(let i=0;i<256;i++){ac+=h[i];if(ac>tot*.02){lo=i;break;}}
    ac=0;for(let i=255;i>=0;i--){ac+=h[i];if(ac>tot*.2){hi=i;break;}}
    if(hi<=lo+10){lo=0;hi=255;}
    const k=255/(hi-lo);
    for(let i=0;i<a.length;i+=4){const v=Math.max(0,Math.min(255,(a[i]-lo)*k));a[i]=a[i+1]=a[i+2]=v;}
    x.putImageData(d,0,0);
    return c;
  }finally{URL.revokeObjectURL(url);}
}
function ocrEstado(msg,pct){
  const e=document.getElementById('ocrEst');if(e)e.textContent=msg;
  const b=document.getElementById('ocrBarIn');if(b&&pct!=null)b.style.width=Math.round(pct*100)+'%';
}
function ocrEscribir(){
  const dlg=document.getElementById('ocrDlg'),txt=document.getElementById('ocrTxt');
  txt.value='';document.getElementById('ocrOk').disabled=false;
  document.getElementById('ocrBar').style.display='none';
  ocrEstado('Escribí o pegá una dirección por línea (calle y altura).',null);
  dlg.classList.add('show');setTimeout(()=>txt.focus(),300);
}
function ocrCerrar(){document.getElementById('ocrDlg').classList.remove('show');}
async function ocrArchivo(input){
  const file=input.files[0];input.value='';
  if(!file) return;
  const dlg=document.getElementById('ocrDlg'),txt=document.getElementById('ocrTxt'),ok=document.getElementById('ocrOk');
  txt.value='';ok.disabled=true;dlg.classList.add('show');
  document.getElementById('ocrBar').style.display='block';
  try{
    const claveIA=FUNC_IA&&lsGet(SK_IA);
    if(claveIA){
      ocrEstado('Leyendo la lista con IA (aguantá unos segundos)…',.4);
      try{
        const t=await leerConIA(file,claveIA);
        txt.value=t.split(/\r?\n/).map(l=>l.replace(/^[\s\-•*]+/,'').replace(/^\d{1,3}\s*[.)]\s+(?=\D)/,'').trim()).filter(l=>l.length>=4).join('\n');
        ocrEstado(txt.value?'Listo. Revisá el texto y corregí lo que haga falta.':'La IA no encontró direcciones. Probá con otra foto.',1);
        ok.disabled=false;return;
      }catch(e){
        console.error('ia:',e);
        ocrEstado((e&&e.message?e.message:'Error con la IA')+' Probando con el lector común…',.1);
      }
    }
    ocrEstado('Preparando la foto…',.03);
    const canvas=await prepararFotoOCR(file);
    ocrEstado('Cargando el lector (la primera vez baja unos 10 MB)…',.06);
    await cargarTesseract();
    const worker=await Tesseract.createWorker('spa',1,{logger:m=>{
      if(m.status==='recognizing text') ocrEstado('Leyendo la lista… '+Math.round(m.progress*100)+'%',.2+m.progress*.8);
      else if(/loading|initializ/.test(m.status||'')) ocrEstado('Preparando el lector…',.1);
    }});
    const r=await worker.recognize(canvas);
    try{await worker.terminate();}catch(e){}
    txt.value=limpiarLineasOCR(r.data.text||'').join('\n');
    ocrEstado(txt.value?'Listo. Revisá el texto y corregí lo que haga falta.':'No se pudo leer texto. Probá con otra foto más derecha y con buena luz.',1);
  }catch(e){
    console.error('ocr:',e);
    ocrEstado('Error: '+(e&&e.message?e.message:'no se pudo leer la foto')+'. Podés escribir o pegar la lista acá.',0);
  }
  ok.disabled=false;
}
function limpiarLineasOCR(t){
  return t.split(/\r?\n/).map(l=>l
      .replace(/^[\s\-–—•*·|_\[\]()]+/,'')           // viñetas
      .replace(/^\d{1,3}\s*[.)\-:]\s+(?=\D)/,'')    // numeración "1. " / "2) "
      .replace(/[|_]+/g,' ').replace(/\s+/g,' ').trim())
    .filter(l=>l.length>=5&&/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(l));
}
function ocrArmarRuta(){
  const lineas=document.getElementById('ocrTxt').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lineas.length){showToast('No hay direcciones para cargar',true);return;}
  const base=Date.now().toString(36).toUpperCase(),usados=new Set(puntos.map(p=>p.id));
  const nuevos=lineas.map((l,i)=>{
    let id='F'+base+'-'+String(i+1).padStart(2,'0'),nombre='',dir=l;
    const pt=l.split(/\s*[;\t|]\s*/).filter(Boolean);
    if(pt.length>=3){id=pt[0];nombre=pt[1];dir=pt.slice(2).join(' ');}
    else if(pt.length===2){nombre=pt[0];dir=pt[1];}
    return {id:usados.has(id)?id+'b':id,nombre:nombre||dir,dir,localidad:'Rosario',tipo:'',obs:'',lat:null,lng:null,geoErr:null};
  });
  puntos=[...puntos,...nuevos];
  nuevos.forEach(n=>sel.add(n.id));
  lsSet(SK.puntos,puntos);lsSet(SK.sel,[...sel]);
  ocrCerrar();renderP();updStats();
  showToast(nuevos.length+' direcciones cargadas y en la ruta ✓');
  setTimeout(()=>geocodificarTodos(true),400);
  triggerAutosave();
}
