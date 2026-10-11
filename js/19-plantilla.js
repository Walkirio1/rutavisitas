// Planilla general de la app (sin marca de empresa, editable) y elección de la planilla en uso
// Modos: 'general' (la de la app) · 'sube' (la oficial incluida) · 'pdf' (un PDF cargado por el usuario, mismo formato que la oficial)
const SK_PLTPL='sube:plantilla', SK_PLMODO='sube:plmodo';
const PLANTILLA_BASE={
  titulo:'Planilla de verificación',
  foto:'aparte', // 'aparte' (archivo propio) · 'planilla' (dentro del PDF) · 'no'
  secA:{nombre:'Irregularidades del local',items:['Domicilio inexistente','Local cerrado','No atiende / sin responsable','Sin cartelería','Sin servicio','Cobro adicional','Otra irregularidad']},
  secB:{nombre:'Otras observaciones',items:['Sin stock','Otro']},
  campos:[] // campos adicionales: {id,tipo,etiqueta,obligatorio,opciones} (ver js/20-campos.js)
};
function plantilla(){
  const t=lsGet(SK_PLTPL);
  return t&&t.secA&&t.secB?t:JSON.parse(JSON.stringify(PLANTILLA_BASE));
}
function modoPlanilla(){
  if(plDefId&&planillas.some(x=>x.id===plDefId)) return 'pdf';
  return lsGet(SK_PLMODO)||'general';
}
// Ajusta las listas que usan el formulario, el Excel y el PDF según la planilla en uso
function aplicarPlantilla(){
  if(!lsGet(SK_PLMODO)){
    // primera vez: quien ya usaba la app sigue con la oficial; quien empieza de cero arranca con la general
    const usaba=localStorage.getItem('sube:puntos')||localStorage.getItem('sube:historial')||localStorage.getItem('sube:drvon');
    lsSet(SK_PLMODO,usaba?'sube':'general');
  }
  if(modoPlanilla()==='general'){
    const t=plantilla();
    CN=t.secA.items.slice();VN=t.secB.items.slice();TIT_A=t.secA.nombre;TIT_B=t.secB.nombre;
  }else{
    CN=CN_SUBE.slice();VN=VN_SUBE.slice();TIT_A='Irregularidad de Carga';TIT_B='Irregularidad en la Venta';
  }
}
// Dónde va la foto de la visita (solo la planilla general lo permite elegir; las otras la mandan aparte)
function fotoModo(){return modoPlanilla()==='general'?(plantilla().foto||'aparte'):'aparte';}
function nombrePlanillaActiva(){
  const m=modoPlanilla();
  if(m==='general') return 'general de la app';
  if(m==='pdf'){const p=planillas.find(x=>x.id===plDefId);return (p&&p.nombre)||'mi planilla';}
  return 'oficial SUBE';
}
function setPlModo(m){
  plDefId=null;lsDel(SK.plDef);lsSet(SK_PLMODO,m);
  aplicarPlantilla();renderPlanillas();showToast('Planilla en uso actualizada ✓');
}
// Irregularidades marcadas en una visita; usa los nombres guardados con la visita (así editar la planilla no cambia visitas viejas)
function irregsDe(pl){
  if(!pl) return [];
  const a=pl.itemsC||CN,b=pl.itemsV||VN;
  return a.filter((_,i)=>pl.chC&&pl.chC[i]).concat(b.filter((_,i)=>pl.chV&&pl.chV[i]));
}

// ── EDITOR
let _plEd=null;
function editarPlantilla(){
  _plEd=JSON.parse(JSON.stringify(plantilla()));
  pintarEditorPlantilla();
  document.getElementById('plEditDlg').classList.add('show');
}
function pintarEditorPlantilla(){
  const e=_plEd;
  document.getElementById('plEdTitulo').value=e.titulo;
  pintarEditorCampos();
  document.getElementById('plEdFoto').value=e.foto||'aparte';
  [['A','secA'],['B','secB']].forEach(([k,s])=>{
    document.getElementById('plEdNom'+k).value=e[s].nombre;
    document.getElementById('plEdLista'+k).innerHTML=e[s].items.map((t,i)=>
      `<div class="pled-row"><input type="text" value="${escapeHtml(t)}" onchange="_plEd.${s}.items[${i}]=this.value"><button onclick="plEdQuitar('${s}',${i})" aria-label="Quitar">✕</button></div>`).join('');
  });
}
function plEdQuitar(s,i){_plEd[s].items.splice(i,1);pintarEditorPlantilla();}
function plEdAgregar(s){
  const inp=document.getElementById(s==='secA'?'plEdNuevoA':'plEdNuevoB'),v=inp.value.trim();
  if(!v) return;
  if(_plEd[s].items.length>=14){showToast('Máximo 14 ítems por sección',true);return;}
  _plEd[s].items.push(v);inp.value='';pintarEditorPlantilla();
}
function plEdGuardar(){
  const e=_plEd;
  e.titulo=document.getElementById('plEdTitulo').value.trim()||PLANTILLA_BASE.titulo;
  e.foto=document.getElementById('plEdFoto').value;
  e.secA.nombre=document.getElementById('plEdNomA').value.trim()||PLANTILLA_BASE.secA.nombre;
  e.secB.nombre=document.getElementById('plEdNomB').value.trim()||PLANTILLA_BASE.secB.nombre;
  e.secA.items=e.secA.items.map(x=>String(x).trim()).filter(Boolean).slice(0,14);
  e.secB.items=e.secB.items.map(x=>String(x).trim()).filter(Boolean).slice(0,14);
  e.campos=(e.campos||[]).map(c=>({...c,etiqueta:String(c.etiqueta||'').trim()})).filter(c=>c.etiqueta).slice(0,12);
  if(!e.secA.items.length){showToast('La primera sección necesita al menos un ítem',true);return;}
  lsSet(SK_PLTPL,e);aplicarPlantilla();renderPlanillas();
  document.getElementById('plEditDlg').classList.remove('show');
  showToast('Planilla general guardada ✓');
}
function plEdRestablecer(){
  confirm2('¿Volver a la planilla general original de la app?',function(){_plEd=JSON.parse(JSON.stringify(PLANTILLA_BASE));pintarEditorPlantilla();});
}
function plEdCerrar(){document.getElementById('plEditDlg').classList.remove('show');}

// ── PDF de la planilla general (se arma desde cero, sin marca de empresa)
async function generarPlanillaGeneralPDF(punto,visita){
  if(!window.PDFLib) throw new Error('pdf-lib no cargó');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const doc=await PDFDocument.create();
  let page=doc.addPage([595,842]);
  const f=await doc.embedFont(StandardFonts.Helvetica),fb=await doc.embedFont(StandardFonts.HelveticaBold);
  const pl=visita.planilla||{},t=plantilla();
  // WinAnsi (Helvetica) no tiene todos los caracteres: se limpian los que no entran
  const L=s=>String(s==null?'':s).replace(/[^\x20-\x7EÀ-ÿ]/g,'');
  const azul=rgb(.05,.16,.47),gris=rgb(.35,.4,.5),negro=rgb(0,0,0);
  let y=800;
  const hace=h=>{if(y-h<50){page=doc.addPage([595,842]);y=800;}}; // si no entra, sigue en otra hoja
  page.drawText(L(t.titulo),{x:40,y,size:20,font:fb,color:azul});y-=10;
  page.drawLine({start:{x:40,y},end:{x:555,y},thickness:1.5,color:azul});y-=24;
  const campo=(k,v)=>{page.drawText(k,{x:40,y,size:9,font:fb,color:gris});page.drawText(L(v).slice(0,80),{x:120,y,size:11,font:f,color:negro});y-=18;};
  campo('Fecha',pl.fecha||hoy());campo('Hora',pl.hora||ahora());
  campo('Dirección',(punto.dir||'')+(punto.localidad?' - '+punto.localidad:''));
  campo('Local',punto.nombre||'');campo('Rubro',pl.rubro||punto.tipo||'');
  y-=8;
  const seccion=(nombre,items,marc)=>{
    hace(40);
    page.drawRectangle({x:40,y:y-4,width:515,height:18,color:rgb(.88,.93,1)});
    page.drawText(L(nombre).toUpperCase(),{x:46,y:y+1,size:10,font:fb,color:azul});y-=24;
    items.forEach((it,i)=>{
      hace(20);
      page.drawRectangle({x:48,y:y-2,width:11,height:11,borderColor:negro,borderWidth:.8});
      if(marc&&marc[i]) page.drawText('X',{x:49.6,y:y-1,size:11,font:fb,color:negro});
      page.drawText(L(it),{x:68,y,size:10.5,font:f,color:negro});y-=17;
    });
    y-=8;
  };
  seccion(pl.titA||t.secA.nombre,pl.itemsC||t.secA.items,pl.chC);
  if((pl.itemsV||t.secB.items).length) seccion(pl.titB||t.secB.nombre,pl.itemsV||t.secB.items,pl.chV);
  // campos adicionales (texto, número, fecha, sí/no, opciones, firma)
  const defs=pl.extraDef||[];
  if(defs.length){
    hace(60);
    page.drawRectangle({x:40,y:y-4,width:515,height:18,color:rgb(.88,.93,1)});
    page.drawText('DATOS ADICIONALES',{x:46,y:y+1,size:10,font:fb,color:azul});y-=26;
    for(const c of defs){
      const v=(pl.extra||{})[c.id];
      if(c.tipo==='firma'){
        hace(100);
        page.drawText(L(c.etiqueta),{x:48,y,size:9,font:fb,color:gris});y-=6;
        if(v){
          try{
            const im=await doc.embedPng(Uint8Array.from(atob(v.replace(/^data:image\/png;base64,/,'')),ch=>ch.charCodeAt(0)));
            const w=190,h=Math.min(70,w*im.height/im.width);
            page.drawImage(im,{x:48,y:y-h,width:h*im.width/im.height>w?w:h*im.width/im.height,height:h});y-=h+4;
          }catch(e){console.warn('firma en PDF:',e);y-=20;}
        }else y-=36;
        page.drawLine({start:{x:48,y},end:{x:248,y},thickness:.8,color:negro});y-=18;
      }else{
        hace(20);
        page.drawText(L(c.etiqueta),{x:48,y,size:9,font:fb,color:gris});
        page.drawText(L(v==null||v===''?'-':v).slice(0,90),{x:200,y,size:11,font:f,color:negro});y-=18;
      }
    }
    y-=6;
  }
  hace(60);
  page.drawText('OBSERVACIONES',{x:40,y,size:10,font:fb,color:azul});y-=16;
  const obs=L(pl.obs||'');
  if(obs){
    const pal=obs.split(/\s+/);let lin='',ls=[];
    for(const w of pal){if((lin+' '+w).trim().length<=95)lin=(lin+' '+w).trim();else{ls.push(lin);lin=w;}}
    if(lin)ls.push(lin);
    for(const l of ls.slice(0,6)){hace(16);page.drawText(l,{x:40,y,size:10,font:f,color:negro});y-=13;}
  }
  y-=6;
  if(pl.foto&&fotoModo()==='planilla'){
    try{
      const raw=pl.foto.replace(/^data:image\/\w+;base64,/,'');
      const img=await doc.embedJpg(Uint8Array.from(atob(raw),c=>c.charCodeAt(0)));
      let esc=Math.min(300/img.width,1);
      if(y-img.height*esc<50&&y<400){page=doc.addPage([595,842]);y=800;}
      esc=Math.min(300/img.width,Math.max(60,y-40)/img.height,1);
      page.drawImage(img,{x:40,y:y-img.height*esc,width:img.width*esc,height:img.height*esc});
    }catch(e){console.warn('foto en PDF:',e);}
  }
  doc.getPages().forEach(p=>p.drawText('Generado con Verific',{x:40,y:20,size:8,font:f,color:gris}));
  return await doc.saveAsBase64({dataUri:false});
}
