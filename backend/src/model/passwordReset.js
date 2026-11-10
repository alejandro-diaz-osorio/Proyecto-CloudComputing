const { query, transaction } = require('./conexion');

const PasswordReset = {
  deleteForUser: async (usuarioId, db) => {
    return await query('DELETE FROM tokens_recuperacion_contrasena WHERE usuario_id = ?', [usuarioId], db);
  },

  deleteByTokenHash: async (tokenHash) => {
    return await query('DELETE FROM tokens_recuperacion_contrasena WHERE token_hash = ?', [tokenHash]);
  },

  deleteExpired: async () => {
    return await query('DELETE FROM tokens_recuperacion_contrasena WHERE expires_at <= UTC_TIMESTAMP()');
  },

  create: async ({ usuarioId, tokenHash }) => {
    return await query(
      `INSERT INTO tokens_recuperacion_contrasena (usuario_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
      [usuarioId, tokenHash],
    );
  },

  consumir: async ({ tokenHash, passwordHash }) => {
    return await transaction(async (db) => {
      const [token] = await query(
        `SELECT id, usuario_id FROM tokens_recuperacion_contrasena
         WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE`,
        [tokenHash],
        db,
      );
      if (!token) return false;

      await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, token.usuario_id], db);
      await query('DELETE FROM tokens_recuperacion_contrasena WHERE usuario_id = ?', [token.usuario_id], db);
      return true;
    });
  },
};

module.exports = PasswordReset;
