import express from 'express';
import mysql from 'mysql2/promise';

const requiredEnvironment = [
  'MYSQL_HOST',
  'MYSQL_DATABASE',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'JWT_SECRET'
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const port = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10
});

const app = express();
app.use(express.json());

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    response.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
});

async function shutDown() {
  server.close(async (error) => {
    if (error) {
      console.error('Error closing HTTP server:', error);
      process.exitCode = 1;
    }

    try {
      await pool.end();
    } catch (poolError) {
      console.error('Error closing MySQL pool:', poolError);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
