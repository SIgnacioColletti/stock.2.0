const pool = require("./src/config/database");

async function setupDatabase() {
  try {
    console.log("🔧 Configurando base de datos...\n");

    // 1. Crear tabla proveedores si no existe
    console.log("📦 Creando tabla proveedores...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        contacto VARCHAR(100),
        telefono VARCHAR(20),
        email VARCHAR(100) UNIQUE,
        direccion TEXT,
        notas TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabla proveedores verificada\n");

    // 2. Verificar productos
    console.log("🔍 Verificando productos...");
    const productos = await pool.query(
      "SELECT COUNT(*) as total FROM productos"
    );
    console.log(`   Total de productos: ${productos.rows[0].total}\n`);

    // 3. Si no hay productos, crear algunos de prueba
    if (parseInt(productos.rows[0].total) === 0) {
      console.log("➕ Insertando productos de prueba...");
      await pool.query(`
        INSERT INTO productos (
          usuario_id,
          categoria_id,
          nombre,
          codigo_barras,
          precio_compra,
          precio_venta,
          stock_actual,
          stock_minimo
        )
        VALUES 
          (1, 1, 'Coca Cola 2.25L', '7790001234567', 500.00, 750.00, 15, 10),
          (1, 1, 'Pepsi 2.25L', '7790001234568', 480.00, 720.00, 8, 10),
          (1, 2, 'Alfajor Jorgito', '7790002345678', 120.00, 180.00, 50, 20),
          (1, 2, 'Galletas Oreo', '7790003456789', 250.00, 380.00, 30, 15),
          (1, 1, 'Agua Mineral 2L', '7790004567890', 150.00, 250.00, 25, 10)
      `);
      console.log("✅ 5 productos de prueba insertados\n");
    } else {
      console.log("✅ Ya hay productos en la base de datos\n");
    }

    // 4. Verificar categorías
    console.log("🔍 Verificando categorías...");
    const categorias = await pool.query(
      "SELECT COUNT(*) as total FROM categorias"
    );
    console.log(`   Total de categorías: ${categorias.rows[0].total}\n`);

    // 5. Verificar usuarios
    console.log("🔍 Verificando usuarios...");
    const usuarios = await pool.query("SELECT COUNT(*) as total FROM usuarios");
    console.log(`   Total de usuarios: ${usuarios.rows[0].total}\n`);

    console.log("🎉 ¡Configuración completada!\n");
    console.log("📊 Resumen:");
    console.log(`   - Productos: ${productos.rows[0].total}`);
    console.log(`   - Categorías: ${categorias.rows[0].total}`);
    console.log(`   - Usuarios: ${usuarios.rows[0].total}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();
