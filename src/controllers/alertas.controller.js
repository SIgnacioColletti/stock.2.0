const pool = require("../config/database");

// 🔔 Obtener productos con stock bajo (menor al stock_minimo)
const getProductosStockBajo = async (req, res) => {
  try {
    console.log("📊 Consultando productos con stock bajo...");

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo_barras,
        p.stock_actual,
        p.stock_minimo,
        p.precio_venta,
        c.nombre as categoria,
        pr.nombre as proveedor,
        pr.telefono as telefono_proveedor,
        (p.stock_minimo - p.stock_actual) as cantidad_faltante,
        CASE 
          WHEN p.stock_actual = 0 THEN 'CRÍTICO'
          WHEN p.stock_actual <= (p.stock_minimo * 0.5) THEN 'URGENTE'
          ELSE 'ADVERTENCIA'
        END as nivel_alerta
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE p.stock_actual <= p.stock_minimo
        AND p.activo = true
      ORDER BY 
        CASE 
          WHEN p.stock_actual = 0 THEN 1
          WHEN p.stock_actual <= (p.stock_minimo * 0.5) THEN 2
          ELSE 3
        END,
        p.stock_actual ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: `Se encontraron ${result.rows.length} productos con stock bajo`,
    });
  } catch (error) {
    console.error("❌ Error al obtener productos con stock bajo:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener productos con stock bajo",
    });
  }
};

// 📅 Obtener productos próximos a vencer (próximos 7 días)
const getProductosProximosVencer = async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    const diasInt = parseInt(dias);

    console.log(
      `📅 Consultando productos que vencen en los próximos ${diasInt} días...`
    );

    // ✅ CORRECCIÓN: Usar parámetro $1 en lugar de interpolación
    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo_barras,
        p.stock_actual,
        p.fecha_vencimiento,
        p.precio_compra,
        p.precio_venta,
        c.nombre as categoria,
        (p.stock_actual * p.precio_compra) as valor_stock,
        DATE_PART('day', p.fecha_vencimiento - CURRENT_DATE) as dias_para_vencer,
        CASE 
          WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
          WHEN p.fecha_vencimiento <= CURRENT_DATE + INTERVAL '3 days' THEN 'CRÍTICO'
          WHEN p.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENTE'
          ELSE 'ADVERTENCIA'
        END as nivel_alerta
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.fecha_vencimiento IS NOT NULL
        AND p.fecha_vencimiento <= CURRENT_DATE + ($1 || ' days')::INTERVAL
        AND p.activo = true
        AND p.stock_actual > 0
      ORDER BY p.fecha_vencimiento ASC
    `;

    const result = await pool.query(query, [diasInt]);

    const valorTotalRiesgo = result.rows.reduce(
      (sum, prod) => sum + parseFloat(prod.valor_stock || 0),
      0
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      valor_total_riesgo: valorTotalRiesgo.toFixed(2),
      message: `Se encontraron ${result.rows.length} productos próximos a vencer`,
    });
  } catch (error) {
    console.error("❌ Error al obtener productos próximos a vencer:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener productos próximos a vencer",
    });
  }
};

// 💤 Obtener productos sin movimiento (últimos 30 días)
const getProductosSinMovimiento = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const diasInt = parseInt(dias);

    console.log(
      `💤 Consultando productos sin movimiento en ${diasInt} días...`
    );

    // ✅ CORRECCIÓN: Usar parámetro $1 en lugar de interpolación
    const query = `
      SELECT 
        COUNT(*) AS total,
        SUM(p.stock_actual * p.precio_compra) AS capital_inmovilizado
      FROM productos p
      WHERE p.activo = true 
        AND p.stock_actual > 0
        AND COALESCE(
              (SELECT MAX(m.fecha) FROM movimientos m WHERE m.producto_id = p.id),
              p.created_at
            ) <= CURRENT_DATE - ($1 || ' days')::INTERVAL
    `;

    const result = await pool.query(query, [diasInt]);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(result.rows[0].total) || 0,
      capital_inmovilizado: parseFloat(
        result.rows[0].capital_inmovilizado || 0
      ).toFixed(2),
      message: `Productos sin movimiento obtenidos`,
    });
  } catch (error) {
    console.error("❌ Error al obtener productos sin movimiento:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener productos sin movimiento",
    });
  }
};

// 📊 Dashboard de alertas - Resumen general
const getDashboardAlertas = async (req, res) => {
  try {
    console.log("📊 Generando dashboard de alertas...");

    // Stock bajo
    const stockBajoQuery = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN stock_actual = 0 THEN 1 END) as criticos,
        COUNT(CASE WHEN stock_actual <= (stock_minimo * 0.5) AND stock_actual > 0 THEN 1 END) as urgentes
      FROM productos 
      WHERE stock_actual <= stock_minimo AND activo = true
    `);

    // Próximos a vencer
    const proximosVencerQuery = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 1 END) as vencidos,
        COUNT(CASE WHEN fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as criticos,
        SUM(stock_actual * precio_compra) as valor_riesgo
      FROM productos 
      WHERE fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' 
        AND activo = true 
        AND stock_actual > 0
    `);

    // Productos sin movimiento
    const sinMovimientoQuery = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(p.stock_actual * p.precio_compra) AS capital_inmovilizado
      FROM productos p
      WHERE p.activo = true 
        AND p.stock_actual > 0
        AND COALESCE(
              (SELECT MAX(m.fecha) FROM movimientos m WHERE m.producto_id = p.id),
              p.created_at
            ) <= CURRENT_DATE - INTERVAL '30 days'
    `);

    const dashboard = {
      stock_bajo: {
        total: parseInt(stockBajoQuery.rows[0].total) || 0,
        criticos: parseInt(stockBajoQuery.rows[0].criticos) || 0,
        urgentes: parseInt(stockBajoQuery.rows[0].urgentes) || 0,
      },
      proximos_vencer: {
        total: parseInt(proximosVencerQuery.rows[0].total) || 0,
        vencidos: parseInt(proximosVencerQuery.rows[0].vencidos) || 0,
        criticos: parseInt(proximosVencerQuery.rows[0].criticos) || 0,
        valor_riesgo: parseFloat(
          proximosVencerQuery.rows[0].valor_riesgo || 0
        ).toFixed(2),
      },
      sin_movimiento: {
        total: parseInt(sinMovimientoQuery.rows[0].total) || 0,
        capital_inmovilizado: parseFloat(
          sinMovimientoQuery.rows[0].capital_inmovilizado || 0
        ).toFixed(2),
      },
      alertas_totales:
        (parseInt(stockBajoQuery.rows[0].total) || 0) +
        (parseInt(proximosVencerQuery.rows[0].total) || 0) +
        (parseInt(sinMovimientoQuery.rows[0].total) || 0),
    };

    console.log("✅ Dashboard de alertas generado");

    res.json({
      success: true,
      data: dashboard,
      message: "Dashboard de alertas generado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al generar dashboard de alertas:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar dashboard de alertas",
    });
  }
};

module.exports = {
  getProductosStockBajo,
  getProductosProximosVencer,
  getProductosSinMovimiento,
  getDashboardAlertas,
};
