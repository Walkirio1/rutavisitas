// Servidor del equipo de Verific: un solo archivo, sin dependencias (Node 22+).
// Guarda equipos, miembros, rutas asignadas y el avance de las visitas (no guarda PDFs ni fotos: eso va al Drive de cada uno).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const OSRM=(process.env.OSRM_URL||'http://osrm:5000').replace(/\/$/,'');
const PORT=+process.env.PORT||8787,DB=process.env.DB||path.join(__dirname,'datos','verific.db');
fs.mkdirSync(path.dirname(DB),{recursive:true});
const APP_DIR=process.env.APP_DIR?path.resolve(process.env.APP_DIR):null; // carpeta de la app (index.html, js/, css/…); si no se define, solo se sirve el panel
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.pdf':'application/pdf'};
const db=new DatabaseSync(DB);
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS equipos(id INTEGER PRIMARY KEY,nombre TEXT NOT NULL,codigo TEXT UNIQUE NOT NULL,admin_token TEXT UNIQUE NOT NULL,creado INTEGER);
CREATE TABLE IF NOT EXISTS miembros(id INTEGER PRIMARY KEY,equipo_id INTEGER NOT NULL,nombre TEXT NOT NULL,token TEXT UNIQUE NOT NULL,creado INTEGER,visto INTEGER);
CREATE TABLE IF NOT EXISTS asignaciones(id INTEGER PRIMARY KEY,miembro_id INTEGER NOT NULL,fecha TEXT NOT NULL,puntos TEXT NOT NULL,creado INTEGER,UNIQUE(miembro_id,fecha));
CREATE TABLE IF NOT EXISTS posiciones(miembro_id INTEGER PRIMARY KEY,lat REAL,lng REAL,prec INTEGER,ts INTEGER);
CREATE TABLE IF NOT EXISTS visitas(id INTEGER PRIMARY KEY,equipo_id INTEGER NOT NULL,miembro_id INTEGER NOT NULL,punto_id TEXT NOT NULL,nombre TEXT,localidad TEXT,estado TEXT,ts INTEGER,fecha TEXT,lat REAL,lng REAL,dist INTEGER,dur INTEGER,irr INTEGER,UNIQUE(miembro_id,punto_id,fecha));
`);
for(const m of ["ALTER TABLE equipos ADD COLUMN tipo TEXT DEFAULT 'equipo'","ALTER TABLE miembros ADD COLUMN foto TEXT","ALTER TABLE miembros ADD COLUMN rol TEXT"]){try{db.exec(m);}catch(e){}}
db.exec('CREATE TABLE IF NOT EXISTS jornadas(equipo_id INTEGER PRIMARY KEY,json TEXT NOT NULL,version INTEGER NOT NULL,ts INTEGER)');
db.exec('CREATE TABLE IF NOT EXISTS usos(id TEXT PRIMARY KEY,primero INTEGER,ultimo INTEGER,dia TEXT,dias INTEGER DEFAULT 1,version TEXT,app INTEGER DEFAULT 0,pdf INTEGER DEFAULT 0,equipo INTEGER DEFAULT 0,dupla INTEGER DEFAULT 0,google INTEGER DEFAULT 0)');
const hoy=()=>new Date(Date.now()-3*3600*1000).toISOString().slice(0,10); // fecha de Argentina (UTC-3)
const tok=()=>crypto.randomBytes(24).toString('hex');
const cod=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[crypto.randomInt(a.length)];return s;};
const ult=(t,...a)=>db.prepare(t).get(...a);
const todos=(t,...a)=>db.prepare(t).all(...a);
const run=(t,...a)=>db.prepare(t).run(...a);

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Private-Network':'true','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',...CORS});res.end(JSON.stringify(obj));};
const leer=req=>new Promise((ok,mal)=>{let b='';req.on('data',c=>{b+=c;if(b.length>3e6){mal(new Error('grande'));req.destroy();}});req.on('end',()=>{try{ok(b?JSON.parse(b):{});}catch(e){mal(e);}});});
const bearer=req=>((req.headers.authorization||'').match(/^Bearer\s+(\S+)/)||[])[1]||'';
const admin=req=>{const t=bearer(req);return t?ult('SELECT * FROM equipos WHERE admin_token=?',t):null;};
const miembro=req=>{const t=bearer(req);const m=t?ult('SELECT * FROM miembros WHERE token=?',t):null;if(m)run('UPDATE miembros SET visto=? WHERE id=?',Date.now(),m.id);return m;};
// clave para ver las estadísticas: la define ESTADISTICAS_CLAVE o se crea sola la primera vez (queda en datos/clave-estadisticas.txt)
const CLAVE_STATS=(()=>{
  if(process.env.ESTADISTICAS_CLAVE) return process.env.ESTADISTICAS_CLAVE;
  const f=path.join(path.dirname(DB),'clave-estadisticas.txt');
  try{return fs.readFileSync(f,'utf8').trim();}catch(e){}
  const k=crypto.randomBytes(9).toString('hex');fs.writeFileSync(f,k+'\n');console.log('Clave de estadísticas (guardada en '+f+'): '+k);return k;
})();
const txt=(v,n=200)=>String(v==null?'':v).slice(0,n);

// límite simple de pedidos por usuario (o por IP si no hay sesión), contra abusos
const cuenta=new Map();setInterval(()=>cuenta.clear(),60000);
const abuso=req=>{
  const k=bearer(req)||(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.headers['cf-connecting-ip']||req.socket.remoteAddress||'?';
  const n=(cuenta.get(k)||0)+1;cuenta.set(k,n);return n>300;
};
// avisos en vivo al panel del jefe (Server-Sent Events)
const oyentes=new Map(); // equipo_id -> Set(res)
const avisar=(equipoId,tipo)=>{const set=oyentes.get(equipoId);if(set)for(const r of set)r.write('data: '+JSON.stringify({tipo,ts:Date.now()})+'\n\n');};
setInterval(()=>{for(const set of oyentes.values())for(const r of set)r.write(': latido\n\n');},25000);


// ── Optimizador de rutas por calles reales (usa OSRM para las distancias y ordena acá)
async function osrmGet(p){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
  try{const r=await fetch(OSRM+p,{signal:c.signal});if(!r.ok) throw new Error('osrm '+r.status);return await r.json();}finally{clearTimeout(t);}
}
// camino abierto que arranca en el punto 0: vecino más cercano + 2-opt + mover paradas, con la matriz de duraciones
function ordenar(T){
  const n=T.length,resto=[];for(let i=1;i<n;i++) resto.push(i);
  let ruta=[0];while(resto.length){let k=0,m=Infinity;resto.forEach((q,i)=>{const x=T[ruta[ruta.length-1]][q];if(x<m){m=x;k=i;}});ruta.push(resto.splice(k,1)[0]);}
  const costo=r=>{let c=0;for(let i=1;i<r.length;i++) c+=T[r[i-1]][r[i]];return c;};
  let mejor=costo(ruta),mejora=true,vueltas=0;
  while(mejora&&vueltas++<40){
    mejora=false;
    for(let i=1;i<n-1;i++)for(let j=i+1;j<n;j++){ // invertir un tramo
      const r=ruta.slice(0,i).concat(ruta.slice(i,j+1).reverse(),ruta.slice(j+1)),c=costo(r);
      if(c+1e-6<mejor){ruta=r;mejor=c;mejora=true;}
    }
    for(let i=1;i<n;i++)for(let j=1;j<n;j++){ // mover una parada a otro lugar
      if(i===j) continue;const r=ruta.slice(),[x]=r.splice(i,1);r.splice(j,0,x);const c=costo(r);
      if(c+1e-6<mejor){ruta=r;mejor=c;mejora=true;}
    }
  }
  return ruta;
}
async function optimizar(b){
  const ini=b.inicio,pts=Array.isArray(b.puntos)?b.puntos:[];
  const ok=p=>p&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
  if(!ok(ini)||!pts.length||pts.length>80||!pts.every(ok)) return [400,{error:'Datos de ruta inválidos (hasta 80 puntos)'}];
  const todos=[ini,...pts],coords=todos.map(p=>(+p.lng).toFixed(6)+','+(+p.lat).toFixed(6)).join(';');
  let t;try{t=await osrmGet('/table/v1/driving/'+coords+'?annotations=duration,distance');}catch(e){return [503,{error:'El mapa de calles no está disponible'}];}
  if(!t.durations||t.durations.some(f=>f.some(x=>x==null))) return [422,{error:'Hay puntos fuera de la zona del mapa'}];
  const r=ordenar(t.durations);let min=0,km=0;const tramos=[];
  for(let i=1;i<r.length;i++){const d=t.durations[r[i-1]][r[i]],m=t.distances[r[i-1]][r[i]];min+=d;km+=m;tramos.push({id:String(pts[r[i]-1].id),min:Math.round(d/60),km:Math.round(m/100)/10});}
  return [200,{fuente:'calles',orden:r.slice(1).map(i=>String(pts[i-1].id)),km:Math.round(km/100)/10,min:Math.round(min/60),tramos}];
}

const rutas={
  'GET /api/salud':async()=>{let calles=false;try{await osrmGet('/nearest/v1/driving/-60.65,-32.95');calles=true;}catch(e){}return [200,{ok:true,hora:Date.now(),calles}];},
  'POST /api/optimizar':async(req,b)=>optimizar(b),
  // contador anónimo: la app avisa que está en uso (código al azar + versión + sí/no de 5 funciones). No recibe nada personal.
  'POST /api/ping':async(req,b)=>{
    const i=txt(b.i,40);if(!/^[a-f0-9]{12,40}$/.test(i)) return [400,{error:'Dato inválido'}];
    const f=b.f||{},bit=x=>f[x]===true?1:0,d=hoy(),now=Date.now(),v=txt(b.v,40);
    const u=ult('SELECT dia FROM usos WHERE id=?',i);
    if(!u) run('INSERT INTO usos(id,primero,ultimo,dia,dias,version,app,pdf,equipo,dupla,google) VALUES(?,?,?,?,1,?,?,?,?,?,?)',i,now,now,d,v,bit('app'),bit('pdf'),bit('equipo'),bit('dupla'),bit('google'));
    else run('UPDATE usos SET ultimo=?,dias=dias+?,dia=?,version=?,app=?,pdf=?,equipo=?,dupla=?,google=? WHERE id=?',now,u.dia===d?0:1,d,v,bit('app'),bit('pdf'),bit('equipo'),bit('dupla'),bit('google'),i);
    return [200,{ok:true}];
  },
  'GET /api/estadisticas':async(req)=>{
    if(bearer(req)!==CLAVE_STATS) return [401,{error:'Sin permiso'}];
    const dia=n=>new Date(Date.now()-3*3600*1000-n*86400000).toISOString().slice(0,10);
    const tot=ult('SELECT COUNT(*) n,SUM(app) app,SUM(pdf) pdf,SUM(equipo) equipo,SUM(dupla) dupla,SUM(google) google FROM usos');
    const act=n=>ult('SELECT COUNT(*) n FROM usos WHERE ultimo>=?',Date.now()-n*86400000).n;
    const nuevos=todos("SELECT strftime('%Y-%m-%d',(primero/1000)-10800,'unixepoch') d,COUNT(*) n FROM usos WHERE primero>=? GROUP BY d ORDER BY d",Date.now()-30*86400000);
    return [200,{total:tot.n,instalada:tot.app||0,conPdf:tot.pdf||0,conEquipo:tot.equipo||0,conDupla:tot.dupla||0,conGoogle:tot.google||0,
      hoy:act(1),semana:act(7),mes:act(30),nuevosHoy:ult('SELECT COUNT(*) n FROM usos WHERE primero>=?',Date.now()-86400000).n,
      versiones:todos('SELECT version v,COUNT(*) n FROM usos GROUP BY version ORDER BY n DESC LIMIT 8'),nuevosPorDia:nuevos}];
  },
  'POST /api/equipo/crear':async(req,b)=>{
    const nombre=txt(b.nombre,60).trim();if(nombre.length<2) return [400,{error:'Poné el nombre del equipo'}];
    let codigo=cod();while(ult('SELECT 1 FROM equipos WHERE codigo=?',codigo)) codigo=cod();
    const admin_token=tok();run('INSERT INTO equipos(nombre,codigo,admin_token,creado) VALUES(?,?,?,?)',nombre,codigo,admin_token,Date.now());
    return [200,{nombre,codigo,adminToken:admin_token}];
  },
  'POST /api/unirse':async(req,b)=>{
    const e=ult('SELECT * FROM equipos WHERE codigo=?',txt(b.codigo,10).toUpperCase().trim());if(!e) return [404,{error:'Ese código no existe'}];
    const otros=todos('SELECT * FROM miembros WHERE equipo_id=?',e.id);
    if(e.tipo==='dupla'&&otros.length>=2) return [409,{error:'Esa dupla ya tiene dos personas'}];
    const nombre=txt(b.nombre,60).trim()||'Sin nombre',foto=txt(b.foto,60000),token=tok();
    const rol=e.tipo==='dupla'?(otros[0]&&otros[0].rol==='verificador'?'navegante':'verificador'):null;
    const r=run('INSERT INTO miembros(equipo_id,nombre,token,creado,visto,foto,rol) VALUES(?,?,?,?,?,?,?)',e.id,nombre,token,Date.now(),Date.now(),foto,rol);
    avisar(e.id,'miembro');
    const c=otros[0];
    return [200,{token,miembroId:Number(r.lastInsertRowid),nombre,equipo:e.nombre,tipo:e.tipo||'equipo',rol,companero:c?{nombre:c.nombre,foto:c.foto||'',rol:c.rol}:null}];
  },
  // ── Dupla: dos personas que comparten la misma jornada (uno navega, el otro baja a completar)
  'POST /api/dupla/crear':async(req,b)=>{
    const nombre=txt(b.nombre,60).trim()||'Sin nombre';let codigo=cod();while(ult('SELECT 1 FROM equipos WHERE codigo=?',codigo)) codigo=cod();
    const r=run('INSERT INTO equipos(nombre,codigo,admin_token,creado,tipo) VALUES(?,?,?,?,?)','Dupla de '+nombre,codigo,tok(),Date.now(),'dupla');
    const rol=b.rol==='verificador'?'verificador':'navegante',token=tok();
    const m=run('INSERT INTO miembros(equipo_id,nombre,token,creado,visto,foto,rol) VALUES(?,?,?,?,?,?,?)',Number(r.lastInsertRowid),nombre,token,Date.now(),Date.now(),txt(b.foto,60000),rol);
    return [200,{token,miembroId:Number(m.lastInsertRowid),codigo,rol,equipo:'Dupla de '+nombre,tipo:'dupla'}];
  },
  'GET /api/dupla':async(req)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    const e=ult('SELECT * FROM equipos WHERE id=?',m.equipo_id),c=ult('SELECT nombre,foto,rol,visto FROM miembros WHERE equipo_id=? AND id<>?',m.equipo_id,m.id);
    const j=ult('SELECT json,version FROM jornadas WHERE equipo_id=?',m.equipo_id);
    return [200,{codigo:e.codigo,yo:{rol:m.rol},companero:c||null,version:j?j.version:0,estado:j?JSON.parse(j.json):{}}];
  },
  'POST /api/dupla/rol':async(req,b)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    const rol=b.rol==='verificador'?'verificador':'navegante',otro=rol==='navegante'?'verificador':'navegante';
    run('UPDATE miembros SET rol=? WHERE id=?',rol,m.id);run('UPDATE miembros SET rol=? WHERE equipo_id=? AND id<>?',otro,m.equipo_id,m.id);
    avisar(m.equipo_id,'rol');return [200,{ok:true,rol}];
  },
  'POST /api/dupla/estado':async(req,b)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    const j=ult('SELECT json,version FROM jornadas WHERE equipo_id=?',m.equipo_id),est=j?JSON.parse(j.json):{},v=(j?j.version:0)+1;
    const lista=(a,n)=>Array.isArray(a)?a.slice(0,n):null;
    if(b.puntos){const l=lista(b.puntos,500);if(l) est.puntos=l.map(p=>({id:txt(p.id,60),nombre:txt(p.nombre),dir:txt(p.dir),localidad:txt(p.localidad,80),tipo:txt(p.tipo,60),lat:Number.isFinite(+p.lat)&&p.lat!=null?+p.lat:null,lng:Number.isFinite(+p.lng)&&p.lng!=null?+p.lng:null}));}
    if(b.sel){const l=lista(b.sel,500);if(l) est.sel=l.map(x=>txt(x,60));}
    if(b.orden){const l=lista(b.orden,500);if(l) est.orden=l.map(x=>txt(x,60));}
    if('actual' in b) est.actual=b.actual?{id:txt(b.actual,60),ts:Date.now()}:null;
    if(b.visita&&b.visita.id){est.visitas=est.visitas||{};est.visitas[txt(b.visita.id,60)]={estado:b.visita.estado==='cerrado'?'cerrado':'ok',ts:Date.now(),por:m.nombre,irr:!!b.visita.irr,nombre:txt(b.visita.nombre)};}
    if(b.quitarVisita) {if(est.visitas) delete est.visitas[txt(b.quitarVisita,60)];}
    if(b.reiniciar){est.visitas={};est.actual=null;}
    run('INSERT INTO jornadas(equipo_id,json,version,ts) VALUES(?,?,?,?) ON CONFLICT(equipo_id) DO UPDATE SET json=excluded.json,version=excluded.version,ts=excluded.ts',m.equipo_id,JSON.stringify(est),v,Date.now());
    avisar(m.equipo_id,'estado');return [200,{ok:true,version:v}];
  },
  'POST /api/dupla/salir':async(req)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    run('DELETE FROM miembros WHERE id=?',m.id);avisar(m.equipo_id,'miembro');
    if(!ult('SELECT 1 FROM miembros WHERE equipo_id=?',m.equipo_id)){run('DELETE FROM jornadas WHERE equipo_id=?',m.equipo_id);run('DELETE FROM equipos WHERE id=?',m.equipo_id);}
    return [200,{ok:true}];
  },
  'GET /api/mi-ruta':async(req)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    const e=ult('SELECT nombre FROM equipos WHERE id=?',m.equipo_id),f=hoy();
    const a=ult('SELECT puntos FROM asignaciones WHERE miembro_id=? AND fecha=?',m.id,f);
    return [200,{equipo:e.nombre,nombre:m.nombre,fecha:f,puntos:a?JSON.parse(a.puntos):[]}];
  },
  'POST /api/visita':async(req,b)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    const f=hoy(),n=x=>Number.isFinite(+x)&&x!==''&&x!=null?+x:null;
    run(`INSERT INTO visitas(equipo_id,miembro_id,punto_id,nombre,localidad,estado,ts,fecha,lat,lng,dist,dur,irr) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(miembro_id,punto_id,fecha) DO UPDATE SET estado=excluded.estado,ts=excluded.ts,lat=excluded.lat,lng=excluded.lng,dist=excluded.dist,dur=excluded.dur,irr=excluded.irr`,
      m.equipo_id,m.id,txt(b.punto_id,60),txt(b.nombre),txt(b.localidad,80),b.estado==='cerrado'?'cerrado':'ok',n(b.ts)||Date.now(),f,n(b.lat),n(b.lng),n(b.dist),n(b.dur),b.irr?1:0);
    avisar(m.equipo_id,'visita');return [200,{ok:true}];
  },
  'POST /api/posicion':async(req,b)=>{
    const m=miembro(req);if(!m) return [401,{error:'Sesión inválida'}];
    if(b.off){run('DELETE FROM posiciones WHERE miembro_id=?',m.id);avisar(m.equipo_id,'posicion');return [200,{ok:true}];}
    if(!Number.isFinite(+b.lat)||!Number.isFinite(+b.lng)) return [400,{error:'Falta la posición'}];
    run('INSERT INTO posiciones(miembro_id,lat,lng,prec,ts) VALUES(?,?,?,?,?) ON CONFLICT(miembro_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,prec=excluded.prec,ts=excluded.ts',m.id,+b.lat,+b.lng,Math.round(+b.prec||0),Date.now());
    avisar(m.equipo_id,'posicion');return [200,{ok:true}];
  },
  'GET /api/panel':async(req,b,url)=>{
    const e=admin(req);if(!e) return [401,{error:'Sin permiso'}];
    const f=url.searchParams.get('fecha')||hoy();
    const ms=todos('SELECT * FROM miembros WHERE equipo_id=? ORDER BY nombre',e.id).map(m=>{
      const a=ult('SELECT puntos FROM asignaciones WHERE miembro_id=? AND fecha=?',m.id,f),pts=a?JSON.parse(a.puntos):[];
      const v=todos('SELECT * FROM visitas WHERE miembro_id=? AND fecha=?',m.id,f);
      const pos=ult('SELECT lat,lng,prec,ts FROM posiciones WHERE miembro_id=? AND ts>?',m.id,Date.now()-15*60000)||null;
      return {id:m.id,nombre:m.nombre,visto:m.visto,pos,asignados:pts.length,hechos:v.filter(x=>x.estado==='ok').length,cerrados:v.filter(x=>x.estado==='cerrado').length,pendientes:pts.filter(p=>!v.some(x=>x.punto_id===String(p.id))).length,puntos:pts};
    });
    const visitas=todos('SELECT v.*,m.nombre AS miembro FROM visitas v JOIN miembros m ON m.id=v.miembro_id WHERE v.equipo_id=? AND v.fecha=? ORDER BY v.ts DESC LIMIT 500',e.id,f);
    return [200,{equipo:e.nombre,codigo:e.codigo,fecha:f,miembros:ms,visitas}];
  },
  'POST /api/asignar':async(req,b)=>{
    const e=admin(req);if(!e) return [401,{error:'Sin permiso'}];
    const f=txt(b.fecha,10)||hoy(),lista=Array.isArray(b.reparto)?b.reparto:[{miembro_id:b.miembro_id,puntos:b.puntos}];
    let n=0;
    for(const r of lista){
      const m=ult('SELECT id FROM miembros WHERE id=? AND equipo_id=?',+r.miembro_id,e.id);if(!m) continue;
      const pts=(Array.isArray(r.puntos)?r.puntos:[]).slice(0,500).map(p=>({id:txt(p.id,60),nombre:txt(p.nombre),dir:txt(p.dir),localidad:txt(p.localidad,80),tipo:txt(p.tipo,60),lat:Number.isFinite(+p.lat)&&p.lat!==''&&p.lat!=null?+p.lat:null,lng:Number.isFinite(+p.lng)&&p.lng!==''&&p.lng!=null?+p.lng:null})).filter(p=>p.id&&p.dir);
      run('INSERT INTO asignaciones(miembro_id,fecha,puntos,creado) VALUES(?,?,?,?) ON CONFLICT(miembro_id,fecha) DO UPDATE SET puntos=excluded.puntos,creado=excluded.creado',m.id,f,JSON.stringify(pts),Date.now());n+=pts.length;
    }
    avisar(e.id,'ruta');return [200,{ok:true,asignados:n}];
  },
};

http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS'){res.writeHead(204,CORS);return res.end();}
    const url=new URL(req.url,'http://x');
    if(url.pathname==='/app') {res.writeHead(302,{Location:'/app/'});return res.end();}
    if(url.pathname.startsWith('/app/')&&APP_DIR){ // la app (PWA) servida desde acá
      let rel=decodeURIComponent(url.pathname.slice(5))||'index.html';if(rel.endsWith('/')) rel+='index.html';
      const f=path.normalize(path.join(APP_DIR,rel));
      const ext=path.extname(f).toLowerCase();
      if(!f.startsWith(APP_DIR+path.sep)||/(^|[\\/])(servidor|\.git|node_modules)([\\/]|$)/.test(path.relative(APP_DIR,f))||!MIME[ext]||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end('No existe');}
      res.writeHead(200,{'Content-Type':MIME[ext],'Cache-Control':'no-cache'});return fs.createReadStream(f).pipe(res);
    }
    if(!url.pathname.startsWith('/api/')){ // el panel web
      const f=path.join(__dirname,url.pathname==='/'||url.pathname==='/panel'?'panel.html':url.pathname==='/estadisticas'?'estadisticas.html':'nada');
      if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(f));}
      res.writeHead(404);return res.end('No existe');
    }
    if(url.pathname==='/api/eventos'){ // el panel se queda escuchando
      const tk=url.searchParams.get('t')||'';let e=ult('SELECT * FROM equipos WHERE admin_token=?',tk);
      if(!e){const mm=ult('SELECT equipo_id FROM miembros WHERE token=?',tk);if(mm) e=ult('SELECT * FROM equipos WHERE id=?',mm.equipo_id);}
      if(!e) return json(res,401,{error:'Sin permiso'});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive','X-Accel-Buffering':'no',...CORS});res.write('retry: 4000\n\n');
      if(!oyentes.has(e.id)) oyentes.set(e.id,new Set());oyentes.get(e.id).add(res);
      req.on('close',()=>{const st=oyentes.get(e.id);if(st){st.delete(res);if(!st.size) oyentes.delete(e.id);}});return;
    }
    if(abuso(req)) return json(res,429,{error:'Demasiados pedidos, esperá un momento'});
    let m=url.pathname.match(/^\/api\/miembro\/(\d+)$/);
    if(m&&req.method==='DELETE'){const e=admin(req);if(!e) return json(res,401,{error:'Sin permiso'});run('DELETE FROM miembros WHERE id=? AND equipo_id=?',+m[1],e.id);return json(res,200,{ok:true});}
    const h=rutas[req.method+' '+url.pathname];if(!h) return json(res,404,{error:'No existe'});
    const body=req.method==='POST'?await leer(req):{};
    const [code,obj]=await h(req,body,url);json(res,code,obj);
  }catch(e){console.error(e);json(res,500,{error:'Error del servidor'});}
}).listen(PORT,()=>console.log('Verific servidor en el puerto '+PORT));
