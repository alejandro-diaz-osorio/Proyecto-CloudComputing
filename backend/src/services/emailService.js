const escaparHtml = (valor) => String(valor).replace(/[&<>"']/g, (caracter) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[caracter]);

const verificarServicioCorreo = () => {
  const requeridas = ['RESEND_API_KEY', 'MAIL_FROM'];
  if (process.env.NODE_ENV === 'production') requeridas.push('FRONTEND_URL');
  const faltan = requeridas.filter((clave) => !process.env[clave]);
  if (faltan.length) {
    throw new Error(`Falta configurar Resend: ${faltan.join(', ')}`);
  }
};

const enviarCorreo = async ({ email, asunto, texto, html }) => {
  verificarServicioCorreo();

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: asunto,
      text: texto,
      html,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Resend respondió ${respuesta.status}: ${detalle.slice(0, 500)}`);
  }
};

const enviarRecuperacionPassword = async ({ email, nombre, enlace }) => {
  const nombreSeguro = escaparHtml(nombre);
  await enviarCorreo({
    email,
    asunto: 'Restablece tu contraseña de SOLUCIA',
    texto: [
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

const enviarVerificacionEmail = async ({ email, nombre, enlace }) => {
  const nombreSeguro = escaparHtml(nombre);
  await enviarCorreo({
    email,
    asunto: 'Verifica tu correo electrónico · SOLUCIA',
    texto: [
      `Hola ${nombre},`,
      '',
      'Gracias por crear una cuenta en SOLUCIA.',
      `Verifica tu correo electrónico dentro de las próximas 24 horas: ${enlace}`,
      '',
      'Si no creaste esta cuenta, puedes ignorar este mensaje.',
    ].join('\n'),
    html: `<p>Hola ${nombreSeguro},</p>
      <p>Gracias por crear una cuenta en SOLUCIA.</p>
      <p><a href="${enlace}">Verificar mi correo electrónico</a></p>
      <p>El enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
  });
};

module.exports = {
  enviarRecuperacionPassword,
  enviarVerificacionEmail,
  verificarServicioCorreo,
};
