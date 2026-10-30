const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');

router.get('/', notificacionController.getNotificaciones);
router.get('/sin-leer', notificacionController.getContadorSinLeer);
router.patch('/leer-todas', notificacionController.marcarTodasLeidas);
router.patch('/:id/leer', notificacionController.marcarLeida);

module.exports = router;