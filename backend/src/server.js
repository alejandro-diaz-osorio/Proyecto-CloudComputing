require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv(); // si falta una variable crítica, el proceso se detiene aquí

const express     = require('express');
const helmet      = require('helmet');
const compression = require('compression');
const cors        = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');

const corsOptions  = require('./config/corsOptions');
const credentials  = require('./middleware/credentials');
const { logger }   = require('./middleware/logEvents');
const verifyJWT    = require('./middleware/verifyJWT');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { pool, conectar } = require('./model/conexion');

const app = express();

// ── Proxy (nginx del frontend está delante del backend) ───────
app.set('trust proxy', 1);

// ── Middlewares globales ──────────────────────────────────────
// credentials DEBE ir antes de cors para poder añadir el header
app.use(credentials);
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(logger);

// ── Router principal: todo cuelga de /api (nginx hace proxy /api → :3000) ──
const api = express.Router();

// Límite de intentos en login/registro (evita fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

// ── Rutas públicas ────────────────────────────────────────────
api.get('/health', async (_req, res) => {      // lo usa Docker / el proveedor cloud
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});
api.use('/auth',   authLimiter, require('./routes/auth'));   // login, registro
api.use('/public', require('./routes/public'));              // catálogo de servicios para el formulario

// ── Rutas protegidas (requieren JWT) ──────────────────────────
api.use(verifyJWT);

api.use('/usuarios',       require('./routes/usuarios'));
api.use('/servicios',      require('./routes/servicios'));
api.use('/solicitudes',    require('./routes/solicitudes'));
api.use('/cotizaciones',   require('./routes/cotizaciones'));
api.use('/archivos',       require('./routes/archivos'));
api.use('/mensajes',       require('./routes/mensajes'));
api.use('/notificaciones', require('./routes/notificaciones'));

app.use('/api', api);

// ── 404 y manejo de errores (siempre al final) ────────────────
app.use(notFound);
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
let server;

conectar()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`✔ API SOLUCIA escuchando en :${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  })
  .catch((err) => {
    console.error('✖ No se pudo iniciar:', err.message);
    process.exit(1);
  });

// ── Graceful Shutdown ─────────────────────────────────────────
function apagar(senal) {
  console.log(`${senal} recibido: cerrando servidor HTTP`);
  const cerrarBD = async () => {
    await pool.end();
    console.log('Conexión MySQL cerrada');
    process.exit(0);
  };
  if (server) server.close(cerrarBD); else cerrarBD();
  setTimeout(() => process.exit(1), 10000).unref(); // si algo se cuelga, forzar salida
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT',  () => apagar('SIGINT'));

module.exports = app;