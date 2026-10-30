// OPCIONAL — reemplaza middleware/verifyJWT.js solo si quieres que desactivar una cuenta
// (o cambiar su rol) surta efecto de inmediato, sin esperar a que venza el token de 8 h.
// Costo: una consulta por clave primaria en cada petición protegida.
// Ruta de conexion según tu árbol (src/model/conexion.js); ajústala si la moviste.
const jwt = require('jsonwebtoken');
const { query } = require('../model/conexion');

// Lee "Authorization: Bearer <token>", valida y deja req.usuario = { id, rol }.
// El rol sale de la base de datos (no del token), así un cambio de rol es inmediato.
module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] }, async (err, payload) => {
    if (err) return res.status(401).json({ error: 'Token inválido o expirado' });
    try {
      const [u] = await query('SELECT rol, activo FROM usuarios WHERE id = ? LIMIT 1', [payload.id]);
      // 401 (no 403): el frontend cierra la sesión automáticamente al recibir 401
      if (!u || !u.activo) return res.status(401).json({ error: 'Cuenta no disponible' });
      req.usuario = { id: payload.id, rol: u.rol };
      next();
    } catch (e) {
      next(e);
    }
  });
};
