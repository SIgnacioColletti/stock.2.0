const pool = require("./src/config/database");

async function testQueries() {
  try {
    console.log("🧪 Probando queries del dashboard...\n");

    // Test 1: Total de productos
    console.log("1️⃣ Probando query de productos...");
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN activo = true THEN 1 END) as activos,
          COUNT(CASE WHEN activo = false THEN 1 END) as inactivos
        FROM productos
      `);
      console.log("✅ Productos:", result.rows[0]);
    } catch (error) {
      console.error("❌ Error en productos:", error.message);
    }

    // Test 2: Valor del inventario
    console.log("\n2️⃣ Probando query de inventario...");
    try {
      const result = await pool.query(`
        SELECT 
          SUM(stock_actual * precio_compra) as valor_compra,
          SUM(stock_actual * precio_venta) as valor_venta,
          SUM(stock_actual * (precio_venta - precio_compra)) as ganancia_potencial
        FROM productos 
        WHERE activo = true
      `);
      console.log("✅ Inventario:", result.rows[0]);
    } catch (error) {
      console.error("❌ Error en inventario:", error.message);
    }

    // Test 3: Stock bajo
    console.log("\n3️⃣ Probando query de stock bajo...");
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as stock_bajo
        FROM productos 
        WHERE stock_actual <= stock_minimo AND activo = true
      `);
      console.log("✅ Stock bajo:", result.rows[0]);
    } catch (error) {
      console.error("❌ Error en stock bajo:", error.message);
    }

    // Test 4: Ventas de hoy
    console.log("\n4️⃣ Probando query de ventas...");
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT m.id) as total_transacciones,
          COALESCE(SUM(m.cantidad), 0) as unidades_vendidas,
          COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ingresos
        FROM movimientos m
        JOIN productos p ON m.producto_id = p.id
        WHERE m.tipo_movimiento = 'salida' 
          AND DATE(m.fecha) = CURRENT_DATE
      `);
      console.log("✅ Ventas hoy:", result.rows[0]);
    } catch (error) {
      console.error("❌ Error en ventas:", error.message);
    }

    // Test 5: Productos con LEFT JOIN a proveedores
    console.log("\n5️⃣ Probando query con proveedores (puede fallar)...");
    try {
      const result = await pool.query(`
        SELECT 
          p.id,
          p.nombre,
          pr.nombre as proveedor
        FROM productos p
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        LIMIT 5
      `);
      console.log("✅ Productos con proveedor:", result.rows);
    } catch (error) {
      console.error("❌ Error con proveedores:", error.message);
      console.error(
        "   Esto significa que la columna proveedor_id no existe en productos"
      );
    }

    console.log("\n✅ Pruebas completadas");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error general:", error);
    process.exit(1);
  }
}

testQueries();
