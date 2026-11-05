const solService = require('../services/solService');

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const listaTextos = (v, max, maxItem) =>
  (Array.isArray(v) ? v : []).slice(0, max).map((x) => texto(x, maxItem)).filter(Boolean);

// POST /api/sol/analizar
const analizar = async (req, res, next) => {
  const b = req.body ?? {};
  const descripcion = texto(b.descripcion, 4000);

  const area = Number(b.area_m2);
  const payload = {
    tipo_proyecto: texto(b.tipo_proyecto, 40),
    descripcion,
    ubicacion: texto(b.ubicacion, 200),
    area_m2: Number.isFinite(area) && area > 0 ? area : null,
    servicios: listaTextos(b.servicios, 20, 100),
    archivos: listaTextos(b.archivos, 20, 200),
    mensaje: texto(b.mensaje, 1000),
    historial: (Array.isArray(b.historial) ? b.historial : [])
      .slice(-8)
      .filter((m) => m && (m.rol === 'cliente' || m.rol === 'sol'))
      .map((m) => ({ rol: m.rol, texto: texto(m.texto, 1000) })),
  };

  try {
    const d = await solService.analizar(payload);
    return res.json({
      respuesta: d.respuesta,
      preguntas_pendientes: d.preguntas_pendientes,
      documentos_pendientes: d.documentos_pendientes,
      descripcion_mejorada: d.descripcion_mejorada,
    });
  } catch (err) {
    if (err instanceof solService.SolError) {
      return res.status(err.estado).json({ mensaje: err.message });
    }
    return next(err);
  }
};

module.exports = { analizar };