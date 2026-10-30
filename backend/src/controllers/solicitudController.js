const Solicitud = require('../model/solicitud');
const Archivo = require('../model/archivo');
const Cotizacion = require('../model/cotizacion');
const HistorialEstado = require('../model/historialEstado');
const { TIPOS_PROYECTO, PLAZOS_INICIO, ESTADOS_SOLICITUD } = require('../utils/constants');
const { esIdValido, textoOpcional, numeroOpcional } = require('../utils/validar');
const { obtenerSolicitudAccesible } = require('../utils/acceso');
const { manejarError } = require('../utils/manejarError');

/**
 * Valida y limpia el cuerpo del formulario de 4 pasos.
 * Devuelve { mensaje } si hay un error, o { datos, servicioIds } si todo está bien.
 */
const validarSolicitud = (body) => {
  const titulo = textoOpcional(body.titulo);
  const descripcion = textoOpcional(body.descripcion);
  const descripcion_ia = textoOpcional(body.descripcion_ia);
  const ubicacion = textoOpcional(body.ubicacion);
  const area_m2 = numeroOpcional(body.area_m2);
  const presupuesto_min = numeroOpcional(body.presupuesto_min);
  const presupuesto_max = numeroOpcional(body.presupuesto_max);
  const plazo_inicio = textoOpcional(body.plazo_inicio);
  const usar_version_ia = body.usar_version_ia === true;
  const servicioIds = body.servicios === undefined ? [] : body.servicios;

  if (!titulo || !body.tipo_proyecto || !descripcion) {
    return { mensaje: 'Título, tipo de proyecto y descripción son obligatorios' };
  }
  if (titulo.length > 150) return { mensaje: 'El título no puede superar 150 caracteres' };
  if (!TIPOS_PROYECTO.includes(body.tipo_proyecto)) return { mensaje: `El tipo de proyecto debe ser: ${TIPOS_PROYECTO.join(', ')}` };
  if (ubicacion && ubicacion.length > 150) return { mensaje: 'La ubicación no puede superar 150 caracteres' };
  if (area_m2 !== null && (!Number.isFinite(area_m2) || area_m2 <= 0)) return { mensaje: 'El área debe ser un número mayor que cero' };
  for (const [nombre, v] of [['mínimo', presupuesto_min], ['máximo', presupuesto_max]]) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) return { mensaje: `El presupuesto ${nombre} debe ser un número positivo` };
  }
  if (presupuesto_min !== null && presupuesto_max !== null && presupuesto_max < presupuesto_min) {
    return { mensaje: 'El presupuesto máximo no puede ser menor que el mínimo' };
  }
  if (plazo_inicio && !PLAZOS_INICIO.includes(plazo_inicio)) return { mensaje: `El plazo de inicio debe ser: ${PLAZOS_INICIO.join(', ')}` };
  if (usar_version_ia && !descripcion_ia) return { mensaje: 'No hay una versión sugerida por Sol para usar' };
  if (!Array.isArray(servicioIds) || !servicioIds.every(esIdValido)) return { mensaje: 'servicios debe ser una lista de IDs de servicio' };

  return {
    datos: { titulo, tipo_proyecto: body.tipo_proyecto, descripcion, descripcion_ia, usar_version_ia, ubicacion, area_m2, presupuesto_min, presupuesto_max, plazo_inicio },
    servicioIds: servicioIds.map(Number),
  };
};

// ── Cliente ───────────────────────────────────────────────────

// Seguimiento del cliente (?borradores=true para incluir los borradores)
const getMisSolicitudes = async (req, res) => {
  try {
    const solicitudes = await Solicitud.findByCliente(req.usuario.id, { incluirBorradores: req.query.borradores === 'true' });
    res.status(200).json(solicitudes);
  } catch (error) {
    manejarError(res, error, 'Error al obtener tus solicitudes');
  }
};

// Crea el borrador con los datos del formulario
const createSolicitud = async (req, res) => {
  try {
    const v = validarSolicitud(req.body);
    if (v.mensaje) return res.status(400).json({ mensaje: v.mensaje });

    const { id, codigo } = await Solicitud.crearConCodigo({ ...v.datos, cliente_id: req.usuario.id }, v.servicioIds);
    res.status(201).json({ mensaje: 'Solicitud creada como borrador', id, codigo });
  } catch (error) {
    manejarError(res, error, 'Error al crear la solicitud');
  }
};

// Edita un borrador (el formulario se puede ir completando por pasos)
const updateSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const v = validarSolicitud(req.body);
    if (v.mensaje) return res.status(400).json({ mensaje: v.mensaje });

    const solicitud = await obtenerSolicitudAccesible(id, req.usuario);
    await Solicitud.update(solicitud.id, v.datos, req.body.servicios === undefined ? null : v.servicioIds);
    res.json({ mensaje: 'Solicitud actualizada exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al actualizar la solicitud');
  }
};

// borrador → enviada
const enviarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const solicitud = await obtenerSolicitudAccesible(id, req.usuario);
    if ((await Solicitud.getServicios(solicitud.id)).length === 0) {
      return res.status(400).json({ mensaje: 'Selecciona al menos un servicio antes de enviar la solicitud' });
    }

    const enviada = await Solicitud.cambiarEstado(solicitud.id, 'enviada', req.usuario.id, { nota: 'Solicitud enviada por el cliente' });
    res.json({ mensaje: 'Solicitud enviada exitosamente', codigo: enviada.codigo });
  } catch (error) {
    manejarError(res, error, 'Error al enviar la solicitud');
  }
};

// Solo se pueden borrar los borradores propios
const deleteSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const eliminada = await Solicitud.eliminarBorrador(id, req.usuario.id);
    if (!eliminada) return res.status(404).json({ mensaje: 'Borrador no encontrado (solo se pueden eliminar borradores propios)' });
    res.json({ mensaje: 'Borrador eliminado exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al eliminar el borrador');
  }
};

// ── Administradora ────────────────────────────────────────────

const getAllSolicitudes = async (req, res) => {
  try {
    const { estado, arquitecto_id } = req.query;
    if (estado && !ESTADOS_SOLICITUD.includes(estado)) {
      return res.status(400).json({ mensaje: `El estado debe ser: ${ESTADOS_SOLICITUD.join(', ')}` });
    }
    if (arquitecto_id && !esIdValido(arquitecto_id)) {
      return res.status(400).json({ mensaje: 'arquitecto_id no es válido' });
    }
    // ?asignadas=mias → solo las que ella evalúa
    const filtroArq = req.query.asignadas === 'mias' ? req.usuario.id : (arquitecto_id || null);
    res.status(200).json(await Solicitud.findAll({ estado: estado || null, arquitecto_id: filtroArq }));
  } catch (error) {
    manejarError(res, error, 'Error al obtener solicitudes');
  }
};

// Contadores para el panel (ej. la burbuja "Nuevas")
const getContadores = async (req, res) => {
  try {
    res.status(200).json(await Solicitud.contarPorEstado());
  } catch (error) {
    manejarError(res, error, 'Error al obtener contadores');
  }
};

// enviada → en_evaluacion: la administradora toma la solicitud
const tomarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const solicitud = await obtenerSolicitudAccesible(id, req.usuario);
    await Solicitud.cambiarEstado(solicitud.id, 'en_evaluacion', req.usuario.id, { nota: 'Solicitud tomada para evaluación' });
    res.json({ mensaje: 'Solicitud en evaluación' });
  } catch (error) {
    manejarError(res, error, 'Error al tomar la solicitud');
  }
};

// ── Ambos roles ───────────────────────────────────────────────

// Detalle completo: datos, servicios, archivos, cotizaciones e historial
const getSolicitudById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const solicitud = await obtenerSolicitudAccesible(id, req.usuario);
    const esAdmin = req.usuario.rol === 'admin';

    const [servicios, archivos, cotizaciones, historial] = await Promise.all([
      Solicitud.getServicios(solicitud.id),
      Archivo.findBySolicitud(solicitud.id),
      Cotizacion.findBySolicitud(solicitud.id),
      HistorialEstado.findBySolicitud(solicitud.id),
    ]);

    // El cliente no ve borradores de cotización ni archivos de cotización sin publicar
    const publicadas = cotizaciones.filter((c) => c.estado !== 'borrador');
    const idsPublicados = new Set(publicadas.map((c) => c.archivo_id).filter(Boolean));

    res.status(200).json({
      ...solicitud,
      servicios,
      archivos: esAdmin ? archivos : archivos.filter((a) => a.categoria !== 'cotizacion' || idsPublicados.has(a.id)),
      cotizaciones: esAdmin ? cotizaciones : publicadas,
      historial,
    });
  } catch (error) {
    manejarError(res, error, 'Error al obtener la solicitud');
  }
};

module.exports = {
  getMisSolicitudes, createSolicitud, updateSolicitud, enviarSolicitud, deleteSolicitud,
  getAllSolicitudes, getContadores, tomarSolicitud, getSolicitudById,
};