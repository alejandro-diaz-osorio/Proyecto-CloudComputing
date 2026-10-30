import { RUTAS } from '../../lib/routes.js';

/** Solo rutas internas ("/algo"): evita open-redirect con ?next=https://sitio-malo.com o //sitio-malo.com */
export function rutaSegura(valor) {
  if (typeof valor !== 'string') return null;
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return null;
  return valor;
}

/** A dónde ir tras autenticarse: ?next= si es seguro; si no, según el rol. */
export function destinoDespuesDeAuth(usuario) {
  if (typeof window !== 'undefined') {
    const next = rutaSegura(new URLSearchParams(window.location.search).get('next'));
    if (next) return next;
  }
  return usuario?.rol === 'admin' ? RUTAS.portalAdmin : RUTAS.portal;
}
