// Firma en las planillas PDF que sube cada usuario: al cargarlas se elige si llevan firma y dónde va
// (se ve la hoja, la app sugiere el lugar buscando la palabra "Firma" y se ajusta tocando o arrastrando)
let _pf=null; // estado del selector: {id,pdf,pag,pw,ph,box:{x,y,w,h}} (medidas en puntos del PDF; y desde abajo)

async function cargarPdfJs(){
  if(window.pdfjsLib) return;
  await new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=res;s.onerror=()=>rej(new Error('No se pudo cargar el visor de PDF. Revisá tu internet.'));
    document.head.appendChild(s);
  });
  if(!window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Después de guardar una planilla nueva: ¿es igual a la oficial o se marcan sus campos?
function preguntarComoUsar(id){
  mostrarDlgEnvio('Planilla guardada ✓\n\nLa app busca sola las casillas, los datos y los totales de tu planilla, y vos solo revisás la lista.',[
    {txt:'✨ Detectar los campos automáticamente',cls:'ba',fn:()=>detectarYRevisar(id)},
    {txt:'Es igual a la oficial SUBE (solo firma, si lleva)',cls:'bd',fn:()=>preguntarFirmaPlanilla(id)},
    {txt:'Más tarde',cls:'bd'}
  ]);
}

// Después de guardar una planilla nueva
function preguntarFirmaPlanilla(id){
  mostrarDlgEnvio('¿Esta planilla lleva firma?\n\nSi la llevás, al completar cada visita se firma con el dedo y la firma se imprime en el lugar que elijas.',[
    {txt:'✍️ Sí, elegir dónde va la firma',cls:'ba',fn:()=>abrirPosFirma(id)},
    {txt:'No, no lleva firma',cls:'bd'}
  ]);
}

async function abrirPosFirma(id){
  const pl=planillas.find(x=>x.id===id);if(!pl) return;
  try{
    showToast('Abriendo la planilla…');
    await cargarPdfJs();
    const bin=atob(pl.b64.replace(/\s/g,''));const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
    _pf={id,pdf,pag:pdf.numPages-1,pw:0,ph:0,box:null,sugerida:false};
    if(pl.firma){_pf.pag=pl.firma.pagina;_pf.box={x:pl.firma.x,y:pl.firma.y,w:pl.firma.w,h:pl.firma.h};}
    document.getElementById('pfDlg').classList.add('show');
    await pintarPagFirma();
    if(!_pf.box) await sugerirLugarFirma();
    posicionarCajaFirma();
  }catch(e){console.error('pos firma:',e);showToast(e.message||'No se pudo abrir la planilla',true);cerrarPosFirma();}
}

async function pintarPagFirma(){
  const pg=await _pf.pdf.getPage(_pf.pag+1),vp1=pg.getViewport({scale:1});
  _pf.pw=vp1.width;_pf.ph=vp1.height;
  const cv=document.getElementById('pfCv'),ancho=Math.min(document.getElementById('pfWrap').clientWidth||360,640);
  const esc=(ancho*2)/vp1.width,vp=pg.getViewport({scale:esc});
  cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
  await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  document.getElementById('pfHoja').textContent='Hoja '+(_pf.pag+1)+' de '+_pf.pdf.numPages;
  posicionarCajaFirma();
}

// busca la palabra "Firma" (de atrás hacia adelante) y pone el recuadro justo arriba
async function sugerirLugarFirma(){
  const n=_pf.pdf.numPages;
  for(let p=n;p>=1;p--){
    const pg=await _pf.pdf.getPage(p),tc=await pg.getTextContent();
    const it=tc.items.find(i=>/firma|firmante|conforme|aclaraci/i.test(i.str||''));
    if(it){
      const vp=pg.getViewport({scale:1}),w=170,h=w*.365;
      _pf.pag=p-1;await pintarPagFirma();
      _pf.box={x:Math.max(10,Math.min(vp.width-w-10,it.transform[4])),y:Math.min(vp.height-h-10,it.transform[5]+6),w,h};
      _pf.sugerida=true;
      showToast('Puse el recuadro sobre «Firma». Ajustalo si hace falta');
      return;
    }
  }
  const w=170,h=w*.365;
  _pf.box={x:_pf.pw-w-40,y:60,w,h}; // sin pistas: abajo a la derecha
}

function posicionarCajaFirma(){
  const b=document.getElementById('pfBox');if(!_pf||!_pf.box||!_pf.pw){b.style.display='none';return;}
  const bx=_pf.box;b.style.display='';
  b.style.left=(bx.x/_pf.pw*100)+'%';b.style.top=((1-(bx.y+bx.h)/_pf.ph)*100)+'%';
  b.style.width=(bx.w/_pf.pw*100)+'%';b.style.height=(bx.h/_pf.ph*100)+'%';
}
function pfLimitar(){
  const b=_pf.box;
  b.w=Math.max(60,Math.min(_pf.pw-20,b.w));b.h=b.w*.365;
  b.x=Math.max(5,Math.min(_pf.pw-b.w-5,b.x));b.y=Math.max(5,Math.min(_pf.ph-b.h-5,b.y));
}
function pfTamano(f){if(!_pf||!_pf.box) return;const c=_pf.box.x+_pf.box.w/2,m=_pf.box.y+_pf.box.h/2;_pf.box.w*=f;_pf.box.h=_pf.box.w*.365;_pf.box.x=c-_pf.box.w/2;_pf.box.y=m-_pf.box.h/2;pfLimitar();posicionarCajaFirma();}
async function pfHoja(d){
  if(!_pf) return;
  const n=Math.max(0,Math.min(_pf.pdf.numPages-1,_pf.pag+d));if(n===_pf.pag) return;
  _pf.pag=n;await pintarPagFirma();pfLimitar();posicionarCajaFirma();
}
// tocar la hoja = mover el recuadro ahí; arrastrarlo = ajustar
(function(){
  let arr=null;
  function pt(e){const r=document.getElementById('pfWrap').getBoundingClientRect();return {px:(e.clientX-r.left)/r.width*_pf.pw,py:(1-(e.clientY-r.top)/r.height)*_pf.ph};}
  document.addEventListener('pointerdown',e=>{
    if(!_pf||!document.getElementById('pfDlg').classList.contains('show')) return;
    const wrap=document.getElementById('pfWrap');if(!wrap.contains(e.target)) return;
    const p=pt(e);
    if(e.target.closest&&e.target.closest('#pfBox')){arr={dx:p.px-_pf.box.x,dy:p.py-_pf.box.y};}
    else{_pf.box.x=p.px-_pf.box.w/2;_pf.box.y=p.py-_pf.box.h/2;arr={dx:_pf.box.w/2,dy:_pf.box.h/2};pfLimitar();posicionarCajaFirma();}
    wrap.setPointerCapture&&wrap.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(!arr||!_pf) return;const p=pt(e);_pf.box.x=p.px-arr.dx;_pf.box.y=p.py-arr.dy;pfLimitar();posicionarCajaFirma();
  });
  ['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{arr=null;}));
})();

function confirmarPosFirma(){
  const pl=planillas.find(x=>x.id===_pf.id);if(!pl||!_pf.box) return;
  const b=_pf.box;pl.firma={pagina:_pf.pag,x:b.x,y:b.y,w:b.w,h:b.h};
  lsSet(SK.planillas,planillas);cerrarPosFirma();aplicarPlantilla();renderPlanillas();
  showToast('Firma configurada ✓ Se firma al completar cada visita');
}
function quitarFirmaPlanilla(id){
  const pl=planillas.find(x=>x.id===id);if(!pl) return;
  delete pl.firma;lsSet(SK.planillas,planillas);cerrarPosFirma();renderPlanillas();showToast('La planilla ya no lleva firma');
}
function cerrarPosFirma(){document.getElementById('pfDlg').classList.remove('show');_pf=null;}

// Campo de firma que se agrega al formulario cuando la planilla PDF en uso lleva firma
function firmaDePlanillaPdf(){
  if(modoPlanilla()!=='pdf') return null;
  const pl=planillas.find(x=>x.id===plDefId);
  return pl&&pl.firma?pl.firma:null;
}
