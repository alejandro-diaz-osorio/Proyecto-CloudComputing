const Notificacion = require('../model/notificacion');
const { esIdValido } = require('../utils/validar');
const { manejarError } = require('../utils/manejarError');

const getNotificaciones = async (req, res) => {
  try {
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 30, 1), 100);
    res.status(200).json(await Notificacion.findByUsuario(req.usuario.id, limite));
  } catch (error) {
    manejarError(res, error, 'Error al obtener notificaciones');
  }
};

// Para el punto rojo de la campana
const getContadorSinLeer = async (req, res) => {
  try {
    res.status(200).json({ sinLeer: await Notificacion.contarSinLeer(req.usuario.id) });
  } catch (error) {
    manejarError(res, error, 'Error al contar notificaciones');
  }
};

const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const r = await Notificacion.marcarLeida(id, req.usuario.id);
    if (r.affectedRows === 0) return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    manejarError(res, error, 'Error al marcar la notificación');
  }
};

const marcarTodasLeidas = async (req, res) => {
  try {
    await Notificacion.marcarTodasLeidas(req.usuario.id);
    res.json({ mensaje: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    manejarError(res, error, 'Error al marcar las notificaciones');
  }
};

module.exports = { getNotificaciones, getContadorSinLeer, marcarLeida, marcarTodasLeidas };