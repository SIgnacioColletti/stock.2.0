const pool = require("./src/config/database");

async function fixMovimientos() {
  try {
    console.log("🔧 Reparando tabla movimientos...\n");

    // Verificar si existe la columna 'fecha'
    const checkFecha = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movimientos' 
        AND column_name = 'fecha'
    `);

    if (checkFecha.rows.length === 0) {
      console.log('➕ La columna "fecha" no existe. Agregándola...');

      // Agregar columna fecha con valor por defecto de created_at
      await pool.query(`
        ALTER TABLE movimientos 
        ADD COLUMN fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);

      // Copiar valores de created_at a fecha si existen registros
      await pool.query(`
        UPDATE movimientos 
        SET fecha = created_at 
        WHERE fecha IS NULL AND created_at IS NOT NULL
      `);

      console.log(
        '✅ Columna "fecha" agregada y sincronizada con created_at\n'
      );
    } else {
      console.log('✅ La columna "fecha" ya existe\n');
    }

    // Mostrar estructura actualizada
    console.log("📋 Estructura actual de movimientos:");
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'movimientos'
      ORDER BY ordinal_position
    `);
    console.table(columns.rows);

    console.log("\n✅ ¡Tabla movimientos reparada!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

fixMovimientos();
