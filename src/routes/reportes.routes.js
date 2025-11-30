const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportes.controller");
const { verificarToken } = require("../middleware/auth"); // ← CAMBIAR AQUÍ

// Todas las rutas de reportes requieren autenticación
router.use(verificarToken); // ← Usar verificarToken

// 🏆 GET /api/reportes/mas-vendidos - Top productos más vendidos
router.get("/mas-vendidos", reportesController.getProductosMasVendidos);

// 📉 GET /api/reportes/menos-vendidos - Productos menos vendidos
router.get("/menos-vendidos", reportesController.getProductosMenosVendidos);

// 💰 GET /api/reportes/rentabilidad - Rentabilidad por producto
router.get("/rentabilidad", reportesController.getRentabilidadProductos);

// 📊 GET /api/reportes/dashboard - Dashboard general del negocio
router.get("/dashboard", reportesController.getDashboardGeneral);

// 📈 GET /api/reportes/ventas-categoria - Ventas por categoría
router.get("/ventas-categoria", reportesController.getVentasPorCategoria);

module.exports = router;
