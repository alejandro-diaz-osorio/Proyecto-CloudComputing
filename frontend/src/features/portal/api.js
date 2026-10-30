import { http } from '../../lib/http.js';

// ⚠ ÚNICO punto que depende de lib/http.js. Si tu cliente HTTP tiene otra firma, se ajusta aquí.
const get = (ruta) => http.get(ruta);
const post = (ruta, cuerpo = {}) => http.post(ruta, cuerpo);

export const moneda = new Intl.NumberFormat('es-CO');

export const PASOS = [
  { id: 'enviada', label: 'Enviada' },
  { id: 'evaluacion', label: 'En evaluación' },
  { id: 'respondida', label: 'Respondida' },
  { id: 'confirmada', label: 'Confirmada' },
];

export const ESTADOS = {
  enviada: { label: 'Enviada', tono: 'info' },
  evaluacion: { label: 'En evaluación', tono: 'warn' },
  respondida: { label: 'Respondida', tono: 'accent' },
  confirmada: { label: 'Confirmada', tono: 'ok' },
};

// ── Mapeo de respuestas del backend (⚠ nombres de campo supuestos) ───────────
const lista = (r) => (Array.isArray(r) ? r : r?.data ?? r?.solicitudes ?? r?.cotizaciones ?? []);

const ALIAS_ESTADO = {
  borrador: 'borrador',
  enviada: 'enviada',
  en_evaluacion: 'evaluacion',
  evaluacion: 'evaluacion',
  en_proceso: 'evaluacion',
  respondida: 'respondida',
  confirmada: 'confirmada',
};
const estadoDe = (v) =>
  ALIAS_ESTADO[String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_')] ?? 'enviada';

const fmtFecha = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(d)
        .replace(/\./g, '');
};

function presupuesto(s) {
  if (typeof s.presupuesto === 'string' && s.presupuesto) return s.presupuesto;
  const min = Number(s.presupuesto_min);
  const max = Number(s.presupuesto_max);
  if (!min && !max) return '—';
  if (min >= 1e6 && max >= 1e6) return `$${+(min / 1e6).toFixed(1)} - ${+(max / 1e6).toFixed(1)} M`;
  return `$${moneda.format(min)} - $${moneda.format(max)}`;
}

function mapSolicitud(s) {
  const creada = s.fecha_envio ?? s.enviada_en ?? s.created_at ?? s.fecha_creacion;
  const area = s.area_m2 ?? s.area;
  return {
    id: s.id,
    codigo: s.codigo ?? `SOL-${String(s.id).padStart(4, '0')}`,
    titulo: s.titulo ?? s.nombre_proyecto ?? s.nombre ?? 'Proyecto sin nombre',
    ubicacion: s.ubicacion ?? ([s.ciudad, s.departamento].filter(Boolean).join(', ') || '—'),
    servicio: s.servicio_nombre ?? s.servicio?.nombre ?? (typeof s.servicio === 'string' ? s.servicio : '—'),
    area: area ? `${area} m²` : '—',
    presupuesto: presupuesto(s),
    estado: estadoDe(s.estado),
    fecha: fmtFecha(creada),
    creada: Date.parse(creada) || null,
    orden: Date.parse(creada) || Number(s.id) || 0,
  };
}

function mapCotizacion(c) {
  return {
    id: c.id,
    estado: String(c.estado ?? '').toLowerCase(),
    version: Number(c.version ?? 1),
    valor: Number(c.valor_total ?? c.valor ?? c.total ?? 0),
    vigencia: c.vigencia_dias ?? null,
    descripcion: c.descripcion ?? c.alcance ?? c.observaciones ?? '',
  };
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** Solicitudes del cliente (sin borradores), de la más reciente a la más antigua. */
export async function listarMisSolicitudes() {
  const filas = lista(await get('/solicitudes/mias')).map(mapSolicitud);
  return filas.filter((s) => s.estado !== 'borrador').sort((a, b) => b.orden - a.orden);
}

/** Última versión de cotización enviada/confirmada de una solicitud (o null). */
export async function cotizacionVigente(solicitudId) {
  const filas = lista(await get(`/cotizaciones/solicitud/${solicitudId}`))
    .map(mapCotizacion)
    .filter((c) => c.estado !== 'borrador');
  return filas.sort((a, b) => b.version - a.version || Number(b.id) - Number(a.id))[0] ?? null;
}

export const confirmarCotizacion = (cotizacionId) => post(`/cotizaciones/${cotizacionId}/confirmar`);