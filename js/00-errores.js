// Registro de errores: guarda los últimos errores del celular para poder revisarlos en Ajustes → Diagnóstico
(function(){
  function guardar(msg){
    try{
      var a=JSON.parse(localStorage.getItem('sube:errores')||'[]');
      a.push({t:new Date().toISOString(),m:String(msg).slice(0,300)});
      localStorage.setItem('sube:errores',JSON.stringify(a.slice(-30)));
    }catch(e){}
  }
  window.addEventListener('error',function(e){guardar((e.message||'error')+' ('+(e.filename||'').split('/').pop()+':'+(e.lineno||0)+')');});
  window.addEventListener('unhandledrejection',function(e){guardar('Promesa rechazada: '+((e.reason&&e.reason.message)||e.reason));});
})();
