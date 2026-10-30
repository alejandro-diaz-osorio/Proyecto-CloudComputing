const { query } = require('./conexion');

const Servicio = {

  findAll: async () => {
    return await query('SELECT * FROM servicios ORDER BY id ASC');
  },

  // Los que ve el cliente en el formulario
  findActivos: async () => {
    return await query('SELECT id, nombre FROM servicios WHERE activo = 1 ORDER BY id ASC');
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM servicios WHERE id = ?', [id]);
    return result.length > 0 ? result[0] : null;
  },

  create: async ({ nombre }) => {
    const result = await query('INSERT INTO servicios (nombre) VALUES (?)', [nombre.trim()]);
    return result.insertId;
  },

  update: async (id, { nombre, activo }) => {
    return await query('UPDATE servicios SET nombre = ?, activo = ? WHERE id = ?', [nombre.trim(), activo ?? 1, id]);
  },

  // Ocultar un servicio sin perder las solicitudes antiguas que lo usaron
  setActivo: async (id, activo) => {
    return await query('UPDATE servicios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  },

  existeNombre: async (nombre, excludeId = null) => {
    let sql = 'SELECT COUNT(*) AS count FROM servicios WHERE nombre = ?';
    const values = [nombre.trim()];
    if (excludeId) {
      sql += ' AND id != ?';
      values.push(excludeId);
    }
    const result = await query(sql, values);
    return result[0].count > 0;
  },
};

module.exports = Servicio;