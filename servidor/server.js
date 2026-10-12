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
const hoy=()=>new Date(Date.now()-3*3600*1000).toISOString().slice(0,10); // fecha de Argentina (UTC-3)
const tok=()=>crypto.randomBytes(24).toString('hex');
const cod=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[crypto.randomInt(a.length)];return s;};
const ult=(t,...a)=>db.prepare(t).get(...a);
const todos=(t,...a)=>db.prepare(t).all(...a);
const run=(t,...a)=>db.prepare(t).run(...a);

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',...CORS});res.end(JSON.stringify(obj));};
const leer=req=>new Promise((ok,mal)=>{let b='';req.on('data',c=>{b+=c;if(b.length>3e6){mal(new Error('grande'));req.destroy();}});req.on('end',()=>{try{ok(b?JSON.parse(b):{});}catch(e){mal(e);}});});
const bearer=req=>((req.headers.authorization||'').match(/^Bearer\s+(\S+)/)||[])[1]||'';
const admin=req=>{const t=bearer(req);return t?ult('SELECT * FROM equipos WHERE admin_token=?',t):null;};
const miembro=req=>{const t=bearer(req);const m=t?ult('SELECT * FROM miembros WHERE token=?',t):null;if(m)run('UPDATE miembros SET visto=? WHERE id=?',Date.now(),m.id);return m;};
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
  'POST /api/equipo/crear':async(req,b)=>{
    const nombre=txt(b.nombre,60).trim();if(nombre.length<2) return [400,{error:'Poné el nombre del equipo'}];
    let codigo=cod();while(ult('SELECT 1 FROM equipos WHERE codigo=?',codigo)) codigo=cod();
    const admin_token=tok();run('INSERT INTO equipos(nombre,codigo,admin_token,creado) VALUES(?,?,?,?)',nombre,codigo,admin_token,Date.now());
    return [200,{nombre,codigo,adminToken:admin_token}];
  },
  'POST /api/unirse':async(req,b)=>{
    const e=ult('SELECT * FROM equipos WHERE codigo=?',txt(b.codigo,10).toUpperCase().trim());if(!e) return [404,{error:'Ese código no existe'}];
    const nombre=txt(b.nombre,60).trim()||'Sin nombre';const token=tok();
    const r=run('INSERT INTO miembros(equipo_id,nombre,token,creado,visto) VALUES(?,?,?,?,?)',e.id,nombre,token,Date.now(),Date.now());
    avisar(e.id,'miembro');return [200,{token,miembroId:Number(r.lastInsertRowid),nombre,equipo:e.nombre}];
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
      const f=path.join(__dirname,url.pathname==='/'||url.pathname==='/panel'?'panel.html':'nada');
      if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(f));}
      res.writeHead(404);return res.end('No existe');
    }
    if(url.pathname==='/api/eventos'){ // el panel se queda escuchando
      const e=ult('SELECT * FROM equipos WHERE admin_token=?',url.searchParams.get('t')||'');if(!e) return json(res,401,{error:'Sin permiso'});
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
