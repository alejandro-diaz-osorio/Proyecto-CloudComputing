const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../model/usuario');
const { emailRegex, textoOpcional, validarPassword, telefonoRegex } = require('../utils/validar');
const { manejarError } = require('../utils/manejarError');

// Hash de mentira: se compara igual cuando el correo no existe, para que el tiempo de
// respuesta no revele si una cuenta existe.
const HASH_FALSO = bcrypt.hashSync('no-es-una-clave', 10);

const firmarToken = (u) =>
  jwt.sign({ id: u.id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

const datosPublicos = (u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email, telefono: u.telefono, rol: u.rol });

// Siempre texto (evita errores si llega un número u objeto en el JSON) y sin espacios sobrantes
const texto = (v) => String(v ?? '').trim();

// Registro de clientes (las administradoras las crea otra administradora)
const register = async (req, res) => {
  try {
    const body = req.body ?? {};
    const nombre = texto(body.nombre);
    const apellido = texto(body.apellido);
    const email = texto(body.email).toLowerCase();
    const password = String(body.password ?? '');
    const telefono = textoOpcional(body.telefono);

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ mensaje: 'Nombre, apellido, email y contraseña son obligatorios' });
    }
    // Límites = tamaño de las columnas de usuarios (init.sql)
    if (nombre.length > 80 || apellido.length > 80) {
      return res.status(400).json({ mensaje: 'El nombre y el apellido no pueden superar 80 caracteres' });
    }
    if (email.length > 190) {
      return res.status(400).json({ mensaje: 'El email no puede superar 190 caracteres' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ mensaje: 'El formato del email no es válido' });
    }
    const errorPassword = validarPassword(password);
    if (errorPassword) {
      return res.status(400).json({ mensaje: errorPassword });
    }
    if (telefono !== null && !telefonoRegex.test(telefono)) {
      return res.status(400).json({ mensaje: 'El teléfono no es válido (máximo 25 caracteres: dígitos, +, espacios)' });
    }
    if (await Usuario.existeEmail(email)) {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta con este email' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    // Si dos registros llegan a la vez, el índice único uq_usuarios_email lanza ER_DUP_ENTRY → 409 (manejarError)
    const id = await Usuario.create({ nombre, apellido, email, password_hash, telefono, rol: 'cliente' });
    const usuario = await Usuario.findById(id);

    res.status(201).json({ mensaje: 'Cuenta creada exitosamente', token: firmarToken(usuario), usuario: datosPublicos(usuario) });
  } catch (error) {
    manejarError(res, error, 'Error al registrar usuario');
  }
};

const login = async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = texto(body.email).toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findByEmail(email);
    const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO);

    if (!usuario || !coincide) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }
    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'La cuenta está desactivada' });
    }

    res.json({ token: firmarToken(usuario), usuario: datosPublicos(usuario) });
  } catch (error) {
    manejarError(res, error, 'Error al iniciar sesión');
  }
};

module.exports = { register, login };
