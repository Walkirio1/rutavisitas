# Ronda 5 · Revisión VISUAL y TÉCNICA del rediseño (para Grok)

Sitio: https://walkirio1.github.io/rutavisitas/ · Código: https://github.com/Walkirio1/rutavisitas
Versión a probar: Ajustes → versión **83 o más** (si dice menos: Ajustes → Buscar actualización, dos veces, y recargar).
Qué cambió: la app se rediseñó con un estilo plano y sobrio (archivo `css/12-sobrio.css`, tipografía IBM Plex Sans). La lógica no cambió, pero se tocaron textos y estilos en casi todas las pantallas. Datos de prueba: `pruebas/puntos-de-ejemplo.xlsx` y los PDF de `pruebas/`.

## Cómo reportar
Para cada hallazgo: **pantalla → qué viste → qué esperabas**, gravedad (🔴 no se puede usar · 🟠 confunde o se ve mal · 🟡 detalle) y captura. Al final: (1) fallos visuales, (2) fallos técnicos, (3) mejoras, (4) "No probado".
Probar en **claro y oscuro**, y con anchos de **320, 360, 390 y 430 px** (modo celular), en vertical y horizontal.

## A. Visual: que se entienda de un vistazo
Para cada pantalla (Entrada, Puntos, Visitas, Mapa, Ajustes, Configuración, Perfil, Historial, Planillas, planilla de la visita, diálogos, guía "Cómo se usa") contestá:
1. ¿Se ve **cuál sección está activa** en la barra de abajo? ¿Se distingue a un golpe de vista?
2. En **Puntos**: ¿se distingue con claridad un punto **en ruta** (azul, con número azul y barra a la izquierda) de uno **sin elegir** (blanco, botón "+ Agregar" punteado)? ¿Y los que no tienen ubicación?
3. En **Visitas**: ¿se distinguen **pendiente (ámbar)**, **hecha (verde)** y **cerrada (roja)** sin leer el texto?
4. **Contraste**: ¿hay alguna tarjeta, botón o texto que se confunda con el fondo? Listá cuáles (texto gris sobre gris, bordes que no se ven, botones que parecen deshabilitados).
5. **Íconos**: ¿alguno se ve cortado, fuera de lugar, demasiado grande o chico, o sin alinear con su texto? ¿Queda algún **emoji** o ícono del estilo viejo (3D, brillos, degradados)?
6. **Textos**: ¿alguno se corta, se pisa con otro, o se ve con otra tipografía (la vieja con serifa o cursiva)?
7. ¿Alguna pantalla conserva el **estilo viejo** (vidrio, burbujas, degradados, botones con brillo)? Listala.
8. ¿La app se siente **seria y de empresa**? ¿Qué la hace parecer informal o barata todavía?

## B. Técnico
1. **Recorrido completo sin errores:** Excel → mapa → ruta → visita con foto y firma → PDF → informe. ¿Algo dejó de funcionar tras el rediseño?
2. Botones y zonas táctiles: ¿alguno **no responde** o queda tapado por otro elemento (barra de abajo, avisos, teclado)? Tamaño mínimo ~44 px.
3. **Barra de abajo** con teclado abierto, con el cartel de instalar, en horizontal: ¿tapa contenido o botones?
4. **Desbordes:** ¿hay scroll horizontal en alguna pantalla? ¿Algo se sale del ancho?
5. **Rendimiento:** tiempo de carga, fluidez al hacer scroll en la lista con 80+ puntos, mapa sin cortes.
6. **Sin conexión:** con modo avión, ¿se ve igual (la tipografía y los íconos cargan)? ¿Los archivos del service worker (`sw.js`, PRECACHE) existen todos, incluidos `css/12-sobrio.css` y `fonts/`?
7. **Actualización:** tras publicar una versión nueva, ¿la app instalada la toma sin pasos raros? ¿Se ven estilos mezclados (CSS viejo con HTML nuevo)?
8. **Consola del navegador:** errores o avisos (404 de archivos, CSS inválido, fuentes que no cargan).
9. **Accesibilidad:** contraste de texto (mínimo 4.5:1 en texto normal), botones sin nombre, foco visible al tabular, letra grande del sistema.
10. **Código** (si podés leer el repo): reglas con `!important` que se pisan entre sí en `css/12-sobrio.css`; selectores muy frágiles; CSS muerto en `css/01`–`11`; estilos que podrían simplificarse.

## C. Para cerrar
- Las **3 pantallas** que más desentonan o confunden.
- Los **3 cambios** que más mejorarían la claridad.
- ¿Algo que **sacarías** para simplificar?
