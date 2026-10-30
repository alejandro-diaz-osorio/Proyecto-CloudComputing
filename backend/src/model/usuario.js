const { query } = require('./conexion');

// Nunca se selecciona password_hash salvo en findByEmail (login).
const COLUMNAS = 'id, nombre, apellido, email, telefono, rol, activo, created_at, updated_at';

const Usuario = {

  findAll: async (rol = null) => {
    if (rol) return await query(`SELECT ${COLUMNAS} FROM usuarios WHERE rol = ? ORDER BY apellido ASC, nombre ASC`, [rol]);
    return await query(`SELECT ${COLUMNAS} FROM usuarios ORDER BY apellido ASC, nombre ASC`);
  },

  findById: async (id, db) => {
    const result = await query(`SELECT ${COLUMNAS} FROM usuarios WHERE id = ?`, [id], db);
    return result.length > 0 ? result[0] : null;
  },

  // Incluye password_hash: solo para validar el login
  findByEmail: async (email) => {
    const result = await query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    return result.length > 0 ? result[0] : null;
  },

  findAdmins: async (db) => {
    return await query(`SELECT ${COLUMNAS} FROM usuarios WHERE rol = 'admin' AND activo = 1`, [], db);
  },

  // El password ya debe llegar cifrado (bcrypt) desde el controlador
  create: async ({ nombre, apellido, email, password_hash, telefono, rol }) => {
    const result = await query(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellido, email.toLowerCase().trim(), password_hash, telefono || null, rol || 'cliente']
    );
    return result.insertId;
  },

  update: async (id, { nombre, apellido, telefono }) => {
    return await query(
      'UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ? WHERE id = ?',
      [nombre, apellido, telefono || null, id]
    );
  },

  actualizarPassword: async (id, password_hash) => {
    return await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash, id]);
  },

  // Los usuarios no se borran: se activan/desactivan para conservar su historial
  setActivo: async (id, activo) => {
    return await query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  },

  existeEmail: async (email, excludeId = null) => {
    let sql = 'SELECT COUNT(*) AS count FROM usuarios WHERE email = ?';
    const values = [email.toLowerCase().trim()];
    if (excludeId) {
      sql += ' AND id != ?';
      values.push(excludeId);
    }
    const result = await query(sql, values);
    return result[0].count > 0;
  },

  // ¿El usuario existe, está activo y tiene ese rol? (cliente_id → 'cliente', arquitecto_id → 'admin')
  tieneRol: async (id, rol, db) => {
    const result = await query('SELECT COUNT(*) AS count FROM usuarios WHERE id = ? AND rol = ? AND activo = 1', [id, rol], db);
    return result[0].count > 0;
  },
};

module.exports = Usuario;