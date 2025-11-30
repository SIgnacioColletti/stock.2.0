const pool = require("./src/config/database");

async function checkMovimientos() {
  try {
    console.log("🔍 Verificando estructura de tabla movimientos...\n");

    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'movimientos'
      ORDER BY ordinal_position
    `);

    console.log("📋 Columnas de la tabla movimientos:");
    console.table(columns.rows);

    // Ver datos de ejemplo
    const sample = await pool.query(`
      SELECT * FROM movimientos LIMIT 3
    `);

    console.log("\n📊 Datos de ejemplo:");
    console.table(sample.rows);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkMovimientos();
