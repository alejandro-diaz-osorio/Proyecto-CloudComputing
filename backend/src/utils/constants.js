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

// ⚠ PENDIENTE: copiar los valores exactos de los ENUM de la base de datos.
const TIPOS_PROYECTO = [];
const PLAZOS_INICIO = [];
const CATEGORIAS_ARCHIVO = [];

module.exports = {
  ESTADOS_SOLICITUD,
  TRANSICIONES,
  TIPOS_PROYECTO,
  PLAZOS_INICIO,
  CATEGORIAS_ARCHIVO,
};