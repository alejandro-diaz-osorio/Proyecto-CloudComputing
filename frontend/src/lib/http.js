// Cliente HTTP único del frontend.
//  - Base /api (mismo origen vía nginx / proxy de Vite).
//  - Adjunta el token de sesión como Bearer.
//  - Si una ruta protegida responde 401: pide renovar la sesión UNA vez (compartida entre
//    peticiones simultáneas) y reintenta. Hoy el backend no tiene refresh, así que la renovación
//    devuelve null y se llama a onExpire (cierra la sesión). Queda listo para cuando exista.
//  - Todos los errores salen como ApiError { status, mensaje, errores }.
import { API_BASE } from './config.js';

export class ApiError extends Error {
  constructor(status, mensaje, errores = null) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.mensaje = mensaje;
    this.errores = errores;
  }
}

const manejadores = {
  getToken: () => null,
  refresh: async () => null, // debe devolver el nuevo access token o null
  onExpire: () => {},
};

/** La capa de sesión registra aquí cómo obtener/renovar el token (evita imports circulares). */
export function configureHttp(extra) {
  Object.assign(manejadores, extra);
}

let refrescando = null;

function mensajePorEstado(status) {
  if (status === 400) return 'Revisa los datos ingresados.';
  if (status === 401) return 'Tus credenciales no son válidas o la sesión expiró.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No encontramos lo que buscabas.';
  if (status === 409) return 'Ya existe un registro con esos datos.';
  if (status === 429) return 'Demasiados intentos. Intenta de nuevo en unos minutos.';
  if (status >= 500) return 'Tuvimos un problema en el servidor. Inténtalo más tarde.';
  return 'Ocurrió un error inesperado.';
}

async function enviar(ruta, { method = 'GET', body, headers, signal }, token) {
  const h = { Accept: 'application/json', ...headers };
  const esForm = typeof FormData !== 'undefined' && body instanceof FormData;
  // Con FormData NO se fija Content-Type: el navegador lo pone con el boundary del multipart
  if (body !== undefined && !esForm) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_BASE}${ruta}`, {
      method,
      headers: h,
      body: body === undefined ? undefined : esForm ? body : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
}

async function leer(res) {
  const texto = res.status === 204 ? '' : await res.text();
  let data = null;
  if (texto) {
    try { data = JSON.parse(texto); } catch { data = null; }
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      // El backend usa { mensaje } en los controladores y { error } en verifyJWT / verifyRoles
      data?.mensaje ?? data?.message ?? (typeof data?.error === 'string' ? data.error : null) ?? mensajePorEstado(res.status),
      data?.errores ?? data?.errors ?? null,
    );
  }
  return data;
}

/**
 * @param {string} ruta  relativa a /api, p. ej. '/solicitudes'
 * @param {{method?:string, body?:any, headers?:object, signal?:AbortSignal, auth?:boolean}} opts
 *        auth:false → ruta pública (login, registro, refresh): sin Bearer y sin reintento.
 */
export async function request(ruta, opts = {}) {
  const { auth = true } = opts;
  let res = await enviar(ruta, opts, auth ? manejadores.getToken() : null);

  if (res.status === 401 && auth) {
    refrescando ??= manejadores.refresh().finally(() => { refrescando = null; });
    const nuevoToken = await refrescando;
    if (nuevoToken) res = await enviar(ruta, opts, nuevoToken);
    else manejadores.onExpire();
  }
  return leer(res);
}

export const http = {
  get: (ruta, opts) => request(ruta, { ...opts, method: 'GET' }),
  post: (ruta, body, opts) => request(ruta, { ...opts, method: 'POST', body }),
  put: (ruta, body, opts) => request(ruta, { ...opts, method: 'PUT', body }),
  patch: (ruta, body, opts) => request(ruta, { ...opts, method: 'PATCH', body }),
  delete: (ruta, opts) => request(ruta, { ...opts, method: 'DELETE' }),
};