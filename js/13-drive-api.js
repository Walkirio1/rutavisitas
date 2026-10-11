// Google Drive: carpetas y subida de archivos
// --- DRIVE API HELPERS ---
async function driveBuscarCarpeta(nombre, parentId){
  await ensureToken();
  const qParts = [
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `name='${nombre.replace(/'/g,"\\'")}'`,
  ];
  if(parentId) qParts.push(`'${parentId}' in parents`);
  const resp = await gapi.client.drive.files.list({
    q: qParts.join(' and '),
    fields:'files(id,name)',
    pageSize: 5,
  });
  return resp.result.files && resp.result.files[0] ? resp.result.files[0].id : null;
}

async function driveCrearCarpeta(nombre, parentId){
  await ensureToken();
  const metadata = {name:nombre, mimeType:'application/vnd.google-apps.folder'};
  if(parentId) metadata.parents=[parentId];
  const resp = await gapi.client.drive.files.create({resource:metadata, fields:'id,name'});
  return resp.result.id;
}

async function driveGetOrCreateFolder(nombre, parentId){
  let id = await driveBuscarCarpeta(nombre, parentId);
  if(!id) id = await driveCrearCarpeta(nombre, parentId);
  return id;
}

async function driveGetRootFolderId(){
  if(drv.rootFolderId){
    // verificar que sigue existiendo
    try{
      await ensureToken();
      const r=await gapi.client.drive.files.get({fileId:drv.rootFolderId,fields:'id,trashed'});
      if(r.result && !r.result.trashed) return drv.rootFolderId;
    }catch(e){drv.rootFolderId=null;}
  }
  const id = await driveGetOrCreateFolder(drv.folderName, null);
  drv.rootFolderId=id;lsSet(SK.rootFolderId,id);
  return id;
}

// Subir archivo (multipart: metadata + bytes). content puede ser dataURL, base64 plano o Blob.
async function driveUploadFile(nombre, mime, content, parentId){
  await ensureToken();
  let bytes;
  if(typeof content === 'string' && content.startsWith('data:')){
    // dataURL → blob
    const m = content.match(/^data:([^;]+);base64,(.+)$/);
    if(!m) throw new Error('dataURL inválido');
    if(!mime) mime = m[1];
    const bin = atob(m[2]);
    const arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    bytes = new Blob([arr],{type:mime});
  }else if(typeof content === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(content) && content.length > 100){
    // Base64 plano (sin prefijo data:) → blob binario
    try{
      const clean = content.replace(/\s/g,'');
      const bin = atob(clean);
      const arr = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
      bytes = new Blob([arr],{type:mime||'application/octet-stream'});
    }catch(e){
      // Si falla decode, lo tratamos como texto plano
      bytes = new Blob([content],{type:mime||'text/plain'});
    }
  }else if(typeof content === 'string'){
    bytes = new Blob([content],{type:mime||'text/plain'});
  }else{
    bytes = content;
  }
  const metadata = {name:nombre, mimeType:mime};
  if(parentId) metadata.parents=[parentId];

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  form.append('file', bytes);

  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{
    method:'POST',
    headers:{'Authorization':'Bearer '+drv.accessToken},
    body: form,
  });
  if(!resp.ok){
    const txt=await resp.text();
    throw new Error('Upload falló: '+txt);
  }
  return await resp.json();
}

// Planilla oficial por defecto: se usa si en la visita no se eligió otra
let _plDefB64=null;
async function planillaPredeterminadaB64(){
  if(_plDefB64) return _plDefB64;
  const r=await fetch('planilla-predeterminada.pdf');
  if(!r.ok) throw new Error('No se pudo cargar la planilla predeterminada');
  const bytes=new Uint8Array(await r.arrayBuffer());
  let bin='';
  for(let i=0;i<bytes.length;i+=8192) bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
  return _plDefB64=btoa(bin);
}

// Sanea nombres para Drive
function safeName(s){
  return String(s||'').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').substring(0,80);
}

// ═══════════════════════════════════════════════════════════
// RELLENAR PLANILLA PDF CON DATOS DE LA VISITA
// Toma el PDF en blanco (base64) y le sobreimprime los datos
// en las coordenadas exactas mapeadas del PDF oficial SUBE.
// ═══════════════════════════════════════════════════════════
async function rellenarPlanillaPDF(pdfB64, punto, visita){
  if(!window.PDFLib){throw new Error('pdf-lib no cargó');}
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  // Decodificar base64 plano
  let bytes;
  const clean = pdfB64.replace(/\s/g,'');
  const bin = atob(clean);
  bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);

  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pl = visita.planilla || {};
  const fecha = pl.fecha || hoy();
  const hora = pl.hora || ahora();

  // ── COORDENADAS (ya mapeadas y validadas con preview) ──
  // Datos cabecera: x=157.5, y desde abajo
  const drawTxt = (txt, x, y, sz)=> page.drawText(String(txt||''),{x,y,size:sz||10,font,color:rgb(0,0,0)});

  drawTxt(fecha,                157.5, 706.2);
  drawTxt(hora,                 157.5, 681.9);
  drawTxt(punto.id||'',         157.5, 657.7);
  // Dirección: si es muy larga, truncar
  let dir = (punto.dir||'') + (punto.localidad?' - '+punto.localidad:'');
  if(dir.length > 70) dir = dir.substring(0,67) + '...';
  drawTxt(dir,                  157.5, 633.5);
  drawTxt(pl.rubro||'',         157.5, 609.2);

  // ── CHECKBOXES IRREGULARIDAD DE CARGA (X grande centrada DENTRO del cuadrado) ──
  // Ajuste fino de las X de la tabla de carga (en puntos PDF): + derecha / + arriba
  const AJ_CARGA_X = 2.5, AJ_CARGA_Y = -1.5;
  const yCarga = [529.8, 506.0, 482.3, 458.5, 434.7, 411.0, 387.2, 363.4];
  const chC = pl.chC || [];
  for(let i=0;i<8;i++){
    if(chC[i]){
      // X tamaño 16, ancho aprox 10pt → para centrar en x=478 ponemos x=473
      page.drawText('X', {x:473+AJ_CARGA_X, y:yCarga[i]-3+AJ_CARGA_Y, size:16, font:fontBold, color:rgb(0,0,0)});
    }
  }

  // ── CHECKBOXES IRREGULARIDAD VENTA ──
  const yVenta = [279.4, 255.6];
  const chV = pl.chV || [];
  for(let i=0;i<2;i++){
    if(chV[i]){
      page.drawText('X', {x:473, y:yVenta[i]-3, size:16, font:fontBold, color:rgb(0,0,0)});
    }
  }

  // ── OBSERVACIONES (multilínea word-wrap) ──
  if(pl.obs){
    const maxChars = 90;
    const palabras = pl.obs.split(/\s+/);
    const lineas = [];
    let actual = '';
    for(const p of palabras){
      if((actual+' '+p).trim().length <= maxChars){
        actual = (actual+' '+p).trim();
      }else{
        if(actual) lineas.push(actual);
        actual = p;
      }
    }
    if(actual) lineas.push(actual);
    let yObs = 175;
    for(const ln of lineas.slice(0,4)){ // máx 4 líneas para no salir del cuadro
      page.drawText(ln, {x:63, y:yObs, size:9, font, color:rgb(0,0,0)});
      yObs -= 11;
    }
  }

  // Serializar PDF resultante
  const pdfBytes = await pdfDoc.save();
  // Convertir a base64 plano
  let bin2 = '';
  const chunkSize = 8192;
  for(let i=0; i<pdfBytes.length; i+=chunkSize){
    bin2 += String.fromCharCode.apply(null, pdfBytes.subarray(i,i+chunkSize));
  }
  return btoa(bin2);
}

// Subir visita (foto + PDF rellenado) a Drive
async function subirVisitaADrive(punto, visita, pdfB64, pdfNombre){
  if(!drv.connected){marcarEnvio(punto.id,'pendiente','Sin conexión con Drive');return false;}
  const fallos = [];
  try{
    const root = await driveGetRootFolderId();
    const fechaCarpeta = (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
    const dia = await driveGetOrCreateFolder(fechaCarpeta, root);
    const subNombre = safeName(punto.id+'_'+(punto.nombre||'punto'));
    const sub = await driveGetOrCreateFolder(subNombre, dia);

    const hora = (new Date()).toTimeString().slice(0,5).replace(':','');
    const prefix = `${fechaCarpeta}_${hora}`;

    // Subir foto si hay
    if(visita.planilla && visita.planilla.foto){
      try{
        const r = await driveUploadFile(`${prefix}_foto.jpg`,'image/jpeg',visita.planilla.foto,sub);
        if(visits[punto.id]&&visits[punto.id].planilla) visits[punto.id].planilla.driveFotoUrl = r.webViewLink;
      }catch(e){console.error('foto:',e);fallos.push('la foto');}
    }
    // Subir PDF rellenado si hay planilla base
    if(pdfB64){
      try{
        // Rellenar el PDF con los datos antes de subirlo
        let pdfFinal = pdfB64;
        try{
          pdfFinal = await rellenarPlanillaPDF(pdfB64, punto, visita);
        }catch(e){
          console.error('Error rellenando PDF, subo el original:',e);
          showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> No pude rellenar el PDF, se sube en blanco',true);
        }
        const nombreLimpio = safeName(pdfNombre||'planilla').replace(/\.pdf$/i,'');
        const r = await driveUploadFile(`${prefix}_${nombreLimpio}_rellenado.pdf`,'application/pdf',pdfFinal,sub);
        if(visits[punto.id]&&visits[punto.id].planilla) visits[punto.id].planilla.drivePdfUrl = r.webViewLink;
      }catch(e){console.error('pdf:',e);fallos.push('el PDF');}
    }else{
      fallos.push('el PDF (no se pudo cargar la planilla predeterminada)');
    }
  }catch(e){
    console.error('subir a Drive:',e);
    marcarEnvio(punto.id,'pendiente',String((e&&e.message)||e).slice(0,140));
    return false;
  }
  if(fallos.length){
    marcarEnvio(punto.id,'pendiente','No se subió '+fallos.join(' ni '));
    showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-alert"/></svg> No se subió '+fallos.join(' ni '),true);
    return false;
  }
  marcarEnvio(punto.id,'ok');
  showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-cloud"/></svg> Subido a Drive <svg class="ico" style="vertical-align:-2px"><use href="#i-check"/></svg>');
  return true;
}

// ── COPIA A LA EMPRESA: se comparte la carpeta del día (solo lectura) con el correo de la empresa; Google le manda el aviso con el enlace
function emailEmpresa(){return ((lsGet('sube:perfil')||{}).emailEmpresa||'').trim();}
async function compartirDiaConEmpresa(avisar){
  const mail=emailEmpresa();
  if(!mail||!drv.connected){if(avisar)showToast(!mail?'Primero cargá el correo de la empresa en tu perfil':'Conectá Google para enviar la copia',true);return false;}
  try{
    await ensureToken();
    const root=await driveGetRootFolderId();
    const dia=await driveGetOrCreateFolder((new Date()).toISOString().slice(0,10),root);
    const hecho=lsGet('sube:compartidos')||[];
    const clave=dia+'|'+mail;
    if(!hecho.includes(clave)){
      await gapi.client.drive.permissions.create({
        fileId:dia,sendNotificationEmail:true,
        emailMessage:'Jornada de verificaciones compartida desde Verific'+((lsGet('sube:perfil')||{}).nombre?' por '+(lsGet('sube:perfil')||{}).nombre:'')+'.',
        resource:{type:'user',role:'reader',emailAddress:mail}
      });
      lsSet('sube:compartidos',[...hecho,clave].slice(-60));
    }
    if(avisar)showToast('Copia enviada a '+mail+' ✓');
    return true;
  }catch(e){
    console.error('compartir con la empresa:',e);
    if(avisar)showToast('No se pudo enviar la copia a la empresa',true);
    return false;
  }
}
