// Controlador de categorías
const db = require("../config/database");

/**
 * LISTAR TODAS LAS CATEGORÍAS DEL USUARIO
 * GET /api/categorias
 */
const listarCategorias = async (req, res) => {
  try {
    const { userId } = req;

    // Obtener todas las categorías activas del usuario con conteo de productos
    const resultado = await db.query(
      `SELECT 
        c.id, 
        c.nombre, 
        c.descripcion, 
        c.color, 
        c.activo, 
        c.created_at, 
        c.updated_at,
        COUNT(p.id) as total_productos
       FROM categorias c
       LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = true
       WHERE c.usuario_id = $1 AND c.activo = true
       GROUP BY c.id
       ORDER BY c.nombre ASC`,
      [userId]
    );

    console.log(`✅ Se encontraron ${resultado.rows.length} categorías`);

    res.json({
      success: true,
      data: resultado.rows,
      total: resultado.rows.length,
      message: "Categorías obtenidas exitosamente",
    });
  } catch (error) {
    console.error("❌ Error listando categorías:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener categorías",
    });
  }
};

/**
 * OBTENER UNA CATEGORÍA POR ID
 * GET /api/categorias/:id
 */
const obtenerCategoria = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const resultado = await db.query(
      `SELECT 
        c.id, 
        c.nombre, 
        c.descripcion, 
        c.color, 
        c.activo, 
        c.created_at, 
        c.updated_at,
        COUNT(p.id) as total_productos
       FROM categorias c
       LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = true
       WHERE c.id = $1 AND c.usuario_id = $2
       GROUP BY c.id`,
      [id, userId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Categoría no encontrada",
        message: "No existe una categoría con ese ID",
      });
    }

    res.json({
      success: true,
      data: resultado.rows[0],
      message: "Categoría obtenida exitosamente",
    });
  } catch (error) {
    console.error("❌ Error obteniendo categoría:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al obtener la categoría",
    });
  }
};

/**
 * CREAR NUEVA CATEGORÍA
 * POST /api/categorias
 */
const crearCategoria = async (req, res) => {
  try {
    const { userId } = req;
    const { nombre, descripcion, color } = req.body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Nombre requerido",
        message: "El nombre de la categoría es obligatorio",
      });
    }

    // Verificar que no exista una categoría con el mismo nombre
    const existe = await db.query(
      `SELECT id FROM categorias 
       WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2) AND activo = true`,
      [userId, nombre.trim()]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Categoría duplicada",
        message: "Ya existe una categoría con ese nombre",
      });
    }

    // Crear la categoría
    const resultado = await db.query(
      `INSERT INTO categorias (usuario_id, nombre, descripcion, color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, color, activo, created_at`,
      [userId, nombre.trim(), descripcion?.trim() || null, color || "#6B7280"]
    );

    console.log(`✅ Categoría creada: ${nombre} (ID: ${resultado.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: "Categoría creada exitosamente",
      data: resultado.rows[0],
    });
  } catch (error) {
    console.error("❌ Error creando categoría:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al crear la categoría",
    });
  }
};

/**
 * EDITAR CATEGORÍA
 * PUT /api/categorias/:id
 */
const editarCategoria = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { nombre, descripcion, color, activo } = req.body;

    // Verificar que la categoría existe y pertenece al usuario
    const categoriaExiste = await db.query(
      "SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2",
      [id, userId]
    );

    if (categoriaExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Categoría no encontrada",
        message: "No existe una categoría con ese ID",
      });
    }

    // Si se está cambiando el nombre, verificar que no exista otra con ese nombre
    if (nombre) {
      const nombreDuplicado = await db.query(
        `SELECT id FROM categorias 
         WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2) AND id != $3 AND activo = true`,
        [userId, nombre.trim(), id]
      );

      if (nombreDuplicado.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Categoría duplicada",
          message: "Ya existe otra categoría con ese nombre",
        });
      }
    }

    // Construir query dinámica
    let query = "UPDATE categorias SET ";
    let valores = [];
    let contador = 1;

    if (nombre !== undefined) {
      query += `nombre = $${contador}, `;
      valores.push(nombre.trim());
      contador++;
    }

    if (descripcion !== undefined) {
      query += `descripcion = $${contador}, `;
      valores.push(descripcion?.trim() || null);
      contador++;
    }

    if (color !== undefined) {
      query += `color = $${contador}, `;
      valores.push(color);
      contador++;
    }

    if (activo !== undefined) {
      query += `activo = $${contador}, `;
      valores.push(activo);
      contador++;
    }

    // Si no hay campos para actualizar
    if (valores.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Sin datos para actualizar",
        message: "Debes proporcionar al menos un campo para actualizar",
      });
    }

    // Agregar updated_at y WHERE
    query += `updated_at = CURRENT_TIMESTAMP WHERE id = $${contador} AND usuario_id = $${
      contador + 1
    } RETURNING *`;
    valores.push(id, userId);

    const resultado = await db.query(query, valores);

    console.log(
      `✅ Categoría actualizada: ${resultado.rows[0].nombre} (ID: ${id})`
    );

    res.json({
      success: true,
      message: "Categoría actualizada exitosamente",
      data: resultado.rows[0],
    });
  } catch (error) {
    console.error("❌ Error editando categoría:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al editar la categoría",
    });
  }
};

/**
 * ELIMINAR CATEGORÍA (SOFT DELETE)
 * DELETE /api/categorias/:id
 */
const eliminarCategoria = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verificar que la categoría existe
    const categoriaExiste = await db.query(
      "SELECT id, nombre FROM categorias WHERE id = $1 AND usuario_id = $2",
      [id, userId]
    );

    if (categoriaExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Categoría no encontrada",
        message: "No existe una categoría con ese ID",
      });
    }

    // Verificar si hay productos con esta categoría
    const productosAsociados = await db.query(
      "SELECT COUNT(*) as total FROM productos WHERE categoria_id = $1 AND activo = true",
      [id]
    );

    const totalProductos = parseInt(productosAsociados.rows[0].total);

    if (totalProductos > 0) {
      return res.status(400).json({
        success: false,
        error: "Categoría en uso",
        message: `No se puede eliminar la categoría porque tiene ${totalProductos} producto(s) asociado(s). Primero cambia la categoría de esos productos.`,
      });
    }

    // Soft delete: marcar como inactiva
    await db.query(
      "UPDATE categorias SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    console.log(
      `🗑️ Categoría eliminada: ${categoriaExiste.rows[0].nombre} (ID: ${id})`
    );

    res.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error eliminando categoría:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Error al eliminar la categoría",
    });
  }
};

module.exports = {
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
};
