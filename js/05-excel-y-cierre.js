// Excel actualizado, borrar día, cerrar día, estadísticas
// ── EXCEL ACTUALIZADO: el Excel importado + estado de cada punto (verde = visitado, rojo = cerrado / no visitado)
const _crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=_crcT[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
// ZIP sin compresión (alcanza para un .xlsx chico)
function zipStore(archivos){
  const enc=new TextEncoder();const partes=[];const central=[];let offset=0;
  const d=new Date();const dosT=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  const dosD=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const [nombre,contenido] of archivos){
    const nb=enc.encode(nombre);const data=typeof contenido==='string'?enc.encode(contenido):contenido;const crc=crc32(data);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);
    lh.setUint16(10,dosT,true);lh.setUint16(12,dosD,true);lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);
    lh.setUint16(26,nb.length,true);lh.setUint16(28,0,true);
    partes.push(new Uint8Array(lh.buffer),nb,data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);
    ch.setUint16(12,dosT,true);ch.setUint16(14,dosD,true);ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);
    ch.setUint16(28,nb.length,true);ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer),nb);
    offset+=30+nb.length+data.length;
  }
  const tamC=central.reduce((a,b)=>a+b.length,0);
  const fin=new DataView(new ArrayBuffer(22));
  fin.setUint32(0,0x06054b50,true);fin.setUint16(8,archivos.length,true);fin.setUint16(10,archivos.length,true);
  fin.setUint32(12,tamC,true);fin.setUint32(16,offset,true);
  const todo=[...partes,...central,new Uint8Array(fin.buffer)];
  const out=new Uint8Array(todo.reduce((a,b)=>a+b.length,0));let o=0;
  for(const p of todo){out.set(p,o);o+=p.length;}
  return out;
}
const _xe=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
function _colLetra(n){let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;}
// filas: array de arrays; estilos: array con el estilo de cada fila (0 normal, 1 encabezado, 2 verde, 3 rojo)
function construirXlsx(filas,estilos,nombreHoja){
  const ncols=Math.max(...filas.map(f=>f.length));
  const anchos=Array.from({length:ncols},(_,c)=>Math.min(50,Math.max(10,...filas.map(f=>String(f[c]==null?'':f[c]).length+2))));
  let filasXml='';
  filas.forEach((f,r)=>{
    let celdas='';
    for(let c=0;c<ncols;c++){
      const v=f[c]==null?'':f[c];const ref=_colLetra(c)+(r+1);const st=estilos[r]?` s="${estilos[r]}"`:'';
      if(typeof v==='number'&&isFinite(v)) celdas+=`<c r="${ref}"${st}><v>${v}</v></c>`;
      else celdas+=`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${_xe(v)}</t></is></c>`;
    }
    filasXml+=`<row r="${r+1}">${celdas}</row>`;
  });
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const hoja=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${anchos.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${filasXml}</sheetData></worksheet>`;
  const fill=rgb=>`<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
  const xf=(font,fillId)=>`<xf numFmtId="0" fontId="${font}" fillId="${fillId}" borderId="0" xfId="0"${font?' applyFont="1"':''}${fillId?' applyFill="1"':''}/>`;
  const estilosXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill('FFD9D9D9')}${fill('FFC6EFCE')}${fill('FFFFC7CE')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4">${xf(0,0)}${xf(1,2)}${xf(0,3)}${xf(0,4)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zipStore([
    ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${R}"><sheets><sheet name="${_xe(nombreHoja||'Jornada')}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',estilosXml],
    ['xl/worksheets/sheet1.xml',hoja]
  ]);
}

// Arma las filas: el Excel importado (todas sus columnas) + Estado, fecha, hora, irregularidades, observaciones y envío
function filasJornadaExcel(){
  const ex=lsGet('sube:excel');
  let aoa=(ex&&ex.aoa&&ex.aoa.length>1)?ex.aoa.map(r=>r.slice()):[['Ubicación ID','Ubicación','Dirección','Localidad','Tipo Centro'],...puntos.map(p=>[p.id,p.nombre,p.dir,p.localidad,p.tipo])];
  const cab=aoa[0].map(h=>String(h==null?'':h));
  let cId=cab.findIndex(h=>/^(ubicaci[oó]n\s*id|id)$/i.test(h.trim()));if(cId<0)cId=0;
  const cNom=cab.findIndex(h=>/^(ubicaci[oó]n|nombre)$/i.test(h.trim()));
  const cDir=cab.findIndex(h=>/^direcci[oó]n$/i.test(h.trim()));
  const cLoc=cab.findIndex(h=>/^localidad$/i.test(h.trim()));
  const cTip=cab.findIndex(h=>/^tipo centro$/i.test(h.trim()));
  // puntos que se cargaron después y no estaban en el Excel original
  const ya=new Set(aoa.slice(1).map(r=>String(r[cId])));
  puntos.forEach(p=>{if(!ya.has(String(p.id))){const r=new Array(cab.length).fill('');r[cId]=p.id;if(cNom>=0)r[cNom]=p.nombre;if(cDir>=0)r[cDir]=p.dir;if(cLoc>=0)r[cLoc]=p.localidad;if(cTip>=0)r[cTip]=p.tipo;aoa.push(r);}});
  const extra=['Estado','Fecha visita','Hora','Irregularidades','Observaciones de la visita','Datos adicionales','Ubicación de la visita','Distancia al local (m)','Duración (min)','Enviado a Drive'];
  const filas=[[...cab,...extra]];const estilos=[1];
  aoa.slice(1).forEach(r=>{
    const id=String(r[cId]);const v=visits[id];const est=estadoVisita(id);const pl=v&&v.planilla;
    const irr=pl?irregsDe(pl).join(', '):'';
    const txt={ok:'VISITADO ✓',cerrado:'CERRADO',no:'NO VISITADO'}[est]||(sel.has(id)?'Pendiente':'');
    filas.push([...cab.map((_,i)=>r[i]==null?'':r[i]),txt,pl?pl.fecha||'':'',pl?pl.hora||'':'',irr,pl?pl.obs||'':'',pl?textoExtras(pl):'',pl&&pl.gps?pl.gps.lat+', '+pl.gps.lng:'',pl&&pl.dist!=null?pl.dist:'',pl&&pl.durMin!=null?pl.durMin:'',v&&v.envio?(v.envio.estado==='ok'?'Sí':'No'):'']);
    estilos.push(est==='ok'?2:(est?3:0));
  });
  return {filas,estilos};
}
function generarExcelJornada(){
  const {filas,estilos}=filasJornadaExcel();
  const bytes=construirXlsx(filas,estilos,'Jornada');
  const nombre='Jornada_'+hoy().replace(/\//g,'-')+'_actualizado.xlsx';
  return new File([bytes],nombre,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
async function subirExcelADrive(file){
  const root=await driveGetRootFolderId();
  const dia=await driveGetOrCreateFolder((new Date()).toISOString().slice(0,10),root);
  await driveUploadFile(file.name,file.type,file,dia);
}
async function exportarExcel(){
  if(!puntos.length){showToast('Importá un Excel primero',true);return;}
  const file=generarExcelJornada();
  if(drv.connected){
    subirExcelADrive(file).then(()=>showToast('<svg class="ico" style="vertical-align:-2px"><use href="#i-cloud"/></svg> Excel guardado en tu Drive')).catch(e=>{console.warn('excel a Drive:',e);});
  }
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:file.name});return;}
    catch(e){if(e&&e.name==='AbortError') return;}
  }
  descargarArchivos([file]);
}

// ── BORRAR DÍA ACTUAL
function borrarDia(){
  confirm2('¿Borrar todos los puntos y visitas del día actual?',function(){
    puntos=[];sel=new Set();visits={};
    lsSet(SK.puntos,[]);lsSet(SK.sel,[]);lsSet(SK.visits,{});fotosClear();lsDel('sube:excel');ordenRuta=[];lsDel(SK_ORDEN);
    renderP();updStats();showToast('Día actual borrado ✓');
  });
}

// ── CERRAR DÍA → HISTORIAL
function cerrarDia(){
  const sinEnviar=pendientesEnvio().length;
  if(sinEnviar){
    showToast('Hay '+sinEnviar+' visita'+(sinEnviar>1?'s':'')+' sin enviar a Drive: reintentá o guardalas en el celular antes de cerrar el día',true);
    showTab(1);return;
  }
  const enRuta=puntos.filter(p=>sel.has(p.id));
  const hechos=puntos.filter(p=>estadoVisita(p.id)==='ok'); // los verdes
  if(!hechos.length){showToast('No hay visitas hechas (verdes) para cerrar',true);return;}
  const quedan=puntos.length-hechos.length;
  confirm2('¿Cerrar el día? '+(hechos.length===1?'La visita hecha (verde) sale':'Las '+hechos.length+' visitas hechas (verdes) salen')+' del mapa y se guarda'+(hechos.length===1?'':'n')+' en el historial. '+(quedan?'Quedan '+quedan+' punto'+(quedan===1?'':'s')+' (sin visitar o cerrados).':'No queda ningún punto.'),function(){
    // el Excel del día queda en Drive antes de limpiar
    try{const fx=generarExcelJornada();if(drv.connected)subirExcelADrive(fx).then(()=>emailEmpresa()?compartirDiaConEmpresa(true):0).catch(e=>console.warn('excel del día:',e));}catch(e){console.warn(e);}
    const entrada={
      fecha:hoy(),hora:ahora(),
      puntos:enRuta,
      visits:visitsSinFotos(visits), // el historial no guarda fotos (ya se enviaron a Drive)
      total:enRuta.length,
      hechos:hechos.length,
    };
    historial=[entrada,...historial].slice(0,60);
    const ids=new Set(hechos.map(p=>p.id));
    hechos.forEach(p=>{fotoDel(p.id);fotosEnIDB.delete(String(p.id));});
    puntos=puntos.filter(p=>!ids.has(p.id));
    sel=new Set([...sel].filter(id=>!ids.has(id)));
    ids.forEach(id=>{delete visits[id];});
    lsSet(SK.historial,historial);
    lsSet(SK.puntos,puntos);lsSet(SK.sel,[...sel]);guardarVisits();
    renderP();updStats();renderH();renderV();
    if(typeof renderMapa==='function'&&mapa) renderMapa(true);
    showToast('Día cerrado: '+hechos.length+(hechos.length===1?' visita guardada':' visitas guardadas')+' ✓');
    if(drv.connected) borrarJornadaActualDrive().catch(()=>{});
    showTab(3);
  });
}

// ── STATS
function updStats(){
  const enRuta=puntos.filter(p=>sel.has(p.id));
  const hchos=enRuta.filter(p=>visits[p.id]&&visits[p.id].done).length;
  document.getElementById('s0').textContent=enRuta.length;
  document.getElementById('s1').textContent=hchos;
  document.getElementById('s2').textContent=enRuta.length-hchos;
}
