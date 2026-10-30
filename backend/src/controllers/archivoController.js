const fs = require('fs');
const Archivo = require('../model/archivo');
const Cotizacion = require('../model/cotizacion');
const { CATEGORIAS_ARCHIVO } = require('../utils/constants');
const { esIdValido } = require('../utils/validar');
const { obtenerSolicitudAccesible } = require('../utils/acceso');
const { ErrorDeNegocio } = require('../utils/manejarError');
const { manejarError } = require('../utils/manejarError');

const borrarFisico = (ruta) => fs.promises.unlink(ruta).catch(() => {});

// multer usa latin1 para el nombre; lo convertimos a UTF-8 (tildes, ñ)
const nombreOriginal = (file) => Buffer.from(file.originalname, 'latin1').toString('utf8');

// Un PDF real empieza con "%PDF" (el mimetype lo declara el cliente y se puede falsear)
const esPdfReal = async (ruta) => {
  const fh = await fs.promises.open(ruta, 'r');
  try {
    const buf = Buffer.alloc(5);
    await fh.read(buf, 0, 5, 0);
    return buf.toString('latin1') === '%PDF-';
  } finally {
    await fh.close();
  }
};

// IDs de archivos de cotización ya publicados (los únicos que el cliente puede ver)
const archivosPublicados = async (solicitudId) => {
  const cots = await Cotizacion.findBySolicitud(solicitudId);
  return new Set(cots.filter((c) => c.estado !== 'borrador' && c.archivo_id).map((c) => c.archivo_id));
};

// Sube un archivo (multipart, campo "archivo") a una solicitud
const subirArchivo = async (req, res) => {
  const ruta = req.file?.path;
  try {
    const { solicitudId } = req.params;
    if (!req.file) return res.status(400).json({ mensaje: 'Adjunta un archivo PDF en el campo "archivo"' });
    if (!esIdValido(solicitudId)) throw new ErrorDeNegocio('El ID de solicitud no es válido', 400);

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    const esAdmin = req.usuario.rol === 'admin';
    const categoria = req.body.categoria || (esAdmin ? 'cotizacion' : 'referencia');

    if (!CATEGORIAS_ARCHIVO.includes(categoria)) throw new ErrorDeNegocio(`La categoría debe ser: ${CATEGORIAS_ARCHIVO.join(', ')}`, 400);
    if (!esAdmin && categoria === 'cotizacion') throw new ErrorDeNegocio('Solo la administradora puede subir archivos de cotización', 403);
    if (!esAdmin && solicitud.estado !== 'borrador') throw new ErrorDeNegocio('Solo puedes adjuntar archivos mientras la solicitud está en borrador', 409);
    if (!(await esPdfReal(ruta))) throw new ErrorDeNegocio('El archivo no es un PDF válido', 400);

    const id = await Archivo.create({
      solicitud_id: solicitud.id, subido_por: req.usuario.id, categoria,
      nombre_original: nombreOriginal(req.file), nombre_almacenado: req.file.filename,
      mime_type: req.file.mimetype, tamano_bytes: req.file.size,
    });
    res.status(201).json({ mensaje: 'Archivo subido exitosamente', id });
  } catch (error) {
    if (ruta) await borrarFisico(ruta); // no dejar archivos huérfanos si algo falló
    manejarError(res, error, 'Error al subir el archivo');
  }
};

const getArchivosBySolicitud = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    if (!esIdValido(solicitudId)) return res.status(400).json({ mensaje: 'El ID de solicitud no es válido' });

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    let archivos = await Archivo.findBySolicitud(solicitud.id);
    if (req.usuario.rol !== 'admin') {
      const publicados = await archivosPublicados(solicitud.id);
      archivos = archivos.filter((a) => a.categoria !== 'cotizacion' || publicados.has(a.id));
    }
    res.status(200).json(archivos.map(({ nombre_almacenado, ...resto }) => resto)); // el nombre interno no se expone
  } catch (error) {
    manejarError(res, error, 'Error al obtener archivos');
  }
};

const descargarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const archivo = await Archivo.findById(id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    await obtenerSolicitudAccesible(archivo.solicitud_id, req.usuario);

    if (req.usuario.rol !== 'admin' && archivo.categoria === 'cotizacion' && !(await archivosPublicados(archivo.solicitud_id)).has(archivo.id)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }

    const ruta = Archivo.rutaFisica(archivo.nombre_almacenado);
    if (!fs.existsSync(ruta)) return res.status(404).json({ mensaje: 'El archivo ya no está disponible en el servidor' });
    res.download(ruta, archivo.nombre_original);
  } catch (error) {
    manejarError(res, error, 'Error al descargar el archivo');
  }
};

const deleteArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const archivo = await Archivo.findById(id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const solicitud = await obtenerSolicitudAccesible(archivo.solicitud_id, req.usuario);

    if (req.usuario.rol !== 'admin') {
      if (archivo.subido_por !== req.usuario.id) throw new ErrorDeNegocio('Archivo no encontrado', 404);
      if (solicitud.estado !== 'borrador') throw new ErrorDeNegocio('Solo puedes eliminar archivos mientras la solicitud está en borrador', 409);
    }

    await Archivo.delete(id);
    await borrarFisico(Archivo.rutaFisica(archivo.nombre_almacenado));
    res.json({ mensaje: 'Archivo eliminado exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al eliminar el archivo');
  }
};

module.exports = { subirArchivo, getArchivosBySolicitud, descargarArchivo, deleteArchivo };