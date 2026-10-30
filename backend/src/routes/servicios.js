const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');
const verifyRoles = require('../middleware/verifyRoles');

// (el catálogo público para el formulario está en /api/public/servicios)
router.get('/', verifyRoles('admin'), servicioController.getAllServicios);
router.post('/', verifyRoles('admin'), servicioController.createServicio);
router.patch('/:id', verifyRoles('admin'), servicioController.updateServicio);

module.exports = router;