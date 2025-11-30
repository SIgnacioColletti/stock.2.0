const pool = require("../config/database");

// 🏆 Productos más vendidos (top 10)
const getProductosMasVendidos = async (req, res) => {
  try {
    const { limite = 10, fecha_desde, fecha_hasta } = req.query;

    console.log("🏆 Generando reporte de productos más vendidos...");

    // Construir filtro de fechas si se proporcionan
    let filtroFechas = "";
    const params = [];

    if (fecha_desde && fecha_hasta) {
      filtroFechas = `AND m.fecha BETWEEN $1 AND $2`;
      params.push(fecha_desde, fecha_hasta);
    }

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo_barras,
        p.stock_actual,
        p.precio_compra,
        p.precio_venta,
        c.nombre as categoria,
        COUNT(m.id) as total_movimientos,
        SUM(m.cantidad) as total_vendido,
        SUM(m.cantidad * p.precio_venta) as ingresos_totales,
        SUM(m.cantidad * p.precio_compra) as costo_total,
        SUM(m.cantidad * (p.precio_venta - p.precio_compra)) as ganancia_total,
        ROUND(
          ((p.precio_venta - p.precio_compra) / p.precio_compra * 100)::numeric, 
          2
        ) as margen_porcentaje
      FROM productos p
      INNER JOIN movimientos m ON p.id = m.producto_id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE m.tipo_movimiento = 'salida'
        ${filtroFechas}
      GROUP BY p.id, c.nombre
      ORDER BY total_vendido DESC
      LIMIT $${params.length + 1}
    `;

    params.push(parseInt(limite));

    const result = await pool.query(query, params);

    console.log(`✅ Reporte generado: ${result.rows.length} productos`);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: "Reporte de productos más vendidos generado",
    });
  } catch (error) {
    console.error(
      "❌ Error al generar reporte de productos más vendidos:",
      error
    );
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar reporte de productos más vendidos",
    });
  }
};

// 📉 Productos menos vendidos
const getProductosMenosVendidos = async (req, res) => {
  try {
    const { limite = 10, fecha_desde, fecha_hasta } = req.query;

    console.log("📉 Generando reporte de productos menos vendidos...");

    let filtroFechas = "";
    const params = [];

    if (fecha_desde && fecha_hasta) {
      filtroFechas = `AND m.fecha BETWEEN $1 AND $2`;
      params.push(fecha_desde, fecha_hasta);
    }

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo_barras,
        p.stock_actual,
        p.precio_compra,
        p.precio_venta,
        c.nombre as categoria,
        COALESCE(SUM(m.cantidad), 0) as total_vendido,
        COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ingresos_totales,
        (p.stock_actual * p.precio_compra) as capital_inmovilizado
      FROM productos p
      LEFT JOIN movimientos m ON p.id = m.producto_id AND m.tipo_movimiento = 'salida' ${filtroFechas}
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = true
      GROUP BY p.id, c.nombre
      ORDER BY total_vendido ASC
      LIMIT $${params.length + 1}
    `;

    params.push(parseInt(limite));

    const result = await pool.query(query, params);

    console.log(`✅ Reporte generado: ${result.rows.length} productos`);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: "Reporte de productos menos vendidos generado",
    });
  } catch (error) {
    console.error(
      "❌ Error al generar reporte de productos menos vendidos:",
      error
    );
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar reporte de productos menos vendidos",
    });
  }
};

// 💰 Reporte de rentabilidad por producto
const getRentabilidadProductos = async (req, res) => {
  try {
    console.log("💰 Generando reporte de rentabilidad...");

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo_barras,
        p.stock_actual,
        p.precio_compra,
        p.precio_venta,
        c.nombre as categoria,
        (p.precio_venta - p.precio_compra) as ganancia_unitaria,
        ROUND(
          ((p.precio_venta - p.precio_compra) / p.precio_compra * 100)::numeric, 
          2
        ) as margen_porcentaje,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'salida' THEN m.cantidad ELSE 0 END), 0) as total_vendido,
        COALESCE(
          SUM(CASE WHEN m.tipo_movimiento = 'salida' THEN m.cantidad * (p.precio_venta - p.precio_compra) ELSE 0 END), 
          0
        ) as ganancia_total_historica,
        (p.stock_actual * p.precio_compra) as capital_invertido,
        (p.stock_actual * p.precio_venta) as valor_venta_potencial,
        (p.stock_actual * (p.precio_venta - p.precio_compra)) as ganancia_potencial
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN movimientos m ON p.id = m.producto_id
      WHERE p.activo = true
      GROUP BY p.id, c.nombre
      ORDER BY margen_porcentaje DESC
    `;

    const result = await pool.query(query);

    // Calcular totales generales
    const totales = {
      capital_total_invertido: result.rows.reduce(
        (sum, p) => sum + parseFloat(p.capital_invertido || 0),
        0
      ),
      ganancia_potencial_total: result.rows.reduce(
        (sum, p) => sum + parseFloat(p.ganancia_potencial || 0),
        0
      ),
      ganancia_historica_total: result.rows.reduce(
        (sum, p) => sum + parseFloat(p.ganancia_total_historica || 0),
        0
      ),
    };

    console.log("✅ Reporte de rentabilidad generado");

    res.json({
      success: true,
      data: result.rows,
      totales: totales,
      total: result.rows.length,
      message: "Reporte de rentabilidad generado",
    });
  } catch (error) {
    console.error("❌ Error al generar reporte de rentabilidad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar reporte de rentabilidad",
    });
  }
};

// 📊 Dashboard general con resumen del negocio
const getDashboardGeneral = async (req, res) => {
  try {
    console.log("📊 Generando dashboard general...");

    // Total de productos
    const totalProductosQuery = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN activo = false THEN 1 END) as inactivos
      FROM productos
    `);

    // Valor del inventario
    const valorInventarioQuery = await pool.query(`
      SELECT 
        SUM(stock_actual * precio_compra) as valor_compra,
        SUM(stock_actual * precio_venta) as valor_venta,
        SUM(stock_actual * (precio_venta - precio_compra)) as ganancia_potencial
      FROM productos 
      WHERE activo = true
    `);

    // Productos críticos
    const productosCriticosQuery = await pool.query(`
      SELECT COUNT(*) as stock_bajo
      FROM productos 
      WHERE stock_actual <= stock_minimo AND activo = true
    `);

    const productosVencimientoQuery = await pool.query(`
      SELECT COUNT(*) as proximos_vencer
      FROM productos 
      WHERE fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' 
        AND activo = true 
        AND stock_actual > 0
    `);

    // Ventas del período
    const ventasHoyQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_transacciones,
        COALESCE(SUM(m.cantidad), 0) as unidades_vendidas,
        COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ingresos
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      WHERE m.tipo_movimiento = 'salida' 
        AND DATE(m.fecha) = CURRENT_DATE
    `);

    const ventasSemanaQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_transacciones,
        COALESCE(SUM(m.cantidad), 0) as unidades_vendidas,
        COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ingresos,
        COALESCE(SUM(m.cantidad * p.precio_compra), 0) as costos,
        COALESCE(SUM(m.cantidad * (p.precio_venta - p.precio_compra)), 0) as ganancia
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      WHERE m.tipo_movimiento = 'salida' 
        AND m.fecha >= CURRENT_DATE - INTERVAL '7 days'
    `);

    const ventasMesQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_transacciones,
        COALESCE(SUM(m.cantidad), 0) as unidades_vendidas,
        COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ingresos,
        COALESCE(SUM(m.cantidad * p.precio_compra), 0) as costos,
        COALESCE(SUM(m.cantidad * (p.precio_venta - p.precio_compra)), 0) as ganancia
      FROM movimientos m
      JOIN productos p ON m.producto_id = p.id
      WHERE m.tipo_movimiento = 'salida' 
        AND m.fecha >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const dashboard = {
      productos: {
        total: parseInt(totalProductosQuery.rows[0].total),
        activos: parseInt(totalProductosQuery.rows[0].activos),
        inactivos: parseInt(totalProductosQuery.rows[0].inactivos),
      },
      inventario: {
        valor_compra: parseFloat(
          valorInventarioQuery.rows[0].valor_compra || 0
        ).toFixed(2),
        valor_venta: parseFloat(
          valorInventarioQuery.rows[0].valor_venta || 0
        ).toFixed(2),
        ganancia_potencial: parseFloat(
          valorInventarioQuery.rows[0].ganancia_potencial || 0
        ).toFixed(2),
      },
      alertas: {
        stock_bajo: parseInt(productosCriticosQuery.rows[0].stock_bajo),
        proximos_vencer: parseInt(
          productosVencimientoQuery.rows[0].proximos_vencer
        ),
        total_alertas:
          parseInt(productosCriticosQuery.rows[0].stock_bajo) +
          parseInt(productosVencimientoQuery.rows[0].proximos_vencer),
      },
      ventas: {
        hoy: {
          transacciones: parseInt(ventasHoyQuery.rows[0].total_transacciones),
          unidades: parseInt(ventasHoyQuery.rows[0].unidades_vendidas),
          ingresos: parseFloat(ventasHoyQuery.rows[0].ingresos || 0).toFixed(2),
        },
        semana: {
          transacciones: parseInt(
            ventasSemanaQuery.rows[0].total_transacciones
          ),
          unidades: parseInt(ventasSemanaQuery.rows[0].unidades_vendidas),
          ingresos: parseFloat(ventasSemanaQuery.rows[0].ingresos || 0).toFixed(
            2
          ),
          costos: parseFloat(ventasSemanaQuery.rows[0].costos || 0).toFixed(2),
          ganancia: parseFloat(ventasSemanaQuery.rows[0].ganancia || 0).toFixed(
            2
          ),
        },
        mes: {
          transacciones: parseInt(ventasMesQuery.rows[0].total_transacciones),
          unidades: parseInt(ventasMesQuery.rows[0].unidades_vendidas),
          ingresos: parseFloat(ventasMesQuery.rows[0].ingresos || 0).toFixed(2),
          costos: parseFloat(ventasMesQuery.rows[0].costos || 0).toFixed(2),
          ganancia: parseFloat(ventasMesQuery.rows[0].ganancia || 0).toFixed(2),
        },
      },
    };

    console.log("✅ Dashboard general generado exitosamente");

    res.json({
      success: true,
      data: dashboard,
      message: "Dashboard general generado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al generar dashboard general:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar dashboard general",
    });
  }
};

// 📈 Ventas por categoría
const getVentasPorCategoria = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    console.log("📈 Generando reporte de ventas por categoría...");

    let filtroFechas = "";
    const params = [];

    if (fecha_desde && fecha_hasta) {
      filtroFechas = `AND m.fecha BETWEEN $1 AND $2`;
      params.push(fecha_desde, fecha_hasta);
    }

    const query = `
      SELECT 
        c.id,
        c.nombre as categoria,
        COUNT(DISTINCT p.id) as productos_vendidos,
        SUM(m.cantidad) as unidades_vendidas,
        SUM(m.cantidad * p.precio_venta) as ingresos_totales,
        SUM(m.cantidad * p.precio_compra) as costos_totales,
        SUM(m.cantidad * (p.precio_venta - p.precio_compra)) as ganancia_total,
        ROUND(
          (SUM(m.cantidad * (p.precio_venta - p.precio_compra)) / SUM(m.cantidad * p.precio_compra) * 100)::numeric,
          2
        ) as margen_promedio
      FROM categorias c
      INNER JOIN productos p ON c.id = p.categoria_id
      INNER JOIN movimientos m ON p.id = m.producto_id
      WHERE m.tipo_movimiento = 'salida'
        ${filtroFechas}
      GROUP BY c.id, c.nombre
      ORDER BY ingresos_totales DESC
    `;

    const result = await pool.query(query, params);

    console.log(`✅ Reporte generado: ${result.rows.length} categorías`);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: "Reporte de ventas por categoría generado",
    });
  } catch (error) {
    console.error(
      "❌ Error al generar reporte de ventas por categoría:",
      error
    );
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar reporte de ventas por categoría",
    });
  }
};

module.exports = {
  getProductosMasVendidos,
  getProductosMenosVendidos,
  getRentabilidadProductos,
  getDashboardGeneral,
  getVentasPorCategoria,
};
