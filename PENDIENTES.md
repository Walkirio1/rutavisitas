# LogiMap · estado y pendientes

> **Plan comercial, publicación en tiendas, seguridad y roadmap GPS offline:** ver [PLAN_ESCALADO.md](PLAN_ESCALADO.md).

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

## Estado a octubre 2026 (versión 91)
- App del celular rediseñada: estilo sobrio con relieve suave, IBM Plex Sans (en `fonts/`), íconos de línea (sprite en `index.html` + máscaras en CSS). Todo el estilo nuevo está en `css/12-sobrio.css`, cargado al final y pisando `css/01`–`11` con `!important` (~400 reglas): **deuda técnica**, conviene unificar las hojas más adelante.
- Guía de 5 pasos (`js/29-tutorial.js`), punto de partida en la ruta, buscador tolerante, conteos unificados (hechas / cerradas / no visitadas / pendientes).
- Drive y envíos: carpeta del día con archivos «Dirección - Comercio.pdf» y «Dirección - Comercio (foto).jpg», sin subcarpeta por visita.
- Equipo y dupla juntos en el perfil (Beta). Panel del jefe: Excel del día, historial por fecha, mapa con color por persona, recorrido y posición.
- Panel del jefe (servidor/panel.html) **todavía con el estilo viejo**; hay maquetas del estilo nuevo en el lienzo de diseño (https://claude.ai/artifact/WHKhtuifAx4Q5112W3Qbwm).
- Pruebas para Grok: `pruebas/RONDA-4-GROK.md` y `pruebas/RONDA-5-GROK.md`.
- Sin probar en celular real: cámara, firma, Google/Drive de punta a punta, hoja de compartir, dos celulares con equipo y dupla, instalación del ícono.
- El ícono de la app (pin con brillo) sigue con el estilo anterior.

## Estado a noviembre 2026 (versión 100)
- **Limpieza de jornadas repetidas (`v92`):** reinicio limpio de visitas huérfanas, borrador, Dupla y respaldo de Drive (`sube:limpiadoTs`) al limpiar o reemplazar Excel conservando coordenadas previas.
- **Aviso automático por proximidad (`v93`–`v98`):** radar a 160 m con barra en vivo, sonido, vibración, rubro desde Excel y autito GPS con rumbo en tiempo real en el mapa (`js/25-ubicacion.js`, `js/09-mapa-geocodificacion.js`).
- **Sincronización offline → online completa (`v99`):** recarga automática de librerías de Google al volver señal, renovación segura sin colgar `ensureToken()`, cartel de confirmación al subir pendientes a Drive, carpeta local sin salto UTC, protección de `checkJornadaActual` y cola completa en Dupla/Equipo.
- **Mapa interactivo (`v100`):** botón «Marcar como hecha / Desmarcar hecha» directamente en el popup del punto en el mapa (`js/09-mapa-geocodificacion.js`, `js/10-tema-navegacion.js`).
- **Documentado para etapas futuras:** plan de escalado comercial / tiendas y explotación de GPS offline asentados en [PLAN_ESCALADO.md](PLAN_ESCALADO.md).
