# Servidor del equipo de Verific

Guarda los equipos, las rutas asignadas y el avance de las visitas. **No guarda PDFs ni fotos** (eso queda en el Drive de cada uno).
Es un solo archivo (`server.js`), sin dependencias. Datos en SQLite (carpeta `datos/`). Incluye el panel web del jefe en `/`.

## Ponerlo a andar (Docker)
```
cd servidor
docker compose up -d --build
curl http://localhost:8787/api/salud      # → {"ok":true,...}
```

## Publicarlo con Cloudflare Tunnel
En el túnel que ya tenés, agregá un hostname público (por ejemplo `verific.tudominio.com`) apuntando a `http://localhost:8787`
(o `http://verific:8787` si el túnel corre en el mismo compose). Después abrí `https://verific.tudominio.com` y creá tu equipo.

## Copias de seguridad
Alcanza con copiar la carpeta `datos/` (por ejemplo, un `cp` diario).

## Cómo funciona
- El **jefe** crea el equipo en el panel (guarda el enlace de acceso: es su llave) y copia la **invitación**.
- Cada **verificador** abre la invitación en el celular: la app se une al equipo sola.
- El jefe pega las filas desde Excel y asigna la ruta de hoy; el verificador toca "Traer mi ruta".
- Cada visita hecha en la app se informa al panel (estado, hora, distancia al local si usa ubicación).

## Servir también la app (opcional)
El `docker-compose.yml` monta la carpeta de la app y el servidor la sirve en **`/app/`** (por ejemplo `https://hivemind.tu-nombre.ts.net/app/`).
- Para actualizarla: `git pull` en la carpeta del repositorio (no hace falta reiniciar nada).
- Si usás el inicio de sesión con Google desde esa dirección, hay que agregarla en Google Cloud → Credenciales → tu ID de cliente → **Orígenes de JavaScript autorizados** (solo el dominio, sin `/app/`).
- La app instalada desde otra dirección (por ejemplo GitHub Pages) **no comparte datos** con esta: son instalaciones distintas.

## Dónde se guardan los datos
El servidor guarda **solo texto liviano** (equipos, miembros, rutas asignadas y el estado de cada visita: unos 300 bytes por visita). **No guarda PDFs, fotos ni Excel**: eso va al Drive de cada usuario.
Para que los datos queden en otro disco, creá un archivo `.env` junto al `docker-compose.yml` con `DATOS_DIR=/datos/verific` (y la carpeta creada), y volvé a levantar con `docker compose up -d`.

## En vivo
- El panel se actualiza solo apenas llega una visita, una ruta o una posición (Server-Sent Events); además refresca cada 30 s.
- Cada verificador puede (opcional, apagado por defecto) compartir su posición mientras tiene la app abierta: aparece en el mapa del jefe.

## Rutas por calles reales (optimizador)
`POST /api/optimizar` recibe el punto de partida y hasta 80 paradas, pide a OSRM las distancias y tiempos de manejo reales y devuelve el mejor orden (vecino más cercano + 2-opt + mover paradas). Lo usa cualquier usuario de la app (no hace falta equipo); si el servidor no responde, la app usa su método de siempre.
Preparar el mapa de calles (una sola vez, tarda unos minutos y usa ~1 GB de disco en `/datos`):
```
cd servidor
DATOS_DIR=/datos/verific sh osrm/preparar.sh          # Gran Rosario; otra zona: BBOX="oeste,sur,este,norte"
DATOS_DIR=/datos/verific docker compose --profile calles up -d
curl http://localhost:8787/api/salud                   # "calles":true
```

## Dupla (dos personas, una jornada)
Para dos personas que trabajan juntas: una navega (mapa y ruta) y la otra baja a completar la planilla.
- Cualquiera crea la dupla desde Perfil → "Trabajar en dupla" (sale un código de 6 letras); el otro lo escribe en su app.
- El navegante sube la ruta (puntos, marcados y orden) y avisa la "próxima parada"; el verificador informa cada visita hecha y el navegante la ve en su mapa al instante (Server-Sent Events).
- Roles intercambiables en cualquier momento. Solo viaja texto liviano: las fotos y los PDF quedan en el celular y en el Drive de quien completa la planilla.
