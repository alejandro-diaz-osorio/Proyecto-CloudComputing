import { configureHttp } from '../../lib/http.js';
import { authApi } from './api.js';

const CLAVE = 'solucia:sesion';

let estado = {
  status: 'idle',
  user: null
};

let accessToken = null;
let iniciada = false;

const oyentes = new Set();

function publicar(siguiente) {
  estado = Object.freeze(siguiente);
  oyentes.forEach((fn) => fn(estado));
}

export function suscribirSesion(fn) {
  oyentes.add(fn);

  return () => {
    oyentes.delete(fn);
  };
}

export function getSesion() {
  return estado;
}

// ── Token / almacenamiento ──────────────────────────────────────────────

function vencido(token) {
  try {
    const b64 = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const { exp } = JSON.parse(atob(b64));

    return typeof exp === 'number' && exp * 1000 <= Date.now() + 5000;
  } catch {
    return true;
  }
}

function almacenes() {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return [];
  }
}

function borrarGuardada() {
  almacenes().forEach((a) => {
    try {
      a.removeItem(CLAVE);
    } catch {
      // No crítico
    }
  });
}

function guardar(sesion, recordar) {
  borrarGuardada();

  const [local, temporal] = almacenes();

  try {
    (recordar ? local : temporal)?.setItem(
      CLAVE,
      JSON.stringify(sesion)
    );
  } catch {
    // Sin storage: la sesión dura solo esta página
  }
}

function leerGuardada() {
  for (const a of almacenes()) {
    try {
      const bruto = a.getItem(CLAVE);

      if (!bruto) continue;

      const s = JSON.parse(bruto);

      if (
        s?.accessToken &&
        s?.usuario &&
        !vencido(s.accessToken)
      ) {
        return s;
      }

      a.removeItem(CLAVE);
    } catch {
      // Ignorar y continuar
    }
  }

  return null;
}

// ── Estado ──────────────────────────────────────────────────────────────

export function aplicarSesion(
  { accessToken: token, usuario },
  recordar = false
) {
  accessToken = token;

  guardar(
    {
      accessToken: token,
      usuario
    },
    recordar
  );

  publicar({
    status: 'authenticated',
    user: usuario
  });
}

export function limpiarSesion() {
  accessToken = null;

  borrarGuardada();

  publicar({
    status: 'anonymous',
    user: null
  });
}

export const getAccessToken = () => accessToken;

export function initSession() {
  if (iniciada) return;

  iniciada = true;

  const guardada = leerGuardada();

  if (guardada) {
    accessToken = guardada.accessToken;

    publicar({
      status: 'authenticated',
      user: guardada.usuario
    });
  } else {
    publicar({
      status: 'anonymous',
      user: null
    });
  }
}

// ── Cliente HTTP ────────────────────────────────────────────────────────

configureHttp({
  getToken: () => accessToken,

  refresh: async () => null,

  onExpire: limpiarSesion
});

// ── Sincronización entre pestañas ───────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE || !iniciada) return;

    const guardada = leerGuardada();

    if (guardada) {
      accessToken = guardada.accessToken;

      publicar({
        status: 'authenticated',
        user: guardada.usuario
      });
    } else if (estado.status === 'authenticated') {
      accessToken = null;

      publicar({
        status: 'anonymous',
        user: null
      });
    }
  });
}

// ── Acciones ────────────────────────────────────────────────────────────

export async function iniciarSesion({
  email,
  password,
  recordar = false
}) {
  const sesion = await authApi.login({
    email,
    password
  });

  aplicarSesion(sesion, recordar);

  return sesion.usuario;
}

export async function registrarYEntrar(datos) {
  const sesion = await authApi.register(datos);

  if (sesion.accessToken && sesion.usuario) {
    aplicarSesion(sesion, false);

    return sesion.usuario;
  }

  return iniciarSesion({
    email: datos.email,
    password: datos.password,
    recordar: false
  });
}

export function cerrarSesion() {
  limpiarSesion();
}