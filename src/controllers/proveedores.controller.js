const pool = require("../config/database");

// 📋 Listar todos los proveedores
const getProveedores = async (req, res) => {
  try {
    const { buscar, ordenar = "nombre", direccion = "ASC" } = req.query;

    console.log("📋 Listando proveedores...");

    // Construir query con filtros opcionales
    let query = `
      SELECT 
        p.id,
        p.nombre,
        p.contacto,
        p.telefono,
        p.email,
        p.direccion,
        p.notas,
        p.activo,
        p.created_at,
        COUNT(DISTINCT pr.id) as total_productos,
        SUM(CASE WHEN pr.stock_actual <= pr.stock_minimo AND pr.activo = true THEN 1 ELSE 0 END) as productos_stock_bajo
      FROM proveedores p
      LEFT JOIN productos pr ON p.id = pr.proveedor_id
    `;

    const params = [];

    // Agregar filtro de búsqueda si existe
    if (buscar) {
      query += ` WHERE (
        p.nombre ILIKE $1 OR 
        p.contacto ILIKE $1 OR 
        p.telefono ILIKE $1 OR 
        p.email ILIKE $1
      )`;
      params.push(`%${buscar}%`);
    }

    query += ` GROUP BY p.id`;

    // Validar campo de ordenamiento
    const camposValidos = [
      "nombre",
      "contacto",
      "telefono",
      "email",
      "created_at",
    ];
    const campoOrden = camposValidos.includes(ordenar) ? ordenar : "nombre";
    const direccionOrden = direccion.toUpperCase() === "DESC" ? "DESC" : "ASC";

    query += ` ORDER BY p.${campoOrden} ${direccionOrden}`;

    const result = await pool.query(query, params);

    console.log(`✅ Se encontraron ${result.rows.length} proveedores`);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: "Proveedores obtenidos exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al obtener proveedores:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener proveedores",
    });
  }
};

// 🔍 Obtener un proveedor por ID
const getProveedorById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Buscando proveedor ID: ${id}...`);

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.contacto,
        p.telefono,
        p.email,
        p.direccion,
        p.notas,
        p.activo,
        p.created_at,
        COUNT(DISTINCT pr.id) as total_productos,
        SUM(pr.stock_actual * pr.precio_compra) as valor_inventario,
        SUM(CASE WHEN pr.stock_actual <= pr.stock_minimo AND pr.activo = true THEN 1 ELSE 0 END) as productos_stock_bajo
      FROM proveedores p
      LEFT JOIN productos pr ON p.id = pr.proveedor_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Proveedor no encontrado",
        message: `No existe un proveedor con ID ${id}`,
      });
    }

    // Obtener productos del proveedor
    const productosQuery = `
      SELECT 
        id,
        nombre,
        codigo_barras,
        stock_actual,
        stock_minimo,
        precio_compra,
        precio_venta,
        activo
      FROM productos
      WHERE proveedor_id = $1
      ORDER BY nombre ASC
    `;

    const productosResult = await pool.query(productosQuery, [id]);

    const proveedor = {
      ...result.rows[0],
      productos: productosResult.rows,
    };

    console.log(`✅ Proveedor encontrado: ${proveedor.nombre}`);

    res.json({
      success: true,
      data: proveedor,
      message: "Proveedor obtenido exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al obtener proveedor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener proveedor",
    });
  }
};

// ➕ Crear nuevo proveedor
const createProveedor = async (req, res) => {
  try {
    const { nombre, contacto, telefono, email, direccion, notas } = req.body;

    console.log("➕ Creando nuevo proveedor...");

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "El nombre del proveedor es requerido",
        message: "Debes proporcionar un nombre válido",
      });
    }

    if (!telefono || telefono.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "El teléfono es requerido",
        message: "Debes proporcionar un teléfono de contacto",
      });
    }

    // Validar email si se proporciona
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Email inválido",
          message: "El formato del email no es válido",
        });
      }

      // Verificar si el email ya existe
      const emailExiste = await pool.query(
        "SELECT id FROM proveedores WHERE email = $1",
        [email]
      );

      if (emailExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Email duplicado",
          message: "Ya existe un proveedor con ese email",
        });
      }
    }

    const query = `
      INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, notas)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      nombre.trim(),
      contacto ? contacto.trim() : null,
      telefono.trim(),
      email ? email.trim() : null,
      direccion ? direccion.trim() : null,
      notas ? notas.trim() : null,
    ];

    const result = await pool.query(query, values);

    console.log(
      `✅ Proveedor creado: ${result.rows[0].nombre} (ID: ${result.rows[0].id})`
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Proveedor creado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al crear proveedor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al crear proveedor",
    });
  }
};

// ✏️ Actualizar proveedor
const updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion, notas, activo } =
      req.body;

    console.log(`✏️ Actualizando proveedor ID: ${id}...`);

    // Verificar que el proveedor existe
    const proveedorExiste = await pool.query(
      "SELECT id FROM proveedores WHERE id = $1",
      [id]
    );

    if (proveedorExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Proveedor no encontrado",
        message: `No existe un proveedor con ID ${id}`,
      });
    }

    // Validaciones
    if (nombre && nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "El nombre no puede estar vacío",
        message: "Proporciona un nombre válido",
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Email inválido",
          message: "El formato del email no es válido",
        });
      }

      // Verificar si el email ya existe en otro proveedor
      const emailExiste = await pool.query(
        "SELECT id FROM proveedores WHERE email = $1 AND id != $2",
        [email, id]
      );

      if (emailExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Email duplicado",
          message: "Ya existe otro proveedor con ese email",
        });
      }
    }

    const query = `
      UPDATE proveedores
      SET 
        nombre = COALESCE($1, nombre),
        contacto = COALESCE($2, contacto),
        telefono = COALESCE($3, telefono),
        email = COALESCE($4, email),
        direccion = COALESCE($5, direccion),
        notas = COALESCE($6, notas),
        activo = COALESCE($7, activo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      nombre ? nombre.trim() : null,
      contacto ? contacto.trim() : null,
      telefono ? telefono.trim() : null,
      email ? email.trim() : null,
      direccion ? direccion.trim() : null,
      notas ? notas.trim() : null,
      activo !== undefined ? activo : null,
      id,
    ];

    const result = await pool.query(query, values);

    console.log(`✅ Proveedor actualizado: ${result.rows[0].nombre}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: "Proveedor actualizado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al actualizar proveedor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al actualizar proveedor",
    });
  }
};

// 🗑️ Eliminar proveedor (soft delete)
const deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Eliminando proveedor ID: ${id}...`);

    // Verificar que el proveedor existe
    const proveedorExiste = await pool.query(
      "SELECT id, nombre FROM proveedores WHERE id = $1",
      [id]
    );

    if (proveedorExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Proveedor no encontrado",
        message: `No existe un proveedor con ID ${id}`,
      });
    }

    // Verificar si tiene productos asociados
    const productosAsociados = await pool.query(
      "SELECT COUNT(*) as total FROM productos WHERE proveedor_id = $1 AND activo = true",
      [id]
    );

    const totalProductos = parseInt(productosAsociados.rows[0].total);

    if (totalProductos > 0) {
      return res.status(400).json({
        success: false,
        error: "No se puede eliminar el proveedor",
        message: `Este proveedor tiene ${totalProductos} producto(s) activo(s) asociado(s). Desactívalo en su lugar.`,
        productos_asociados: totalProductos,
      });
    }

    // Soft delete
    const query = `
      UPDATE proveedores
      SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    console.log(`✅ Proveedor desactivado: ${result.rows[0].nombre}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: "Proveedor desactivado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al eliminar proveedor:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al eliminar proveedor",
    });
  }
};

// 🛒 Lista de compras sugeridas (productos con stock bajo agrupados por proveedor)
const getListaComprasSugeridas = async (req, res) => {
  try {
    console.log("🛒 Generando lista de compras sugeridas...");

    const query = `
      SELECT 
        prov.id as proveedor_id,
        prov.nombre as proveedor,
        prov.contacto,
        prov.telefono,
        prov.email,
        json_agg(
          json_build_object(
            'producto_id', p.id,
            'nombre', p.nombre,
            'codigo_barras', p.codigo_barras,
            'stock_actual', p.stock_actual,
            'stock_minimo', p.stock_minimo,
            'cantidad_sugerida', GREATEST(p.stock_minimo - p.stock_actual, p.stock_minimo),
            'precio_compra', p.precio_compra,
            'total_estimado', GREATEST(p.stock_minimo - p.stock_actual, p.stock_minimo) * p.precio_compra,
            'urgencia', CASE 
              WHEN p.stock_actual = 0 THEN 'CRÍTICO'
              WHEN p.stock_actual <= (p.stock_minimo * 0.5) THEN 'URGENTE'
              ELSE 'NORMAL'
            END
          ) ORDER BY p.stock_actual ASC
        ) as productos,
        COUNT(p.id) as total_productos,
        SUM(GREATEST(p.stock_minimo - p.stock_actual, p.stock_minimo) * p.precio_compra) as total_estimado
      FROM proveedores prov
      INNER JOIN productos p ON prov.id = p.proveedor_id
      WHERE p.stock_actual <= p.stock_minimo
        AND p.activo = true
        AND prov.activo = true
      GROUP BY prov.id, prov.nombre, prov.contacto, prov.telefono, prov.email
      ORDER BY total_productos DESC
    `;

    const result = await pool.query(query);

    const totalGeneral = result.rows.reduce(
      (sum, prov) => sum + parseFloat(prov.total_estimado || 0),
      0
    );

    console.log(
      `✅ Lista de compras generada: ${result.rows.length} proveedores`
    );

    res.json({
      success: true,
      data: result.rows,
      total_proveedores: result.rows.length,
      total_estimado_general: totalGeneral.toFixed(2),
      message: "Lista de compras sugeridas generada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al generar lista de compras:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al generar lista de compras sugeridas",
    });
  }
};

module.exports = {
  getProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  getListaComprasSugeridas,
};
