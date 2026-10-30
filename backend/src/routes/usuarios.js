const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const verifyRoles = require('../middleware/verifyRoles');

// Cualquier usuario autenticado (rutas fijas ANTES de /:id)
router.get('/me', usuarioController.getPerfil);
router.patch('/me', usuarioController.updatePerfil);
router.patch('/me/password', usuarioController.cambiarPassword);

// Solo administradora
router.get('/', verifyRoles('admin'), usuarioController.getAllUsuarios);
router.post('/administradoras', verifyRoles('admin'), usuarioController.createAdministradora);
router.get('/:id', verifyRoles('admin'), usuarioController.getUsuarioById);
router.patch('/:id/activo', verifyRoles('admin'), usuarioController.setActivoUsuario);

module.exports = router;