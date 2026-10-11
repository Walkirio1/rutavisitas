// Detección automática de campos en una planilla PDF: casillas (cuadraditos), datos como "Fecha:", totales, firma y más.
// Si el PDF es un formulario rellenable, se usan sus campos reales. El usuario solo revisa la lista (nada de marcar a mano).

// ── texto de la hoja agrupado en frases (con su posición en puntos del PDF)
const RX_GLIFO=/[☐□▢❏❐❑❒◻⬜🔲]/;
// elementos de texto de la hoja; los caracteres de casilla (☐ □ …) se separan: quedan como casillas aparte
async function itemsDePagina(pg){
  const tc=await pg.getTextContent(),it=[],glifos=[];
  for(const i of tc.items){
    const str=i.str||'';if(!str.trim()) continue;
    const x=i.transform[4],y=i.transform[5],h=Math.abs(i.transform[3])||i.height||9;
    if(!RX_GLIFO.test(str)){it.push({s:str,x,y,w:i.width,h});continue;}
    const cw=i.width/Math.max(1,str.length);let buf='',bx=x;
    [...str].forEach((ch,j)=>{
      const cx=x+j*cw;
      if(RX_GLIFO.test(ch)){
        if(buf.trim()) it.push({s:buf,x:bx,y,w:cx-bx,h});buf='';bx=cx+cw;
        const t=Math.min(cw,h)*.8;glifos.push({x:cx+(cw-t)/2,y:y-h*.05,w:t,h:t});
      }else{if(!buf) bx=cx;buf+=ch;}
    });
    if(buf.trim()) it.push({s:buf,x:bx,y,w:x+i.width-bx,h});
  }
  return {it,glifos};
}
async function frasesDePagina(pg){
  const it=(await itemsDePagina(pg)).it;
  it.sort((a,b)=>Math.abs(b.y-a.y)>2.5?b.y-a.y:a.x-b.x);
  const out=[];
  for(const t of it){
    const u=out[out.length-1];
    if(u&&Math.abs(u.y-t.y)<=2.5&&t.x-(u.x+u.w)<=7&&t.x>=u.x-1){u.s+=(t.x-(u.x+u.w)>1.5?' ':'')+t.s;u.w=t.x+t.w-u.x;u.h=Math.max(u.h,t.h);}
    else out.push({s:t.s,x:t.x,y:t.y,w:t.w,h:t.h});
  }
  return out;
}

// ── rectángulos pequeños y cuadrados (casillas) a partir de las instrucciones de dibujo del PDF
async function cuadradosDePagina(pg){
  const OPS=window.pdfjsLib.OPS,ol=await pg.getOperatorList(),res=[],segs=[];
  const mul=(m,n)=>[m[0]*n[0]+m[1]*n[2],m[0]*n[1]+m[1]*n[3],m[2]*n[0]+m[3]*n[2],m[2]*n[1]+m[3]*n[3],m[4]*n[0]+m[5]*n[2]+n[4],m[4]*n[1]+m[5]*n[3]+n[5]];
  let ctm=[1,0,0,1,0,0];const pila=[];
  const aplicar=(x,y)=>[ctm[0]*x+ctm[2]*y+ctm[4],ctm[1]*x+ctm[3]*y+ctm[5]];
  const MIN=5,MAX=28;
  const cuadrado=(x0,y0,x1,y1)=>{const w=x1-x0,h=y1-y0;if(w>=MIN&&w<=MAX&&h>=MIN&&h<=MAX&&Math.max(w,h)/Math.min(w,h)<=1.4) res.push({x:x0,y:y0,w,h});};
  const agregar=pts=>{
    const P=pts.map(p=>aplicar(p[0],p[1])),xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);
    cuadrado(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));
  };
  // un trazo recto (horizontal o vertical) corto: puede ser el lado de una casilla dibujada con 4 líneas
  const trazo=(p,q)=>{
    const A=aplicar(p[0],p[1]),B=aplicar(q[0],q[1]);
    if(Math.abs(A[1]-B[1])<.6&&Math.abs(A[0]-B[0])>=MIN&&Math.abs(A[0]-B[0])<=MAX) segs.push({h:true,c:(A[1]+B[1])/2,a:Math.min(A[0],B[0]),b:Math.max(A[0],B[0])});
    else if(Math.abs(A[0]-B[0])<.6&&Math.abs(A[1]-B[1])>=MIN&&Math.abs(A[1]-B[1])<=MAX) segs.push({h:false,c:(A[0]+B[0])/2,a:Math.min(A[1],B[1]),b:Math.max(A[1],B[1])});
  };
  for(let i=0;i<ol.fnArray.length;i++){
    const fn=ol.fnArray[i],a=ol.argsArray[i];
    if(fn===OPS.save) pila.push(ctm.slice());
    else if(fn===OPS.restore) ctm=pila.pop()||[1,0,0,1,0,0];
    else if(fn===OPS.transform) ctm=mul(a,ctm);
    else if(fn===OPS.constructPath){
      const ops=a[0],co=a[1];let k=0,sub=[],lineas=0,curvas=0;
      const cerrar=()=>{
        if(sub.length===2) trazo(sub[0],sub[1]);
        else if(sub.length>=4&&sub.length<=5&&!curvas){const axis=sub.every((p,j)=>j===0||Math.abs(p[0]-sub[j-1][0])<.5||Math.abs(p[1]-sub[j-1][1])<.5);if(axis)agregar(sub);}
        else if(curvas&&curvas<=8&&lineas>=3&&sub.length<=13) agregar(sub); // casilla con esquinas redondeadas
        sub=[];lineas=0;curvas=0;
      };
      for(const op of ops){
        if(op===OPS.rectangle){
          const x=co[k],y=co[k+1],w=co[k+2],h=co[k+3];k+=4;
          if(Math.min(Math.abs(w),Math.abs(h))<1.2) trazo([x,y],[x+w,y+h]); // borde dibujado como rectángulo finito
          else agregar([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
        }
        else if(op===OPS.moveTo){cerrar();sub=[[co[k],co[k+1]]];k+=2;}
        else if(op===OPS.lineTo){sub.push([co[k],co[k+1]]);lineas++;k+=2;}
        else if(op===OPS.curveTo){sub.push([co[k+4],co[k+5]]);curvas++;k+=6;}
        else if(op===OPS.curveTo2||op===OPS.curveTo3){sub.push([co[k+2],co[k+3]]);curvas++;k+=4;}
        else if(op===OPS.closePath) cerrar();
      }
      cerrar();
    }
  }
  // casillas dibujadas con cuatro líneas sueltas: dos horizontales y dos verticales que forman un cuadrado
  const H=segs.filter(s=>s.h),V=segs.filter(s=>!s.h);
  for(const t of H)for(const u of H){
    const d=u.c-t.c;if(d<MIN||d>MAX||Math.abs(t.a-u.a)>2||Math.abs(t.b-u.b)>2) continue;
    if(Math.abs((t.b-t.a)-d)>Math.max(2.5,d*.25)) continue;
    const izq=V.some(v=>Math.abs(v.c-t.a)<2.5&&Math.abs(v.a-t.c)<2.5&&Math.abs(v.b-u.c)<2.5),der=V.some(v=>Math.abs(v.c-t.b)<2.5&&Math.abs(v.a-t.c)<2.5&&Math.abs(v.b-u.c)<2.5);
    if(izq&&der) cuadrado(t.a,t.c,t.b,u.c);
  }
  // casillas escritas como carácter (☐ □ …)
  try{(await itemsDePagina(pg)).glifos.forEach(g=>res.push(g));}catch(e){}
  // sin duplicados (mismo cuadrado dibujado dos veces: relleno y borde)
  const u=[];res.forEach(r=>{if(!u.some(q=>Math.abs(q.x-r.x)<3&&Math.abs(q.y-r.y)<3)) u.push(r);});
  return u;
}

const RX_AUTO=[[/^fecha/i,'fecha'],[/^hora/i,'hora'],[/^(direcci[oó]n|domicilio)/i,'direccion'],[/^(local|comercio|nombre del (local|comercio|establecimiento)|raz[oó]n social|establecimiento|punto de venta)/i,'nombre'],[/^(id|c[oó]digo|n[uú]mero de (local|punto))/i,'id'],[/^(rubro|tipo)/i,'rubro']];
function limpiarEt(s){return String(s).replace(/[:_\.]+\s*$/,'').replace(/\s+/g,' ').trim();}
function puntosDe(s){const m=String(s).match(/\(?\s*(\d+(?:[.,]\d+)?)\s*(?:pts?\.?|puntos?)\s*\)?/i);return m?{p:parseFloat(m[1].replace(',','.')),s:s.replace(m[0],'').replace(/[\s\-–:]+$/,'').trim()}:{p:0,s};}

// ── detecta todo y devuelve la lista de campos propuestos
async function detectarCampos(pdf){
  const campos=[];let n=0;const nid=()=>'d'+Date.now().toString(36)+(n++);
  for(let p=0;p<pdf.numPages;p++){
    const pg=await pdf.getPage(p+1),vp=pg.getViewport({scale:1}),frases=await frasesDePagina(pg),cuad=await cuadradosDePagina(pg);
    const usadas=new Set();
    // casillas: filas con 1 o varias casillas
    cuad.sort((a,b)=>b.y-a.y||a.x-b.x);
    const filas=[];cuad.forEach(c=>{const f=filas.find(f=>Math.abs(f.y-c.y)<5);if(f)f.c.push(c);else filas.push({y:c.y,c:[c]});});
    for(const f of filas){
      f.c.sort((a,b)=>a.x-b.x);
      const enFila=frases.filter(s=>s.y>=f.y-5&&s.y<=f.y+f.c[0].h+3);
      const izq=enFila.filter(s=>s.x+s.w<=f.c[0].x+3).sort((a,b)=>(b.x+b.w)-(a.x+a.w));
      const der=c=>enFila.filter(s=>s.x>=c.x+c.w-2&&s.x-(c.x+c.w)<=16).sort((a,b)=>a.x-b.x)[0]||null;
      const dere=f.c.map(der),modoDer=dere.every(Boolean); // casilla + texto a su derecha (varias por fila, en columnas)
      for(let j=0;j<f.c.length;j++){
        const c=f.c[j];let fila=null;
        if(modoDer) fila=dere[j];
        else if(f.c.length===1){fila=izq[0]||dere[0]||null;}
        else{ // varias casillas en la fila: el texto de la fila + el encabezado de la columna (Sí / No, etc.)
          fila=enFila.filter(s=>s.x+s.w<=f.c[0].x+3).sort((a,b)=>a.x-b.x)[0]||null;
        }
        let et=fila?fila.s:'';if(fila&&!(modoDer&&/[:_]\s*$/.test(et))) usadas.add(fila);
        if(f.c.length>1&&!modoDer){
          const cx=c.x+c.w/2,enc=frases.filter(s=>s.y>c.y+c.h&&s.y-c.y<220&&Math.abs(s.x+s.w/2-cx)<=Math.max(30,s.w/2+8)&&s.s.length<24).sort((a,b)=>a.y-b.y)[0];
          if(enc){et=(et?et+' · ':'')+enc.s;usadas.add(enc);}
        }
        const pt=puntosDe(et||('Casilla '+(campos.filter(x=>x.tipo==='tilde').length+1)));
        const k={id:nid(),tipo:'tilde',etiqueta:limpiarEt(pt.s)||'Casilla',pag:p,x:c.x,y:c.y,w:c.w,h:c.h};
        if(pt.p&&j===0) k.puntos=pt.p; // con columnas Sí / No, los puntos van solo en la primera columna
        if(j===0&&/cerrad|inexistente|no se pudo|no atiende|no existe/i.test(k.etiqueta)) k.cierra=true;
        campos.push(k);
      }
    }
    // signo $: a su lado siempre va un número (importe); se toma el texto de la izquierda como nombre
    for(const s of frases){
      if(!/\$\s*[_\.]*\s*$/.test(s.s.trim())) continue;
      const solo=s.s.replace(/[$_\.\s:]/g,'').length===0;
      let nom='Importe';
      const hermanos=frases.filter(q=>q!==s&&/\$\s*[_\.]*\s*$/.test(q.s.trim())&&Math.abs(q.y-s.y)<=3);
      if(hermanos.length){ // varias columnas de importes en la misma fila: nombre de la fila + encabezado de la columna
        const fil=frases.filter(q=>Math.abs(q.y-s.y)<=3&&!/\$/.test(q.s)&&q.x+q.w<=Math.min(s.x,...hermanos.map(h=>h.x))+2).sort((a,b)=>a.x-b.x)[0];
        const enc=frases.filter(q=>q.y>s.y&&q.y-s.y<120&&Math.abs(q.x+q.w/2-(s.x+s.w/2))<70&&q.s.length<28&&!/\$/.test(q.s)).sort((a,b)=>a.y-b.y)[0];
        const col=enc?limpiarEt(enc.s):'Importe '+(1+[s,...hermanos].sort((a,b)=>a.x-b.x).indexOf(s));
        nom=(fil?limpiarEt(fil.s)+' · ':'')+col;usadas.add(s);if(fil)usadas.add(fil);if(enc)usadas.add(enc);
        const x=s.x+s.w+3,w=Math.max(40,Math.min(90,vp.width-30-x));
        campos.push({id:nid(),tipo:/total|suma|puntaje/i.test(nom)?'suma':'numero',moneda:true,etiqueta:nom,pag:p,x,y:s.y-2.5,w,h:14});
        continue;
      }
      if(!solo){const n=limpiarEt(s.s.replace(/\$/g,'').trim());if(n.length>=2) nom=n;usadas.add(s);}
      else{
        const izq=frases.filter(q=>q!==s&&Math.abs(q.y-s.y)<=4&&q.x+q.w<=s.x+2&&s.x-(q.x+q.w)<260).sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0];
        if(izq){nom=limpiarEt(izq.s)||nom;usadas.add(izq);}
        else{const enc=frases.filter(q=>q.y>s.y&&q.y-s.y<120&&Math.abs(q.x+q.w/2-(s.x+s.w/2))<60&&q.s.length<28).sort((a,b)=>a.y-b.y)[0];if(enc){nom=limpiarEt(enc.s)||nom;usadas.add(enc);}}
        usadas.add(s);
      }
      const x=s.x+s.w+3,w=Math.max(40,Math.min(90,vp.width-30-x));
      // si la fila o la columna dice Total / Subtotal / Suma, el $ es el casillero del total: ahí va la suma
      const esTotal=/total|suma|puntaje/i.test(nom);
      campos.push({id:nid(),tipo:esTotal?'suma':'numero',moneda:true,etiqueta:nom,pag:p,x,y:s.y-2.5,w,h:14});
    }
    // datos automáticos, totales, firma y otros campos "Etiqueta:"
    for(const s of frases){
      if(usadas.has(s)) continue;
      const t=s.s.trim(),hasta=Math.min(vp.width-30,s.x+s.w+190);
      if(/firma|aclaraci[oó]n/i.test(t)&&t.length<40){campos.push({id:nid(),tipo:'firma',etiqueta:limpiarEt(t)||'Firma',pag:p,x:Math.max(10,Math.min(vp.width-180,s.x)),y:s.y+6,w:170,h:62});continue;}
      if(!/[:_]\s*$/.test(t)&&t.length>26) continue; // solo etiquetas cortas o que terminan en ":"
      if(!/[:_]\s*$/.test(t)) continue;
      const base=limpiarEt(t),x=s.x+s.w+4,w=Math.max(40,Math.min(160,hasta-x));
      const auto=RX_AUTO.find(r=>r[0].test(base));
      if(auto){campos.push({id:nid(),tipo:'auto',etiqueta:FUENTES_AUTO[auto[1]],fuente:auto[1],pag:p,x,y:s.y-2.5,w,h:14});continue;}
      if(/total|puntaje|suma/i.test(base)){campos.push({id:nid(),tipo:'suma',etiqueta:base,pag:p,x,y:s.y-2.5,w:Math.min(w,60),h:14});continue;}
      if(base.length>=3&&base.length<=40) campos.push({id:nid(),tipo:/cantidad|n[uú]mero|importe|monto|edad|\bn[°º]/i.test(base)?'numero':'texto',etiqueta:base,pag:p,x,y:s.y-2.5,w,h:14});
    }
    const hs=frases.map(f=>f.h).sort((a,b)=>a-b),hMed=hs[Math.floor(hs.length/2)]||10;
    // sección de cada campo: el título (en mayúsculas) más cercano por encima
    const pcs=campos.filter(k=>k.pag===p),tits=frases.filter(s=>!usadas.has(s)&&esTituloSec(s,hMed)&&!pcs.some(k=>Math.abs(k.y-s.y)<8));
    pcs.forEach(k=>{const e=tits.filter(s=>s.y>=k.y+Math.min(k.h,16)-2).sort((a,b)=>a.y-b.y)[0];if(e) k.seccion=limpiarEt(e.s);});
  }
  // lo que queda sin título en una hoja sigue en la sección de la anterior
  let ult='';campos.forEach(k=>{if(k.seccion) ult=k.seccion;else if(ult&&!campos.some(o=>o.pag===k.pag&&o.seccion)) k.seccion=ult;});
  return campos;
}
function esTituloSec(f,hMed){ // título de sección: todo en mayúsculas, o con letra más grande que el resto
  const t=f.s.trim();
  if(t.length<3||t.length>45||/[:_]\s*$/.test(t)||/\d{3,}/.test(t)||!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(t)) return false;
  return (/[A-ZÁÉÍÓÚÑ]{3}/.test(t)&&t===t.toUpperCase())||f.h>=hMed*1.2;
}

// ── PDF rellenable (con campos reales de formulario)
async function camposDeFormulario(bytes,pdf){
  if(!window.PDFLib) return []; // sin pdf-lib se sigue con la detección de la hoja
  const {PDFDocument}=window.PDFLib;
  let doc;try{doc=await PDFDocument.load(bytes);}catch(e){return [];}
  const form=doc.getForm(),fields=form.getFields(),pages=doc.getPages(),res=[];let n=0;
  const frases=[];for(let p=0;p<pdf.numPages;p++) frases.push(await frasesDePagina(await pdf.getPage(p+1)));
  for(const f of fields){
    const L=window.PDFLib,ws=f.acroField.getWidgets();if(!ws.length) continue;
    const w0=ws[0],r=w0.getRectangle(),pr=w0.P(),pag=Math.max(0,pages.findIndex(pp=>pp.ref===pr));
    let t=null;
    if(f instanceof L.PDFCheckBox) t='tilde';else if(f instanceof L.PDFTextField) t='texto';else continue;
    const fr=frases[pag]||[],fila=fr.filter(s=>s.y>=r.y-5&&s.y<=r.y+r.height+3&&s.x+s.w<=r.x+3).sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0]||fr.filter(s=>s.y>=r.y-5&&s.y<=r.y+r.height+3&&s.x>=r.x+r.width-3).sort((a,b)=>a.x-b.x)[0];
    const pt=puntosDe(fila?fila.s:f.getName());
    const k={id:'f'+Date.now().toString(36)+(n++),tipo:t,etiqueta:limpiarEt(pt.s)||f.getName(),pag,x:r.x,y:r.y,w:r.width,h:r.height,via:'form',nombreForm:f.getName()};
    if(pt.p&&t==='tilde') k.puntos=pt.p;
    res.push(k);
  }
  return res;
}

// ── flujo: detectar → revisar la lista → usar
async function detectarYRevisar(id){
  const pl=planillas.find(x=>x.id===id);if(!pl) return;
  try{
    showToast('Buscando los campos de tu planilla…');
    await cargarPdfJs();
    const bin=atob(pl.b64.replace(/\s/g,''));const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const pdf=await window.pdfjsLib.getDocument({data:bytes.slice()}).promise;
    let campos=await camposDeFormulario(bytes,pdf),origen='formulario';
    if(!campos.length){campos=await detectarCampos(pdf);origen='hoja';}
    _rev={id,campos:campos.map(c=>({...c,on:true})),origen};
    if(!campos.length){mostrarDlgEnvio('No pude encontrar casillas ni datos en esta planilla (puede ser una imagen escaneada). Podés marcarlos vos sobre la hoja.',[{txt:'🧩 Marcar sobre la hoja',cls:'ba',fn:()=>abrirDisenador(id)},{txt:'Cancelar',cls:'bd'}]);return;}
    pintarRevision();document.getElementById('revDlg').classList.add('show');
  }catch(e){console.error('detectar:',e);showToast(e.message||'No se pudo leer la planilla',true);}
}
let _rev=null;
const NOMBRES_TIPO={tilde:'Casillas',auto:'Se completan solos',suma:'Totales',texto:'Textos',numero:'Números',fecha:'Fechas',firma:'Firma'};
function pintarRevision(){
  const g={};_rev.campos.forEach((c,i)=>{(g[c.tipo]=g[c.tipo]||[]).push([c,i]);});
  const orden=['tilde','auto','suma','numero','texto','fecha','firma'];
  document.getElementById('revRes').textContent=(_rev.origen==='formulario'?'Es un formulario rellenable: usé sus campos reales. ':'Estos son los campos que encontré en la hoja. ')+'Destildá los que no sirvan y corregí los nombres o puntos.';
  document.getElementById('revLista').innerHTML=orden.filter(t=>g[t]).map(t=>`<div class="rev-g">${NOMBRES_TIPO[t]} <span>${g[t].length}</span></div>`+g[t].map(([c,i])=>`
    <div class="rev-r"><input type="checkbox" ${c.on?'checked':''} onchange="_rev.campos[${i}].on=this.checked;actualizarRevCuenta()">
      <input type="text" class="rev-n" value="${escapeHtml(c.etiqueta)}" onchange="_rev.campos[${i}].etiqueta=this.value.trim()||_rev.campos[${i}].etiqueta"${c.tipo==='auto'?' disabled':''}>
      ${c.tipo==='tilde'?`<input type="number" inputmode="decimal" class="rev-p" placeholder="pts" value="${c.puntos||''}" onchange="_rev.campos[${i}].puntos=parseFloat(this.value)||0;if(!_rev.campos[${i}].puntos)delete _rev.campos[${i}].puntos">`:''}
    </div>`).join('')).join('');
  actualizarRevCuenta();
}
function actualizarRevCuenta(){const n=_rev.campos.filter(c=>c.on).length;document.getElementById('revOk').textContent='Usar estos '+n+' campos';}
function revUsar(){
  const pl=planillas.find(x=>x.id===_rev.id);if(!pl) return;
  const campos=_rev.campos.filter(c=>c.on).map(c=>{const k={...c};delete k.on;return k;});
  if(!campos.length){showToast('No hay campos elegidos',true);return;}
  pl.campos=campos;delete pl.firma;lsSet(SK.planillas,planillas);
  document.getElementById('revDlg').classList.remove('show');aplicarPlantilla();renderPlanillas();
  showToast('Listo ✓ '+campos.length+' campos. Si algo no queda bien, usá «🧩 Campos» para ajustarlo.');
}
function revAjustar(){
  const pl=planillas.find(x=>x.id===_rev.id);if(!pl) return;
  pl.campos=_rev.campos.filter(c=>c.on).map(c=>{const k={...c};delete k.on;return k;});
  lsSet(SK.planillas,planillas);document.getElementById('revDlg').classList.remove('show');abrirDisenador(_rev.id);
}
function revCerrar(){document.getElementById('revDlg').classList.remove('show');}
