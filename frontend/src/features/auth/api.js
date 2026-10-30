// Contrato con el backend (routes/auth.js + authController.js).
//
//   POST /api/auth/login     { email, password }                       → { token, usuario }
//   POST /api/auth/register  { nombre, apellido, email, password, telefono? } → 201 { mensaje, token, usuario }
//   usuario = { id, nombre, apellido, email, telefono, rol: 'cliente' | 'admin' }
//   Errores: { mensaje }  (400 datos inválidos · 401 credenciales · 403 cuenta desactivada · 409 email repetido · 429 límite)
//
// El backend usa un único JWT (sin refresh token ni logout en servidor): el cierre de sesión es local.
// Si cambian rutas o campos, SOLO se edita este archivo.
import { http, ApiError } from '../../lib/http.js';

const RUTAS_API = {
  login: '/auth/login',
  registro: '/auth/register',
};

function normalizar(data) {
  return {
    accessToken: data?.token ?? data?.accessToken ?? null,
    usuario: data?.usuario ?? data?.user ?? null,
  };
}

function exigirSesion(data) {
  const sesion = normalizar(data);
  if (!sesion.accessToken || !sesion.usuario) {
    throw new ApiError(500, 'Respuesta inesperada del servidor. Inténtalo de nuevo.');
  }
  return sesion;
}

export const authApi = {
  async login({ email, password }) {
    const data = await http.post(
      RUTAS_API.login,
      { email: email.trim().toLowerCase(), password },
      { auth: false },
    );
    return exigirSesion(data);
  },

  async register({ nombre, apellido, email, password, telefono }) {
    const cuerpo = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim().toLowerCase(),
      password,
    };
    if (telefono) cuerpo.telefono = telefono;
    const data = await http.post(RUTAS_API.registro, cuerpo, { auth: false });
    return normalizar(data); // el backend ya devuelve token + usuario al registrar
  },
};
