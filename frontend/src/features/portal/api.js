import { http } from '../../lib/http.js';

// ⚠ ÚNICO punto que depende de lib/http.js. Si tu cliente HTTP tiene otra firma, se ajusta aquí.
const get = (ruta) => http.get(ruta);
const post = (ruta, cuerpo = {}) => http.post(ruta, cuerpo);
const patch = (ruta, cuerpo = {}) => http.patch(ruta, cuerpo);
const del = (ruta) => http.delete(ruta);

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

// ── Mapeo de respuestas del backend ─────────────────────────────────────────

const lista = (r) =>
  Array.isArray(r)
    ? r
    : r?.data ?? r?.solicitudes ?? r?.cotizaciones ?? [];

// ── Estados ──────────────────────────────────────────────────────────────────

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
  ALIAS_ESTADO[
    String(v ?? '')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_')
  ] ?? 'enviada';

// ── Formato de fecha ─────────────────────────────────────────────────────────

const fmtFecha = (v) => {
  const d = new Date(v);

  return Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
        .format(d)
        .replace(/\./g, '');
};

// ── Servicios ────────────────────────────────────────────────────────────────

// El servicio puede llegar como:
// "Diseño arquitectónico"
// o como:
// [{ id, nombre }]
function serviciosTexto(v) {
  if (Array.isArray(v)) {
    return (
      v
        .map((x) => (typeof x === 'string' ? x : x?.nombre))
        .filter(Boolean)
        .join(', ') || '—'
    );
  }

  return typeof v === 'string' && v.trim() ? v : '—';
}

// ── Datos del cliente ────────────────────────────────────────────────────────

// ⚠ Depende de que el backend una la solicitud con `usuarios`.
function datosCliente(s) {
  const c =
    s.cliente && typeof s.cliente === 'object'
      ? s.cliente
      : {};

  const nombre = [
    s.cliente_nombre ?? c.nombre,
    s.cliente_apellido ?? c.apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    cliente:
      nombre ||
      (typeof s.cliente === 'string' ? s.cliente : '') ||
      s.nombre_cliente ||
      null,

    clienteEmail:
      s.cliente_email ??
      c.email ??
      s.email_cliente ??
      '',
  };
}

// ── Archivos ─────────────────────────────────────────────────────────────────

const fmtBytes = (n) => {
  const b = Number(n);

  if (!Number.isFinite(b) || b <= 0) {
    return '';
  }

  const f = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 1,
  });

  return b >= 1048576
    ? `${f.format(b / 1048576)} MB`
    : `${f.format(Math.max(b / 1024, 0.1))} KB`;
};

// ── Presupuesto ──────────────────────────────────────────────────────────────

function presupuesto(s) {
  const tieneMin =
    s.presupuesto_min !== null &&
    s.presupuesto_min !== undefined;

  const tieneMax =
    s.presupuesto_max !== null &&
    s.presupuesto_max !== undefined;

  const formato = (valor) =>
    `$${moneda.format(Number(valor))}`;

  if (!tieneMin && !tieneMax) {
    return '—';
  }

  if (!tieneMin) {
    return `Hasta ${formato(s.presupuesto_max)}`;
  }

  if (!tieneMax) {
    return `Desde ${formato(s.presupuesto_min)}`;
  }

  return `${formato(s.presupuesto_min)} - ${formato(s.presupuesto_max)}`;
}

// ── Tipos de proyecto ────────────────────────────────────────────────────────

const TIPOS_PROYECTO = {
  vivienda: 'Vivienda',
  comercial: 'Comercial',
  otro: 'Otro',
};

// ── Plazos ───────────────────────────────────────────────────────────────────

const PLAZOS_INICIO = {
  proximo_mes: 'Próximo mes',
  proximos_3_meses: 'Próximos 3 meses',
  proximos_6_meses: 'Próximos 6 meses',
  mas_adelante: 'Más adelante',
  sin_definir: 'Sin definir',
};

// ── Mapear solicitud ─────────────────────────────────────────────────────────

function mapSolicitud(s) {
  const creada =
    s.fecha_envio ??
    s.enviada_en ??
    s.created_at ??
    s.fecha_creacion;

  const area = s.area_m2;

  return {
    id: s.id,

    codigo:
      s.codigo ??
      `SOL-${String(s.id).padStart(4, '0')}`,

    titulo:
      s.titulo ??
      s.nombre_proyecto ??
      s.nombre ??
      'Proyecto sin nombre',

    tipoProyecto:
      TIPOS_PROYECTO[s.tipo_proyecto] ??
      s.tipo_proyecto ??
      '—',

    descripcion:
      s.descripcion ??
      '—',

    ubicacion:
      s.ubicacion ??
      '—',

    servicio: serviciosTexto(
      s.servicios ??
      s.servicio_nombre ??
      s.servicio?.nombre ??
      s.servicio
    ),

    clienteId:
      s.cliente_id ??
      null,

    ...datosCliente(s),

    area:
      area !== null && area !== undefined
        ? `${moneda.format(Number(area))} m²`
        : '—',

    presupuesto:
      presupuesto(s),

    plazoInicio:
      PLAZOS_INICIO[s.plazo_inicio] ??
      s.plazo_inicio ??
      '—',

    estado:
      estadoDe(s.estado),

    fecha:
      fmtFecha(creada),

    creada:
      Date.parse(creada) || null,

    orden:
      Date.parse(creada) ||
      Number(s.id) ||
      0,
  };
}

// ── Mapear cotización ────────────────────────────────────────────────────────

function mapCotizacion(c) {
  return {
    id: c.id,

    estado:
      String(c.estado ?? '').toLowerCase(),

    version:
      Number(c.version ?? 1),

    titulo:
      c.titulo ??
      'Propuesta comercial',

    valor:
      Number(c.valor),

    moneda:
      c.moneda ??
      'COP',

    vigencia:
      c.vigencia_dias ??
      null,

    descripcion:
      c.mensaje ??
      '',
  };
}

// ── Mapear archivo ───────────────────────────────────────────────────────────

function mapArchivo(a) {
  return {
    id: a.id,

    nombre:
      a.nombre_original ??
      a.nombre ??
      'Archivo',

    categoria:
      String(a.categoria ?? 'referencia').toLowerCase(),

    tamano:
      fmtBytes(a.tamano_bytes),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// ── Solicitudes del cliente ──────────────────────────────────────────────────

/**
 * Solicitudes del cliente (sin borradores),
 * de la más reciente a la más antigua.
 */
export async function listarMisSolicitudes() {
  const filas = lista(
    await get('/solicitudes/mias')
  ).map(mapSolicitud);

  return filas
    .filter((s) => s.estado !== 'borrador')
    .sort((a, b) => b.orden - a.orden);
}

// ── Cotizaciones ─────────────────────────────────────────────────────────────

/**
 * Última versión de cotización enviada/confirmada
 * de una solicitud (o null).
 */
export async function cotizacionVigente(solicitudId) {
  const filas = lista(
    await get(`/cotizaciones/solicitud/${solicitudId}`)
  )
    .map(mapCotizacion)
    .filter((c) => c.estado !== 'borrador');

  return (
    filas.sort(
      (a, b) =>
        b.version - a.version ||
        Number(b.id) - Number(a.id)
    )[0] ?? null
  );
}

/**
 * Confirma una cotización.
 */
export const confirmarCotizacion = (cotizacionId) =>
  post(`/cotizaciones/${cotizacionId}/confirmar`);

// ═════════════════════════════════════════════════════════════════════════════
// NUEVA SOLICITUD — "CUÉNTANOS SOBRE TU PROYECTO"
// ═════════════════════════════════════════════════════════════════════════════

// ── Servicios disponibles ────────────────────────────────────────────────────

/**
 * Catálogo público de servicios activos.
 *
 * Devuelve:
 * [
 *   { id, nombre }
 * ]
 */
export const listarServicios = async () =>
  lista(
    await get('/public/servicios')
  );

// ── Crear borrador ───────────────────────────────────────────────────────────

/**
 * Crea una nueva solicitud en estado borrador.
 *
 * Devuelve:
 * { mensaje, id, codigo }
 */
export const crearBorrador = (datos) =>
  post('/solicitudes', datos);

// ── Actualizar borrador ──────────────────────────────────────────────────────

/**
 * Actualiza una solicitud que todavía está en borrador.
 *
 * El backend exige el cuerpo completo.
 */
export const actualizarBorrador = (id, datos) =>
  patch(`/solicitudes/${id}`, datos);

// ── Enviar solicitud ─────────────────────────────────────────────────────────

/**
 * Cambia una solicitud de:
 *
 * borrador → enviada
 *
 * Devuelve:
 * { mensaje, codigo }
 */
export const enviarSolicitud = (id) =>
  post(`/solicitudes/${id}/enviar`);

// ── Subir archivo ────────────────────────────────────────────────────────────

/**
 * Adjunta un PDF a una solicitud.
 *
 * Campo multipart:
 * "archivo"
 */
export function subirArchivo(solicitudId, file) {
  const datos = new FormData();

  datos.append('archivo', file);

  return http.post(
    `/archivos/solicitud/${solicitudId}`,
    datos
  );
}

// ── Eliminar archivo ─────────────────────────────────────────────────────────

export const eliminarArchivo = (archivoId) =>
  del(`/archivos/${archivoId}`);

// ═════════════════════════════════════════════════════════════════════════════
// ADMINISTRACIÓN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Todas las solicitudes enviadas (sin borradores),
 * de la más reciente a la más antigua.
 */
export async function listarSolicitudesAdmin() {
  const filas = lista(
    await get('/solicitudes')
  ).map(mapSolicitud);

  return filas
    .filter((s) => s.estado !== 'borrador')
    .sort((a, b) => b.orden - a.orden);
}

/**
 * Detalle de una solicitud:
 *
 * - Datos de la solicitud
 * - Cliente
 * - Archivos
 * - Última cotización
 */
export async function detalleSolicitudAdmin(id) {
  const r = await get(`/solicitudes/${id}`);

  const cotizaciones = (
    r?.cotizaciones ?? []
  )
    .map(mapCotizacion)
    .sort(
      (a, b) =>
        b.version - a.version ||
        Number(b.id) - Number(a.id)
    );

  return {
    ...mapSolicitud(r),

    archivos:
      (r?.archivos ?? [])
        .map(mapArchivo),

    cotizacion:
      cotizaciones[0] ?? null,
  };
}