const nodemailer = require('nodemailer');

let transporte;

const escaparHtml = (valor) => String(valor).replace(/[&<>"']/g, (caracter) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[caracter]);

const crearTransporte = () => {
  const requeridas = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
  const faltan = requeridas.filter((clave) => !process.env[clave]);
  if (faltan.length) {
    throw new Error(`Falta configurar el correo SMTP: ${faltan.join(', ')}`);
  }

  const puerto = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('SMTP_PORT debe ser un puerto válido');
  }

  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporte;
};

const obtenerTransporte = () => transporte || crearTransporte();

const verificarServicioCorreo = async () => {
  await obtenerTransporte().verify();
};

const enviarRecuperacionPassword = async ({ email, nombre, enlace }) => {
  const correo = obtenerTransporte();
  const nombreSeguro = escaparHtml(nombre);
  await correo.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Restablece tu contraseña de SOLUCIA',
    text: [
      `Hola ${nombre},`,
      '',
      'Recibimos una solicitud para cambiar la contraseña de tu cuenta de SOLUCIA.',
      `Usa este enlace dentro de los próximos 30 minutos: ${enlace}`,
      '',
      'Si no solicitaste este cambio, puedes ignorar este mensaje.',
    ].join('\n'),
    html: `<p>Hola ${nombreSeguro},</p>
      <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de SOLUCIA.</p>
      <p><a href="${enlace}">Crear una contraseña nueva</a></p>
      <p>El enlace vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>`,
  });
};

module.exports = { enviarRecuperacionPassword, verificarServicioCorreo };
