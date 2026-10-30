const Solicitud = require('../model/solicitud');
const { ErrorDeNegocio } = require('./errors');

/**
 * Devuelve la solicitud si el usuario puede verla; si no, lanza 404 (así no se revela
 * que existe). Admin: cualquiera menos borradores. Cliente: solo las suyas.
 */
const obtenerSolicitudAccesible = async (id, usuario) => {
  const s = await Solicitud.findById(id);
  const noEncontrada = new ErrorDeNegocio('Solicitud no encontrada', 404);
  if (!s) throw noEncontrada;
  if (usuario.rol === 'admin') {
    if (s.estado === 'borrador') throw noEncontrada;
    return s;
  }
  if (s.cliente_id !== usuario.id) throw noEncontrada;
  return s;
};

module.exports = { obtenerSolicitudAccesible };