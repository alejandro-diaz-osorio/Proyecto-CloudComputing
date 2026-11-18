import { RUTAS } from '../../lib/routes.js';

// Menú lateral de la administración: solo "Solicitudes" (sin "Resumen").
// La forma de cada ítem es la misma que usa PortalSidebar: { label, href, icon }.
export const NAV_ADMIN_SOLICITUDES = [
  { id: 'solicitudes', label: 'Solicitudes', href: RUTAS.portalAdmin, icon: 'file' },
  { id: 'usuarios', label: 'Usuarios', href: RUTAS.portalAdminUsuarios, icon: 'users' },
  { id: 'perfil', label: 'Mi perfil', href: RUTAS.portalAdminPerfil, icon: 'user' },
];