const { query } = require('./conexion');
const { TRANSICIONES } = require('../utils/constants');
const { ErrorDeNegocio } = require('../utils/errors');
const Usuario = require('./usuario');
const HistorialEstado = require('./historialEstado');
const Notificacion = require('./notificacion');

// Base de las listas: solicitud + nombre del cliente + arquitecta + servicios en texto
const SELECT_LISTA = `
  SELECT s.id, s.codigo, s.titulo, s.tipo_proyecto, s.descripcion, s.ubicacion,
         s.area_m2, s.presupuesto_min, s.presupuesto_max, s.plazo_inicio,
         s.estado, s.enviada_en, s.created_at,
         s.cliente_id,    CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre,
         s.arquitecto_id, CONCAT(a.nombre, ' ', a.apellido) AS arquitecto_nombre,
         (SELECT GROUP_CONCAT(sv.nombre ORDER BY sv.nombre SEPARATOR ', ')
            FROM solicitud_servicios ss
            JOIN servicios sv ON sv.id = ss.servicio_id
           WHERE ss.solicitud_id = s.id) AS servicios
    FROM solicitudes s
    JOIN usuarios c ON c.id = s.cliente_id
    LEFT JOIN usuarios a ON a.id = s.arquitecto_id`;

// Avisos que se generan en cada cambio de estado
const notificarCambio = async (s, nuevo, db) => {
  const cod = s.codigo || `#${s.id}`;
  if (nuevo === 'enviada') {
    const admins = await Usuario.findAdmins(db);
    await Notificacion.createMany(
      admins.map((a) => ({ usuario_id: a.id, solicitud_id: s.id, tipo: 'solicitud_nueva', texto: `Nueva solicitud ${cod}: ${s.titulo}` })),
      db
    );
  } else if (nuevo === 'en_evaluacion') {
    await Notificacion.create({ usuario_id: s.cliente_id, solicitud_id: s.id, tipo: 'solicitud_asignada', texto: `Tu solicitud ${cod} está siendo evaluada` }, db);
  } else if (nuevo === 'respondida') {
    await Notificacion.create({ usuario_id: s.cliente_id, solicitud_id: s.id, tipo: 'cotizacion_lista', texto: `Tu cotización de ${cod} está lista` }, db);
  } else if (nuevo === 'confirmada' && s.arquitecto_id) {
    await Notificacion.create({ usuario_id: s.arquitecto_id, solicitud_id: s.id, tipo: 'cotizacion_confirmada', texto: `El cliente confirmó la cotización de ${cod}` }, db);
  }
};

const Solicitud = {

  // Panel de la administradora: todo menos borradores. Filtros opcionales.
  findAll: async ({ estado = null, arquitecto_id = null } = {}) => {
    let sql = `${SELECT_LISTA} WHERE s.estado <> 'borrador'`;
    const values = [];
    if (estado) { sql += ' AND s.estado = ?'; values.push(estado); }
    if (arquitecto_id) { sql += ' AND s.arquitecto_id = ?'; values.push(arquitecto_id); }
    return await query(`${sql} ORDER BY s.enviada_en DESC`, values);
  },

  // Seguimiento del cliente: sin borradores (salvo que se pidan, ej. para retomar el formulario)
  findByCliente: async (clienteId, { incluirBorradores = false } = {}) => {
    let sql = `${SELECT_LISTA} WHERE s.cliente_id = ?`;
    if (!incluirBorradores) sql += " AND s.estado <> 'borrador'";
    return await query(`${sql} ORDER BY COALESCE(s.enviada_en, s.created_at) DESC`, [clienteId]);
  },

  findById: async (id, db) => {
    const result = await query(
      `SELECT s.*,
              CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre, c.email AS cliente_email, c.telefono AS cliente_telefono,
              CONCAT(a.nombre, ' ', a.apellido) AS arquitecto_nombre
         FROM solicitudes s
         JOIN usuarios c ON c.id = s.cliente_id
         LEFT JOIN usuarios a ON a.id = s.arquitecto_id
        WHERE s.id = ?`,
      [id], db
    );
    return result.length > 0 ? result[0] : null;
  },

  findByCodigo: async (codigo) => {
    const result = await query('SELECT * FROM solicitudes WHERE codigo = ?', [codigo]);
    return result.length > 0 ? result[0] : null;
  },

  getServicios: async (solicitudId) => {
    return await query(
      `SELECT sv.id, sv.nombre
         FROM solicitud_servicios ss JOIN servicios sv ON sv.id = ss.servicio_id
        WHERE ss.solicitud_id = ? ORDER BY sv.id`,
      [solicitudId]
    );
  },

  // Contadores del panel admin (ej. la burbuja "Nuevas")
  contarPorEstado: async () => {
    return await query(`SELECT estado, COUNT(*) AS total FROM solicitudes WHERE estado <> 'borrador' GROUP BY estado`);
  },

  // Reemplaza los servicios de la solicitud (tabla puente solicitud_servicios)
  setServicios: async (solicitudId, servicioIds, db) => {
    await query('DELETE FROM solicitud_servicios WHERE solicitud_id = ?', [solicitudId], db);
    if (!servicioIds || !servicioIds.length) return;
    const filas = [...new Set(servicioIds)].map((sid) => [solicitudId, sid]);
    await query('INSERT INTO solicitud_servicios (solicitud_id, servicio_id) VALUES ?', [filas], db);
  },

  /**
   * Crea la solicitud en borrador, le asigna el código SOL-0000, guarda sus servicios
   * y registra el primer cambio en el historial. Todo o nada (transacción).
   */
  crearConCodigo: async (datos, servicioIds = []) => {
    return await transaction(async (conn) => {
      if (!(await Usuario.tieneRol(datos.cliente_id, 'cliente', conn))) {
        throw new ErrorDeNegocio('cliente_id debe ser un usuario activo con rol cliente');
      }
      const result = await query(
        `INSERT INTO solicitudes
           (cliente_id, titulo, tipo_proyecto, descripcion, descripcion_ia, usar_version_ia,
            ubicacion, area_m2, presupuesto_min, presupuesto_max, plazo_inicio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [datos.cliente_id, datos.titulo, datos.tipo_proyecto, datos.descripcion, datos.descripcion_ia ?? null,
         datos.usar_version_ia ? 1 : 0, datos.ubicacion ?? null, datos.area_m2 ?? null,
         datos.presupuesto_min ?? null, datos.presupuesto_max ?? null, datos.plazo_inicio ?? null],
        conn
      );
      const id = result.insertId;
      const codigo = `SOL-${String(id).padStart(4, '0')}`;
      await query('UPDATE solicitudes SET codigo = ? WHERE id = ?', [codigo, id], conn);
      await Solicitud.setServicios(id, servicioIds, conn);
      await HistorialEstado.create(
        { solicitud_id: id, estado_anterior: null, estado_nuevo: 'borrador', cambiado_por: datos.cliente_id, nota: 'Solicitud creada' },
        conn
      );
      return { id, codigo };
    });
  },

  // Solo se edita mientras sea borrador (el wizard de 4 pasos)
  update: async (id, datos, servicioIds = null) => {
    return await transaction(async (conn) => {
      const result = await query(
        `UPDATE solicitudes SET titulo = ?, tipo_proyecto = ?, descripcion = ?, descripcion_ia = ?, usar_version_ia = ?,
                ubicacion = ?, area_m2 = ?, presupuesto_min = ?, presupuesto_max = ?, plazo_inicio = ?
          WHERE id = ? AND estado = 'borrador'`,
        [datos.titulo, datos.tipo_proyecto, datos.descripcion, datos.descripcion_ia ?? null, datos.usar_version_ia ? 1 : 0,
         datos.ubicacion ?? null, datos.area_m2 ?? null, datos.presupuesto_min ?? null, datos.presupuesto_max ?? null,
         datos.plazo_inicio ?? null, id],
        conn
      );
      if (result.affectedRows === 0) throw new ErrorDeNegocio('Solo se pueden editar solicitudes en borrador', 409);
      if (servicioIds) await Solicitud.setServicios(id, servicioIds, conn);
      return result;
    });
  },

  /**
   * Cambia el estado validando la transición permitida, registra el historial
   * y genera las notificaciones. Si pasa a 'en_evaluacion', la administradora que
   * lo hace queda como responsable. `conn` permite usarlo dentro de otra transacción.
   */
  cambiarEstado: async (id, nuevo, usuarioId, { nota = null, conn = null } = {}) => {
    return await transaction(async (c) => {
      const filas = await query('SELECT * FROM solicitudes WHERE id = ? FOR UPDATE', [id], c);
      const s = filas[0];
      if (!s) throw new ErrorDeNegocio('Solicitud no encontrada', 404);

      if (!(TRANSICIONES[s.estado] || []).includes(nuevo)) {
        throw new ErrorDeNegocio(`Transición no permitida: ${s.estado} → ${nuevo}`, 409);
      }
      if (nuevo === 'en_evaluacion' && !s.arquitecto_id && !(await Usuario.tieneRol(usuarioId, 'admin', c))) {
        throw new ErrorDeNegocio('Solo una administradora puede tomar la solicitud', 403);
      }

      await query(
        `UPDATE solicitudes
            SET estado = ?,
                enviada_en    = IF(? = 'enviada', NOW(), enviada_en),
                arquitecto_id = IF(? = 'en_evaluacion', COALESCE(arquitecto_id, ?), arquitecto_id)
          WHERE id = ?`,
        [nuevo, nuevo, nuevo, usuarioId, id],
        c
      );
      await HistorialEstado.create(
        { solicitud_id: id, estado_anterior: s.estado, estado_nuevo: nuevo, cambiado_por: usuarioId, nota },
        c
      );
      const actualizada = await Solicitud.findById(id, c);
      await notificarCambio(actualizada, nuevo, c);
      return actualizada;
    }, conn);
  },

  // El cliente solo puede borrar sus borradores. Al borrar, la BD elimina en cascada lo asociado.
  eliminarBorrador: async (id, clienteId) => {
    const result = await query("DELETE FROM solicitudes WHERE id = ? AND cliente_id = ? AND estado = 'borrador'", [id, clienteId]);
    return result.affectedRows > 0;
  },
};

module.exports = Solicitud;