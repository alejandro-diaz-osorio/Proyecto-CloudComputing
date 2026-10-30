const Cotizacion = require('../model/cotizacion');
const Archivo = require('../model/archivo');
const { esIdValido, textoOpcional } = require('../utils/validar');
const { obtenerSolicitudAccesible } = require('../utils/acceso');
const { ErrorDeNegocio } = require('../utils/manejarError');
const { manejarError } = require('../utils/manejarError');

/** Valida el cuerpo de una cotización. Devuelve { mensaje } o { datos }. */
const validarCotizacion = async (body, solicitudId) => {
  const valor = Number(body.valor);
  const moneda = textoOpcional(body.moneda) || 'COP';
  const vigencia_dias = body.vigencia_dias === undefined ? 30 : Number(body.vigencia_dias);
  const titulo = textoOpcional(body.titulo) || 'Propuesta comercial';
  const archivo_id = body.archivo_id ?? null;

  if (body.valor === undefined || !Number.isFinite(valor) || valor <= 0) return { mensaje: 'El valor debe ser un número mayor que cero' };
  if (!/^[A-Za-z]{3}$/.test(moneda)) return { mensaje: 'La moneda debe ser un código de 3 letras (ej. COP)' };
  if (!Number.isInteger(vigencia_dias) || vigencia_dias < 1) return { mensaje: 'La vigencia debe ser un número entero de días mayor que cero' };
  if (titulo.length > 120) return { mensaje: 'El título no puede superar 120 caracteres' };
  if (body.iva_incluido !== undefined && typeof body.iva_incluido !== 'boolean') return { mensaje: 'iva_incluido debe ser true o false' };

  if (archivo_id !== null) {
    const archivo = esIdValido(archivo_id) ? await Archivo.findById(archivo_id) : null;
    if (!archivo || archivo.solicitud_id !== Number(solicitudId)) return { mensaje: 'El archivo indicado no pertenece a esta solicitud' };
  }

  return {
    datos: {
      titulo, valor, moneda: moneda.toUpperCase(), iva_incluido: body.iva_incluido ?? true,
      vigencia_dias, mensaje: textoOpcional(body.mensaje), archivo_id: archivo_id === null ? null : Number(archivo_id),
    },
  };
};

// Cotizaciones de una solicitud (el cliente solo ve las ya enviadas)
const getCotizacionesBySolicitud = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    if (!esIdValido(solicitudId)) return res.status(400).json({ mensaje: 'El ID de solicitud no es válido' });

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    const todas = await Cotizacion.findBySolicitud(solicitud.id);
    res.status(200).json(req.usuario.rol === 'admin' ? todas : todas.filter((c) => c.estado !== 'borrador'));
  } catch (error) {
    manejarError(res, error, 'Error al obtener cotizaciones');
  }
};

const getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const cot = await Cotizacion.findById(id);
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    await obtenerSolicitudAccesible(cot.solicitud_id, req.usuario);
    if (req.usuario.rol !== 'admin' && cot.estado === 'borrador') return res.status(404).json({ mensaje: 'Cotización no encontrada' });

    res.status(200).json(cot);
  } catch (error) {
    manejarError(res, error, 'Error al obtener la cotización');
  }
};

// Admin: crea una nueva versión en borrador
const createCotizacion = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    if (!esIdValido(solicitudId)) return res.status(400).json({ mensaje: 'El ID de solicitud no es válido' });

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    if (!['en_evaluacion', 'respondida'].includes(solicitud.estado)) {
      return res.status(409).json({ mensaje: 'Solo se puede cotizar una solicitud en evaluación o respondida' });
    }

    const v = await validarCotizacion(req.body, solicitud.id);
    if (v.mensaje) return res.status(400).json({ mensaje: v.mensaje });

    const { id, version } = await Cotizacion.nuevaVersion(solicitud.id, req.usuario.id, v.datos);
    res.status(201).json({ mensaje: 'Cotización creada como borrador', id, version });
  } catch (error) {
    manejarError(res, error, 'Error al crear la cotización');
  }
};

// Admin: edita un borrador
const updateCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const cot = await Cotizacion.findById(id);
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    await obtenerSolicitudAccesible(cot.solicitud_id, req.usuario);

    const v = await validarCotizacion(req.body, cot.solicitud_id);
    if (v.mensaje) return res.status(400).json({ mensaje: v.mensaje });

    await Cotizacion.update(id, v.datos);
    res.json({ mensaje: 'Cotización actualizada exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al actualizar la cotización');
  }
};

// Admin: envía la cotización al cliente (pasa a vigente)
const enviarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const cot = await Cotizacion.findById(id);
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    await obtenerSolicitudAccesible(cot.solicitud_id, req.usuario);

    const enviada = await Cotizacion.enviar(id, req.usuario.id);
    res.json({ mensaje: 'Cotización enviada al cliente', vence_en: enviada.vence_en });
  } catch (error) {
    manejarError(res, error, 'Error al enviar la cotización');
  }
};

// Cliente: confirma la cotización vigente de SU solicitud
const confirmarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const cot = await Cotizacion.findById(id);
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    await obtenerSolicitudAccesible(cot.solicitud_id, req.usuario); // verifica que sea el cliente dueño

    await Cotizacion.confirmar(id, req.usuario.id);
    res.json({ mensaje: 'Cotización confirmada exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al confirmar la cotización');
  }
};

// Admin: solo se borran borradores
const deleteCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const cot = await Cotizacion.findById(id);
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (cot.estado !== 'borrador') throw new ErrorDeNegocio('Solo se pueden eliminar cotizaciones en borrador', 409);

    await Cotizacion.eliminarBorrador(id);
    res.json({ mensaje: 'Cotización eliminada exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al eliminar la cotización');
  }
};

module.exports = {
  getCotizacionesBySolicitud, getCotizacionById, createCotizacion, updateCotizacion,
  enviarCotizacion, confirmarCotizacion, deleteCotizacion,
};