# Ronda 4 · Revisión final de LogiMap (para Grok)

Sitio: https://walkirio1.github.io/rutavisitas/ · Código: https://github.com/Walkirio1/rutavisitas · Panel del jefe: https://hivemind.tail38381c.ts.net/
Versión a probar: Ajustes → Versión **79 o más**. Ruta de prueba: `pruebas/puntos-de-ejemplo.xlsx` y los PDF de `pruebas/`.
Contexto: se presenta en una empresa la semana próxima, por dos personas que trabajan en dupla. **Lo más importante es que la app del verificador no falle.** El panel del jefe es una primera versión (ya sabemos que es básica: no hace falta listar "le faltan cuentas, reportes").

## Cómo reportar
Para cada hallazgo: **qué hiciste → qué esperabas → qué pasó**, gravedad (🔴 rompe el trabajo · 🟠 molesta · 🟡 detalle) y captura si podés. Al final, tres listas separadas:
1. **Bugs y errores** (ordenados por gravedad).
2. **Mejoras de uso** (cosas confusas, textos, pasos de más).
3. **Simplificaciones** (pantallas o botones que sobran, flujos que se pueden acortar).
Si algo no lo pudiste probar (cámara, GPS, dos celulares), decilo en una lista "No probado".

## A. Recorrido del verificador (prioridad máxima)
1. Entrar sin Google → importar el Excel de ejemplo → ver los puntos en el mapa. ¿Tarda? ¿Queda algún punto sin ubicar?
2. **Buscador de la lista de puntos**: probar "Corrientez" (con error), "kiosko", "cordoba" sin tilde, "pepe kiosco" (palabras en otro orden), un ID. Debe encontrar siempre lo razonable y no mostrar de más.
3. Armar la ruta, abrir en Google Maps, marcar puntos como visitados y cerrados.
4. Hacer 3 visitas completas con la planilla general y con una planilla PDF de la empresa: texto con tildes/ñ/emoji, importes, Sí/No, firma (chica y grande), foto de cámara y de galería, foto enorme.
5. Guardar, ver el PDF generado (con marca de agua en gratis; sin marca con Pro: Perfil → Plan Pro, clave LogiPro2026).
6. Informe: WhatsApp (texto), "Compartir con PDFs y fotos", Excel, mail. Revisar que cuenten las visitas correctas.
7. Cerrar y reabrir la app; recargar a mitad de una visita (¿se pierde algo?); modo avión.
8. Girar la pantalla, teclado tapando campos, modo oscuro, letra grande del sistema.
9. Actualización: Ajustes → Buscar actualización. ¿Aparece la versión nueva sin pasos raros?

## B. Equipo, dupla y panel (con dos celulares si es posible)
1. Jefe abre el panel y crea un equipo. Copia la invitación. Verificador la abre: **en el navegador** debe ofrecer unirse o copiarla; en la **app instalada**, Perfil → Unirme al equipo debe tomar la invitación copiada.
2. Al unirse, pregunta por compartir ubicación. Aceptar y verificar que el jefe ve la posición y el recorrido en el mapa (con la app abierta).
3. Perfil con nombre y foto: el panel debe mostrar nombre y foto (no "Sin nombre").
4. Jefe asigna ruta **subiendo un Excel** y **pegando una lista** (con y sin columna ID). Debe aparecer el aviso "N puntos listos" y, en el celular, "tu jefe te asignó N puntos".
5. Los puntos asignados aparecen en el mapa del jefe con el color de cada verificador; botón "Ubicar los puntos sin ubicación".
6. Dupla: navegante y verificador (código de 6 letras). Que el verificador marque visitas y el navegante las vea. El jefe debe ver "en dupla con X" y las visitas contadas **una sola vez**.
7. Panel: selector de fecha (ver un día anterior), botón **Descargar Excel del día** (3 hojas), recargar sin perder la sesión.
8. Salir del equipo / de la dupla: no debe quedar nada colgado.

## C. Revisión de código (si podés leer el repositorio)
Buscá, sin cambiar nada, y listá con archivo y línea:
- Errores probables: variables sin definir, `catch` vacíos que esconden fallas, condiciones de carrera (dos pestañas, sin conexión), datos que se pisan.
- Seguridad básica: texto del usuario insertado en HTML sin escapar, claves en el código, endpoints del servidor (`servidor/server.js`) sin validación.
- Código repetido o muerto que se pueda borrar; archivos que ya no se usan.
- Archivos del `sw.js` (PRECACHE) que no existen o archivos nuevos que faltan.
- Textos con faltas de ortografía o voseo inconsistente.

## D. Para cerrar
- ¿Cuáles son los **3 riesgos más grandes** para una presentación en vivo?
- ¿Qué **3 cosas sacarías o esconderías** para que la app se vea más simple?
- ¿Qué recorrido recomendás mostrar y cuál evitar?
