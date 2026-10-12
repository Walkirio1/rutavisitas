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

---

# Ronda 2 (versión 2026-10-11 · 53)

## Primero: verificar las correcciones de la ronda 1
Repetí estos casos y decí si quedaron **bien**, **igual** o **peor**:
1. Importar `puntos-de-ejemplo.xlsx` y geocodificar: ¿"Kiosco Funes" (Santa Fe 450, Funes) queda con pin? Si no, ¿qué dice ahora?
2. Búsqueda manual de un punto sin ubicación de Funes: ¿ofrece primero resultados de Funes?
3. "Ruta completa" con un punto sin ubicación marcado: ¿avisa cuál quedó afuera?
4. Avisos (verdes y rojos): ¿salen arriba, se leen enteros y ya no tapan botones? Con el banner "Instalá la app" a la vista, ¿tapa algo?
5. Mapa: tocar un pin, ¿muestra la ficha sin cambiar la ruta?
6. Observación larga (1500 caracteres): ¿la tarjeta muestra solo 2 líneas?
7. Excel vacío y Excel con columnas «Foo» y «Bar»: ¿avisan con error? ¿Los puntos que ya había siguen igual?
8. Total con Viáticos 10.10 y Peajes 0.20: ¿dice `$ 10,30`? Con 1500.50 + 249.50: ¿`$ 1.750,00`?
9. Cerrar día con 1 visita hecha: ¿el texto está bien escrito?
10. Revisión de campos: ¿el campo de cada casilla dice "puntos"? ¿Se ve el Total al abrir?

## Lo que no se probó en la ronda 1
- Detección (✨) de `planilla-fachadas.pdf`, `planilla-casillas-finas.pdf`, `planilla-casillas-varios-estilos.pdf` y `planilla-casillas-imagen-y-lineas.pdf`: ¿cuántas casillas encuentra de las que se ven? ¿Toma algo que no es una casilla (una letra, una celda de tabla)? ¿Los títulos de sección y los nombres son correctos?
- Editor de campos (🧩 Campos): agregar un tipo (Suma, Foto, Firma), mover, cambiar el tamaño con las esquinas, borrar y "Editar todos". ¿Se puede agregar un campo tocando encima de otro?
- 📋 Copiar campos entre dos planillas.
- Guardar una visita completa con una planilla PDF y **revisar el PDF generado** (descargarlo): ¿casillas, importes, total, firma y foto quedan en su lugar? ¿La firma tiene fondo transparente?
- Historial: 7 días, 30 días y "Compartir resumen".
- Cerrar la app a mitad de una visita y volver a entrar; usar sin internet (modo avión); girar la pantalla; tocar muy rápido "Marcar hecha" y "Guardar visita" varias veces.

## Dupla (solo si se pueden abrir **dos navegadores o perfiles distintos**)
Hace falta que el servidor esté andando. En cada navegador: Perfil → **Trabajar en dupla**. En el primero, anotar el código de 6 letras; en el segundo, escribirlo y tocar Conectar.
- ¿Aparece la foto o la inicial del compañero arriba, al lado del perfil?
- Navegante: cargar puntos y marcarlos. ¿Le aparecen al verificador?
- Navegante: "Siguiente punto" → "📣 Avisarle a mi compañero". ¿El verificador ve **Próxima parada** con el botón de abrir la planilla?
- Verificador: guardar la visita. ¿El punto se pone verde en el otro navegador sin recargar?
- Verificador: deshacer la visita. ¿Vuelve a quedar pendiente en el otro?
- Cambiar de rol y volver a probar. Salir de la dupla desde uno: ¿qué ve el otro?
- Con internet cortado en uno de los dos: ¿qué pasa y qué pasa al volver?

## Qué informar además
- **Qué versión** vio (Ajustes → "Versión …").
- Errores de la **consola del navegador** (en rojo), si puede verlos.
- Qué cosas **funcionaron**, aunque no haya errores.
- Para cada error: título, pasos, esperado, obtenido, gravedad y captura. No repetir los de la ronda 1 que ya salieron bien.
- Separar: **errores nuevos**, **correcciones que no funcionaron** y **cosas que no pudo probar** (y por qué).
