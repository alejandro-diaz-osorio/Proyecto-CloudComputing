// Reglas y utilidades puras del formulario "Cuéntanos sobre tu proyecto".
// Sin DOM ni red: lo usa NuevaSolicitudView.astro y se puede probar con Node.
// Los valores de los enum coinciden con la tabla `solicitudes` (tipo_proyecto, plazo_inicio).

const MILLON = 1_000_000;

export const LIMITES = {
  descripcionMin: 20,
  descripcionMax: 3000,
  ubicacionMax: 150,   // solicitudes.ubicacion = VARCHAR(150)
  tituloMax: 150,      // solicitudes.titulo    = VARCHAR(150)
  areaMax: 1_000_000,  // solicitudes.area_m2   = DECIMAL(10,2)
  archivoBytes: 10 * 1024 * 1024, // igual que Archivo.MAX_BYTES del backend
  archivosMax: 10,
};

export const TIPOS = [
  { id: 'vivienda', label: 'Vivienda', hint: 'Casa o apartamento' },
  { id: 'comercial', label: 'Comercial', hint: 'Local u oficina' },
  { id: 'otro', label: 'Otro', hint: 'Proyecto especial' },
];

// Cada rango se guarda en presupuesto_min / presupuesto_max (DECIMAL(14,0), en pesos).
export const PRESUPUESTOS = [
  { id: '', label: 'Aún no lo sé', min: null, max: null },
  { id: 'r1', label: 'Hasta $50 millones', min: null, max: 50 * MILLON },
  { id: 'r2', label: '$50 – 150 millones', min: 50 * MILLON, max: 150 * MILLON },
  { id: 'r3', label: '$150 – 300 millones', min: 150 * MILLON, max: 300 * MILLON },
  { id: 'r4', label: '$300 – 450 millones', min: 300 * MILLON, max: 450 * MILLON },
  { id: 'r5', label: '$450 – 600 millones', min: 450 * MILLON, max: 600 * MILLON },
  { id: 'r6', label: '$600 – 1.000 millones', min: 600 * MILLON, max: 1000 * MILLON },
  { id: 'r7', label: 'Más de $1.000 millones', min: 1000 * MILLON, max: null },
];

export const PLAZOS = [
  { id: 'sin_definir', label: 'Aún no lo sé' },
  { id: 'proximo_mes', label: 'En el próximo mes' },
  { id: 'proximos_3_meses', label: 'En los próximos 3 meses' },
  { id: 'proximos_6_meses', label: 'En los próximos 6 meses' },
  { id: 'mas_adelante', label: 'Más adelante' },
];

export const rangoPorId = (id) => PRESUPUESTOS.find((r) => r.id === (id ?? '')) ?? PRESUPUESTOS[0];
export const etiquetaTipo = (id) => TIPOS.find((t) => t.id === id)?.label ?? '—';
export const etiquetaPlazo = (id) => PLAZOS.find((p) => p.id === id)?.label ?? '—';

/** "280", "280,5" o "280.5" → número; vacío → null; texto inválido → NaN. */
export function parseArea(valor) {
  const t = String(valor ?? '').trim().replace(',', '.');
  return t === '' ? null : Number(t);
}

/** El formulario no pide título: se arma con el tipo y la ubicación (o el inicio de la idea). */
export function tituloAuto({ tipo, ubicacion, descripcion }) {
  const lugar = String(ubicacion ?? '').trim();
  const idea = String(descripcion ?? '').trim().replace(/\s+/g, ' ');
  let titulo;
  if (lugar) titulo = `${etiquetaTipo(tipo)} en ${lugar}`;
  else titulo = idea.length > 60 ? `${idea.slice(0, 60).trimEnd()}…` : idea;
  return (titulo || 'Nueva solicitud').slice(0, LIMITES.tituloMax);
}

// ── Validación (mismas reglas que validarSolicitud del backend + las del formulario) ──

/** Paso 1. Devuelve { campo: mensaje }; objeto vacío = válido. */
export function validarIdea({ tipo, descripcion }) {
  const e = {};
  if (!TIPOS.some((t) => t.id === tipo)) e.tipo = 'Elige el tipo de proyecto.';
  const d = String(descripcion ?? '').trim();
  if (!d) e.descripcion = 'Cuéntanos tu idea con tus palabras.';
  else if (d.length < LIMITES.descripcionMin) e.descripcion = `Agrega un poco más de detalle (mínimo ${LIMITES.descripcionMin} caracteres).`;
  else if (d.length > LIMITES.descripcionMax) e.descripcion = `La descripción no puede superar ${LIMITES.descripcionMax} caracteres.`;
  return e;
}

/** Paso 2. `exigirServicios:false` se usa al "Guardar y salir" (el backend los pide solo al enviar). */
export function validarDatos({ ubicacion, area, servicios }, { exigirServicios = true } = {}) {
  const e = {};
  if (String(ubicacion ?? '').trim().length > LIMITES.ubicacionMax) e.ubicacion = `La ubicación no puede superar ${LIMITES.ubicacionMax} caracteres.`;
  const a = parseArea(area);
  if (a !== null && (!Number.isFinite(a) || a <= 0)) e.area = 'Escribe un número mayor que cero (por ejemplo 120).';
  else if (a !== null && a > LIMITES.areaMax) e.area = 'El área indicada es demasiado grande.';
  if (exigirServicios && !(servicios?.length > 0)) e.servicios = 'Elige al menos un servicio.';
  return e;
}

/** Devuelve el mensaje de error o null si el archivo es válido (solo PDF, máx. 10 MB). */
export function validarArchivo(file) {
  const esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!esPdf) return `"${file.name}" no es un PDF. Por ahora solo se aceptan archivos PDF.`;
  if (file.size === 0) return `"${file.name}" está vacío.`;
  if (file.size > LIMITES.archivoBytes) return `"${file.name}" supera los 10 MB.`;
  return null;
}

/** Cuerpo JSON que espera POST/PATCH /solicitudes (nombres de columna de la BD). */
export function construirPayload(d) {
  const rango = rangoPorId(d.presupuesto);
  return {
    titulo: tituloAuto(d),
    tipo_proyecto: d.tipo,
    descripcion: String(d.descripcion).trim(),
    ubicacion: String(d.ubicacion ?? '').trim() || null,
    area_m2: parseArea(d.area),
    presupuesto_min: rango.min,
    presupuesto_max: rango.max,
    plazo_inicio: d.plazo || 'sin_definir',
    servicios: d.servicios ?? [],
  };
}

export const tamanoLegible = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;