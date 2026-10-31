// Rutas de la aplicación en un solo lugar (nada de strings sueltos en los componentes).
// Las rutas del portal llevan "/" final, igual que login y registro (Astro genera carpeta/index.html).
export const RUTAS = {
  inicio: '/',
  login: '/login/',
  registro: '/registro/',
  cotizar: '/cotizar',
  recuperar: '/recuperar',     // pendiente: requiere endpoint de recuperación en el backend
  terminos: '/terminos',       // pendiente: página estática
  privacidad: '/privacidad',   // pendiente: página estática

  // Portal del cliente (rol 'cliente')
  portal: '/portal/cotizaciones/',          // destino por defecto tras el login de un cliente
  portalCotizaciones: '/portal/cotizaciones/',
  portalNuevaSolicitud: '/portal/cotizaciones/nueva/',
  portalPerfil: '/portal/perfil/',

  // Portal de administración (rol 'admin')
  portalAdmin: '/portal/admin/',
};