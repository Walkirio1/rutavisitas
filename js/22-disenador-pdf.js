// Diseñador de planillas PDF: el usuario marca sobre la hoja dónde va cada campo (tilde, texto, número, fecha, firma,
// suma de puntos o dato automático). Con eso la app arma el formulario de la visita y rellena el PDF de esa empresa.
let _ds=null; // {id,pdf,pag,pw,ph,zoom,campos,tool}
const TOOLS_DS={
  tilde:{n:'✕ Tilde',w:14,h:14,c:'#dc2626'},
  texto:{n:'Aa Texto',w:150,h:14,c:'#2563eb'},
  numero:{n:'123 Número',w:50,h:14,c:'#7c3aed'},
  fecha:{n:'📅 Fecha',w:80,h:14,c:'#0891b2'},
  firma:{n:'✍️ Firma',w:170,h:62,c:'#16a34a'},
  foto:{n:'📷 Foto',w:160,h:120,c:'#be185d'},
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
    _ds={id,pdf,pag:0,pw:0,ph:0,zoom:1,tool:null,sel:null,campos:JSON.parse(JSON.stringify(pl.campos||[]))};
    document.getElementById('dsDlg').classList.add('show');
    document.getElementById('dsHint').style.display=lsGet('sube:dszoomvisto')?'none':'';
    pintarHerramientas();
    await pintarPagDs();
  }catch(e){console.error('diseñador:',e);showToast(e.message||'No se pudo abrir la planilla',true);cerrarDisenador();}
}
function cerrarDisenador(){document.getElementById('dsDlg').classList.remove('show');_ds=null;}

function pintarHerramientas(){
  document.getElementById('dsTools').innerHTML=Object.entries(TOOLS_DS).map(([k,t])=>
    `<button class="dst${_ds.tool===k?' on':''}" style="--c:${t.c}" onclick="dsTool('${k}')">${t.n}</button>`).join('');
}
function dsTool(k){_ds.tool=_ds.tool===k?null:k;if(_ds.tool&&_ds.sel){_ds.sel=null;pintarMarcas();}pintarHerramientas();if(_ds.tool) showToast('Ahora tocá la hoja donde va');}

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
  const lay=document.getElementById('dsMarcas'),pos=(c)=>`left:${c.x/_ds.pw*100}%;top:${(1-(c.y+c.h)/_ds.ph)*100}%;width:${c.w/_ds.pw*100}%;height:${c.h/_ds.ph*100}%`;
  lay.innerHTML=_ds.campos.map((c,i)=>{
    let h='';
    if(c.tipo==='suma'&&c.zona&&c.zona.pag===_ds.pag){
      const z=c.zona,sel=_ds.sel&&_ds.sel.i===i&&_ds.sel.parte==='zona';
      h+=`<div class="ds-m ds-zona${sel?' ds-sel':''}" data-i="${i}" data-p="zona" style="--c:#d97706;${pos(z)}"><span>Σ zona de suma</span>${sel?manijas():''}</div>`;
    }
    if(c.pag===_ds.pag){
      const t=TOOLS_DS[c.tipo]||TOOLS_DS.texto,sel=_ds.sel&&_ds.sel.i===i&&_ds.sel.parte==='campo';
      const gr=_ds.todos&&_ds.grupo&&_ds.grupo.includes(i);
      h+=`<div class="ds-m ds-${c.tipo}${sel?' ds-sel':''}${gr?' ds-grupo':''}" data-i="${i}" data-p="campo" style="--c:${t.c};${pos(c)}"><span>${c.tipo==='tilde'?'✕':escapeHtml(c.etiqueta||'')}</span>${sel?manijas():''}</div>`;
    }
    return h;
  }).join('');
  document.getElementById('dsCuenta').textContent=_ds.campos.length+' campo'+(_ds.campos.length===1?'':'s');
  const acc=document.getElementById('dsAcc');
  if(_ds.sel){
    const c=_ds.campos[_ds.sel.i];
    acc.style.display='';
    document.getElementById('dsAccTxt').textContent=_ds.sel.parte==='zona'?'Zona de suma: arrastrá las esquinas para cubrir los números y movela con un dedo':'«'+(c.etiqueta||'campo')+'»: arrastrá una esquina para darle la forma que quieras';
    document.getElementById('dsAccEd').style.display=_ds.sel.parte==='zona'?'none':'';
    const bt=document.getElementById('dsAccTodos'),n=(_ds.grupo||[]).length;
    bt.style.display=n>1?'':'none';bt.textContent='👥 Editar todos ('+n+')';bt.classList.toggle('sma',!!_ds.todos);bt.classList.toggle('smh',!_ds.todos);
  }else acc.style.display='none';
}
// campos del mismo tipo alineados con el elegido (misma fila o misma columna): se pueden editar todos juntos
function calcGrupo(){
  _ds.grupo=[];
  if(!_ds.sel||_ds.sel.parte!=='campo') return;
  const s=_ds.campos[_ds.sel.i],mismos=_ds.campos.map((c,i)=>i).filter(i=>{const c=_ds.campos[i];return c.pag===s.pag&&c.tipo===s.tipo;});
  const fila=mismos.filter(i=>Math.abs(_ds.campos[i].y-s.y)<=6),col=mismos.filter(i=>Math.abs(_ds.campos[i].x-s.x)<=6);
  const g=fila.length>=col.length?fila:col;
  _ds.grupo=g.length>1?g:[];
}
const manijas=()=>['nw','ne','sw','se'].map(k=>`<i class="ds-h ${k}" data-h="${k}"></i>`).join('');
function dsSel(i,parte){_ds.sel=i===null?null:{i,parte:parte||'campo'};calcGrupo();pintarMarcas();}
function dsTodos(){_ds.todos=!_ds.todos;pintarMarcas();}
function dsAccEditar(){if(_ds.sel) dsEditar(_ds.sel.i);}
function dsAccBorrar(){
  if(!_ds.sel) return;
  if(_ds.sel.parte==='zona'){delete _ds.campos[_ds.sel.i].zona;}
  else _ds.campos.splice(_ds.sel.i,1);
  _ds.sel=null;_ds.grupo=[];pintarMarcas();
}
function dsAccListo(){_ds.sel=null;_ds.grupo=[];pintarMarcas();}
function rectSel(){const c=_ds.campos[_ds.sel.i];return _ds.sel.parte==='zona'?c.zona:c;}

// ── Gestos: tocar = seleccionar / agregar · arrastrar una marca = moverla · arrastrar la hoja = desplazarla
//           dos dedos sobre la marca elegida = cambiar su tamaño · dos dedos en otro lado = zoom
(function(){
  const ptrs=new Map();let down=null,pinch=null;
  const wrap=()=>document.getElementById('dsWrap'),sc=()=>document.getElementById('dsScroll');
  const pt=(x,y)=>{const r=wrap().getBoundingClientRect();return {x:(x-r.left)/r.width*_ds.pw,y:(1-(y-r.top)/r.height)*_ds.ph};};
  const activo=()=>_ds&&document.getElementById('dsDlg').classList.contains('show');
  function dentroSel(x,y){
    if(!_ds.sel) return false;
    const r=rectSel(),a=pt(x,y),mx=Math.max(30,_ds.pw*.04);
    return a.x>=r.x-mx&&a.x<=r.x+r.w+mx&&a.y>=r.y-mx&&a.y<=r.y+r.h+mx;
  }
  document.addEventListener('pointerdown',e=>{
    if(!activo()||!sc().contains(e.target)) return; // también se puede pellizcar sobre el fondo gris
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){
      const m=e.target.closest&&e.target.closest('.ds-m');
      const hnd=e.target.closest&&e.target.closest('.ds-h');
      down={sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,mov:false,cancel:false,m:m?{i:+m.dataset.i,parte:m.dataset.p}:null,res:hnd?hnd.dataset.h:null};
      if(down.res&&_ds.sel){const r=rectSel(),fx=down.res.includes('w')?r.x+r.w:r.x,fy=down.res.includes('n')?r.y:r.y+r.h;down.fijo={x:fx,y:fy};}
      if(down.m){const r=down.m.parte==='zona'?_ds.campos[down.m.i].zona:_ds.campos[down.m.i],p=pt(e.clientX,e.clientY);down.dx=p.x-r.x;down.dy=p.y-r.y;}
    }else if(ptrs.size===2){
      if(down) down.cancel=true;
      const [a,b]=[...ptrs.values()];
      const w0=wrap().getBoundingClientRect();
      pinch={dx0:Math.max(30,Math.abs(a.x-b.x)),dy0:Math.max(30,Math.abs(a.y-b.y)),d0:Math.hypot(a.x-b.x,a.y-b.y),zoom0:_ds.zoom,
        modo:'zoom',
        r0:_ds.sel?{...rectSel()}:null,fx:((a.x+b.x)/2-w0.left)/w0.width,fy:((a.y+b.y)/2-w0.top)/w0.height};
    }
  });
  document.addEventListener('pointermove',e=>{
    if(!activo()||!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&ptrs.size>=2){
      const [a,b]=[...ptrs.values()];
      if(pinch.modo==='tam'){
        const r=rectSel(),rx=Math.max(30,Math.abs(a.x-b.x))/pinch.dx0,ry=Math.max(30,Math.abs(a.y-b.y))/pinch.dy0;
        const cx=pinch.r0.x+pinch.r0.w/2,cy=pinch.r0.y+pinch.r0.h/2;
        r.w=Math.max(8,Math.min(_ds.pw-10,pinch.r0.w*rx));r.h=Math.max(8,Math.min(_ds.ph-10,pinch.r0.h*ry));
        r.x=Math.max(0,Math.min(_ds.pw-r.w,cx-r.w/2));r.y=Math.max(0,Math.min(_ds.ph-r.h,cy-r.h/2));
        pintarMarcas();
      }else{
        const base=document.getElementById('dsScroll').clientWidth-16||360,z=Math.max(1,Math.min(5,pinch.zoom0*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d0));
        _ds.zoom=z;wrap().style.width=Math.min(base*z,2400)+'px';
        const w1=wrap().getBoundingClientRect(),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
        sc().scrollLeft+=(w1.left+pinch.fx*w1.width)-cx;sc().scrollTop+=(w1.top+pinch.fy*w1.height)-cy;
        document.getElementById('dsZoomT').textContent=Math.round(z*100)+'%';
        lsSet('sube:dszoomvisto',true);document.getElementById('dsHint').style.display='none';
      }
      return;
    }
    if(!down||down.cancel) return;
    if(!down.mov&&Math.hypot(e.clientX-down.sx,e.clientY-down.sy)<7) return;
    down.mov=true;
    if(down.res&&down.fijo&&_ds.sel){ // estirar desde la esquina: la esquina opuesta queda fija
      const r=rectSel(),p=pt(e.clientX,e.clientY),fx=down.fijo.x,fy=down.fijo.y;
      let x0=Math.min(fx,p.x),x1=Math.max(fx,p.x),y0=Math.min(fy,p.y),y1=Math.max(fy,p.y);
      x0=Math.max(0,x0);x1=Math.min(_ds.pw,x1);y0=Math.max(0,y0);y1=Math.min(_ds.ph,y1);
      if(x1-x0<8) x1=x0+8; if(y1-y0<8) y1=y0+8;
      const w0=r.w,h0=r.h;
      r.x=x0;r.y=y0;r.w=x1-x0;r.h=y1-y0;
      if(_ds.todos&&_ds.grupo&&_ds.sel.parte==='campo'){ // todos los alineados toman la misma forma
        _ds.grupo.forEach(gi=>{if(gi===_ds.sel.i) return;const m=_ds.campos[gi];
          const nx=down.res.includes('w')?(m.x+m.w)-r.w:m.x,ny=down.res.includes('s')?(m.y+m.h)-r.h:m.y;
          m.w=r.w;m.h=r.h;m.x=Math.max(0,Math.min(_ds.pw-m.w,nx));m.y=Math.max(0,Math.min(_ds.ph-m.h,ny));});
      }
      pintarMarcas();
    }else if(down.m){ // mover la marca
      if(!_ds.sel||_ds.sel.i!==down.m.i||_ds.sel.parte!==down.m.parte){_ds.sel={i:down.m.i,parte:down.m.parte};calcGrupo();}
      const r=rectSel(),p=pt(e.clientX,e.clientY),ox=r.x,oy=r.y;
      r.x=Math.max(0,Math.min(_ds.pw-r.w,p.x-down.dx));r.y=Math.max(0,Math.min(_ds.ph-r.h,p.y-down.dy));
      if(_ds.todos&&_ds.grupo&&_ds.sel.parte==='campo'&&_ds.grupo.includes(_ds.sel.i)){ // se mueven todos juntos
        const dx=r.x-ox,dy=r.y-oy;
        _ds.grupo.forEach(gi=>{if(gi===_ds.sel.i) return;const m=_ds.campos[gi];m.x=Math.max(0,Math.min(_ds.pw-m.w,m.x+dx));m.y=Math.max(0,Math.min(_ds.ph-m.h,m.y+dy));});
      }
      pintarMarcas();
    }else{ // desplazar la hoja
      sc().scrollLeft-=e.clientX-down.lx;sc().scrollTop-=e.clientY-down.ly;
    }
    down.lx=e.clientX;down.ly=e.clientY;
  });
  function fin(e){
    if(!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if(pinch&&ptrs.size<2){
      const era=pinch.modo;pinch=null;
      if(era==='zoom'&&activo()) pintarPagDs(); // se vuelve a dibujar nítida al nuevo zoom
    }
    if(ptrs.size===0&&down){
      const d=down;down=null;
      if(!activo()||d.cancel||d.mov||d.res) return;
      if(_ds.tool){const p=pt(d.sx,d.sy);if(p.x>=0&&p.x<=_ds.pw&&p.y>=0&&p.y<=_ds.ph) dsAgregar(p);} // con una herramienta elegida, tocar siempre agrega (aunque haya una marca debajo)
      else if(d.m) dsSel(d.m.i,d.m.parte);
      else if(_ds.sel) dsSel(null);
      else showToast('Elegí arriba qué querés marcar y después tocá la hoja');
    }
  }
  document.addEventListener('pointerup',fin);document.addEventListener('pointercancel',fin);
})();

function dsAgregar(p){
  const t=TOOLS_DS[_ds.tool];
  const c={id:'p'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),tipo:_ds.tool,etiqueta:'',pag:_ds.pag,w:t.w,h:t.h,x:p.x-t.w/2,y:p.y-t.h/2};
  c.x=Math.max(0,Math.min(_ds.pw-c.w,c.x));c.y=Math.max(0,Math.min(_ds.ph-c.h,c.y));
  if(c.tipo==='auto') c.fuente='fecha';
  if(c.tipo==='foto') c.etiqueta='Foto de la visita';
  _ds.campos.push(c);_ds.sel={i:_ds.campos.length-1,parte:'campo'};calcGrupo();_ds.tool=null;pintarHerramientas(); // cada toque agrega un solo campo: la herramienta se apaga
  pintarMarcas();dsEditar(_ds.campos.length-1,true);
}

// ── Editar un campo
let _dsEdI=null,_dsEdNuevo=false;
function dsEditar(i,nuevo){
  _dsEdI=i;_dsEdNuevo=!!nuevo;
  const c=_ds.campos[i],t=TOOLS_DS[c.tipo];
  document.getElementById('dsEdTit').textContent=({tilde:'Tilde',texto:'Campo de texto',numero:'Campo de número',fecha:'Campo de fecha',firma:'Firma',foto:'Foto de la visita',suma:'Total / suma',auto:'Dato automático'})[c.tipo];
  const nom=document.getElementById('dsEdNom');nom.value=c.etiqueta||'';
  nom.placeholder=c.tipo==='suma'?'Ej: Total de puntos':(c.tipo==='tilde'?'Ej: Comercio cerrado':'Nombre del campo');
  document.getElementById('dsEdNomBox').style.display=c.tipo==='auto'?'none':'';
  document.getElementById('dsEdAuto').style.display=c.tipo==='auto'?'':'none';
  document.getElementById('dsEdFuente').innerHTML=Object.entries(FUENTES_AUTO).map(([k,n])=>`<option value="${k}"${c.fuente===k?' selected':''}>${n}</option>`).join('');
  document.getElementById('dsEdPuntosBox').style.display=c.tipo==='tilde'?'':'none';
  document.getElementById('dsEdPuntos').value=c.puntos||'';
  document.getElementById('dsEdCierraBox').style.display=c.tipo==='tilde'?'':'none';
  document.getElementById('dsEdCierra').checked=!!c.cierra;
  document.getElementById('dsEdObligBox').style.display=(c.tipo==='auto'||c.tipo==='suma'||c.tipo==='foto')?'none':'';
  document.getElementById('dsEdOblig').checked=!!c.obligatorio;
  // suma: de qué campos
  const sb=document.getElementById('dsEdSumaBox');
  if(c.tipo==='suma'){
    document.getElementById('dsEdModoZona').checked=!!c.zona;document.getElementById('dsEdModoLista').checked=!c.zona;
    dsEdModoSuma();
    const fuentes=_ds.campos.filter(x=>x!==c&&(x.tipo==='numero'||(x.tipo==='tilde'&&x.puntos)));
    sb.style.display='';
    document.getElementById('dsEdSuma').innerHTML=fuentes.length?fuentes.map(x=>`<label class="ds-chk"><input type="checkbox" value="${x.id}" ${(!c.suma||c.suma.includes(x.id))?'checked':''}> ${escapeHtml(x.etiqueta||'(sin nombre)')}${x.tipo==='tilde'?' · '+x.puntos+' pts':''}</label>`).join(''):'<div class="pled-nota">Todavía no marcaste campos de número ni tildes con puntos. Marcalos y volvé a editar este total.</div>';
  }else sb.style.display='none';
  document.getElementById('dsEdDlg').classList.add('show');
}
function dsEdModoSuma(){
  const z=document.getElementById('dsEdModoZona').checked;
  document.getElementById('dsEdSuma').style.display=z?'none':'';
  document.getElementById('dsEdZonaBox').style.display=z?'':'none';
  const c=_ds.campos[_dsEdI];
  document.getElementById('dsEdZonaEst').textContent=c&&c.zona?'✓ Zona marcada. Tocá el botón para moverla o cambiarla.':'Todavía no marcaste la zona.';
}
// pasa a marcar la zona sobre la hoja (se mueve y se estira con los dedos)
function dsMarcarZona(){
  const c=_ds.campos[_dsEdI];
  if(!document.getElementById('dsEdNom').value.trim()){showToast('Primero escribí el nombre del total',true);return;}
  c.etiqueta=document.getElementById('dsEdNom').value.trim();
  if(!c.zona){
    const sc=document.getElementById('dsScroll'),w=document.getElementById('dsWrap').getBoundingClientRect(),r=sc.getBoundingClientRect();
    const cx=((r.left+r.width/2-w.left)/w.width)*_ds.pw,cy=(1-((r.top+r.height/2-w.top)/w.height))*_ds.ph;
    const zw=_ds.pw*.55,zh=_ds.ph*.07;
    c.zona={pag:_ds.pag,w:zw,h:zh,x:Math.max(0,Math.min(_ds.pw-zw,cx-zw/2)),y:Math.max(0,Math.min(_ds.ph-zh,cy-zh/2))};
  }
  _ds.pag=c.zona.pag;document.getElementById('dsEdDlg').classList.remove('show');
  _ds.sel={i:_dsEdI,parte:'zona'};pintarPagDs();
  showToast('Estirá la zona con dos dedos y arrastrala sobre los números a sumar');
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
    if(document.getElementById('dsEdModoZona').checked){
      if(!c.zona){showToast('Marcá la zona de suma o elegí «Campos que elijo»',true);return;}
      delete c.suma;
    }else{
      delete c.zona;
      const marc=[...document.querySelectorAll('#dsEdSuma input:checked')].map(i=>i.value),todos=document.querySelectorAll('#dsEdSuma input').length;
      if(marc.length===todos) delete c.suma; else c.suma=marc; // sin lista = todos
    }
  }
  document.getElementById('dsEdDlg').classList.remove('show');pintarMarcas();
}
function dsEdTamano(f){const ids=(_ds.todos&&_ds.grupo&&_ds.grupo.includes(_dsEdI))?_ds.grupo:[_dsEdI];ids.forEach(i=>{const c=_ds.campos[i];if(!c) return;const cx=c.x+c.w/2,cy=c.y+c.h/2;c.w*=f;c.h*=f;c.x=Math.max(0,Math.min(_ds.pw-c.w,cx-c.w/2));c.y=Math.max(0,Math.min(_ds.ph-c.h,cy-c.h/2));});pintarMarcas();}
function dsEdBorrar(){
  _ds.sel=null;_ds.campos.splice(_dsEdI,1);document.getElementById('dsEdDlg').classList.remove('show');pintarMarcas();
}
function dsEdCancelar(){
  if(_dsEdNuevo&&!_ds.campos[_dsEdI].etiqueta&&_ds.campos[_dsEdI].tipo!=='auto'){_ds.campos.splice(_dsEdI,1);_ds.sel=null;}
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
  let fuentes;
  if(c.zona){ // zona de la hoja: se suman todos los números (y tildes con puntos) cuyo centro cae adentro
    const z=c.zona;
    fuentes=campos.filter(x=>x!==c&&(x.tipo==='numero'||(x.tipo==='tilde'&&x.puntos))&&(x.pag||0)===z.pag&&x.x+x.w/2>=z.x&&x.x+x.w/2<=z.x+z.w&&x.y+x.h/2>=z.y&&x.y+x.h/2<=z.y+z.h);
  }else fuentes=campos.filter(x=>x!==c&&(c.suma?c.suma.includes(x.id):(x.tipo==='numero'||(x.tipo==='tilde'&&x.puntos))));
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
  let form=null;try{form=doc.getForm();}catch(e){}
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
    if(c.via==='form'&&form){ // campo real del formulario del PDF
      try{
        if(c.tipo==='tilde'){const cb=form.getCheckBox(c.nombreForm);if(v==='Sí')cb.check();else cb.uncheck();}
        else if(c.tipo==='texto'||c.tipo==='numero'||c.tipo==='fecha'||c.tipo==='auto'||c.tipo==='suma'){
          const txt=c.tipo==='auto'?auto[c.fuente]:(c.tipo==='suma'?String(valorSuma(c,val,campos)):v);
          if(txt) form.getTextField(c.nombreForm).setText(L(txt));
        }
      }catch(e){console.warn('campo del formulario:',e);}
      continue;
    }
    if(c.tipo==='tilde'){
      if(v==='Sí'){const t=Math.min(c.w,c.h)*1.15;pg.drawText('X',{x:c.x+(c.w-fb.widthOfTextAtSize('X',t))/2,y:c.y+(c.h-t)/2+t*.12,size:t,font:fb,color:rgb(0,0,0)});}
    }else if(c.tipo==='auto') texto(pg,c,auto[c.fuente]);
    else if(c.tipo==='suma') texto(pg,c,String(valorSuma(c,val,campos)));
    else if(c.tipo==='foto'){ // la foto de la visita va dentro de la planilla, en este recuadro
      if(pl.foto){
        try{
          const im=await doc.embedJpg(Uint8Array.from(atob(pl.foto.replace(/^data:image\/\w+;base64,/,'')),ch=>ch.charCodeAt(0)));
          const e=Math.min(c.w/im.width,c.h/im.height),w=im.width*e,h=im.height*e;
          pg.drawImage(im,{x:c.x+(c.w-w)/2,y:c.y+(c.h-h)/2,width:w,height:h});
        }catch(e){console.warn('foto en la planilla:',e);}
      }
    }else if(c.tipo==='firma'){
      if(v){
        try{const f1=await firmaRecortada(doc,v,c.w,c.h,true);pg.drawImage(f1.im,{x:c.x+(c.w-f1.w)/2,y:c.y+(c.h-f1.h)/2,width:f1.w,height:f1.h});}
        catch(e){console.warn('firma en la planilla:',e);}
      }
    }else texto(pg,c,v);
  }
  try{if(form) form.flatten();}catch(e){}
  return await doc.saveAsBase64({dataUri:false});
}
