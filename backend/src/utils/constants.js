// Estados de una solicitud (borrador → enviada → en_evaluacion → respondida → confirmada)
const ESTADOS_SOLICITUD = ['borrador', 'enviada', 'en_evaluacion', 'respondida', 'confirmada'];

// A qué estado puede pasar una solicitud desde cada estado.
const TRANSICIONES = {
  borrador:      ['enviada'],
  enviada:       ['en_evaluacion'],
  en_evaluacion: ['respondida'],
  respondida:    ['confirmada'],
  confirmada:    [],
};

// Valores exactos de los ENUM de la base de datos (solucia.sql)
const TIPOS_PROYECTO = ['vivienda', 'comercial', 'otro'];                                          // solicitudes.tipo_proyecto
const PLAZOS_INICIO = ['proximo_mes', 'proximos_3_meses', 'proximos_6_meses', 'mas_adelante', 'sin_definir']; // solicitudes.plazo_inicio
const CATEGORIAS_ARCHIVO = ['referencia', 'plano', 'cotizacion'];                                  // archivos.categoria

module.exports = {
  ESTADOS_SOLICITUD,
  TRANSICIONES,
  TIPOS_PROYECTO,
  PLAZOS_INICIO,
  CATEGORIAS_ARCHIVO,
};