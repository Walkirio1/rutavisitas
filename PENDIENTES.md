# LogiMap · estado y pendientes (octubre 2026)

## Lo que ya funciona
- App del verificador (sin servidor): Excel → mapa → ruta → planilla (propia o PDF de la empresa) con firma y fotos → PDF e informe (WhatsApp, mail, Excel, Drive).
- Plan gratis con marca de agua; Pro sin marca (interruptor provisorio con contraseña, solo en el celular).
- Equipo (con servidor): invitación, asignar ruta desde el panel (Excel o lista pegada), mapa con color por persona, posición y recorrido del día, nombre y foto, "en dupla con X".
- Dupla (con servidor): navegante y verificador.
- Contador anónimo de uso + página /estadisticas.

## Pendiente: pantalla del jefe (lo más importante)
- Cuentas con usuario y contraseña, varios equipos por jefe (hoy el acceso es por un enlace).
- Historial de días anteriores, filtros por persona, reportes exportables.
- Avisos cuando alguien se atrasa; resumen del día.
- Ubicación en segundo plano (hoy solo con la app abierta; una app web no puede más → app nativa).
- Que "desmarcar" una visita en la dupla llegue también al equipo.

## Pendiente: negocio
- Servidor en la nube con HTTPS y copias de seguridad (hoy corre en la PC de casa con Tailscale).
- Planes Gratis / Starter / Pro con cobro real y control en el servidor (hoy la clave Pro es solo del celular).
- Marca Hivemind Solutions en pies legales cuando haya dominio.
- Tabla de funciones por plan.

## Pendiente: detalles
- Buscador que tolere errores de tipeo ("Corrientez").
- Tesseract todavía se baja de internet (jsdelivr).
- La invitación del jefe en iPhone abre Safari (límite de Apple): se resuelve copiando y pegando en la app.

## Comandos útiles
- Actualizar el servidor: `cd ~/rutavisitas && git pull && cd servidor && docker compose --profile calles up -d --build`
- Actualizar la app en el celular: Ajustes → 🔄 Buscar actualización.
- Clave de estadísticas: `cat /datos/verific/clave-estadisticas.txt`
