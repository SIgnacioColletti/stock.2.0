// Importar dependencias
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Importar configuración de base de datos
const db = require("./config/database");

// Importar rutas
const authRoutes = require("./routes/auth.Routes");
const categoriasRoutes = require("./routes/categorias.Routes");
const productosRoutes = require("./routes/productos.Routes");
const movimientosRoutes = require("./routes/movimientos.Routes");
const alertasRoutes = require("./routes/alertas.routes");
const reportesRoutes = require("./routes/reportes.routes");
const proveedoresRoutes = require("./routes/proveedores.routes");

// Crear instancia de Express
const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// CORS - Permitir peticiones desde el frontend
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://tu-dominio.com"
        : "http://localhost:5173",
    credentials: true,
  })
);
// Servir archivos estáticos (frontend)
app.use(express.static("public"));

// Parser de JSON
app.use(express.json());

// Parser de URL encoded
app.use(express.urlencoded({ extended: true }));

// Logger simple de requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================
// RUTAS
// ============================================

// Ruta de health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "✅ Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

// Ruta de prueba de base de datos
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() as now");
    res.json({
      success: true,
      message: "✅ Conexión a base de datos exitosa",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    res.status(500).json({
      success: false,
      error: "Error conectando a la base de datos",
      message: error.message,
    });
  }
});

// Rutas de autenticación
app.use("/api/auth", authRoutes);
// Rutas de categorías
app.use("/api/categorias", categoriasRoutes);
// Rutas de productos
app.use("/api/productos", productosRoutes);
// Rutas de movimientos
app.use("/api/movimientos", movimientosRoutes);
// Rutas de alertas
app.use("/api/alertas", alertasRoutes);
// Rutas de reportes
app.use("/api/reportes", reportesRoutes);
// Rutas de proveedores
app.use("/api/proveedores", proveedoresRoutes);

// Ruta 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
  });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({
    success: false,
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 Servidor iniciado correctamente");
  console.log("=".repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`📅 Fecha: ${new Date().toLocaleString("es-AR")}`);
  console.log("=".repeat(50) + "\n");
});

// Manejo de errores no capturados
process.on("unhandledRejection", (err) => {
  console.error("❌ Error no manejado:", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM recibido, cerrando servidor...");
  process.exit(0);
});
