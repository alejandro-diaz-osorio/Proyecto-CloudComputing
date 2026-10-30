const { query } = require('./conexion');

const HistorialEstado = {

  // Línea de tiempo del cliente: del más antiguo al más reciente
  findBySolicitud: async (solicitudId) => {
    return await query(
      `SELECT h.id, h.estado_anterior, h.estado_nuevo, h.nota, h.created_at,
              h.cambiado_por, CONCAT(u.nombre, ' ', u.apellido) AS cambiado_por_nombre
         FROM historial_estados h
         JOIN usuarios u ON u.id = h.cambiado_por
        WHERE h.solicitud_id = ?
        ORDER BY h.created_at ASC, h.id ASC`,
      [solicitudId]
    );
  },

  // `db` = conexión de la transacción en curso
  create: async ({ solicitud_id, estado_anterior, estado_nuevo, cambiado_por, nota }, db) => {
    const result = await query(
      `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, nota)
       VALUES (?, ?, ?, ?, ?)`,
      [solicitud_id, estado_anterior ?? null, estado_nuevo, cambiado_por, nota ?? null],
      db
    );
    return result.insertId;
  },
};

module.exports = HistorialEstado;