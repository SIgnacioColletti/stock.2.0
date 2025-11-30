// Rutas de autenticación
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.Controller");
const { verificarToken } = require("../middleware/auth");

// Rutas públicas (no requieren autenticación)
router.post("/registro", authController.registro);
router.post("/login", authController.login);

// Rutas protegidas (requieren autenticación)
router.get("/perfil", verificarToken, authController.obtenerPerfil);

module.exports = router;
