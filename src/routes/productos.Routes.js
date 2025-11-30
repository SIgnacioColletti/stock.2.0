// Rutas de productos
const express = require("express");
const router = express.Router();
const productosController = require("../controllers/productos.Controller");
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// CRUD de productos
router.get("/", productosController.listarProductos);
router.get("/:id", productosController.obtenerProducto);
router.post("/", productosController.crearProducto);
router.put("/:id", productosController.editarProducto);
router.delete("/:id", productosController.eliminarProducto);
router.get("/buscar", productosController.busquedaAvanzada);

module.exports = router;
