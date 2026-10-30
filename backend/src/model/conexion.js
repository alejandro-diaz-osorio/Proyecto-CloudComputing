require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de conexiones MySQL. Las credenciales vienen del .env / docker-compose.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',          // fechas en UTC (igual que el CURRENT_TIMESTAMP de MySQL en Docker)
  decimalNumbers: true,   // DECIMAL llega como número y no como string
  dateStrings: ['DATE'],  // vence_en llega como '2026-11-29' (sin hora ni zona)
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * Ejecuta una consulta y devuelve las filas (SELECT) o el resultado (INSERT/UPDATE/DELETE,
 * con insertId y affectedRows). `db` permite reutilizar una conexión de transacción.
 */
const query = async (sql, params = [], db = pool) => {
  const [resultado] = await db.query(sql, params);
  return resultado;
};

/**
 * Ejecuta fn(conn) dentro de una transacción: hace COMMIT si todo sale bien
 * y ROLLBACK si algo falla. Si ya recibes una conexión (conn), la reutiliza.
 */
const transaction = async (fn, conn = null) => {
  if (conn) return fn(conn);
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const resultado = await fn(c);
    await c.commit();
    return resultado;
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
};

// Espera a que MySQL esté listo (en Docker tarda unos segundos en arrancar).
const conectar = async (reintentos = 10, esperaMs = 3000) => {
  for (let i = 1; i <= reintentos; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✔ Conectado a MySQL');
      return;
    } catch (err) {
      console.log(`MySQL no disponible (intento ${i}/${reintentos}): ${err.message}`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
  throw new Error('No se pudo conectar a la base de datos');
};

module.exports = { pool, query, transaction, conectar };