// Guardas de navegación del lado del cliente (la sesión vive en el navegador).
//
//  - protegerPagina(rol, alAutorizar): para páginas del portal. Sin sesión → /login/?next=…;
//    con sesión pero de otro rol → a SU portal; si todo está bien, muestra la página.
//  - redirigirSiHaySesion(): para /login y /registro. Si ya hay sesión → directo a su portal.
//
// Importante: esto es comodidad de navegación, no seguridad. La seguridad real son
// verifyJWT / verifyRoles en el backend.
import { RUTAS } from './routes.js';
import { initSession, getSesion, suscribirSesion } from '../features/auth/session.js';
import { destinoDespuesDeAuth } from '../features/auth/redirect.js';

const ir = (ruta) => window.location.replace(ruta);

/** Solo existen dos roles: 'admin' y todo lo demás se trata como 'cliente'. */
export const rolDe = (usuario) => (usuario?.rol === 'admin' ? 'admin' : 'cliente');

/** Portal que le corresponde a un usuario según su rol. */
export const destinoPorRol = (usuario) =>
  rolDe(usuario) === 'admin' ? RUTAS.portalAdmin : RUTAS.portal;

/**
 * @param {'cliente'|'admin'} rol  rol que puede ver esta página
 * @param {(usuario:object)=>void} [alAutorizar]  se ejecuta cuando la página ya puede mostrarse
 */
export function protegerPagina(rol, alAutorizar) {
  initSession();
  let autorizado = false;

  const evaluar = (sesion) => {
    if (sesion.status === 'anonymous') {
      if (autorizado) {
        // Cerró sesión (o expiró) estando dentro: login limpio, sin ?next
        ir(RUTAS.login);
      } else {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        ir(`${RUTAS.login}?next=${next}`);
      }
      return;
    }

    if (sesion.status !== 'authenticated') return;

    if (rolDe(sesion.user) !== rol) {
      ir(destinoPorRol(sesion.user)); // el cliente solo ve su portal; el admin, el suyo
      return;
    }

    if (!autorizado) {
      autorizado = true;
      document.documentElement.removeAttribute('data-auth-pending');
      document.querySelector('.portal-shell')?.classList.remove('invisible');
      alAutorizar?.(sesion.user);
    }
  };

  evaluar(getSesion());
  suscribirSesion(evaluar);
}
