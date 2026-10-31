import { http } from '../../lib/http.js';

// ── Cliente HTTP ──────────────────────────────────────────────────────────────

const get = (ruta) => http.get(ruta);
const post = (ruta, cuerpo = {}) => http.post(ruta, cuerpo);
const patch = (ruta, cuerpo = {}) => http.patch(ruta, cuerpo);
const del = (ruta) => http.delete(ruta);

export const moneda = new Intl.NumberFormat('es-CO');

// ── Estados ──────────────────────────────────────────────────────────────────

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

// ── Mapeo de respuestas del backend ──────────────────────────────────────────

const lista = (r) =>
  Array.isArray(r)
    ? r
    : r?.data ?? r?.solicitudes ?? r?.cotizaciones ?? [];

// ── Alias de estados ─────────────────────────────────────────────────────────

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

// ── Formato de fechas ────────────────────────────────────────────────────────

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

// Fechas sin alterar el día por zona horaria.

const fmtFechaDia = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''));

  if (!m) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .replace(/\./g, '');
};

// ── Servicios ────────────────────────────────────────────────────────────────

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

    ivaIncluido:
      c.iva_incluido == null
        ? null
        : Boolean(c.iva_incluido),

    descripcion:
      c.mensaje ??
      '',

    archivoId:
      c.archivo_id ??
      null,

    archivoNombre:
      c.archivo_nombre ??
      null,

    enviada:
      c.enviada_en
        ? fmtFecha(c.enviada_en)
        : '',

    vence:
      fmtFechaDia(c.vence_en),
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
// SOLICITUDES DEL CLIENTE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lista las solicitudes del cliente.
 * Excluye borradores.
 */
export async function listarMisSolicitudes() {
  const filas = lista(
    await get('/solicitudes/mias')
  ).map(mapSolicitud);

  return filas
    .filter((s) => s.estado !== 'borrador')
    .sort((a, b) => b.orden - a.orden);
}

// ═════════════════════════════════════════════════════════════════════════════
// COTIZACIONES DEL CLIENTE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la última cotización enviada o confirmada.
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
// NUEVA SOLICITUD
// ═════════════════════════════════════════════════════════════════════════════

// ── Servicios disponibles ────────────────────────────────────────────────────

export const listarServicios = async () =>
  lista(
    await get('/public/servicios')
  );

// ── Crear borrador ───────────────────────────────────────────────────────────

export const crearBorrador = (datos) =>
  post('/solicitudes', datos);

// ── Actualizar borrador ──────────────────────────────────────────────────────

export const actualizarBorrador = (id, datos) =>
  patch(`/solicitudes/${id}`, datos);

// ── Enviar solicitud ─────────────────────────────────────────────────────────

export const enviarSolicitud = (id) =>
  post(`/solicitudes/${id}/enviar`);

// ── Subir archivo de solicitud ───────────────────────────────────────────────

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
// ADMINISTRACIÓN DE SOLICITUDES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lista todas las solicitudes enviadas.
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
 * Detalle de una solicitud: sus datos, sus archivos, la última cotización ya
 * enviada (`cotizacion`, o null) y el borrador en preparación (`borrador`, o null).
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
      cotizaciones.find((c) => c.estado !== 'borrador') ?? null,

    borrador:
      cotizaciones.find((c) => c.estado === 'borrador') ?? null,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE SOLICITUDES Y COTIZACIONES — ADMINISTRACIÓN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * La administradora toma una solicitud.
 * enviada → en_evaluacion
 */
export const tomarSolicitud = (id) =>
  post(`/solicitudes/${id}/tomar`);

/**
 * Sube el PDF de la propuesta comercial (campo multipart "archivo").
 * Los campos de texto van antes del archivo.
 */
export function subirPropuestaPdf(solicitudId, archivo) {
  const datos = new FormData();

  datos.append('categoria', 'cotizacion');
  datos.append('archivo', archivo);

  return http.post(
    `/archivos/solicitud/${solicitudId}`,
    datos
  );
}

/**
 * Crea una nueva versión de cotización en borrador → { id, version }.
 * POST /cotizaciones/solicitud/:solicitudId
 */
export const crearCotizacion = (solicitudId, datos) =>
  post(`/cotizaciones/solicitud/${solicitudId}`, datos);

/**
 * Edita un borrador. El backend reescribe todos los campos,
 * por eso `archivo_id` debe enviarse siempre.
 */
export const actualizarCotizacion = (id, datos) =>
  patch(`/cotizaciones/${id}`, datos);

/**
 * Envía la cotización al cliente:
 * borrador → vigente, calcula vence_en y la solicitud pasa a "respondida".
 */
export const enviarCotizacion = (id) =>
  post(`/cotizaciones/${id}/enviar`);

/**
 * Descarga un archivo con la sesión activa
 * (GET /archivos/:id/descargar exige Bearer, no sirve un enlace simple).
 * @param {{ id: number|string, nombre: string }} archivo
 */
export async function descargarArchivo(archivo) {
  const blob = await http.get(`/archivos/${archivo.id}/descargar`, {
    blob: true,
    headers: { Accept: '*/*' },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = archivo.nombre || 'archivo';
  document.body.append(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}