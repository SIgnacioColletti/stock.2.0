const pool = require("./src/config/database");

async function syncFecha() {
  try {
    console.log("🔄 Sincronizando columna fecha...\n");

    // Copiar datos de fecha_movimiento a fecha
    const result = await pool.query(`
      UPDATE movimientos 
      SET fecha = fecha_movimiento 
      WHERE fecha_movimiento IS NOT NULL
    `);

    console.log(`✅ ${result.rowCount} registros sincronizados`);

    // Verificar
    const check = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(fecha) as con_fecha,
        COUNT(fecha_movimiento) as con_fecha_movimiento
      FROM movimientos
    `);

    console.log("\n📊 Verificación:");
    console.table(check.rows);

    console.log("\n✅ ¡Sincronización completada!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

syncFecha();
