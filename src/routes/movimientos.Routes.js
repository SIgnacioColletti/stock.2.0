// Rutas de movimientos de stock
const express = require("express");
const router = express.Router();
const movimientosController = require("../controllers/movimientos.Controller");
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Registrar movimientos
router.post("/entrada", movimientosController.registrarEntrada);
router.post("/salida", movimientosController.registrarSalida);
router.post("/ajuste", movimientosController.registrarAjuste);

// Consultar movimientos
router.get("/", movimientosController.listarMovimientos);
router.get(
  "/producto/:producto_id",
  movimientosController.obtenerHistorialProducto
);

module.exports = router;
