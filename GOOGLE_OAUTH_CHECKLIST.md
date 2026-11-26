# Checklist — Verificación de Google OAuth (Producción) · LogiMap

> **Objetivo:** Pasar el ID de cliente OAuth `197847834069-dagdtb4k8...` de modo *Prueba* (tope 100 testers manuales) a **Producción**, sin auditoría paga CASA (solo usamos `drive.file` y `drive.appdata`, que son scopes no restringidos).

---

## 1. Orígenes y URLs en Google Cloud Console

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/) → proyecto de LogiMap (`197847834069`).
2. **APIs y servicios → Credenciales → Cliente Web OAuth 2.0**:
   - **Orígenes autorizados de JavaScript** (sin barra final `/`):
     - `https://app.logimap.app`
     - `https://beta.logimap.app`
     - `https://hivemind.tail38381c.ts.net` *(compatibilidad durante transición)*
     - `https://walkirio1.github.io` *(compatibilidad GitHub Pages)*
3. **Google Auth Platform → Marca / Branding (Pantalla de consentimiento)**:
   - **Nombre de la app:** `LogiMap`
   - **Correo de asistencia:** `logimap.soporte@gmail.com` *(o tu mail de soporte verificado en el proyecto)*
   - **Página principal de la aplicación:** `https://app.logimap.app/app/`
   - **Política de privacidad:** `https://app.logimap.app/app/privacidad.html`
   - **Condiciones del servicio:** `https://app.logimap.app/app/terminos.html`
   - **Dominios autorizados:** agregar `logimap.app`

---

## 2. Verificar propiedad del dominio en Google Search Console

Google exige que tu cuenta de Google Cloud figure como propietaria verificada de `logimap.app`:
1. Entrar a [search.google.com/search-console](https://search.google.com/search-console) con la misma cuenta de Google Cloud.
2. Agregar propiedad tipo **Dominio**: `logimap.app`.
3. Copiar el registro `TXT` (`google-site-verification=...`) y pegarlo en **Cloudflare → `logimap.app` → DNS → Records**.
4. Tocar **Verificar** en Search Console.

---

## 3. Justificación de Scopes y Guion de Video (60 segundos)

En **Google Auth Platform → Acceso a los datos (Data Access)** asegurar solo estos scopes:
- `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` → mostrar nombre, correo y avatar en el perfil.
- `https://www.googleapis.com/auth/drive.file` → crear una carpeta elegida por el usuario y guardar allí los PDFs completados, fotos de visitas y Excel de resumen generados por la app. **La app nunca accede a otros archivos de Drive.**
- `https://www.googleapis.com/auth/drive.appdata` → guardar respaldo automático de la jornada en la carpeta privada oculta de la app para recuperarla si se cambia de celular o falla la red.

### Guion para grabar el video demo (pantalla celular o navegador mostrando barra de URL):
1. Abrir `https://app.logimap.app/app/` mostrando la URL completa y tocar **Entrar con Google**.
2. Mostrar en pantalla la **pantalla de consentimiento de Google** con los permisos pedidos y el **Client ID visible en la URL de la barra**.
3. Completar el login y mostrar en Perfil que aparece tu email conectado.
4. Marcar una visita de prueba con foto/planilla → mostrar cómo se crea la carpeta en **Google Drive** con el PDF y la foto generados.
5. Subir ese video como **No listado** en YouTube y pegar el link en el formulario de **Publicar app → Verificar** dentro de Google Cloud Console.
