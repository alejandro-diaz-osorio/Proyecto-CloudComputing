const crypto = require('crypto');
const path = require('path');
const { query } = require('./conexion');

const Archivo = {

  // Reglas de validación (las usa el controlador / multer antes de guardar)
  MIME_PERMITIDOS: ['application/pdf'],   // hoy solo PDF
  MAX_BYTES: 10 * 1024 * 1024,            // 10 MB

  // Nombre interno único: evita que dos archivos se pisen y rutas maliciosas
  generarNombreAlmacenado: (nombreOriginal) => {
    return `${crypto.randomUUID()}${path.extname(nombreOriginal).toLowerCase()}`;
  },

  rutaFisica: (nombreAlmacenado, dirUploads = process.env.UPLOADS_DIR || '/app/uploads') => {
    return path.join(dirUploads, nombreAlmacenado);
  },

  findBySolicitud: async (solicitudId, categoria = null) => {
    let sql = 'SELECT * FROM archivos WHERE solicitud_id = ?';
    const values = [solicitudId];
    if (categoria) {
      sql += ' AND categoria = ?';
      values.push(categoria);
    }
    return await query(sql + ' ORDER BY created_at ASC', values);
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM archivos WHERE id = ?', [id]);
    return result.length > 0 ? result[0] : null;
  },

  create: async ({ solicitud_id, subido_por, categoria, nombre_original, nombre_almacenado, mime_type, tamano_bytes }, db) => {
    const result = await query(
      `INSERT INTO archivos (solicitud_id, subido_por, categoria, nombre_original, nombre_almacenado, mime_type, tamano_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [solicitud_id, subido_por, categoria || 'referencia', nombre_original, nombre_almacenado, mime_type, tamano_bytes],
      db
    );
    return result.insertId;
  },

  // Devuelve la fila borrada para que el controlador elimine también el archivo físico
  delete: async (id) => {
    const archivo = await Archivo.findById(id);
    if (!archivo) return null;
    await query('DELETE FROM archivos WHERE id = ?', [id]);
    return archivo;
  },
};

module.exports = Archivo;