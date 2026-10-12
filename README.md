# LogiMap (antes Verific)

App web para celular (PWA) para armar rutas de visitas, completar planillas PDF, sacar fotos y subirlo todo al Drive de cada persona.
Publicada en GitHub Pages: https://walkirio1.github.io/rutavisitas/

## Estructura

```
index.html              Pantallas (HTML) y carga de los archivos de abajo
css/                    Estilos, en orden (cada archivo pisa al anterior)
  01-base.css             variables, tipografía y componentes originales
  02-movil-y-entrada.css  envíos pendientes, pantalla de entrada, ajustes para celular
  03-nuevo-diseno.css     acento azul, acabado brillante, barra de navegación
  04-cristal.css          cristal (glassmorphism), burbujas, botones, chips
  05-fondos-y-barra.css   fondos de cristal y barra de abajo con íconos 3D
  06-ajustes-finos.css    movimientos suaves, planilla, resplandor de íconos
  07-pantalla-entrada.css pantalla de entrada animada
  08-perfil.css           foto de perfil y ventana de perfil
  09-plantilla.css        editor de la planilla general
  10-mapa.css             pines tapados que titilan
  11-campos.css           campos adicionales y firma
js/                     Lógica, en orden (comparten el mismo ámbito global)
  00-errores.js           registro de errores (se carga primero)
  01-base.js              constantes, fechas, almacenamiento, fotos (IndexedDB)
  02-puntos.js            estado de la interfaz, pestañas, ajustes, lista de puntos, importar Excel
  03-lectura-fotos.js     lista de direcciones desde una foto (OCR); lector con IA (apagado, FUNC_IA)
  04-mapa-offline-y-copia.js  mapa sin señal y copia de seguridad
  05-excel-y-cierre.js    Excel actualizado, borrar día, cerrar día
  06-visitas-historial.js lista de visitas e historial
  07-planillas.js         planillas guardadas y ventana de la planilla de visita
  08-informe-dialogos.js  emails, informe, confirmaciones y avisos
  09-mapa-geocodificacion.js  mapa (Leaflet) y geocodificación
  10-tema-navegacion.js   tema claro/oscuro, siguiente punto y ruta optimizada
  11-busqueda-direcciones.js  búsqueda de direcciones forzando Rosario
  12-drive-sesion.js      Google Drive: sesión y pantalla de entrada
  13-drive-api.js         Google Drive: carpetas y subida
  14-envios-pendientes.js envíos pendientes y guardar en el celular
  15-autosave.js          auto-guardado de la jornada
  16-app-instalacion.js   versión (APP_VERSION), iPhone, instalar como app
  17-diagnostico.js       Ajustes → Diagnóstico (info para soporte)
  18-perfil.js            perfil de usuario (foto de Google, cerrar sesión)
  19-plantilla.js         planilla general editable (sin marca), planilla en uso, PDF general
  20-campos.js            campos adicionales (texto, número, fecha, sí/no, opciones) y firma en pantalla
  21-firma-pdf.js         firma en planillas PDF subidas: elegir dónde va (visor de PDF)
  22-disenador-pdf.js     marcar sobre un PDF dónde va cada campo (tilde, texto, número, fecha, firma, suma, dato auto) y rellenarlo
  23-detector-pdf.js      detección automática de campos en el PDF (casillas, datos, totales, firma, formularios)
  25-ubicacion.js         ubicación y hora de cada visita, sello en las fotos y reportes (hoy / 7 días / 30 días)
  26-equipo.js            equipos: unirse con invitación, traer la ruta asignada e informar cada visita (servidor en /servidor)
  99-arranque.js          lo que se ejecuta al cargar, después de definir todo
privacidad.html / terminos.html   páginas legales (completar [correo de contacto])
sw.js                   Service worker (funciona sin señal, guarda el mapa)
manifest.webmanifest    Datos de la app instalable
icons/                  Íconos, fondos e imágenes de la barra
planilla-predeterminada.pdf   Planilla oficial
```

## Reglas para editar

- Los archivos de `js/` son scripts clásicos que comparten el mismo ámbito: una función definida en uno se puede llamar desde otro, **pero el código que se ejecuta al cargar va en `99-arranque.js`** (las funciones de los archivos de después todavía no existen cuando corre uno anterior).
- Al agregar un archivo nuevo: sumarlo en `index.html` (en el orden correcto) y en `PRECACHE` de `sw.js`.
- Cada cambio visible: subir `APP_VERSION` (en `js/16-app-instalacion.js`) y la versión de caché en `sw.js`.
