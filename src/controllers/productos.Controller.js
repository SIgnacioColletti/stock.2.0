// Controlador de productos
const db = require("../config/database");

/**
 * LISTAR PRODUCTOS CON FILTROS Y PAGINACIÓN
 * GET /api/productos
 * Query params: page, limit, buscar, categoria_id, orden
 */
const listarProductos = async (req, res) => {
  try {
    const { userId } = req;
    const {
      page = 1,
      limit = 10,
      buscar = "",
      categoria_id,
      orden = "nombre_asc",
    } = req.query;

    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query con filtros
    let whereConditions = ["p.usuario_id = $1", "p.eliminado = false"];
    let queryParams = [userId];
    let paramCounter = 2;

    // Filtro de búsqueda por nombre o código de barras
    if (buscar) {
      whereConditions.push(
        `(LOWER(p.nombre) LIKE LOWER($${paramCounter}) OR p.codigo_barras LIKE $${paramCounter})`
      );
      queryParams.push(`%${buscar}%`);
      paramCounter++;
    }

    // Filtro por categoría
    if (categoria_id) {
      whereConditions.push(`p.categoria_id = $${paramCounter}`);
      queryParams.push(categoria_id);
      paramCounter++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Determinar orden
    let orderBy = "p.nombre ASC";
    switch (orden) {
      case "nombre_desc":
        orderBy = "p.nombre DESC";
        break;
      case "precio_asc":
        orderBy = "p.precio_venta ASC";
        break;
      case "precio_desc":
        orderBy = "p.precio_venta DESC";
        break;
      case "stock_asc":
        orderBy = "p.stock_actual ASC";
        break;
      case "stock_desc":
        orderBy = "p.stock_actual DESC";
        break;
      case "reciente":
        orderBy = "p.created_at DESC";
        break;
    }

    // Obtener total de productos (sin paginación)
    const countQuery = `SELECT COUNT(*) as total FROM productos p WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Obtener productos con paginación
    const query = `
      SELECT 
        p.id, p.nombre, p.descripcion, p.codigo_barras, p.sku,
        p.stock_actual, p.stock_minimo, p.unidad_medida,
        p.precio_compra, p.precio_venta, p.margen_ganancia,
        p.fecha_vencimiento, p.lote, p.ubicacion,
        p.categoria_id, c.nombre as categoria_nombre, c.color as categoria_color,
        p.proveedor_id, pr.nombre as proveedor_nombre,
        p.activo, p.created_at, p.updated_at
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const resultado = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        productos: resultado.rows,
        paginacion: {
          total: total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error listando productos:", error);
    res.status(500).json({
      success: false,
      error: "Error listando productos",
      message: "Ocurrió un error al obtener los productos",
    });
  }
};

/**
 * OBTENER UN PRODUCTO POR ID
 * GET /api/productos/:id
 */
const obtenerProducto = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre, c.color as categoria_color,
        pr.nombre as proveedor_nombre, pr.telefono as proveedor_telefono
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE p.id = $1 AND p.usuario_id = $2 AND p.eliminado = false
    `;

    const resultado = await db.query(query, [id, userId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    res.json({
      success: true,
      data: {
        producto: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo producto:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo producto",
      message: "Ocurrió un error al obtener el producto",
    });
  }
};

/**
 * CREAR NUEVO PRODUCTO
 * POST /api/productos
 */
const crearProducto = async (req, res) => {
  try {
    const { userId } = req;
    const {
      nombre,
      descripcion,
      codigo_barras,
      sku,
      categoria_id,
      proveedor_id,
      stock_actual,
      stock_minimo,
      unidad_medida,
      precio_compra,
      precio_venta,
      fecha_vencimiento,
      lote,
      ubicacion,
    } = req.body;

    // Validaciones obligatorias
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: "Nombre requerido",
        message: "El nombre del producto es obligatorio",
      });
    }

    if (!precio_venta || precio_venta <= 0) {
      return res.status(400).json({
        success: false,
        error: "Precio de venta inválido",
        message: "El precio de venta es obligatorio y debe ser mayor a 0",
      });
    }

    // Verificar que el código de barras no esté duplicado (si se proporciona)
    if (codigo_barras) {
      const codigoExiste = await db.query(
        "SELECT id FROM productos WHERE codigo_barras = $1 AND usuario_id = $2 AND eliminado = false",
        [codigo_barras, userId]
      );

      if (codigoExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Código de barras duplicado",
          message: "Ya existe un producto con ese código de barras",
        });
      }
    }

    // Verificar que la categoría existe y pertenece al usuario (si se proporciona)
    if (categoria_id) {
      const categoriaValida = await db.query(
        "SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2 AND activo = true",
        [categoria_id, userId]
      );

      if (categoriaValida.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Categoría inválida",
          message: "La categoría seleccionada no existe",
        });
      }
    }

    // Verificar que el proveedor existe y pertenece al usuario (si se proporciona)
    if (proveedor_id) {
      const proveedorValido = await db.query(
        "SELECT id FROM proveedores WHERE id = $1 AND usuario_id = $2 AND activo = true",
        [proveedor_id, userId]
      );

      if (proveedorValido.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Proveedor inválido",
          message: "El proveedor seleccionado no existe",
        });
      }
    }

    // Crear el producto
    const query = `
      INSERT INTO productos (
        usuario_id, nombre, descripcion, codigo_barras, sku,
        categoria_id, proveedor_id,
        stock_actual, stock_minimo, unidad_medida,
        precio_compra, precio_venta,
        fecha_vencimiento, lote, ubicacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const valores = [
      userId,
      nombre,
      descripcion || null,
      codigo_barras || null,
      sku || null,
      categoria_id || null,
      proveedor_id || null,
      stock_actual || 0,
      stock_minimo || 5,
      unidad_medida || "unidad",
      precio_compra || 0,
      precio_venta,
      fecha_vencimiento || null,
      lote || null,
      ubicacion || null,
    ];

    const resultado = await db.query(query, valores);

    console.log(`✅ Producto creado: ${nombre} (ID: ${resultado.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      data: {
        producto: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error creando producto:", error);
    res.status(500).json({
      success: false,
      error: "Error creando producto",
      message: "Ocurrió un error al crear el producto",
    });
  }
};

/**
 * EDITAR PRODUCTO
 * PUT /api/productos/:id
 */
const editarProducto = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verificar que el producto existe y pertenece al usuario
    const productoExiste = await db.query(
      "SELECT id FROM productos WHERE id = $1 AND usuario_id = $2 AND eliminado = false",
      [id, userId]
    );

    if (productoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    const {
      nombre,
      descripcion,
      codigo_barras,
      sku,
      categoria_id,
      proveedor_id,
      stock_actual,
      stock_minimo,
      unidad_medida,
      precio_compra,
      precio_venta,
      fecha_vencimiento,
      lote,
      ubicacion,
      activo,
    } = req.body;

    // Verificar código de barras duplicado
    if (codigo_barras) {
      const codigoDuplicado = await db.query(
        "SELECT id FROM productos WHERE codigo_barras = $1 AND usuario_id = $2 AND id != $3 AND eliminado = false",
        [codigo_barras, userId, id]
      );

      if (codigoDuplicado.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Código de barras duplicado",
          message: "Ya existe otro producto con ese código de barras",
        });
      }
    }

    // Verificar categoría
    if (categoria_id) {
      const categoriaValida = await db.query(
        "SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2 AND activo = true",
        [categoria_id, userId]
      );

      if (categoriaValida.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Categoría inválida",
          message: "La categoría seleccionada no existe",
        });
      }
    }

    // Construir query dinámica
    let setClauses = [];
    let valores = [];
    let contador = 1;

    const campos = {
      nombre,
      descripcion,
      codigo_barras,
      sku,
      categoria_id,
      proveedor_id,
      stock_actual,
      stock_minimo,
      unidad_medida,
      precio_compra,
      precio_venta,
      fecha_vencimiento,
      lote,
      ubicacion,
      activo,
    };

    for (const [campo, valor] of Object.entries(campos)) {
      if (valor !== undefined) {
        setClauses.push(`${campo} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Sin datos para actualizar",
        message: "Debes proporcionar al menos un campo para actualizar",
      });
    }

    // Agregar updated_at
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE productos 
      SET ${setClauses.join(", ")}
      WHERE id = $${contador} AND usuario_id = $${contador + 1}
      RETURNING *
    `;

    valores.push(id, userId);

    const resultado = await db.query(query, valores);

    console.log(
      `✅ Producto actualizado: ${resultado.rows[0].nombre} (ID: ${id})`
    );

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: {
        producto: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error editando producto:", error);
    res.status(500).json({
      success: false,
      error: "Error editando producto",
      message: "Ocurrió un error al editar el producto",
    });
  }
};

/**
 * ELIMINAR PRODUCTO (SOFT DELETE)
 * DELETE /api/productos/:id
 */
const eliminarProducto = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verificar que el producto existe
    const productoExiste = await db.query(
      "SELECT id, nombre FROM productos WHERE id = $1 AND usuario_id = $2 AND eliminado = false",
      [id, userId]
    );

    if (productoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
        message: "No existe un producto con ese ID",
      });
    }

    // Soft delete
    await db.query(
      "UPDATE productos SET eliminado = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    console.log(
      `🗑️ Producto eliminado: ${productoExiste.rows[0].nombre} (ID: ${id})`
    );

    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error eliminando producto:", error);
    res.status(500).json({
      success: false,
      error: "Error eliminando producto",
      message: "Ocurrió un error al eliminar el producto",
    });
  }
};
// 🔍 Búsqueda avanzada de productos
const busquedaAvanzada = async (req, res) => {
  try {
    const {
      termino, // Término de búsqueda general
      codigo_barras, // Búsqueda por código de barras específico
      categoria_id, // Filtrar por categoría
      proveedor_id, // Filtrar por proveedor
      stock_bajo, // Solo productos con stock bajo (true/false)
      sin_stock, // Solo productos sin stock (true/false)
      ordenar = "nombre",
      direccion = "ASC",
      limite = 50,
      pagina = 1,
    } = req.query;

    console.log("🔍 Realizando búsqueda avanzada de productos...");

    let whereConditions = ["p.activo = true"];
    const params = [];
    let paramCounter = 1;

    // Búsqueda por término general (nombre)
    if (termino) {
      whereConditions.push(`p.nombre ILIKE $${paramCounter}`);
      params.push(`%${termino}%`);
      paramCounter++;
    }

    // Búsqueda exacta por código de barras
    if (codigo_barras) {
      whereConditions.push(`p.codigo_barras = $${paramCounter}`);
      params.push(codigo_barras);
      paramCounter++;
    }

    // Filtrar por categoría
    if (categoria_id) {
      whereConditions.push(`p.categoria_id = $${paramCounter}`);
      params.push(categoria_id);
      paramCounter++;
    }

    // Filtrar por proveedor
    if (proveedor_id) {
      whereConditions.push(`p.proveedor_id = $${paramCounter}`);
      params.push(proveedor_id);
      paramCounter++;
    }

    // Filtrar por stock bajo
    if (stock_bajo === "true") {
      whereConditions.push("p.stock_actual <= p.stock_minimo");
    }

    // Filtrar por sin stock
    if (sin_stock === "true") {
      whereConditions.push("p.stock_actual = 0");
    }

    const whereClause = whereConditions.join(" AND ");

    // Validar campo de ordenamiento
    const camposValidos = [
      "nombre",
      "codigo_barras",
      "precio_compra",
      "precio_venta",
      "stock_actual",
      "created_at",
    ];
    const campoOrden = camposValidos.includes(ordenar) ? ordenar : "nombre";
    const direccionOrden = direccion.toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Calcular offset para paginación
    const limiteNum = parseInt(limite) || 50;
    const paginaNum = parseInt(pagina) || 1;
    const offset = (paginaNum - 1) * limiteNum;

    // Query principal
    const query = `
      SELECT 
        p.*,
        c.nombre as categoria,
        prov.nombre as proveedor,
        prov.telefono as telefono_proveedor,
        (p.precio_venta - p.precio_compra) as ganancia_unitaria,
        ROUND(
          ((p.precio_venta - p.precio_compra) / p.precio_compra * 100)::numeric, 
          2
        ) as margen_porcentaje
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
      WHERE ${whereClause}
      ORDER BY p.${campoOrden} ${direccionOrden}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(limiteNum, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM productos p
      WHERE ${whereClause}
    `;

    const [resultProductos, resultCount] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)), // Excluir limit y offset
    ]);

    const total = parseInt(resultCount.rows[0].total);
    const totalPaginas = Math.ceil(total / limiteNum);

    console.log(
      `✅ Búsqueda completada: ${resultProductos.rows.length} productos encontrados`
    );

    res.json({
      success: true,
      data: resultProductos.rows,
      pagination: {
        pagina_actual: paginaNum,
        total_paginas: totalPaginas,
        total_productos: total,
        productos_por_pagina: limiteNum,
      },
      message: "Búsqueda completada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error en búsqueda avanzada:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al realizar la búsqueda",
    });
  }
};
module.exports = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  editarProducto,
  eliminarProducto,
  busquedaAvanzada,
};
