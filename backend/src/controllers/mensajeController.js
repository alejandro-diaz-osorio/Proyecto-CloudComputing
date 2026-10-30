const Mensaje = require('../model/mensaje');
const { esIdValido } = require('../utils/validar');
const { obtenerSolicitudAccesible } = require('../utils/acceso');
const { manejarError } = require('../utils/manejarError');

// Conversación de la solicitud; al leerla se marcan como leídos los mensajes de la otra persona
const getMensajes = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    if (!esIdValido(solicitudId)) return res.status(400).json({ mensaje: 'El ID de solicitud no es válido' });

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    const mensajes = await Mensaje.findBySolicitud(solicitud.id);
    await Mensaje.marcarLeidos(solicitud.id, req.usuario.id);
    res.status(200).json(mensajes);
  } catch (error) {
    manejarError(res, error, 'Error al obtener mensajes');
  }
};

const enviarMensaje = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const cuerpo = typeof req.body.cuerpo === 'string' ? req.body.cuerpo.trim() : '';
    if (!esIdValido(solicitudId)) return res.status(400).json({ mensaje: 'El ID de solicitud no es válido' });
    if (!cuerpo) return res.status(400).json({ mensaje: 'El mensaje no puede estar vacío' });
    if (cuerpo.length > 2000) return res.status(400).json({ mensaje: 'El mensaje no puede superar 2000 caracteres' });

    const solicitud = await obtenerSolicitudAccesible(solicitudId, req.usuario);
    if (solicitud.estado === 'borrador') {
      return res.status(409).json({ mensaje: 'Envía la solicitud antes de hacer consultas' });
    }

    const id = await Mensaje.enviar({ solicitud_id: solicitud.id, autor_id: req.usuario.id, cuerpo });
    res.status(201).json({ mensaje: 'Mensaje enviado', id });
  } catch (error) {
    manejarError(res, error, 'Error al enviar el mensaje');
  }
};

module.exports = { getMensajes, enviarMensaje };