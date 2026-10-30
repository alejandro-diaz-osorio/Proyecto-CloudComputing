const { ErrorDeNegocio } = require('./errors');

// Convierte errores conocidos (reglas de negocio y errores de MySQL) en { status, mensaje }.
const traducirError = (err) => {
  if (err instanceof ErrorDeNegocio) return { status: err.status, mensaje: err.message };
  if (err.code === 'ER_DUP_ENTRY') return { status: 409, mensaje: 'Ya existe un registro con ese valor' };
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return { status: 409, mensaje: 'Referencia inválida: el registro relacionado no existe' };
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return { status: 409, mensaje: 'No se puede eliminar: tiene registros relacionados' };
  if (err.code === 'ER_DATA_TOO_LONG') return { status: 400, mensaje: 'Un texto excede la longitud permitida' };
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819 || err.errno === 4025) {
    return { status: 400, mensaje: 'Un valor no cumple las reglas de la base de datos (ej. valor > 0, presupuesto máximo ≥ mínimo)' };
  }
  return null;
};

// Se usa en el catch de cada controlador
const manejarError = (res, err, mensajeDefecto) => {
  const t = traducirError(err);
  if (t) return res.status(t.status).json({ mensaje: t.mensaje });
  console.error(`${mensajeDefecto}:`, err);
  return res.status(500).json({ mensaje: mensajeDefecto });
};

module.exports = { traducirError, manejarError };
