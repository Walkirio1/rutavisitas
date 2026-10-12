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
