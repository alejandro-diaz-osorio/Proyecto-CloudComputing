const solService = require('../services/solService');

const TIPOS = new Set(['vivienda', 'comercial', 'otro']);
const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Ficha de requerimientos que Sol va completando: { clave: valor } con claves y valores cortos
const limpiarFicha = (f) => {
  const out = {};
  if (!f || typeof f !== 'object' || Array.isArray(f)) return out;
  for (const [k, v] of Object.entries(f).slice(0, 30)) {
    if (/^[a-z_]{1,40}$/.test(k) && typeof v === 'string') out[k] = texto(v, 300);
  }
  return out;
};

// POST /api/sol/analizar
// Conversación de Sol para ayudar a redactar el campo "Describe lo que imaginas para tu proyecto".
const analizar = async (req, res, next) => {
  const b = req.body ?? {};
  const mensaje = texto(b.mensaje, 1000);
  const descripcion = texto(b.descripcion, 4000);
  if (!mensaje && !descripcion) {
    return res.status(400).json({ mensaje: 'Escríbele a Sol o cuéntale tu idea para empezar.' });
  }

  const payload = {
    tipo_proyecto: TIPOS.has(b.tipo_proyecto) ? b.tipo_proyecto : '',
    descripcion,
    mensaje,
    historial: (Array.isArray(b.historial) ? b.historial : [])
      .slice(-30)
      .filter((m) => m && (m.rol === 'cliente' || m.rol === 'sol'))
      .map((m) => ({ rol: m.rol, texto: texto(m.texto, 1000) }))
      .filter((m) => m.texto),
    ficha: limpiarFicha(b.ficha),
  };

  try {
    const d = await solService.analizar(payload);
    return res.json({
      respuesta: d.respuesta,
      borrador: d.borrador || '',
      ficha: limpiarFicha(d.ficha),
    });
  } catch (err) {
    if (err instanceof solService.SolError) {
      return res.status(err.estado).json({ mensaje: err.message });
    }
    return next(err);
  }
};

module.exports = { analizar };