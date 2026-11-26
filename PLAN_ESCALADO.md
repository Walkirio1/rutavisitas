# Plan de Escalado, Publicación en Tiendas y Monetización — LogiMap (`rutavisitas`)

> **Resumen ejecutivo:** El producto tiene una base diferencial real que es vendible en B2B, pero antes de cobrar planes o subirlo a Google Play / App Store necesita limpiar acoplamientos internos (Rosario, SUBE, PC hogareña con Tailscale), cerrar brechas de seguridad/políticas de mapas, profesionalizar el **Panel de Control** y validar las suscripciones del lado del servidor.

---

## 1. Lo que YA es oro puro (diferencial real)

LogiMap **no es otra app genérica de ruteo**: une **ruteo de campo + digitalización sin fricción del PDF oficial de cada empresa**:

1. **Detector automático + diseñador visual sobre el PDF propio del cliente** ([js/23-detector-pdf.js](js/23-detector-pdf.js), [js/22-disenador-pdf.js](js/22-disenador-pdf.js), [js/20-campos.js](js/20-campos.js)):
   - Lee formularios AcroForm y también PDFs planos (detección vectorial y por visión en canvas de casillas, importes `$`, totales, firmas y fotos), genera un formulario móvil táctil y devuelve el **PDF oficial de la empresa completado y firmado**.
   - **Por qué destaca:** Apps de ruteo (Circuit, Routific) no manejan planillas complejas; apps de formularios (Fulcrum, Jotform) obligan a rehacer la planilla desde cero. En auditorías, inspecciones, seguros, municipios y contratistas, el mandante exige *su* PDF.
2. **Modo Dupla (Navegante + Verificador) en tiempo real** ([js/27-dupla.js](js/27-dupla.js), [servidor/server.js](servidor/server.js)):
   - Refleja cómo se trabaja en calle en LATAM: uno maneja y optimiza la ruta, el otro baja y completa la planilla, consolidando ambos ante el jefe como una sola unidad.
3. **Offline real + Prueba de visita + Costo de almacenamiento mínimo** ([js/25-ubicacion.js](js/25-ubicacion.js), [js/12-drive-sesion.js](js/12-drive-sesion.js), [js/14-envios-pendientes.js](js/14-envios-pendientes.js)):
   - Genera PDFs en el celular, verifica distancia GPS al local, estampa sello fecha/hora/GPS en las fotos, avisa por proximidad sin señal (160 m) y sincroniza al volver internet.

---

## 2. Los 7 bloqueantes antes de cobrar o publicar

1. **Bloqueo geográfico a Gran Rosario / Santa Fe** ([js/11-busqueda-direcciones.js](js/11-busqueda-direcciones.js), [js/09-mapa-geocodificacion.js](js/09-mapa-geocodificacion.js), [servidor/osrm/preparar.sh](servidor/osrm/preparar.sh)):
   - `ROSARIO_BOX` descarta cualquier coordenada fuera del Gran Rosario; Georef fija `provincia=Santa Fe`; Nominatim fija `city=Rosario`; OSRM recorta solo Gran Rosario. Un cliente de otra ciudad importa su Excel y no se ubica ninguna dirección.
2. **Rastros de marca ajena (`SUBE` / `Verific`) y textos legales en borrador**:
   - UI y carpetas muestran `"Verificaciones SUBE"` y `"Planilla oficial SUBE"` ([index.html](index.html), [js/12-drive-sesion.js](js/12-drive-sesion.js)): riesgo de rechazo en tiendas por uso de marca estatal sin autorización.
   - [privacidad.html](privacidad.html) y [terminos.html](terminos.html) aún tienen nota de borrador y deben reflejar con exactitud qué datos GPS/visitas viajan al servidor para pasar *Data Safety* (Google) y *App Privacy* (Apple).
3. **Políticas de OpenStreetMap (riesgo de bloqueo comercial)**:
   - `guardarMapaOffline()` ([js/04-mapa-offline-y-copia.js](js/04-mapa-offline-y-copia.js)) descarga hasta 1.800 tiles en paralelo desde `tile.openstreetmap.org` (prohibido por la *Tile Usage Policy*), y el mapa tiene `attributionControl: false` en [js/09-mapa-geocodificacion.js](js/09-mapa-geocodificacion.js) (violación ODbL).
   - `nominatim.openstreetmap.org` se consulta en masa desde el navegador en app y panel (prohibido para uso comercial/masivo). Hay que pasar a proveedor legal (Protomaps / MapTiler) + geocoding cacheado en backend.
4. **Infraestructura doméstica (`hivemind.tail38381c.ts.net`) y Google OAuth en Testing**:
   - `SERVIDOR_URL` ([js/26-equipo.js](js/26-equipo.js)) apunta hoy a PC hogareña por Tailscale, sin SLA ni backups automatizados de SQLite.
   - Google OAuth en modo Testing tiene tope de 100 usuarios. Los scopes `drive.file` y `drive.appdata` no requieren auditoría CASA paga, pero sí dominio propio verificado y video demo (trámite de 1–4 semanas).
5. **Monetización local sin control de servidor**:
   - Hoy el Plan Pro solo quita la marca de agua y se habilita en `localStorage` (`sube:pro` / `PRO_HASH` en [js/19-plantilla.js](js/19-plantilla.js)), mientras OSRM, Dupla, Detector PDF y Equipos están abiertos sin cuenta.
6. **Panel de Control (`servidor/panel.html`) todavía verde para vender licencias B2B** (ver sección 4).
7. **Pruebas end-to-end en celulares reales** (Android + iPhone): cámara, firma, OAuth Drive tras > 1 hora, compartir archivos, instalación de ícono.

---

## 3. Publicación en Google Play y App Store

| Plataforma | Estrategia | Qué exige / qué limita |
| :--- | :--- | :--- |
| **Google Play (Android)** | **TWA** (Bubblewrap / PWABuilder) o **Capacitor** | 1. Dominio propio con `/.well-known/assetlinks.json`.<br>2. Ocultar banners web de *"Instalar en el celular"* dentro de la app empaquetada.<br>3. Cuenta individual nueva exige **test cerrado de 12 testers durante 14 días**. |
| **App Store (iOS)** | **Solo Capacitor** (Apple no soporta TWA) | 1. **Guideline 4.2:** rechaza wrappers web simples; integrar plugins nativos reales (Cámara, GPS, Share, Push).<br>2. **Guideline 4.8:** si "Entrar con Google" es login principal, exige **Sign in with Apple**.<br>3. **Guideline 3.1.1 (IAP 15–30%):** no vender códigos Pro por fuera en B2C. **Salida legal B2B:** cobrar por web (panel del jefe) y dejar la app iOS sin pantalla de precios (acceso corporativo).<br>4. **WKWebView:** Google OAuth popup web falla y `sw.js` no corre bajo `capacitor://`; requiere OAuth nativo (PKCE) y storage nativo para mapas/offline. |

> **Estrategia de salida recomendada:** Salir primero con **Web/PWA + Panel B2B** (cobrando directo por web), luego **Google Play** (Android domina >85% del trabajo en calle en LATAM) y recién con clientes pagos absorber el empaquetado nativo de **App Store (iOS)**.

---

## 4. Auditoría del Panel de Control de escritorio (`servidor/panel.html`)

Para que un jefe de operaciones pague licencias por su equipo, [servidor/panel.html](servidor/panel.html) necesita evolucionar de prototipo a consola operativa:

1. **Cuentas reales con login y recuperación** (reemplazar acceso actual por `/#t=TOKEN` en URL).
2. **Inspección de evidencia completa:** al tocar cualquier visita en el panel, ver observaciones, detalle de irregularidades, foto con sello, PDF generado y alerta de distancia GPS al local.
3. **Distribución centralizada de la planilla PDF de la empresa:** que el jefe cargue/ajuste el PDF oficial una sola vez en el panel y baje automáticamente a todos los celulares del equipo.
4. **Gestión operativa de rutas y mapa incremental:** editar y reasignar paradas entre verificadores, reparto por cercanía geográfica (no `slice()`), geocodificación asíncrona en servidor y actualización incremental del mapa Leaflet sin destruirlo cada 30 s.
5. **Historial multi-día, filtros por persona y reportes exportables** (quitar el corte silencioso en 60 visitas, eliminar `alert`/`confirm`/`prompt` y aplicar el diseño sobrio de la app).

---

## 5. Seguridad, bugs y arquitectura recomendada

### Arquitectura
- **Decisión:** Mantener y evolucionar como **monolito modular** (NO microservicios): backend Node.js dividido en módulos (`auth`, `equipos`, `duplas`, `rutas`, `planes`) sobre **PostgreSQL**, manteniendo **OSRM** en su contenedor aparte como ya está en [servidor/docker-compose.yml](servidor/docker-compose.yml). Frontend migrado gradualmente a módulos ES (Vite) al encarar empaquetado para tiendas.

### Checklist técnico y de seguridad

- [x] **Renovación no bloqueante de `ensureToken()` y sincronización offline → online completa** (resuelto en `v99`, [js/12-drive-sesion.js](js/12-drive-sesion.js), [js/14-envios-pendientes.js](js/14-envios-pendientes.js), [js/15-autosave.js](js/15-autosave.js), [js/27-dupla.js](js/27-dupla.js)).
- [ ] **Crítico — Stored XSS:** sanear con `escapeHtml()` (y evitar concatenar IDs crudos dentro de `onclick="..."`) en [js/02-puntos.js](js/02-puntos.js), [js/06-visitas-historial.js](js/06-visitas-historial.js), [js/08-informe-dialogos.js](js/08-informe-dialogos.js), [js/20-campos.js](js/20-campos.js) y [servidor/panel.html](servidor/panel.html).
- [ ] **Crítico — Auth y endpoints públicos en `servidor/server.js`:** proteger creación de equipos/duplas/OSRM, no confiar en `x-forwarded-for` sin proxy confiable, sacar tokens de query string en `/api/eventos` SSE y validar `tipo === 'dupla'` en `/api/dupla/rol` y `/api/dupla/estado`.
- [ ] **Crítico — Límite de `localStorage` (~5 MB):** mover los PDFs base64 subidos (`sube:planillas` en [js/07-planillas.js](js/07-planillas.js)) y el historial pesado a **IndexedDB**.
- [ ] **Alto — Estabilidad servidor y SW:**
  - En [servidor/server.js](servidor/server.js): agregar `.woff2` al mapa `MIME` y envolver `r.write()` de SSE en `try/catch`.
  - En [sw.js](sw.js): excluir `/api/` del `redPrimero()` para no devolver `index.html` ante fallos de red y precachear `pdf.min.js` / `pdf.worker.min.js`.
  - En [js/04-mapa-offline-y-copia.js](js/04-mapa-offline-y-copia.js): aplicar allowlist estricta de claves al restaurar copias JSON (nunca sobrescribir `sube:pro` o `sube:srv`).
- [ ] **Medio — Higiene:** unificar `css/01`–`css/12` (eliminar la deuda de `!important` en `css/12-sobrio.css`), agregar purga/TTL a la tabla `trazas` en SQLite/Postgres y ampliar la suite de tests automatizados.

---

## 6. Modelo de negocio, planes y costos reales de nube

### Estrategia comercial
- **Quién paga:** **B2B (empresas, contratistas y equipos de calle)** por asiento + panel de control. La **app individual gratis** (con marca de agua discreta *"LogiMap"*) funciona como puerta de entrada viral: cuando el verificador entrega PDFs impecables, el jefe pide contratar el sistema para todo el equipo.

### Propuesta de planes (validados en servidor)

| Plan | Precio sugerido | Qué incluye / Qué limita |
| :--- | :---: | :--- |
| **Gratis (Individual)** | **$0** | 1 persona. Hasta 20 puntos/día, ruta en línea recta, planilla general + 1 PDF propio (con marca de agua). Sin Dupla ni Panel. |
| **Pro (Autónomo / Dupla)** | **USD 7–9 / mes** | Puntos ilimitados, optimización por calles reales (OSRM), sin marca de agua, hasta 10 PDFs con detector automático, Modo Dupla (2 personas), sello GPS y reportes 30 días. |
| **Equipos (B2B — Core)** | **USD 39 / mes** *(hasta 5 usuarios)* + **USD 8 / usuario extra** | Todo Pro + Panel de Control con cuentas, **plantilla PDF oficial distribuida al equipo**, reparto geográfico, evidencia centralizada (fotos/PDFs/observaciones), historial multi-día y Excel consolidado. |

### Costo real de infraestructura seria (50 a 200 usuarios pagos)

| Concepto | Escenario *Lean Production* | Escenario *Cómodo (SA)* |
| :--- | :---: | :---: |
| **VPS 8 GB RAM** (API + PostgreSQL + OSRM Argentina) | USD 14–16 / mes *(Hetzner)* | USD 32–48 / mes *(São Paulo)* |
| **Frontend + SSL (Cloudflare Pages) + Dominio** | USD 1 / mes | USD 1 / mes |
| **Mapas legales + offline** (Protomaps PMTiles / MapTiler) | USD 0–2 / mes | USD 20–25 / mes |
| **Geocoding** (caché backend + Georef AR + fallback comercial) | USD 0–15 / mes | USD 15–40 / mes |
| **Backups diarios offsite + Email/Monitoreo** | USD 2–3 / mes | USD 5–18 / mes |
| **Total infraestructura / mes** | **~USD 17–37 / mes** | **~USD 73–132 / mes** |
| **Cuentas de tiendas (al publicar)** | +USD 8,25/mes *(Apple USD 99/año)* + USD 25 único *(Google Play)* | Ídem |

---

## 7. Hoja de ruta priorizada por fases

- **Fase 0 — Desbloqueo y limpieza (1–2 semanas):** quitar `ROSARIO_BOX` / Santa Fe, limpiar marcas `SUBE` / `Verific`, finalizar textos legales, corregir XSS + SW + `.woff2` + `localStorage` → IndexedDB, y probar en 2 Android + 1 iPhone reales.
- **Fase 1 — Listo para cobrar en Web/PWA + Panel B2B (3–4 semanas):** dominio propio + VPS (PostgreSQL + OSRM Argentina + backups) + verificación Google OAuth + mapas/geocoding legales + **Panel de Control v2** (cuentas, plantilla oficial sincronizada, ficha de evidencia, mapa incremental, reparto geográfico) + cobro inicial por MercadoPago / transferencia.
- **Fase 2 — Tiendas y Escala (con clientes pagos validados):** **Google Play primero** (TWA o Capacitor, test cerrado 14 días) → **App Store (iOS)** vía Capacitor con plugins nativos, OAuth nativo (PKCE + Sign in with Apple) y cobro B2B web. *(Postergar como YAGNI hasta demanda real: OCR con IA/Tesseract, refactor cosmético CSS y multi-equipo por jefe.)*

---

## 8. Explotación de GPS Offline y Campo (Roadmap futuro)

> **Por qué funciona sin internet:** El chip GPS es solo receptor de satélites (como una radio FM). Como LogiMap guarda previamente en el celular la lista de comercios con sus coordenadas, rubros y observaciones, la app puede calcular distancias y disparar alertas **100% offline** (como ya hace el radar de 160 m en [js/25-ubicacion.js](js/25-ubicacion.js)). Limitación física: el GPS no puede *transmitir* datos, así que el envío a Drive/Dupla/Equipo siempre espera a recuperar datos o Wi-Fi.

Ideas de alto valor para explotar esa capacidad offline:

1. **Copiloto hablado offline (`speechSynthesis`):** sin conexión, al acercarse a un comercio, dictar en voz alta el nombre, rubro y observación para que quien maneja no tenga que mirar la pantalla.
2. **Alerta de «pasaste de largo»:** si el celular entró a < 60–80 m de un punto pendiente (azul) y se alejó > 200 m sin marcarlo ni abrir planilla, disparar un aviso rápido (*«¿Cerrado o quedó pendiente?»*).
3. **«Caja negra» del recorrido completo offline:** ir guardando el rastro GPS en `IndexedDB` durante toda la jornada sin señal y subir la traza entera al panel del jefe al volver internet (kilómetros reales, paradas y tiempos sin baches).
4. **Prueba de presencia / auditoría anti-trampa (B2B):** registrar por geocerca offline la hora exacta de entrada y salida de cada comercio y la distancia real verificada al punto, estampándolo en la planilla y en la foto aunque sea zona rural sin señal.
5. **Reordenamiento de ruta instantáneo offline:** ante desvíos o cambios de orden en calle, recalcular el mejor recorrido desde la posición GPS actual usando `optimizarOrden` local ([js/10-tema-navegacion.js](js/10-tema-navegacion.js)).
6. **En Fase 2 (app nativa Capacitor Android/iOS):**
   - **GPS en segundo plano** con la pantalla apagada (límite actual del navegador/PWA).
   - **Dupla offline por Bluetooth / Wi-Fi Direct (Nearby Connections):** sincronizar entre los dos celulares del auto incluso cuando ninguno tenga señal móvil.
