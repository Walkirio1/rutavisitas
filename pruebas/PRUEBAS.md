# Pruebas de Verific

Paquete para probar la app a fondo (con una persona o con una IA que maneje un navegador).

**App:** https://walkirio1.github.io/rutavisitas/
**Archivos de prueba:** carpeta `pruebas/` (planillas PDF y `puntos-de-ejemplo.xlsx`).

## Reglas
- Entrar con **"Entrar sin conectar"** (no se puede probar Google con una IA). Eso prueba todo menos Drive.
- Usar solo los archivos de esta carpeta: no cargar datos reales.
- Probar con el navegador en **tamaño de celular** (390 × 844).

## Plan de pruebas
1. **Puntos:** importar `puntos-de-ejemplo.xlsx`; ver que aparezcan 10 puntos; marcarlos para la ruta; ver el mapa (los pines se ubican por dirección: puede tardar).
2. **Ruta:** "Ruta completa" → muestra orden, km y tiempo (con servidor dice "por calles reales"; si no, "optimizada").
3. **Visita con la planilla general:** abrir un punto, completar, sacar/adjuntar foto, firmar, "Guardar visita" y "Guardar sin enviar".
4. **Planillas PDF propias:** en Ajustes → Planillas, subir cada PDF de `pruebas/`, tocar **✨ Detectar** y revisar:
   - ¿Detecta todas las casillas, números con $ , totales (suma), firma y datos automáticos?
   - ¿Agrupa en secciones con los títulos? ¿Los nombres de los campos son correctos?
   - 🧩 Campos: agregar, mover y cambiar el tamaño de un campo; borrar; "Editar todos".
   - Hacer una visita con esa planilla: tildar, escribir importes (el total debe sumar bien), firmar, guardar.
   - ¿El PDF final queda con todo en su lugar?
5. **Copiar campos** entre dos planillas (📋 Copiar).
6. **Historial y reportes:** cerrar el día; ver el reporte Hoy / 7 días / 30 días y "Compartir resumen".
7. **Perfil:** cambiar nombre y foto; interruptores de ubicación y sello de fotos.
8. **Casos raros:** importar un Excel vacío o con columnas mal; subir un PDF que no es planilla; cerrar y abrir la app a mitad de una visita; usar sin internet; rotar la pantalla; textos muy largos en los campos; tocar botones muy rápido varias veces.
9. **Aspecto:** textos cortados, botones superpuestos, cosas que no se ven en pantalla chica, ventanas que no se cierran.

## Cómo informar cada error
- **Título corto.**
- **Pasos** exactos para repetirlo.
- **Esperado** vs **Obtenido**.
- **Gravedad:** rompe la app / molesta / detalle.
- Captura de pantalla si se puede.
Entregar la lista ordenada por gravedad.

## Texto para pegarle a la IA
> Sos un tester de software. Abrí https://walkirio1.github.io/rutavisitas/ en un navegador con tamaño de celular (390×844) y probá la app a fondo siguiendo el plan de `pruebas/PRUEBAS.md` del repositorio https://github.com/Walkirio1/rutavisitas. Usá solo "Entrar sin conectar". Los archivos de prueba están en https://github.com/Walkirio1/rutavisitas/tree/main/pruebas. Tu objetivo es encontrar errores, comportamientos confusos y cosas que se vean mal. Probá también casos raros. Para cada problema informá: título, pasos para repetirlo, esperado, obtenido, gravedad y captura. Al final, entregá la lista ordenada de más a menos grave. No inventes errores: si no podés repetir algo, decilo.
