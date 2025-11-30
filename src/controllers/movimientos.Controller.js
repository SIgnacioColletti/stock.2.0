// Controlador de movimientos de stock
const db = require("../config/database");

/**
 * REGISTRAR ENTRADA DE STOCK (Compras)
 * POST /api/movimientos/entrada
 */
const registrarEntrada = async (req, res) => {
  const client = await db.getClient();

  try {
    const { userId } = req;
    const {
      producto_id,
      cantidad,
      precio_unitario,
      proveedor_id,
      numero_factura,
      notas,
    } = req.body;

    // Validaciones
    if (!producto_id || !cantidad) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        message: "El producto_id y cantidad son obligatorios",
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cantidad inválida",
        message: "La cantidad debe ser mayor a 0",
      });
    }

    // Iniciar transacción
    await client.query("BEGIN");

    // Verificar que el producto existe y pertenece al usuario
    const productoResult = await client.query(
      "SELECT id, nombre, stock_actual FROM productos WHERE id = $1 AND usuario_id = $2 AND eliminado = false",
      [producto_id, userId]
    );

    if (productoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    const producto = productoResult.rows[0];
    const stockAnterior = producto.stock_actual;
    const stockPosterior = stockAnterior + parseInt(cantidad);

    // Verificar proveedor si se proporciona
    if (proveedor_id) {
      const proveedorValido = await client.query(
        "SELECT id FROM proveedores WHERE id = $1 AND usuario_id = $2 AND activo = true",
        [proveedor_id, userId]
      );

      if (proveedorValido.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Proveedor inválido",
          message: "El proveedor seleccionado no existe",
        });
      }
    }

    // Registrar el movimiento
    const movimientoQuery = `
      INSERT INTO movimientos (
        producto_id, usuario_id, tipo_movimiento, cantidad, motivo,
        precio_unitario, stock_anterior, stock_posterior,
        proveedor_id, numero_factura, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const movimientoResult = await client.query(movimientoQuery, [
      producto_id,
      userId,
      "entrada",
      cantidad,
      "compra",
      precio_unitario || null,
      stockAnterior,
      stockPosterior,
      proveedor_id || null,
      numero_factura || null,
      notas || null,
    ]);

    // Actualizar el stock del producto
    await client.query(
      "UPDATE productos SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [stockPosterior, producto_id]
    );

    // Si se proporcionó precio de compra, actualizar el producto
    if (precio_unitario && precio_unitario > 0) {
      await client.query(
        "UPDATE productos SET precio_compra = $1 WHERE id = $2",
        [precio_unitario, producto_id]
      );
    }

    // Confirmar transacción
    await client.query("COMMIT");

    console.log(
      `✅ Entrada registrada: ${producto.nombre} +${cantidad} (Stock: ${stockAnterior} → ${stockPosterior})`
    );

    res.status(201).json({
      success: true,
      message: "Entrada de stock registrada exitosamente",
      data: {
        movimiento: movimientoResult.rows[0],
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          stock_anterior: stockAnterior,
          stock_actual: stockPosterior,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error registrando entrada:", error);
    res.status(500).json({
      success: false,
      error: "Error registrando entrada",
      message: "Ocurrió un error al registrar la entrada de stock",
    });
  } finally {
    client.release();
  }
};

/**
 * REGISTRAR SALIDA DE STOCK (Ventas)
 * POST /api/movimientos/salida
 */
const registrarSalida = async (req, res) => {
  const client = await db.getClient();

  try {
    const { userId } = req;
    const { producto_id, cantidad, precio_unitario, notas } = req.body;

    // Validaciones
    if (!producto_id || !cantidad) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        message: "El producto_id y cantidad son obligatorios",
      });
    }

    if (cantidad <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cantidad inválida",
        message: "La cantidad debe ser mayor a 0",
      });
    }

    // Iniciar transacción
    await client.query("BEGIN");

    // Verificar que el producto existe y pertenece al usuario
    const productoResult = await client.query(
      "SELECT id, nombre, stock_actual, precio_venta FROM productos WHERE id = $1 AND usuario_id = $2 AND eliminado = false",
      [producto_id, userId]
    );

    if (productoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    const producto = productoResult.rows[0];
    const stockAnterior = producto.stock_actual;

    // VALIDACIÓN CRÍTICA: Verificar que hay stock suficiente
    if (stockAnterior < cantidad) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Stock insuficiente",
        message: `No hay suficiente stock. Disponible: ${stockAnterior}, Solicitado: ${cantidad}`,
      });
    }

    const stockPosterior = stockAnterior - parseInt(cantidad);

    // Usar el precio de venta del producto si no se proporciona
    const precioVenta = precio_unitario || producto.precio_venta;

    // Registrar el movimiento
    const movimientoQuery = `
      INSERT INTO movimientos (
        producto_id, usuario_id, tipo_movimiento, cantidad, motivo,
        precio_unitario, stock_anterior, stock_posterior, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const movimientoResult = await client.query(movimientoQuery, [
      producto_id,
      userId,
      "salida",
      cantidad,
      "venta",
      precioVenta,
      stockAnterior,
      stockPosterior,
      notas || null,
    ]);

    // Actualizar el stock del producto
    await client.query(
      "UPDATE productos SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [stockPosterior, producto_id]
    );

    // Confirmar transacción
    await client.query("COMMIT");

    console.log(
      `✅ Salida registrada: ${producto.nombre} -${cantidad} (Stock: ${stockAnterior} → ${stockPosterior})`
    );

    res.status(201).json({
      success: true,
      message: "Salida de stock registrada exitosamente",
      data: {
        movimiento: movimientoResult.rows[0],
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          stock_anterior: stockAnterior,
          stock_actual: stockPosterior,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error registrando salida:", error);
    res.status(500).json({
      success: false,
      error: "Error registrando salida",
      message: "Ocurrió un error al registrar la salida de stock",
    });
  } finally {
    client.release();
  }
};

/**
 * REGISTRAR AJUSTE DE INVENTARIO
 * POST /api/movimientos/ajuste
 */
const registrarAjuste = async (req, res) => {
  const client = await db.getClient();

  try {
    const { userId } = req;
    const { producto_id, cantidad, motivo, notas } = req.body;

    // Validaciones
    if (!producto_id || cantidad === undefined) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        message: "El producto_id y cantidad son obligatorios",
      });
    }

    if (!motivo) {
      return res.status(400).json({
        success: false,
        error: "Motivo requerido",
        message:
          "Debes especificar el motivo del ajuste (merma, rotura, vencimiento, inventario, etc.)",
      });
    }

    // Validar motivos permitidos
    const motivosPermitidos = [
      "merma",
      "rotura",
      "vencimiento",
      "inventario",
      "otro",
    ];
    if (!motivosPermitidos.includes(motivo.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Motivo inválido",
        message: `El motivo debe ser uno de: ${motivosPermitidos.join(", ")}`,
      });
    }

    // Iniciar transacción
    await client.query("BEGIN");

    // Verificar que el producto existe y pertenece al usuario
    const productoResult = await client.query(
      "SELECT id, nombre, stock_actual FROM productos WHERE id = $1 AND usuario_id = $2 AND eliminado = false",
      [producto_id, userId]
    );

    if (productoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    const producto = productoResult.rows[0];
    const stockAnterior = producto.stock_actual;
    const cantidadAjuste = parseInt(cantidad);
    const stockPosterior = stockAnterior + cantidadAjuste;

    // Validar que el stock no quede negativo
    if (stockPosterior < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Ajuste inválido",
        message: `El ajuste resultaría en stock negativo. Stock actual: ${stockAnterior}, Ajuste: ${cantidadAjuste}`,
      });
    }

    // Registrar el movimiento
    const movimientoQuery = `
      INSERT INTO movimientos (
        producto_id, usuario_id, tipo_movimiento, cantidad, motivo,
        stock_anterior, stock_posterior, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const movimientoResult = await client.query(movimientoQuery, [
      producto_id,
      userId,
      "ajuste",
      Math.abs(cantidadAjuste), // Guardar como positivo siempre
      motivo,
      stockAnterior,
      stockPosterior,
      notas || null,
    ]);

    // Actualizar el stock del producto
    await client.query(
      "UPDATE productos SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [stockPosterior, producto_id]
    );

    // Confirmar transacción
    await client.query("COMMIT");

    const simbolo = cantidadAjuste > 0 ? "+" : "";
    console.log(
      `✅ Ajuste registrado: ${producto.nombre} ${simbolo}${cantidadAjuste} (Stock: ${stockAnterior} → ${stockPosterior})`
    );

    res.status(201).json({
      success: true,
      message: "Ajuste de inventario registrado exitosamente",
      data: {
        movimiento: movimientoResult.rows[0],
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          stock_anterior: stockAnterior,
          stock_actual: stockPosterior,
          diferencia: cantidadAjuste,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error registrando ajuste:", error);
    res.status(500).json({
      success: false,
      error: "Error registrando ajuste",
      message: "Ocurrió un error al registrar el ajuste de inventario",
    });
  } finally {
    client.release();
  }
};

/**
 * OBTENER HISTORIAL DE MOVIMIENTOS DE UN PRODUCTO
 * GET /api/movimientos/producto/:producto_id
 */
const obtenerHistorialProducto = async (req, res) => {
  try {
    const { userId } = req;
    const { producto_id } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verificar que el producto existe y pertenece al usuario
    const productoExiste = await db.query(
      "SELECT id, nombre FROM productos WHERE id = $1 AND usuario_id = $2",
      [producto_id, userId]
    );

    if (productoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    // Obtener total de movimientos
    const countResult = await db.query(
      "SELECT COUNT(*) as total FROM movimientos WHERE producto_id = $1",
      [producto_id]
    );

    const total = parseInt(countResult.rows[0].total);

    // Obtener movimientos con información del proveedor y usuario
    const query = `
      SELECT 
        m.*,
        u.nombre as usuario_nombre,
        pr.nombre as proveedor_nombre
      FROM movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN proveedores pr ON m.proveedor_id = pr.id
      WHERE m.producto_id = $1
      ORDER BY m.fecha_movimiento DESC
      LIMIT $2 OFFSET $3
    `;

    const resultado = await db.query(query, [
      producto_id,
      parseInt(limit),
      offset,
    ]);

    res.json({
      success: true,
      data: {
        producto: productoExiste.rows[0],
        movimientos: resultado.rows,
        paginacion: {
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo historial:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo historial",
      message: "Ocurrió un error al obtener el historial de movimientos",
    });
  }
};

/**
 * OBTENER TODOS LOS MOVIMIENTOS DEL USUARIO
 * GET /api/movimientos
 */
const listarMovimientos = async (req, res) => {
  try {
    const { userId } = req;
    const {
      limit = 50,
      page = 1,
      tipo_movimiento,
      fecha_desde,
      fecha_hasta,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir condiciones WHERE
    let whereConditions = ["m.usuario_id = $1"];
    let queryParams = [userId];
    let paramCounter = 2;

    if (tipo_movimiento) {
      whereConditions.push(`m.tipo_movimiento = $${paramCounter}`);
      queryParams.push(tipo_movimiento);
      paramCounter++;
    }

    if (fecha_desde) {
      whereConditions.push(`m.fecha_movimiento >= $${paramCounter}`);
      queryParams.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereConditions.push(`m.fecha_movimiento <= $${paramCounter}`);
      queryParams.push(fecha_hasta);
      paramCounter++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Obtener total
    const countQuery = `SELECT COUNT(*) as total FROM movimientos m WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Obtener movimientos
    const query = `
      SELECT 
        m.*,
        p.nombre as producto_nombre,
        p.codigo_barras as producto_codigo,
        pr.nombre as proveedor_nombre,
        u.nombre as usuario_nombre
      FROM movimientos m
      LEFT JOIN productos p ON m.producto_id = p.id
      LEFT JOIN proveedores pr ON m.proveedor_id = pr.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE ${whereClause}
      ORDER BY m.fecha_movimiento DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const resultado = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        movimientos: resultado.rows,
        paginacion: {
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error listando movimientos:", error);
    res.status(500).json({
      success: false,
      error: "Error listando movimientos",
      message: "Ocurrió un error al obtener los movimientos",
    });
  }
};

module.exports = {
  registrarEntrada,
  registrarSalida,
  registrarAjuste,
  obtenerHistorialProducto,
  listarMovimientos,
};
