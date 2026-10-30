const { ErrorDeNegocio } = require('../utils/errors');

const notFound = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorDeNegocio) return res.status(err.status).json({ error: err.message });
  // Errores de MySQL (las reglas que garantiza la propia base de datos)
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con ese valor (duplicado)' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(409).json({ error: 'Referencia inválida: el registro relacionado no existe' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: tiene registros relacionados' });
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819 || err.errno === 4025) {
    return res.status(400).json({ error: 'Un valor no cumple las reglas de la base de datos (ej. valor > 0, presupuesto máx ≥ mín)' });
  }
  if (err.message === 'Origen no permitido por CORS') return res.status(403).json({ error: err.message });

  console.error(err);
  // En producción no se filtran detalles internos
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message });
};

module.exports = { notFound, errorHandler };