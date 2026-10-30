// Validación del lado del cliente. Debe reflejar (no reemplazar) lo que valida el backend
// (utils/validar.js): el servidor sigue siendo la fuente de verdad.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function reglasPassword(valor = '') {
  return {
    largo: valor.length >= 8,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(valor),
    numero: /\d/.test(valor),
  };
}
export const passwordValida = (valor) => Object.values(reglasPassword(valor)).every(Boolean);

/** Solo dígitos, máximo 10, con formato "300 000 0000" mientras se escribe. */
export function formatearTelefono(valor = '') {
  const d = valor.replace(/\D/g, '').slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(' ');
}

/** Celular colombiano: 10 dígitos que empiezan por 3. Devuelve '+573001234567' o null si está vacío. */
export function telefonoParaApi(valor = '') {
  const d = valor.replace(/\D/g, '');
  return d ? `+57${d}` : null;
}

export function validarLogin({ email = '', password = '' }) {
  const e = {};
  if (!email.trim()) e.email = 'Ingresa tu correo electrónico.';
  else if (!EMAIL_RE.test(email.trim())) e.email = 'El correo no tiene un formato válido.';
  if (!password) e.password = 'Ingresa tu contraseña.';
  return e;
}

export function validarRegistro(v) {
  const e = {};
  const nombre = (v.nombre ?? '').trim();
  const apellido = (v.apellido ?? '').trim();

  if (!nombre) e.nombre = 'Ingresa tu nombre.';
  else if (nombre.length > 80) e.nombre = 'Máximo 80 caracteres.';

  if (!apellido) e.apellido = 'Ingresa tu apellido.';
  else if (apellido.length > 80) e.apellido = 'Máximo 80 caracteres.';

  const email = (v.email ?? '').trim();
  if (!email) e.email = 'Ingresa tu correo electrónico.';
  else if (!EMAIL_RE.test(email)) e.email = 'El correo no tiene un formato válido.';
  else if (email.length > 190) e.email = 'Máximo 190 caracteres.';

  if (!v.password) e.password = 'Crea una contraseña.';
  else if (!passwordValida(v.password)) e.password = 'Usa 8 caracteres, una mayúscula y un número.';

  if (!v.confirmar) e.confirmar = 'Repite tu contraseña.';
  else if (v.confirmar !== v.password) e.confirmar = 'Las contraseñas no coinciden.';

  const tel = (v.telefono ?? '').replace(/\D/g, '');
  if (tel && !/^3\d{9}$/.test(tel)) e.telefono = 'Ingresa un celular colombiano de 10 dígitos (ej. 300 000 0000).';

  if (!v.terminos) e.terminos = 'Debes aceptar los términos y la política de privacidad.';
  return e;
}

/** Normaliza errores de campo enviados por el backend: {campo:msg} o [{campo|path, mensaje|msg}]. */
export function erroresDelServidor(err) {
  const bruto = err?.errores;
  if (!bruto) return {};
  if (Array.isArray(bruto)) {
    return Object.fromEntries(
      bruto
        .map((x) => [x?.campo ?? x?.path ?? x?.param, x?.mensaje ?? x?.msg])
        .filter(([k, v]) => k && v),
    );
  }
  return typeof bruto === 'object' ? bruto : {};
}
