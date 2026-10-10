/**
 * Receptor de Verificaciones SUBE.
 * Se pega en script.google.com con la cuenta DUEÑA del Drive donde
 * querés recibir los archivos, y se publica como "Aplicación web"
 * (Ejecutar como: Yo / Acceso: Cualquier persona).
 *
 * Estructura que crea en el Drive del dueño:
 *   <carpeta>/<nombre de quien envía>/<YYYY-MM-DD>/<IdPunto_Nombre>/archivos
 *   <carpeta>/<nombre de quien envía>/jornada-actual.json
 */

function doGet() {
  return salida({ ok: true, msg: 'Verificaciones SUBE activo' });
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var raiz = subcarpeta(DriveApp.getRootFolder(), d.carpeta || 'Verificaciones SUBE');
    var usuario = subcarpeta(raiz, limpiar(d.nombre || 'sin-nombre'));

    if (d.action === 'ping') {
      return salida({ ok: true });
    }

    if (d.action === 'visita') {
      var dia = subcarpeta(usuario, limpiar(d.fecha));
      var sub = subcarpeta(dia, limpiar(d.sub));
      var urls = [];
      (d.files || []).forEach(function (f) {
        var blob = Utilities.newBlob(Utilities.base64Decode(f.b64), f.mime, f.name);
        urls.push(sub.createFile(blob).getUrl());
      });
      return salida({ ok: true, urls: urls });
    }

    if (d.action === 'saveJornada') {
      var it = usuario.getFilesByName('jornada-actual.json');
      if (it.hasNext()) it.next().setContent(d.json);
      else usuario.createFile('jornada-actual.json', d.json, 'application/json');
      return salida({ ok: true });
    }

    if (d.action === 'getJornada') {
      var it2 = usuario.getFilesByName('jornada-actual.json');
      return salida({ ok: true, json: it2.hasNext() ? it2.next().getBlob().getDataAsString() : null });
    }

    if (d.action === 'delJornada') {
      var it3 = usuario.getFilesByName('jornada-actual.json');
      while (it3.hasNext()) it3.next().setTrashed(true);
      return salida({ ok: true });
    }

    return salida({ ok: false, error: 'Acción desconocida: ' + d.action });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function subcarpeta(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function limpiar(s) {
  return String(s || '').replace(/[\\\/:*?"<>|]/g, '_').substring(0, 80);
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
