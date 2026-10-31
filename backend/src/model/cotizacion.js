const { query, transaction } = require('./conexion');
const { ErrorDeNegocio } = require('../utils/manejarError');
const Solicitud = require('./solicitud');

const Cotizacion = {

  // Todas las versiones de una solicitud, la más reciente primero
  findBySolicitud: async (solicitudId) => {
    return await query(
      `SELECT c.*, CONCAT(u.nombre, ' ', u.apellido) AS creada_por_nombre,
              a.nombre_original AS archivo_nombre
         FROM cotizaciones c
         JOIN usuarios u ON u.id = c.creada_por
         LEFT JOIN archivos a ON a.id = c.archivo_id
        WHERE c.solicitud_id = ?
        ORDER BY c.version DESC`,
      [solicitudId]
    );
  },

  findById: async (id, db) => {
    const result = await query('SELECT * FROM cotizaciones WHERE id = ?', [id], db);
    return result.length > 0 ? result[0] : null;
  },

  // La que el cliente puede ver y confirmar (solo existe una por solicitud)
  findVigente: async (solicitudId) => {
    const result = await query("SELECT * FROM cotizaciones WHERE solicitud_id = ? AND estado = 'vigente'", [solicitudId]);
    return result.length > 0 ? result[0] : null;
  },

  // Nueva versión en borrador (1, 2, 3…). Nunca sobrescribe la anterior.
  nuevaVersion: async (solicitudId, creadaPor, { titulo, valor, moneda, iva_incluido, vigencia_dias, mensaje, archivo_id }) => {
    return await transaction(async (conn) => {
      const max = await query('SELECT COALESCE(MAX(version), 0) AS v FROM cotizaciones WHERE solicitud_id = ?', [solicitudId], conn);
      const version = max[0].v + 1;
      const result = await query(
        `INSERT INTO cotizaciones (solicitud_id, version, creada_por, titulo, valor, moneda, iva_incluido, vigencia_dias, mensaje, archivo_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [solicitudId, version, creadaPor, titulo || 'Propuesta comercial', valor, moneda || 'COP',
         iva_incluido === undefined ? 1 : (iva_incluido ? 1 : 0), vigencia_dias || 30, mensaje ?? null, archivo_id ?? null],
        conn
      );
      return { id: result.insertId, version };
    });
  },

  // Solo se edita mientras está en borrador
  update: async (id, { titulo, valor, moneda, iva_incluido, vigencia_dias, mensaje, archivo_id }) => {
    const result = await query(
      `UPDATE cotizaciones SET titulo = ?, valor = ?, moneda = ?, iva_incluido = ?, vigencia_dias = ?, mensaje = ?, archivo_id = ?
        WHERE id = ? AND estado = 'borrador'`,
      [titulo, valor, moneda || 'COP', iva_incluido ? 1 : 0, vigencia_dias || 30, mensaje ?? null, archivo_id ?? null, id]
    );
    if (result.affectedRows === 0) throw new ErrorDeNegocio('Solo se puede editar una cotización en borrador', 409);
    return result;
  },

  /**
   * Envía la cotización al cliente: la anterior vigente pasa a 'reemplazada', esta pasa a
   * 'vigente' (calcula vence_en) y la solicitud pasa a 'respondida'.
   */
  enviar: async (id, usuarioId) => {
    return await transaction(async (conn) => {
      const filas = await query('SELECT * FROM cotizaciones WHERE id = ? FOR UPDATE', [id], conn);
      const cot = filas[0];
      if (!cot) throw new ErrorDeNegocio('Cotización no encontrada', 404);
      if (cot.estado !== 'borrador') throw new ErrorDeNegocio('Solo se puede enviar una cotización en borrador', 409);

      // Primero se libera la vigente anterior (índice único uq_cot_una_vigente)
      await query("UPDATE cotizaciones SET estado = 'reemplazada' WHERE solicitud_id = ? AND estado = 'vigente'", [cot.solicitud_id], conn);
      await query(
        `UPDATE cotizaciones
            SET estado = 'vigente', enviada_en = NOW(), vence_en = DATE_ADD(CURDATE(), INTERVAL vigencia_dias DAY)
          WHERE id = ?`,
        [id], conn
      );

      const solicitud = await Solicitud.findById(cot.solicitud_id, conn);
      if (solicitud.estado === 'en_evaluacion') {
        await Solicitud.cambiarEstado(solicitud.id, 'respondida', usuarioId, { nota: `Cotización v${cot.version} enviada`, conn });
      }
      return await Cotizacion.findById(id, conn);
    });
  },

  /**
   * El cliente acepta la propuesta vigente. (El controlador debe verificar antes
   * que req.usuario.id sea el cliente de la solicitud.)
   */
  confirmar: async (id, usuarioId) => {
    return await transaction(async (conn) => {
      const filas = await query('SELECT * FROM cotizaciones WHERE id = ? FOR UPDATE', [id], conn);
      const cot = filas[0];
      if (!cot) throw new ErrorDeNegocio('Cotización no encontrada', 404);
      if (cot.estado !== 'vigente') throw new ErrorDeNegocio('Solo se puede confirmar la cotización vigente', 409);

      const vencida = await query('SELECT (vence_en IS NOT NULL AND vence_en < CURDATE()) AS vencida FROM cotizaciones WHERE id = ?', [id], conn);
      if (vencida[0].vencida) throw new ErrorDeNegocio('La cotización está vencida', 409);

      await query("UPDATE cotizaciones SET estado = 'confirmada', confirmada_en = NOW() WHERE id = ?", [id], conn);
      await Solicitud.cambiarEstado(cot.solicitud_id, 'confirmada', usuarioId, { nota: `Cotización v${cot.version} confirmada`, conn });
      return await Cotizacion.findById(id, conn);
    });
  },

  // Solo se borran borradores (lo enviado queda como constancia)
  eliminarBorrador: async (id) => {
    const result = await query("DELETE FROM cotizaciones WHERE id = ? AND estado = 'borrador'", [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Cotizacion;