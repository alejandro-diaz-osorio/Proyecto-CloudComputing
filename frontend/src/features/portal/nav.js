import { RUTAS } from '../../lib/routes.js';

export const NAV_PORTAL = [
  { id: 'cotizaciones', label: 'Mis cotizaciones', href: RUTAS.portalCotizaciones, icon: 'file' },
  { id: 'perfil', label: 'Mi perfil', href: RUTAS.portalPerfil, icon: 'user' },
];

export const NAV_ADMIN = [
  { id: 'cotizaciones', label: 'Solicitudes', href: RUTAS.portalAdmin, icon: 'file' },
  { id: 'usuarios', label: 'Usuarios', href: RUTAS.portalAdminUsuarios, icon: 'users' },
  { id: 'perfil', label: 'Mi perfil', href: RUTAS.portalAdminPerfil, icon: 'user' },
];