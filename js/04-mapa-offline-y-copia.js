// Mapa sin señal y copia de seguridad
// ── MAPA SIN SEÑAL: guarda en el celular los cuadraditos de mapa alrededor de los puntos ubicados
const TILES_CACHE='sube-tiles';
function tileXY(lat,lng,z){const n=2**z,r=lat*Math.PI/180;return [Math.floor((lng+180)/360*n),Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)];}
async function guardarMapaOffline(){
  const pts=puntos.filter(p=>p.lat&&p.lng);
  if(!pts.length){showToast('Primero ubicá los puntos en el mapa',true);return;}
  if(!('caches' in window)){showToast('Este navegador no permite guardar mapas',true);return;}
  const urls=new Set();
  for(const z of [12,13,14,15,16]){
    const r=z>=15?1:0;
    for(const p of pts){
      const [x,y]=tileXY(p.lat,p.lng,z);
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)urls.add(`https://tile.openstreetmap.org/${z}/${x+dx}/${y+dy}.png`);
    }
  }
  const lista=[...urls].slice(0,1800);
  const est=document.getElementById('mapaOffEst');
  const c=await caches.open(TILES_CACHE);
  let hechos=0,fallos=0,i=0;
  showToast('Guardando mapa… no cierres la app ('+lista.length+' cuadros)');
  mantenerPantalla(true);
  async function worker(){
    while(i<lista.length){
      const u=lista[i++];
      try{
        if(!(await c.match(u))){
          const r=await fetch(u,{mode:'cors'});
          if(r.ok) await c.put(u,r); else fallos++;
        }
        hechos++;
      }catch(e){fallos++;}
      if(est&&(hechos+fallos)%10===0) est.textContent='Guardando… '+Math.round((hechos+fallos)/lista.length*100)+'%';
      await _sleep(60);
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  mantenerPantalla(false);
  const msg=fallos>lista.length/2?'No se pudo guardar el mapa (sin conexión)':'Mapa guardado ✓ ('+hechos+' cuadros)';
  if(est) est.textContent=fallos>lista.length/2?'Guarda el mapa de tus puntos en el celular':'Guardado: '+hechos+' cuadros del mapa';
  showToast(msg,fallos>lista.length/2);
}

// ── COPIA DE SEGURIDAD
function menuCopia(){
  closeCfg();
  mostrarDlgEnvio('Copia de seguridad\n\nExportar guarda un archivo con tus puntos, visitas, fotos, historial y ajustes. Restaurar lo carga en este u otro celular.',[
    {txt:'📤 Exportar copia',cls:'ba',fn:exportarCopia},
    {txt:'📥 Restaurar copia',cls:'bd',fn:()=>document.getElementById('copiaFile').click()},
    {txt:'Cancelar',cls:'bd'}
  ]);
}
async function exportarCopia(){
  try{
    showToast('Armando la copia…');
    const datos={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith('sube:')&&k!==SK_DRV_ON&&k!==SK_DRV_USER&&k!==SK_IA) datos[k]=localStorage.getItem(k);
    }
    const fotos={};
    for(const id of Object.keys(visits||{})){
      const f=await fotoGet(id);if(f) fotos[id]=f;
    }
    const json=JSON.stringify({app:'verific',version:1,fecha:new Date().toISOString(),datos,fotos});
    const nombre='Verific_copia_'+new Date().toISOString().slice(0,10)+'.json';
    const file=new File([json],nombre,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:nombre});showToast('Copia lista ✓');return;}
      catch(e){if(e&&e.name==='AbortError') return;}
    }
    descargarArchivos([file]);
  }catch(e){console.error(e);showToast('No se pudo armar la copia',true);}
}
function restaurarCopia(input){
  const file=input.files[0];input.value='';
  if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    let c;
    try{c=JSON.parse(r.result);if(c.app!=='verific'||!c.datos)throw 0;}
    catch(e){showToast('Ese archivo no es una copia de Verific',true);return;}
    confirm2('¿Restaurar la copia del '+(c.fecha||'').slice(0,10)+'? Reemplaza lo que hay ahora en este celular.',async function(){
      try{
        for(const [k,v] of Object.entries(c.datos)) localStorage.setItem(k,v);
        await fotosClear();
        for(const [id,f] of Object.entries(c.fotos||{})) await fotoPut(id,f);
        showToast('Copia restaurada ✓ Reiniciando…');
        setTimeout(()=>location.reload(),900);
      }catch(e){console.error(e);showToast('No se pudo restaurar',true);}
    });
  };
  r.readAsText(file);
}
