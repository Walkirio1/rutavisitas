// Completar la visita sobre la hoja: se ve la planilla cargada y los campos van en su lugar (tocar una casilla la tilda,
// tocar un número o texto abre un cuadro para escribirlo). Hay un botón para verla como lista.
const HV_ANCHO=700;                // resolución con la que se dibuja la hoja (la vista se ajusta al ancho de la pantalla)
let _hvImgs={};                    // páginas ya dibujadas (por planilla), para no volver a procesar el PDF
let _hvEd=null,_hvZoom=1;

function hojaActiva(){return !!pdfConCampos()&&!lsGet('sube:vistaLista');}

async function paginasDeHoja(pl){
  if(_hvImgs[pl.id]&&_hvImgs[pl.id].b64===pl.b64) return _hvImgs[pl.id].pags;
  await cargarPdfJs();
  const bin=atob(pl.b64.replace(/\s/g,''));const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise,pags=[];
  for(let n=1;n<=pdf.numPages;n++){
    const pg=await pdf.getPage(n),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(2.4,(HV_ANCHO*2)/v1.width)});
    const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
    pags.push({url:cv.toDataURL('image/jpeg',.88),w:v1.width,h:v1.height});
  }
  _hvImgs[pl.id]={b64:pl.b64,pags};
  return pags;
}

// dibuja la hoja y los campos encima (se llama al abrir la planilla de una visita)
async function pintarHojaVisita(){
  const box=document.getElementById('plHojaBox'),bar=document.getElementById('plHojaBar'),lista=document.getElementById('plExtraBox'),pc=pdfConCampos();
  if(!pc){box.style.display='none';bar.style.display='none';lista.style.display='';return;}
  bar.style.display='';
  const hoja=hojaActiva();
  document.getElementById('plHojaToggle').textContent=hoja?'☰ Ver como lista':'📄 Ver como la hoja';
  lista.style.display=hoja?'none':'';
  if(!hoja){box.style.display='none';return;}
  box.style.display='';box.innerHTML='<div class="hv-carga">Abriendo la planilla…</div>';
  try{
    const pags=await paginasDeHoja(pc);
    box.innerHTML=`<div class="hv-sc"><div class="hv-hojas" id="hvHojas" style="width:${_hvZoom*100}%">`+pags.map((p,i)=>`<div class="hv-pg" style="aspect-ratio:${p.w}/${p.h}"><img src="${p.url}" alt="Hoja ${i+1}"><div class="hv-capa" data-pag="${i}"></div></div>`).join('')+'</div></div><div class="hv-ayu">Tocá cada casilla o número para completarlo. Con 🔍 acercás la hoja.</div>';
    const campos=camposActivos();
    box.querySelectorAll('.hv-capa').forEach(capa=>{
      const pag=+capa.dataset.pag,p=pags[pag];
      capa.innerHTML=campos.filter(c=>(c.pag||0)===pag).map(c=>`<div class="hv-f hv-${c.tipo}" data-id="${c.id}" onclick="hvToque('${c.id}')" style="left:${c.x/p.w*100}%;top:${(1-(c.y+c.h)/p.h)*100}%;width:${c.w/p.w*100}%;height:${c.h/p.h*100}%"></div>`).join('');
    });
    hvRefrescar();hvFuentes();
  }catch(e){
    console.warn('hoja:',e);lsSet('sube:vistaLista',true);
    box.style.display='none';lista.style.display='';document.getElementById('plHojaToggle').textContent='📄 Ver como la hoja';
    showToast('No pude abrir la hoja (hace falta internet la primera vez). Va como lista.',true);
  }
}

// muestra el valor actual de cada campo sobre la hoja
function hvRefrescar(){
  const campos=camposActivos();
  document.querySelectorAll('#plHojaBox .hv-f').forEach(el=>{
    const c=campos.find(x=>x.id===el.dataset.id);if(!c) return;
    const v=plExtra[c.id];let txt='',on=false;
    if(c.tipo==='tilde'){on=v==='Sí';txt=on?'✕':'';}
    else if(c.tipo==='firma'){txt=v?`<img src="${v}" alt="Firma">`:'✍️';}
    else if(c.tipo==='auto') txt=escapeHtml(autoValor(c.fuente));
    else if(c.tipo==='suma') txt=(c.moneda?'$ ':'')+(plExtra[c.id]==null?0:plExtra[c.id]);
    else txt=escapeHtml(c.tipo==='numero'&&c.moneda&&v?'$ '+v:(v||''));
    el.innerHTML=`<span>${txt}</span>`;
    el.classList.toggle('on',on);
    el.classList.toggle('vacio',(c.tipo==='texto'||c.tipo==='numero'||c.tipo==='fecha'||c.tipo==='firma')&&!v);
    el.classList.toggle('falta',!!c.obligatorio&&!v);
  });
}
function autoValor(f){
  const p=puntos.find(x=>x.id===curId)||{};
  return ({fecha:document.getElementById('plF').value,hora:document.getElementById('plH').value,id:p.id||'',direccion:(p.dir||'')+(p.localidad?' - '+p.localidad:''),nombre:p.nombre||'',rubro:document.getElementById('plR').value||p.tipo||''})[f]||'';
}
function hvToque(id){
  const c=camposActivos().find(x=>x.id===id);if(!c) return;
  if(c.tipo==='tilde'){plExtra[id]=plExtra[id]==='Sí'?'':'Sí';plCambio();return;}
  if(c.tipo==='firma'){abrirFirma(id);return;}
  if(c.tipo==='auto'){showToast('Se completa solo');return;}
  if(c.tipo==='suma'){showToast('El total se calcula solo');return;}
  _hvEd=id;
  document.getElementById('hvEdTit').textContent=c.etiqueta;
  const inp=document.getElementById('hvEdIn');
  inp.type=c.tipo==='numero'?'number':(c.tipo==='fecha'?'date':'text');
  inp.inputMode=c.tipo==='numero'?'decimal':'text';
  inp.value=plExtra[id]||'';
  document.getElementById('hvEdMon').style.display=c.moneda?'':'none';
  document.getElementById('hvEdDlg').classList.add('show');
  setTimeout(()=>inp.focus(),200);
}
function hvEdListo(){
  const inp=document.getElementById('hvEdIn');
  plExtra[_hvEd]=inp.value;document.getElementById('hvEdDlg').classList.remove('show');plCambio();
}
// el texto de cada campo se ajusta al alto del recuadro en pantalla
function hvFuentes(){
  document.querySelectorAll('#plHojaBox .hv-f').forEach(el=>{
    const h=el.getBoundingClientRect().height||10;
    el.style.fontSize=Math.max(7,Math.min(20,h*(el.classList.contains('hv-tilde')?1.05:.78)))+'px';
  });
}
function hvZoom(f){
  _hvZoom=Math.max(1,Math.min(3,_hvZoom*f));
  const h=document.getElementById('hvHojas');if(h) h.style.width=(_hvZoom*100)+'%';
  hvFuentes();
}
function hvToggleVista(){lsSet('sube:vistaLista',!lsGet('sube:vistaLista'));pintarHojaVisita();}
