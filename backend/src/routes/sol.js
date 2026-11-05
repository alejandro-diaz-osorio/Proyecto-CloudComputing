const express = require('express');
const rateLimit = require('express-rate-limit');
const solController = require('../controllers/solController');

const router = express.Router();

// Protege el costo del modelo: máx. 12 consultas por minuto
const limitador = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Has consultado a Sol muchas veces seguidas. Espera un momento.' },
});

router.post('/analizar', limitador, solController.analizar);

module.exports = router;