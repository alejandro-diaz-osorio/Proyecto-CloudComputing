const router = require('express').Router();
const Servicio = require('../model/servicio');

router.get('/servicios', async (_req, res, next) => {
  try { res.json(await Servicio.findActivos()); } catch (e) { next(e); }
});

module.exports = router;