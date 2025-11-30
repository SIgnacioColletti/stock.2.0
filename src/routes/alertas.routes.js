const express = require("express");
const router = express.Router();
const alertasController = require("../controllers/alertas.controller");
const { verificarToken } = require("../middleware/auth"); // ← CAMBIAR AQUÍ

// Todas las rutas de alertas requieren autenticación
router.use(verificarToken); // ← Usar verificarToken

// 🔔 GET /api/alertas/stock-bajo - Productos con stock bajo
router.get("/stock-bajo", alertasController.getProductosStockBajo);

// 📅 GET /api/alertas/proximos-vencer - Productos próximos a vencer
router.get("/proximos-vencer", alertasController.getProductosProximosVencer);

// 💤 GET /api/alertas/sin-movimiento - Productos sin movimiento
router.get("/sin-movimiento", alertasController.getProductosSinMovimiento);

// 📊 GET /api/alertas/dashboard - Dashboard resumen de alertas
router.get("/dashboard", alertasController.getDashboardAlertas);

module.exports = router;
