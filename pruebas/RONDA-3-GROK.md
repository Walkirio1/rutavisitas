# LogiMap · Ronda 3 de pruebas (completa, hasta el último rincón)

**App:** https://walkirio1.github.io/rutavisitas/  ·  **Versión mínima:** 70 (Ajustes → "Buscar actualización")
**Archivos de prueba:** carpeta `pruebas/` del repositorio (puntos-de-ejemplo.xlsx y 6 planillas PDF).
**Panel del jefe / estadísticas:** https://hivemind.tail38381c.ts.net/ y /estadisticas (clave aparte).

## Cómo probar
Actuá como un **usuario nuevo, no técnico**, en celular (Safari iPhone y Chrome Android si podés; si no, Chrome con pantalla de celular 390×844). Hacé cada paso **sin ayuda**. Si algo no se entiende a la primera, anotalo: es un problema aunque funcione.

**Para cada prueba anotá:** qué hiciste · qué esperabas · qué pasó · captura si falló · gravedad:
- 🔴 **Grave**: no deja usar o pierde datos
- 🟠 **Medio**: molesta o confunde
- 🟡 **Menor**: detalle estético o de texto

Marcá `(solo con dispositivo real)` lo que no puedas probar y decí qué quedó a medias.

---

## 1. Primer arranque e instalación
1. Abrir la URL por primera vez (borrá datos del sitio antes). ¿Se ve la pantalla de entrada completa, sin cortes?
2. Los botones **Entrar con Google** y **Entrar sin Google**: ¿tienen el mismo peso visual? ¿Se entiende la diferencia leyendo el texto de abajo?
3. Cartel **"Instalá LogiMap"**: ¿aparece a los pocos segundos? ¿Se puede cerrar con ✕ y no vuelve en el día? ¿Tapa algo importante?
4. Tocar **Instalar**: en Android debe abrir el instalador del sistema o la guía; en iPhone la guía de 3 pasos con la flecha hacia el botón Compartir. ¿La flecha apunta al lugar real? (solo con dispositivo real)
5. Ícono y nombre al instalar: **LogiMap**, ícono pin con mapa y tilde. (solo con dispositivo real)
6. Ajustes → **🔄 Buscar actualización**: ¿recarga y muestra la versión actual?
7. Abrir con `?instalar=1`: fuerza el cartel.

## 2. Cuenta, perfil y Google
1. **Entrar sin Google**: ¿el aviso es claro (no suena a "sin internet")?
2. Perfil (foto arriba a la derecha): cambiar nombre, cambiar foto, correo de empresa.
3. **Entrar con Google** con una cuenta que NO sea de prueba: ¿permisos razonables? ¿Aviso de "app no verificada"? ¿Vuelve a la app?
4. Conectado: estado "Conectado a Google Drive". **Desconectar** y volver a conectar.
5. Cerrar y abrir la app a los 2 días: ¿sigue conectado o pide entrar otra vez? ¿Se entiende?
6. Textos legales: enlaces **términos** y **política de privacidad** abren y muestran el correo logimap.soporte@gmail.com.

## 3. Puntos (lista)
1. Importar `puntos-de-ejemplo.xlsx`: ¿10 puntos? ¿Cuántos tardan en ubicarse en el mapa?
2. Importar Excel **vacío**, con columnas **inventadas**, con una sola columna, con 80+ filas, con tildes/ñ, con direcciones repetidas, con direcciones sin número. ¿Mensajes claros? ¿Se pierden los puntos anteriores?
3. Agregar un punto **a mano** (nombre, dirección, localidad). Editar, borrar, borrar todos (¿pide confirmar?).
4. **Buscador**: "Santa Fe", "Mitre", "Av. Pellegrini 1500", una palabra con error ("Corrientez"). ¿Resultados sin repetir? ¿Muestra el número?
5. Seleccionar / deseleccionar todos / por localidad. Contadores de arriba.
6. Puntos **sin ubicación**: buscar manual, elegir un resultado, marcar en el mapa con el dedo.
7. Cerrar y abrir la app: ¿todo sigue igual?

## 4. Mapa
1. Pines por estado: pendiente, hecha, cerrada (colores). Tocar un pin: ¿el menú es claro?
2. Mi ubicación (pedir permiso; probar rechazar el permiso). ¿Mensaje si se rechaza?
3. Descargar el **mapa sin conexión**: progreso, tamaño, aviso al terminar. Luego modo avión: ¿el mapa se ve?
4. Zoom, mover, rotar el celular (apaisado): ¿se rompe algo?
5. Modo oscuro y claro del mapa.

## 5. Ruta
1. **Optimizar ruta** con 10 puntos: ¿tiene sentido? ¿Dice si fue por calles reales o en línea recta?
2. Con la ruta por calles (servidor encendido) vs servidor apagado: ¿cae a un plan B sin errores?
3. **Ruta completa**: ¿avisa de los puntos sin ubicación?
4. Reordenar a mano (arrastrar o botones), quitar una parada, agregar una.
5. **Navegar** a una parada (abre Google Maps / Waze): ¿llega la dirección correcta?
6. Botón "Avisarle a mi compañero".
7. Con 80 puntos: ¿tarda mucho? ¿aviso de límite?

## 6. Hacer una visita
Probar con **cada planilla**: general, oficial SUBE y PDF propio.
1. Abrir la visita de un punto, completar todo, **guardar como hecha**.
2. **Visita cerrada / no atendida**: ¿cómo se marca y cómo se ve en la lista y el mapa?
3. **Borrador**: escribir a medias, cerrar la app, volver: ¿recupera el texto?
4. **Foto**: sacar con la cámara, elegir de la galería, foto muy grande, quitarla, cambiarla. ¿Se ve la miniatura?
5. **Firma** en pantalla: dibujar, borrar, firmar con el dedo muy chico/grande, girar la pantalla.
6. **Sello en las fotos** y **ubicación/hora** (Perfil, opcionales): activar y comprobar que aparecen en la foto y en el reporte; rechazar el permiso de ubicación.
7. **Editar una visita ya hecha**: ¿conserva datos, foto y firma? **Desmarcar** como hecha.
8. Teclado abierto: ¿tapa el campo que escribís?
9. Escribir cosas raras: emojis, `<b>negrita</b>`, comillas, textos larguísimos, tildes y ñ.
10. Cada tipo de campo: tilde, texto, número (moneda), fecha, sí/no, opciones, firma, suma (¿suma bien?), automático, foto.

## 7. Planillas
**General (la de la app)**
1. Ajustes → Planilla general → **✏️ Editar**: cambiar título, secciones e ítems, agregar/quitar ítems (máx. 14), agregar campos adicionales de cada tipo (máx. 12), foto aparte / dentro / sin foto.
2. **👁 Vista previa**: ¿refleja lo que editás sin guardar? ¿Se ve la marca de agua?
3. Guardar, **Restablecer la original**, cancelar sin guardar.

**PDF propio** (probar con los 6 PDFs de `pruebas/`)
1. Subir un PDF (también uno muy grande, uno escaneado, uno de varias páginas, uno que no sea PDF).
2. **✨ Detectar**: ¿encuentra tildes, textos, números, firma, foto? ¿Los nombres están bien? Revisar la lista y desmarcar algunos.
3. **Usar estos N campos**: ¿la planilla queda **en uso** de inmediato? ¿El título de la visita muestra el nombre de la planilla y no "SUBE"?
4. **🧩 Campos** (diseñador): agregar, mover, achicar, borrar, editar cada tipo; deshacer; zoom en el PDF.
5. **✍️ Firma**: elegir dónde va. **📋 Copiar** campos entre planillas.
6. Llenar una visita y generar el PDF: ¿textos en su lugar? ¿tildes marcadas bien (puntos / X / irregulares)? ¿firma y foto en el recuadro?
7. Máximo 10 planillas guardadas: ¿qué pasa con la 11?
8. Borrar una planilla que está en uso.

## 8. PDF generado y marca de agua
1. **Plan gratis:** planilla general con logo grande suave; planilla propia con logo chico y transparente. ¿Se lee todo igual? ¿Tapa texto?
2. **Plan Pro** (Perfil → Plan → ⭐ Plan Pro; clave `LogiPro2026`): ¿sale sin marca? Contraseña mala: ¿avisa? Apagar el Pro.
3. Caracteres especiales (ñ, tildes, emojis, símbolos) en nombres y observaciones: ¿se rompe el PDF?
4. PDF de varias hojas: marca en todas.

## 9. Informe y envíos
1. **Informe**: resumen X/Y, lista por local, irregularidades.
2. **📎 Compartir informe con PDFs y fotos**: ¿abre el menú del celular? Elegir WhatsApp y luego Mail: ¿llegan el texto, los PDFs y las fotos? ¿Cuántos archivos acepta? (solo con dispositivo real)
3. **Enviar solo el resumen por WhatsApp** y por **email** (agregar/quitar destinatarios, mail inválido).
4. **Descargar Excel actualizado**: abrirlo; ¿columnas y datos correctos?
5. Reportes **Hoy / 7 / 30 días**.
6. Informe con 0 visitas hechas y con 80 visitas.

## 10. Google Drive
1. Con Google conectado: hacer una visita → ¿se sube la carpeta, el PDF y la foto? ¿Nombres y orden de carpetas claros?
2. Cortar internet y hacer visitas: ¿quedan **pendientes**? Volver internet: ¿reintenta? Botón de reintentar y **Guardar en el celular**.
3. El archivo oculto de respaldo del día (no debe verse en el Drive del usuario).
4. Perder el celular: instalar en otro, entrar con Google, ¿recupera la jornada?

## 11. Equipo (jefe y verificadores)
1. Panel (`/`): crear equipo, copiar **invitación**.
2. Verificador: abrir el enlace de invitación, unirse con su nombre.
3. Jefe: **pegar la ruta desde Excel** y asignarla; el verificador debe recibir el aviso "te asignó N puntos" y traerlos a su ruta.
4. Verificador hace visitas: ¿el panel se actualiza solo en vivo (estado, hora, distancia)?
5. Compartir posición (opcional, apagada por defecto) y verla en el mapa del jefe.
6. Quitar un miembro; salir del equipo; unirse con un código inválido; sin conexión con el servidor.

## 12. Dupla (dos celulares) (solo con dos dispositivos reales)
1. Perfil → **Trabajar en dupla** → crear: ¿código de 6 letras claro?
2. Otro celular: unirse con el código. ¿Aparece la foto del compañero arriba?
3. **Navegante**: elegir puntos y ruta; el otro celular debe recibirlos solo.
4. **Verificador** hace una visita: el navegante lo ve reflejado. "📍 Próxima parada": enviar y recibir.
5. **Cambiar de rol**. **Salir** de la dupla desde ambos lados. Intentar unirse una tercera persona (máx. 2).
6. Cortar la conexión a uno de los dos y recuperar: ¿se re-sincroniza sin perder datos?
7. Ruido: dejar un celular 10 minutos con la pantalla apagada y volver.

## 13. Privacidad y datos
1. Perfil → Privacidad → **Contar mi uso de forma anónima**: apagar y encender; ¿el texto se entiende?
2. La política de privacidad menciona el contador, la ubicación, equipo, dupla y Drive. ¿Falta algo que la app haga y no esté explicado?
3. Estadísticas (`/estadisticas`, con clave): ¿suma esta instalación? Con el contador apagado, ¿deja de sumar?
4. ¿La app pide algún permiso que no necesite (cámara, ubicación, notificaciones)? ¿Lo pide en el momento justo y no al abrir?
5. Borrar datos del sitio: ¿qué se pierde y la app avisa antes?

## 14. Sin conexión y PWA
1. Modo avión con la app instalada: abrir, ver puntos, hacer una visita, generar el PDF. ¿Qué funciona y qué no, y avisa con claridad?
2. Recuperar la señal: ¿sincroniza solo?
3. Actualización: ¿cómo se entera el usuario de una versión nueva?
4. Cerrar la app muchas veces y abrirla: tiempos de arranque.

## 15. Diseño y accesibilidad
1. Modo **oscuro** y **claro**: todas las pantallas y diálogos legibles (formularios, vista previa, diálogos de dupla/equipo).
2. Tamaños de texto del sistema grande; celular chico (iPhone SE / 360 px de ancho); tablet; celular apaisado.
3. Botones muy cerca o chicos para el dedo; textos cortados; cosas que se montan.
4. **Avisos verdes (toast)**: ¿tapan lo que se acaba de abrir? ¿duran lo justo?
5. Botón "atrás" del sistema: ¿cierra diálogos, vuelve de pestaña o saca de la app?
6. Textos: errores de ortografía, tuteo/voseo mezclado, palabras en inglés, mensajes técnicos.
7. Lector de pantalla básico (VoiceOver/TalkBack): ¿los botones tienen nombre?

## 16. Estrés y casos raros
1. Doble toque rápido en guardar / enviar / optimizar: ¿duplica?
2. Cambiar de pestaña a mitad de una acción larga (importar, subir a Drive).
3. 80 puntos + 10 fotos grandes: ¿se traba? ¿Memoria? ¿Tiempo de generar el informe?
4. Datos viejos de una versión anterior: ¿la app los migra sin romperse?
5. Reloj/fecha del celular mal puesta, otra zona horaria.
6. Abrir la app en dos pestañas a la vez.

## 17. Mirada de usuario nuevo (la parte más valiosa)
Sin ayuda, cronometrá cuánto tarda en: (a) importar un Excel y ver el mapa, (b) hacer y guardar su primera visita, (c) mandar el informe.
Después contestá:
1. ¿Qué fue lo primero que no entendiste?
2. ¿Qué pantalla es la más confusa o tiene demasiadas cosas?
3. ¿Qué sacarías? ¿Qué le falta para usarla todos los días en el trabajo?
4. ¿Qué te dio desconfianza (permisos, mensajes, datos)?
5. ¿Qué función te pareció **más valiosa** y cuál **no usarías nunca**?
6. ¿Pagarías por esto? ¿Cuánto y qué tendría que tener el plan pago?

## Entrega del informe
Un solo informe ordenado por sección (1 a 17), con una **tabla final** de problemas: `#` · sección · descripción · gravedad · captura. Al principio, un **resumen de 5 líneas**: lo mejor, lo peor, y los 3 arreglos más urgentes antes de presentarla en una empresa.
