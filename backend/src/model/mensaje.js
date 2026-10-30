const { query } = require('./conexion');
const { ErrorDeNegocio } = require('../utils/manejarError');
const Notificacion = require('./notificacion');

const Mensaje = {

  // Conversación de la solicitud, en orden cronológico
  findBySolicitud: async (solicitudId) => {
    return await query(
      `SELECT m.id, m.autor_id, CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre, u.rol AS autor_rol,
              m.cuerpo, m.leido_en, m.created_at
         FROM mensajes m
         JOIN usuarios u ON u.id = m.autor_id
        WHERE m.solicitud_id = ?
        ORDER BY m.created_at ASC, m.id ASC`,
      [solicitudId]
    );
  },

  // Guarda el mensaje y avisa a la otra parte de la conversación
  enviar: async ({ solicitud_id, autor_id, cuerpo }) => {
    return await transaction(async (conn) => {
      const filas = await query('SELECT id, codigo, cliente_id, arquitecto_id FROM solicitudes WHERE id = ?', [solicitud_id], conn);
      const sol = filas[0];
      if (!sol) throw new ErrorDeNegocio('Solicitud no encontrada', 404);

      const result = await query('INSERT INTO mensajes (solicitud_id, autor_id, cuerpo) VALUES (?, ?, ?)', [solicitud_id, autor_id, cuerpo], conn);

      const destinatario = autor_id === sol.cliente_id ? sol.arquitecto_id : sol.cliente_id;
      if (destinatario) {
        await Notificacion.create(
          { usuario_id: destinatario, solicitud_id, tipo: 'mensaje_nuevo', texto: `Nuevo mensaje en ${sol.codigo || '#' + sol.id}` },
          conn
        );
      }
      return result.insertId;
    });
  },

  // Marca como leídos los mensajes escritos por la otra persona
  marcarLeidos: async (solicitudId, usuarioId) => {
    return await query(
      'UPDATE mensajes SET leido_en = NOW() WHERE solicitud_id = ? AND autor_id <> ? AND leido_en IS NULL',
      [solicitudId, usuarioId]
    );
  },

  contarSinLeer: async (solicitudId, usuarioId) => {
    const result = await query(
      'SELECT COUNT(*) AS total FROM mensajes WHERE solicitud_id = ? AND autor_id <> ? AND leido_en IS NULL',
      [solicitudId, usuarioId]
    );
    return result[0].total;
  },
};

module.exports = Mensaje;