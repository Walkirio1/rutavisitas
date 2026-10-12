// Campos adicionales de la planilla general: texto, número, fecha, sí/no, opciones y firma en pantalla
const TIPOS_CAMPO={texto:'Texto',numero:'Número',fecha:'Fecha',si_no:'Sí / No',opciones:'Opciones (elegir una)',firma:'Firma en pantalla'};
// dónde se dibuja la firma en el PDF
const POS_FIRMA={final:'Posición: pegada al final de la planilla',pie_izq:'Posición: abajo a la izquierda',pie_centro:'Posición: abajo, centrada',pie_der:'Posición: abajo a la derecha'};
let plExtra={}; // valores de la visita que se está completando: {idCampo: valor}

function camposActivos(){
  if(modoPlanilla()==='general') return (plantilla().campos)||[];
  const pc=pdfConCampos();if(pc) return pc.campos; // planilla PDF con campos marcados por el usuario
  if(firmaDePlanillaPdf()) return [{id:'firma_pdf',tipo:'firma',etiqueta:'Firma',obligatorio:false,pos:'final'}]; // planilla PDF con firma
  return [];
}
function idCampoNuevo(){return 'f'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36);}

// ── Formulario (dentro de la planilla de la visita)
function pintarCamposExtra(pl){
  const cont=document.getElementById('plExtraBox'),tit=document.getElementById('plExtraTit'),campos=camposActivos();
  plExtra={};_plAutoRef=pl||null;
  // valores previos: se buscan por id (si el campo se quitó de la planilla después, no se muestra)
  if(pl&&pl.extra) campos.forEach(c=>{if(pl.extra[c.id]!==undefined)plExtra[c.id]=pl.extra[c.id];});
  tit.style.display=campos.length?'':'none';
  cont.innerHTML=pdfConCampos()?seccionesHtml(campos):campos.map(c=>htmlCampo(c)).join('');
  plCambio();
}
function htmlCampo(c,compacto){
  const v=plExtra[c.id],req=c.obligatorio?' <span class="plreq">*</span>':'';
  const lab=`<div class="pllb">${escapeHtml(c.etiqueta)}${req}</div>`,num=compacto?' scnum':'';
  if(c.tipo==='texto') return `<div class="plcampo">${lab}<input class="pli" type="text" value="${escapeHtml(v||'')}" oninput="plExtra['${c.id}']=this.value;plCambio()"></div>`;
  if(c.tipo==='numero') return `<div class="plcampo${num}">${lab}${c.moneda?'<div class="plmon"><span>$</span>':''}<input class="pli" type="number" inputmode="decimal" value="${escapeHtml(v==null?'':v)}" oninput="plExtra['${c.id}']=this.value;plCambio()">${c.moneda?'</div>':''}</div>`;
  if(c.tipo==='fecha') return `<div class="plcampo">${lab}<input class="pli" type="date" value="${escapeHtml(v||'')}" oninput="plExtra['${c.id}']=this.value;plCambio()"></div>`;
  if(c.tipo==='si_no') return `<div class="plcampo">${lab}<div class="plsino" data-id="${c.id}"><button type="button" class="${v==='Sí'?'on':''}" onclick="plSiNo('${c.id}','Sí')">Sí</button><button type="button" class="${v==='No'?'on':''}" onclick="plSiNo('${c.id}','No')">No</button></div></div>`;
  if(c.tipo==='opciones') return `<div class="plcampo">${lab}<select class="pli" onchange="plExtra['${c.id}']=this.value;plCambio()"><option value="">— elegir —</option>${(c.opciones||[]).map(o=>`<option${o===v?' selected':''}>${escapeHtml(o)}</option>`).join('')}</select></div>`;
  if(c.tipo==='firma') return `<div class="plcampo">${lab}<div class="plfirma" onclick="abrirFirma('${c.id}')" id="plfirma_${c.id}">${v?`<img src="${v}" alt="Firma">`:'<span>✍️ Tocá para firmar</span>'}</div></div>`;
  if(c.tipo==='tilde') return `<div class="plcampo"><div class="plr${v==='Sí'?' on':''}" onclick="plTilde('${c.id}',this)"><div class="plrn">${escapeHtml(c.etiqueta)}${c.puntos?' · '+c.puntos+' pts':''}${req}</div><div class="plck"><span class="plx">✕</span></div></div></div>`;
  if(c.tipo==='suma') return `<div class="plcampo${num}${compacto?' tot':''}">${lab}<div class="plsuma" id="plsuma_${c.id}">0</div></div>`;
  return '';
}
// Planilla PDF con campos: tarjetas por sección, con los campos en el mismo orden y en las mismas filas que la hoja
let _plAutoRef=null;
function autoValor(f){
  const pl=_plAutoRef,p=puntos.find(x=>x.id===curId)||{};
  return ({fecha:(pl&&pl.fecha)||hoy(),hora:(pl&&pl.hora)||ahora(),id:p.id||'',direccion:(p.dir||'')+(p.localidad?' - '+p.localidad:''),nombre:p.nombre||'',rubro:(pl&&pl.rubro)||p.tipo||''})[f]||'';
}
function chipTilde(k,etq){return `<div class="sc-chip${plExtra[k.id]==='Sí'?' on':''}" onclick="plTilde('${k.id}',this)">${escapeHtml(etq)}${k.puntos?` · ${k.puntos} pts`:''}</div>`;}
function filaHtml(fila){
  const c0=fila[0],req=c=>c.obligatorio?' <span class="plreq">*</span>':'';
  const solo=fila.every(c=>c.tipo==='tilde');
  if(solo){
    if(fila.length===1) return `<div class="sc-f" onclick="plTilde('${c0.id}',this.querySelector('.sc-ck'))"><div class="sc-n">${escapeHtml(c0.etiqueta)}${c0.puntos?` <span class="sc-pts">· ${c0.puntos} pts</span>`:''}${req(c0)}</div><div class="sc-ck${plExtra[c0.id]==='Sí'?' on':''}">✕</div></div>`;
    if(fila.every(c=>c.etiqueta.includes(' · '))){ // columnas Sí / No: el nombre de la fila y un botón por columna
      const nom=c0.etiqueta.split(' · ')[0];
      return `<div class="sc-f"><div class="sc-n">${escapeHtml(nom)}${c0.puntos?` <span class="sc-pts">· ${c0.puntos} pts</span>`:''}${req(c0)}</div>${fila.map(k=>chipTilde(k,k.etiqueta.split(' · ').pop())).join('')}</div>`;
    }
    return `<div class="sc-f sc-opc">${fila.map(k=>chipTilde(k,k.etiqueta)).join('')}</div>`; // varias casillas en la misma fila, cada una con su texto
  }
  if(fila.length===1){
    if(c0.tipo==='auto') return `<div class="plcampo sc-auto"><div class="pllb">${escapeHtml(c0.etiqueta)}</div><div class="sc-av">${escapeHtml(autoValor(c0.fuente))||'—'}</div></div>`;
    return htmlCampo(c0,true);
  }
  // varios campos en la misma fila de la hoja: van uno al lado del otro
  return `<div class="sc-row">${fila.map(c=>`<div class="sc-cell">${c.tipo==='tilde'?`<div style="padding-top:18px">${chipTilde(c,c.etiqueta)}</div>`:(c.tipo==='auto'?`<div class="plcampo sc-auto"><div class="pllb">${escapeHtml(c.etiqueta)}</div><div class="sc-av">${escapeHtml(autoValor(c.fuente))||'—'}</div></div>`:htmlCampo(c,false))}</div>`).join('')}</div>`;
}
function seccionesHtml(campos){
  const ord=campos.slice().sort((a,b)=>(a.pag||0)-(b.pag||0)||(Math.abs(a.y-b.y)>5?b.y-a.y:a.x-b.x));
  const grupos=[];
  ord.forEach(c=>{
    const t=c.seccion||'';let g=grupos[grupos.length-1];
    if(!g||g.t!==t){g={t,filas:[]};grupos.push(g);}
    const f=g.filas[g.filas.length-1];
    if(f&&f.pag===(c.pag||0)&&Math.abs(f.y-c.y)<=5) f.c.push(c);
    else g.filas.push({pag:c.pag||0,y:c.y,c:[c]});
  });
  const unico=grupos.length===1&&!grupos[0].t;
  return grupos.map(g=>{
    const filas=g.filas.map(f=>filaHtml(f.c.sort((a,b)=>a.x-b.x))).join('');
    return `<div class="tj">${g.t?`<div class="sc-t">${escapeHtml(g.t)}</div>`:(unico?'':`<div class="sc-t">Otros datos</div>`)}${filas}</div>`;
  }).join('');
}
function plTilde(id,el){plExtra[id]=plExtra[id]==='Sí'?'':'Sí';el.classList.toggle('on',plExtra[id]==='Sí');plCambio();}
const fmtMonto=n=>Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); // 10,30 · 1.750,00
// recalcula los totales (campos de suma) cada vez que algo cambia
function plCambio(){
  const campos=camposActivos();
  campos.filter(c=>c.tipo==='suma').forEach(c=>{
    const t=valorSuma(c,plExtra,campos);plExtra[c.id]=t;
    const el=document.getElementById('plsuma_'+c.id);if(el) el.textContent=c.moneda?'$ '+fmtMonto(t):t;
  });
}
function plSiNo(id,val){
  plExtra[id]=plExtra[id]===val?'':val;plCambio();
  document.querySelectorAll(`.plsino[data-id="${id}"] button`).forEach(b=>b.classList.toggle('on',b.textContent===plExtra[id]));
}
// Antes de guardar: campos obligatorios completos
function faltaCampoObligatorio(){
  const c=camposActivos().find(c=>c.obligatorio&&!plExtra[c.id]);
  if(c){showToast('Falta completar: '+c.etiqueta,true);return true;}
  return false;
}
// Texto de los datos adicionales de una visita (Excel, informe): "Etiqueta: valor · …"
function textoExtras(pl){
  if(!pl||!pl.extra||!pl.extraDef) return '';
  return pl.extraDef.map(c=>{
    const v=pl.extra[c.id];if(!v) return '';
    return c.etiqueta+': '+(c.tipo==='firma'?'firmado':v);
  }).filter(Boolean).join(' · ');
}

// ── Firma en pantalla
let _firmaId=null,_firmaTrazo=false;
function abrirFirma(id){
  _firmaId=id;_firmaTrazo=false;
  const dlg=document.getElementById('firmaDlg'),cv=document.getElementById('firmaCv');
  dlg.classList.add('show');
  const def=camposActivos().find(c=>c.id===id);
  document.getElementById('firmaSub').textContent=def?def.etiqueta:'Con el dedo, dentro del recuadro';
  const r=cv.getBoundingClientRect(),dpr=2;
  cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);
  const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);
  x.lineWidth=3.2*dpr;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#0b1b4d';
  const prev=plExtra[id];
  if(prev){const im=new Image();im.onload=()=>{x.drawImage(im,0,0,cv.width,cv.height);_firmaTrazo=true;};im.src=prev;}
}
(function(){
  let dibujando=false,ult=null;
  function pos(e,cv){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height};}
  document.addEventListener('pointerdown',e=>{
    const cv=document.getElementById('firmaCv');if(!cv||e.target!==cv) return;
    dibujando=true;ult=pos(e,cv);_firmaTrazo=true;cv.setPointerCapture(e.pointerId);
    const x=cv.getContext('2d');x.beginPath();x.arc(ult.x,ult.y,x.lineWidth/2,0,7);x.fillStyle='#0b1b4d';x.fill();
  });
  document.addEventListener('pointermove',e=>{
    const cv=document.getElementById('firmaCv');if(!dibujando||!cv) return;
    const p=pos(e,cv),x=cv.getContext('2d');
    x.beginPath();x.moveTo(ult.x,ult.y);x.lineTo(p.x,p.y);x.stroke();ult=p;
  });
  ['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{dibujando=false;}));
})();
function firmaBorrar(){
  const cv=document.getElementById('firmaCv'),x=cv.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);_firmaTrazo=false;
}
function firmaGuardar(){
  if(!_firmaTrazo){showToast('Firmá primero con el dedo',true);return;}
  const cv=document.getElementById('firmaCv');
  // se achica para que pese poco
  const c=document.createElement('canvas');c.width=500;c.height=Math.round(500*cv.height/cv.width);
  c.getContext('2d').drawImage(cv,0,0,c.width,c.height);
  plExtra[_firmaId]=c.toDataURL('image/png');
  const box=document.getElementById('plfirma_'+_firmaId);
  if(box) box.innerHTML=`<img src="${plExtra[_firmaId]}" alt="Firma">`;
  firmaCerrar();plCambio();
}
function firmaCerrar(){document.getElementById('firmaDlg').classList.remove('show');}

// ── Editor de campos (dentro del editor de la planilla general)
function pintarEditorCampos(){
  const l=document.getElementById('plEdCampos');if(!l) return;
  l.innerHTML=(_plEd.campos||[]).map((c,i)=>`
    <div class="plcamp-ed">
      <div class="pled-row"><input type="text" value="${escapeHtml(c.etiqueta)}" placeholder="Nombre del campo" onchange="_plEd.campos[${i}].etiqueta=this.value"><button onclick="plEdQuitarCampo(${i})" aria-label="Quitar">✕</button></div>
      <div class="plcamp-sub"><span>${TIPOS_CAMPO[c.tipo]||c.tipo}</span><label><input type="checkbox" ${c.obligatorio?'checked':''} onchange="_plEd.campos[${i}].obligatorio=this.checked"> Obligatorio</label></div>
      ${c.tipo==='firma'?`<select class="pli" onchange="_plEd.campos[${i}].pos=this.value">${Object.entries(POS_FIRMA).map(([k,n])=>`<option value="${k}"${(c.pos||'final')===k?' selected':''}>${n}</option>`).join('')}</select>`:''}
      ${c.tipo==='opciones'?`<input class="pli" type="text" value="${escapeHtml((c.opciones||[]).join(', '))}" placeholder="Opciones separadas por coma" onchange="_plEd.campos[${i}].opciones=this.value.split(',').map(s=>s.trim()).filter(Boolean)">`:''}
    </div>`).join('');
}
function plEdAgregarCampo(){
  const tipo=document.getElementById('plEdCampoTipo').value,inp=document.getElementById('plEdCampoNom'),nom=inp.value.trim();
  if(!nom){showToast('Escribí el nombre del campo',true);return;}
  _plEd.campos=_plEd.campos||[];
  if(_plEd.campos.length>=12){showToast('Máximo 12 campos adicionales',true);return;}
  _plEd.campos.push({id:idCampoNuevo(),tipo,etiqueta:nom,obligatorio:false,opciones:tipo==='opciones'?['Opción 1','Opción 2']:undefined});
  inp.value='';pintarEditorCampos();
}
function plEdQuitarCampo(i){_plEd.campos.splice(i,1);pintarEditorCampos();}
