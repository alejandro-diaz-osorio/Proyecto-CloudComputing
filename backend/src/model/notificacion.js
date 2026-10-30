const { query } = require('./conexion');
const Notificacion = {

  findByUsuario: async (usuarioId, limite = 30) => {
    return await query(
      'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
      [usuarioId, Number(limite)]
    );
  },

  // Controla el punto rojo de la campana
  contarSinLeer: async (usuarioId) => {
    const result = await query('SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = 0', [usuarioId]);
    return result[0].total;
  },

  create: async ({ usuario_id, solicitud_id, tipo, texto }, db) => {
    const result = await query(
      'INSERT INTO notificaciones (usuario_id, solicitud_id, tipo, texto) VALUES (?, ?, ?, ?)',
      [usuario_id, solicitud_id ?? null, tipo, texto],
      db
    );
    return result.insertId;
  },

  // Varias a la vez (ej. avisar a todas las administradoras)
  createMany: async (lista, db) => {
    if (!lista.length) return;
    const filas = lista.map((n) => [n.usuario_id, n.solicitud_id ?? null, n.tipo, n.texto]);
    return await query('INSERT INTO notificaciones (usuario_id, solicitud_id, tipo, texto) VALUES ?', [filas], db);
  },

  // El WHERE incluye usuario_id para que nadie marque notificaciones ajenas
  marcarLeida: async (id, usuarioId) => {
    return await query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
  },

  marcarTodasLeidas: async (usuarioId) => {
    return await query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0', [usuarioId]);
  },
};

module.exports = Notificacion;