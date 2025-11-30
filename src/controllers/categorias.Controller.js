// Controlador de categorías
const db = require("../config/database");

/**
 * LISTAR TODAS LAS CATEGORÍAS DEL USUARIO
 * GET /api/categorias
 */
const listarCategorias = async (req, res) => {
  try {
    const { userId } = req;

    // Obtener todas las categorías activas del usuario
    const resultado = await db.query(
      `SELECT id, nombre, descripcion, color, activo, created_at, updated_at
       FROM categorias 
       WHERE usuario_id = $1 AND activo = true
       ORDER BY nombre ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        categorias: resultado.rows,
        total: resultado.rows.length,
      },
    });
  } catch (error) {
    console.error("❌ Error listando categorías:", error);
    res.status(500).json({
      success: false,
      error: "Error listando categorías",
      message: "Ocurrió un error al obtener las categorías",
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
      `SELECT id, nombre, descripcion, color, activo, created_at, updated_at
       FROM categorias 
       WHERE id = $1 AND usuario_id = $2`,
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
      data: {
        categoria: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo categoría:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo categoría",
      message: "Ocurrió un error al obtener la categoría",
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
    if (!nombre) {
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
      [userId, nombre]
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
      [userId, nombre, descripcion || null, color || "#6B7280"]
    );

    console.log(`✅ Categoría creada: ${nombre} (ID: ${resultado.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: "Categoría creada exitosamente",
      data: {
        categoria: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error creando categoría:", error);
    res.status(500).json({
      success: false,
      error: "Error creando categoría",
      message: "Ocurrió un error al crear la categoría",
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
        [userId, nombre, id]
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
      valores.push(nombre);
      contador++;
    }

    if (descripcion !== undefined) {
      query += `descripcion = $${contador}, `;
      valores.push(descripcion);
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
      data: {
        categoria: resultado.rows[0],
      },
    });
  } catch (error) {
    console.error("❌ Error editando categoría:", error);
    res.status(500).json({
      success: false,
      error: "Error editando categoría",
      message: "Ocurrió un error al editar la categoría",
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
      "SELECT COUNT(*) as total FROM productos WHERE categoria_id = $1 AND eliminado = false",
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
    await db.query("UPDATE categorias SET activo = false WHERE id = $1", [id]);

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
      error: "Error eliminando categoría",
      message: "Ocurrió un error al eliminar la categoría",
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
