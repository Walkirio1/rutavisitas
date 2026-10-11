// Diseñador de planillas PDF: el usuario marca sobre la hoja dónde va cada campo (tilde, texto, número, fecha, firma,
// suma de puntos o dato automático). Con eso la app arma el formulario de la visita y rellena el PDF de esa empresa.
let _ds=null; // {id,pdf,pag,pw,ph,zoom,campos,tool}
const TOOLS_DS={
  tilde:{n:'✕ Tilde',w:14,h:14,c:'#dc2626'},
  texto:{n:'Aa Texto',w:150,h:14,c:'#2563eb'},
  numero:{n:'123 Número',w:50,h:14,c:'#7c3aed'},
  fecha:{n:'📅 Fecha',w:80,h:14,c:'#0891b2'},
  firma:{n:'✍️ Firma',w:170,h:62,c:'#16a34a'},
  suma:{n:'Σ Suma',w:50,h:14,c:'#d97706'},
  auto:{n:'⚙ Dato auto',w:150,h:14,c:'#64748b'}
};
const FUENTES_AUTO={fecha:'Fecha de la visita',hora:'Hora',id:'ID del punto',direccion:'Dirección',nombre:'Nombre del local',rubro:'Rubro'};

function pdfConCampos(){
  if(modoPlanilla()!=='pdf') return null;
  const p=planillas.find(x=>x.id===plDefId);
  return p&&p.campos&&p.campos.length?p:null;
}

// ── Abrir el diseñador
async function abrirDisenador(id){
  const pl=planillas.find(x=>x.id===id);if(!pl) return;
  try{
    showToast('Abriendo la planilla…');
    await cargarPdfJs();
    const bin=atob(pl.b64.replace(/\s/g,''));const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
    _ds={id,pdf,pag:0,pw:0,ph:0,zoom:1,tool:'tilde',campos:JSON.parse(JSON.stringify(pl.campos||[]))};
    document.getElementById('dsDlg').classList.add('show');
    pintarHerramientas();
    await pintarPagDs();
  }catch(e){console.error('diseñador:',e);showToast(e.message||'No se pudo abrir la planilla',true);cerrarDisenador();}
}
function cerrarDisenador(){document.getElementById('dsDlg').classList.remove('show');_ds=null;}

function pintarHerramientas(){
  document.getElementById('dsTools').innerHTML=Object.entries(TOOLS_DS).map(([k,t])=>
    `<button class="dst${_ds.tool===k?' on':''}" style="--c:${t.c}" onclick="dsTool('${k}')">${t.n}</button>`).join('');
}
function dsTool(k){_ds.tool=k;pintarHerramientas();}

async function pintarPagDs(){
  const pg=await _ds.pdf.getPage(_ds.pag+1),vp1=pg.getViewport({scale:1});
  _ds.pw=vp1.width;_ds.ph=vp1.height;
  const wrap=document.getElementById('dsWrap'),base=document.getElementById('dsScroll').clientWidth-16||360;
  const css=Math.min(base*_ds.zoom,2000);
  wrap.style.width=css+'px';
  const cv=document.getElementById('dsCv'),esc=Math.min(css*2,3000)/vp1.width,vp=pg.getViewport({scale:esc});
  cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
  await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  document.getElementById('dsHoja').textContent='Hoja '+(_ds.pag+1)+' de '+_ds.pdf.numPages;
  document.getElementById('dsZoomT').textContent=Math.round(_ds.zoom*100)+'%';
  pintarMarcas();
}
async function dsHoja(d){const n=Math.max(0,Math.min(_ds.pdf.numPages-1,_ds.pag+d));if(n===_ds.pag) return;_ds.pag=n;await pintarPagDs();}
async function dsZoom(f){_ds.zoom=Math.max(1,Math.min(4,_ds.zoom*f));await pintarPagDs();}

function pintarMarcas(){
  const lay=document.getElementById('dsMarcas');
  lay.innerHTML=_ds.campos.map((c,i)=>{
    if(c.pag!==_ds.pag) return '';
    const t=TOOLS_DS[c.tipo]||TOOLS_DS.texto;
    return `<div class="ds-m ds-${c.tipo}" data-i="${i}" style="--c:${t.c};left:${c.x/_ds.pw*100}%;top:${(1-(c.y+c.h)/_ds.ph)*100}%;width:${c.w/_ds.pw*100}%;height:${c.h/_ds.ph*100}%"><span>${c.tipo==='tilde'?'✕':escapeHtml(c.etiqueta||'')}</span></div>`;
  }).join('');
  document.getElementById('dsCuenta').textContent=_ds.campos.length+' campo'+(_ds.campos.length===1?'':'s');
}

// ── Tocar la hoja = nuevo campo; tocar una marca = editarla; arrastrar = moverla
(function(){
  let arr=null;
  const pt=e=>{const r=document.getElementById('dsWrap').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*_ds.pw,y:(1-(e.clientY-r.top)/r.height)*_ds.ph};};
  document.addEventListener('pointerdown',e=>{
    if(!_ds||!document.getElementById('dsDlg').classList.contains('show')) return;
    const wrap=document.getElementById('dsWrap');if(!wrap.contains(e.target)) return;
    const m=e.target.closest&&e.target.closest('.ds-m'),p=pt(e);
    if(m){const c=_ds.campos[+m.dataset.i];arr={i:+m.dataset.i,dx:p.x-c.x,dy:p.y-c.y,sx:e.clientX,sy:e.clientY,mov:false};}
    else arr={nuevo:true,p,sx:e.clientX,sy:e.clientY};
  });
  document.addEventListener('pointermove',e=>{
    if(!arr||arr.nuevo||!_ds) return;
    if(!arr.mov&&Math.hypot(e.clientX-arr.sx,e.clientY-arr.sy)<6) return;
    arr.mov=true;const p=pt(e),c=_ds.campos[arr.i];
    c.x=Math.max(0,Math.min(_ds.pw-c.w,p.x-arr.dx));c.y=Math.max(0,Math.min(_ds.ph-c.h,p.y-arr.dy));pintarMarcas();
  });
  document.addEventListener('pointerup',e=>{
    if(!arr||!_ds){arr=null;return;}
    const a=arr;arr=null;
    if(Math.hypot(e.clientX-a.sx,e.clientY-a.sy)>=6) return; // fue un arrastre
    if(a.nuevo) dsAgregar(a.p); else dsEditar(a.i);
  });
})();

function dsAgregar(p){
  const t=TOOLS_DS[_ds.tool];
  const c={id:'p'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),tipo:_ds.tool,etiqueta:'',pag:_ds.pag,w:t.w,h:t.h,x:p.x-t.w/2,y:p.y-t.h/2};
  c.x=Math.max(0,Math.min(_ds.pw-c.w,c.x));c.y=Math.max(0,Math.min(_ds.ph-c.h,c.y));
  if(c.tipo==='auto') c.fuente='fecha';
  _ds.campos.push(c);pintarMarcas();dsEditar(_ds.campos.length-1,true);
}

// ── Editar un campo
let _dsEdI=null,_dsEdNuevo=false;
function dsEditar(i,nuevo){
  _dsEdI=i;_dsEdNuevo=!!nuevo;
  const c=_ds.campos[i],t=TOOLS_DS[c.tipo];
  document.getElementById('dsEdTit').textContent=({tilde:'Tilde',texto:'Campo de texto',numero:'Campo de número',fecha:'Campo de fecha',firma:'Firma',suma:'Total / suma',auto:'Dato automático'})[c.tipo];
  const nom=document.getElementById('dsEdNom');nom.value=c.etiqueta||'';
  nom.placeholder=c.tipo==='suma'?'Ej: Total de puntos':(c.tipo==='tilde'?'Ej: Comercio cerrado':'Nombre del campo');
  document.getElementById('dsEdNomBox').style.display=c.tipo==='auto'?'none':'';
  document.getElementById('dsEdAuto').style.display=c.tipo==='auto'?'':'none';
  document.getElementById('dsEdFuente').innerHTML=Object.entries(FUENTES_AUTO).map(([k,n])=>`<option value="${k}"${c.fuente===k?' selected':''}>${n}</option>`).join('');
  document.getElementById('dsEdPuntosBox').style.display=c.tipo==='tilde'?'':'none';
  document.getElementById('dsEdPuntos').value=c.puntos||'';
  document.getElementById('dsEdCierraBox').style.display=c.tipo==='tilde'?'':'none';
  document.getElementById('dsEdCierra').checked=!!c.cierra;
  document.getElementById('dsEdObligBox').style.display=(c.tipo==='auto'||c.tipo==='suma')?'none':'';
  document.getElementById('dsEdOblig').checked=!!c.obligatorio;
  // suma: de qué campos
  const sb=document.getElementById('dsEdSumaBox');
  if(c.tipo==='suma'){
    const fuentes=_ds.campos.filter(x=>x!==c&&(x.tipo==='numero'||(x.tipo==='tilde'&&x.puntos)));
    sb.style.display='';
    document.getElementById('dsEdSuma').innerHTML=fuentes.length?fuentes.map(x=>`<label class="ds-chk"><input type="checkbox" value="${x.id}" ${(!c.suma||c.suma.includes(x.id))?'checked':''}> ${escapeHtml(x.etiqueta||'(sin nombre)')}${x.tipo==='tilde'?' · '+x.puntos+' pts':''}</label>`).join(''):'<div class="pled-nota">Todavía no marcaste campos de número ni tildes con puntos. Marcalos y volvé a editar este total.</div>';
  }else sb.style.display='none';
  document.getElementById('dsEdDlg').classList.add('show');
}
function dsEdGuardar(){
  const c=_ds.campos[_dsEdI];
  if(c.tipo==='auto'){c.fuente=document.getElementById('dsEdFuente').value;c.etiqueta=FUENTES_AUTO[c.fuente];}
  else{
    const n=document.getElementById('dsEdNom').value.trim();
    if(!n){showToast('Escribí el nombre del campo',true);return;}
    c.etiqueta=n;
  }
  if(c.tipo==='tilde'){c.puntos=parseFloat(document.getElementById('dsEdPuntos').value)||0;if(!c.puntos)delete c.puntos;c.cierra=document.getElementById('dsEdCierra').checked;}
  if(c.tipo!=='auto'&&c.tipo!=='suma') c.obligatorio=document.getElementById('dsEdOblig').checked;
  if(c.tipo==='suma'){
    const marc=[...document.querySelectorAll('#dsEdSuma input:checked')].map(i=>i.value),todos=document.querySelectorAll('#dsEdSuma input').length;
    c.suma=marc.length===todos?null:marc; // null = todos
    if(c.suma===null) delete c.suma;
  }
  document.getElementById('dsEdDlg').classList.remove('show');pintarMarcas();
}
function dsEdTamano(f){const c=_ds.campos[_dsEdI];if(!c) return;const cx=c.x+c.w/2,cy=c.y+c.h/2;c.w*=f;c.h*=f;c.x=Math.max(0,Math.min(_ds.pw-c.w,cx-c.w/2));c.y=Math.max(0,Math.min(_ds.ph-c.h,cy-c.h/2));pintarMarcas();}
function dsEdBorrar(){
  _ds.campos.splice(_dsEdI,1);document.getElementById('dsEdDlg').classList.remove('show');pintarMarcas();
}
function dsEdCancelar(){
  if(_dsEdNuevo&&!_ds.campos[_dsEdI].etiqueta&&_ds.campos[_dsEdI].tipo!=='auto') _ds.campos.splice(_dsEdI,1);
  document.getElementById('dsEdDlg').classList.remove('show');pintarMarcas();
}

function guardarDisenador(){
  const pl=planillas.find(x=>x.id===_ds.id);if(!pl) return;
  const campos=_ds.campos.filter(c=>c.tipo==='auto'||c.etiqueta);
  if(campos.length) pl.campos=campos; else delete pl.campos;
  delete pl.firma; // la firma ahora es un campo más (si hacía falta)
  lsSet(SK.planillas,planillas);cerrarDisenador();aplicarPlantilla();renderPlanillas();
  showToast(campos.length?'Campos guardados ✓ Ya podés usar la planilla':'Planilla sin campos: se usa como la oficial');
}

// ── Cálculo de sumas (en el formulario y en el PDF)
function valorSuma(c,valores,campos){
  const fuentes=campos.filter(x=>x!==c&&(c.suma?c.suma.includes(x.id):(x.tipo==='numero'||(x.tipo==='tilde'&&x.puntos))));
  let t=0;
  fuentes.forEach(x=>{
    if(x.tipo==='numero') t+=parseFloat(String(valores[x.id]).replace(',','.'))||0;
    else if(x.tipo==='tilde'&&valores[x.id]==='Sí') t+=x.puntos||0;
  });
  return Math.round(t*100)/100;
}

// ── Rellenar el PDF según los campos marcados
async function rellenarPorCampos(pdfB64,plPdf,punto,visita){
  if(!window.PDFLib) throw new Error('pdf-lib no cargó');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const bin=atob(pdfB64.replace(/\s/g,''));const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  const doc=await PDFDocument.load(bytes),f=await doc.embedFont(StandardFonts.Helvetica),fb=await doc.embedFont(StandardFonts.HelveticaBold);
  const pl=visita.planilla||{},val=pl.extra||{},campos=plPdf.campos||[],paginas=doc.getPages();
  const L=s=>String(s==null?'':s).replace(/[^\x20-\x7EÀ-ÿ]/g,'');
  const auto={fecha:pl.fecha||hoy(),hora:pl.hora||ahora(),id:punto.id||'',direccion:(punto.dir||'')+(punto.localidad?' - '+punto.localidad:''),nombre:punto.nombre||'',rubro:pl.rubro||punto.tipo||''};
  const texto=(pg,c,s)=>{
    s=L(s);if(!s) return;
    let tam=Math.max(7,Math.min(12,c.h*.8));
    while(tam>6&&f.widthOfTextAtSize(s,tam)>c.w-2) tam-=.5;
    pg.drawText(s,{x:c.x+1,y:c.y+(c.h-tam)/2+tam*.18,size:tam,font:f,color:rgb(0,0,0)});
  };
  for(const c of campos){
    const pg=paginas[Math.min(c.pag||0,paginas.length-1)],v=val[c.id];
    if(c.tipo==='tilde'){
      if(v==='Sí'){const t=Math.min(c.w,c.h)*1.15;pg.drawText('X',{x:c.x+(c.w-fb.widthOfTextAtSize('X',t))/2,y:c.y+(c.h-t)/2+t*.12,size:t,font:fb,color:rgb(0,0,0)});}
    }else if(c.tipo==='auto') texto(pg,c,auto[c.fuente]);
    else if(c.tipo==='suma') texto(pg,c,String(valorSuma(c,val,campos)));
    else if(c.tipo==='firma'){
      if(v){
        try{const f1=await firmaRecortada(doc,v,c.w,c.h,true);pg.drawImage(f1.im,{x:c.x+(c.w-f1.w)/2,y:c.y+(c.h-f1.h)/2,width:f1.w,height:f1.h});}
        catch(e){console.warn('firma en la planilla:',e);}
      }
    }else texto(pg,c,v);
  }
  return await doc.saveAsBase64({dataUri:false});
}
