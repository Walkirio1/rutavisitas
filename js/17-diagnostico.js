// Diagnóstico: resumen de la app y últimos errores, para mandar a soporte
function textoDiagnostico(){
  let err=[];try{err=JSON.parse(localStorage.getItem('sube:errores')||'[]');}catch(e){}
  const l=[
    'Verific · '+APP_VERSION,
    'Fecha: '+new Date().toLocaleString('es-AR'),
    'Instalada: '+((navigator.standalone===true||matchMedia('(display-mode: standalone)').matches)?'sí':'no'),
    'Conexión: '+(navigator.onLine?'sí':'no')+' · Drive: '+(drv.connected?'conectado':'no conectado'),
    'Puntos: '+puntos.length+' ('+puntos.filter(p=>p.lat).length+' ubicados) · En ruta: '+sel.size+' · Visitas: '+Object.keys(visits).length,
    'Pendientes de envío: '+pendientesEnvio().length,
    'Navegador: '+navigator.userAgent,
    '',
    err.length?'Últimos errores:':'Sin errores registrados.'
  ];
  err.slice(-8).forEach(x=>l.push('· '+x.t.slice(5,16).replace('T',' ')+' '+x.m));
  return l.join('\n');
}
function verDiagnostico(){
  closeCfg();
  const t=textoDiagnostico();
  mostrarDlgEnvio(t,[
    {txt:'📤 Compartir / copiar',cls:'ba',fn:async()=>{
      try{if(navigator.share){await navigator.share({title:'Diagnóstico Verific',text:t});return;}}catch(e){if(e&&e.name==='AbortError')return;}
      try{await navigator.clipboard.writeText(t);showToast('Copiado ✓');}catch(e){showToast('No se pudo copiar',true);}
    }},
    {txt:'Borrar registro de errores',cls:'bd',fn:()=>{lsDel('sube:errores');showToast('Registro borrado');}},
    {txt:'Cerrar',cls:'bd'}
  ]);
}
