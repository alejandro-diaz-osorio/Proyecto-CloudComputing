const { query, transaction } = require('./conexion');

const EmailVerification = {
  deleteForUser: async (usuarioId, db) => {
    return await query('DELETE FROM tokens_verificacion_email WHERE usuario_id = ?', [usuarioId], db);
  },

  deleteByTokenHash: async (tokenHash) => {
    return await query('DELETE FROM tokens_verificacion_email WHERE token_hash = ?', [tokenHash]);
  },

  deleteExpired: async () => {
    return await query('DELETE FROM tokens_verificacion_email WHERE expires_at <= UTC_TIMESTAMP()');
  },

  create: async ({ usuarioId, tokenHash }) => {
    return await query(
      `INSERT INTO tokens_verificacion_email (usuario_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))`,
      [usuarioId, tokenHash],
    );
  },

  tieneTokenReciente: async (usuarioId) => {
    const resultado = await query(
      `SELECT 1 FROM tokens_verificacion_email
       WHERE usuario_id = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
       LIMIT 1`,
      [usuarioId],
    );
    return resultado.length > 0;
  },

  consumir: async (tokenHash) => {
    return await transaction(async (db) => {
      const [token] = await query(
        `SELECT usuario_id FROM tokens_verificacion_email
         WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE`,
        [tokenHash],
        db,
      );
      if (!token) return false;

      await query(
        'UPDATE usuarios SET email_verificado_en = COALESCE(email_verificado_en, UTC_TIMESTAMP()) WHERE id = ?',
        [token.usuario_id],
        db,
      );
      await query('DELETE FROM tokens_verificacion_email WHERE usuario_id = ?', [token.usuario_id], db);
      return true;
    });
  },
};

module.exports = EmailVerification;
