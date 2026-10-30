import { RUTAS } from '../../lib/routes.js';

// Menú lateral de la administración: solo "Solicitudes" (sin "Resumen").
// La forma de cada ítem es la misma que usa PortalSidebar: { label, href, icon }.
export const NAV_ADMIN_SOLICITUDES = [
  { label: 'Solicitudes', href: RUTAS.portalAdmin, icon: 'file' },
];