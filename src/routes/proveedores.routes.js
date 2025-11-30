const express = require("express");
const router = express.Router();
const proveedoresController = require("../controllers/proveedores.controller");
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// 📋 GET /api/proveedores - Listar todos los proveedores
router.get("/", proveedoresController.getProveedores);

// 🛒 GET /api/proveedores/lista-compras - Lista de compras sugeridas
router.get("/lista-compras", proveedoresController.getListaComprasSugeridas);

// 🔍 GET /api/proveedores/:id - Obtener un proveedor por ID
router.get("/:id", proveedoresController.getProveedorById);

// ➕ POST /api/proveedores - Crear nuevo proveedor
router.post("/", proveedoresController.createProveedor);

// ✏️ PUT /api/proveedores/:id - Actualizar proveedor
router.put("/:id", proveedoresController.updateProveedor);

// 🗑️ DELETE /api/proveedores/:id - Eliminar proveedor (soft delete)
router.delete("/:id", proveedoresController.deleteProveedor);

module.exports = router;
