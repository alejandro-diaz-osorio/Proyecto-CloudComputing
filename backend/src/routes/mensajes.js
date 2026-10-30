const express = require('express');
const router = express.Router();
const mensajeController = require('../controllers/mensajeController');

router.get('/solicitud/:solicitudId', mensajeController.getMensajes);
router.post('/solicitud/:solicitudId', mensajeController.enviarMensaje);

module.exports = router;