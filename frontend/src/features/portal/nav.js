import { RUTAS } from '../../lib/routes.js';

export const NAV_PORTAL = [
  { id: 'cotizaciones', label: 'Mis cotizaciones', href: RUTAS.portalCotizaciones, icon: 'file' },
  { id: 'perfil', label: 'Mi perfil', href: RUTAS.portalPerfil, icon: 'user' },
];

export const NAV_ADMIN = [
  { id: 'inicio', label: 'Panel de administración', href: RUTAS.portalAdmin, icon: 'file' },
];