// Rutas de categorías
const express = require("express");
const router = express.Router();
const categoriasController = require("../controllers/categorias.Controller");
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// CRUD de categorías
router.get("/", categoriasController.listarCategorias);
router.get("/:id", categoriasController.obtenerCategoria);
router.post("/", categoriasController.crearCategoria);
router.put("/:id", categoriasController.editarCategoria);
router.delete("/:id", categoriasController.eliminarCategoria);

module.exports = router;
