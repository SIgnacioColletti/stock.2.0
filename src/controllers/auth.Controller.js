// Controlador de autenticación (registro y login)
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

/**
 * REGISTRO DE NUEVO USUARIO
 * POST /api/auth/registro
 */
const registro = async (req, res) => {
  const client = await db.getClient();

  try {
    const { nombre, email, password, rol } = req.body;

    // 1. VALIDACIONES
    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        message: "Nombre, email y password son obligatorios",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Email inválido",
        message: "El formato del email no es válido",
      });
    }

    // Validar longitud de password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password muy corta",
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Validar rol (solo admin o usuario)
    const rolFinal = rol === "admin" ? "admin" : "usuario";

    // 2. INICIAR TRANSACCIÓN
    // Usamos transacción porque vamos a crear usuario Y categorías
    await client.query("BEGIN");

    // 3. VERIFICAR SI EL EMAIL YA EXISTE
    const emailExiste = await client.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email.toLowerCase()]
    );

    if (emailExiste.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Email ya registrado",
        message: "Ya existe un usuario con este email",
      });
    }

    // 4. HASHEAR LA CONTRASEÑA
    // El "10" es el número de rondas de salt (más alto = más seguro pero más lento)
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. INSERTAR EL NUEVO USUARIO
    const resultado = await client.query(
      `INSERT INTO usuarios (nombre, email, password, rol) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nombre, email, rol, created_at`,
      [nombre, email.toLowerCase(), passwordHash, rolFinal]
    );

    const nuevoUsuario = resultado.rows[0];
    console.log(
      `✅ Usuario registrado: ${nuevoUsuario.email} (ID: ${nuevoUsuario.id})`
    );

    // 6. CREAR CATEGORÍAS PREDETERMINADAS PARA EL NUEVO USUARIO
    const categoriasPredeterminadas = [
      {
        nombre: "Bebidas",
        descripcion: "Gaseosas, jugos, aguas",
        color: "#3B82F6",
      },
      {
        nombre: "Golosinas",
        descripcion: "Chocolates, caramelos, chicles",
        color: "#EC4899",
      },
      {
        nombre: "Snacks",
        descripcion: "Papas fritas, palitos, maní",
        color: "#F59E0B",
      },
      {
        nombre: "Cigarrillos",
        descripcion: "Cigarrillos y tabaco",
        color: "#EF4444",
      },
      {
        nombre: "Almacén",
        descripcion: "Productos de almacén general",
        color: "#10B981",
      },
      { nombre: "Otros", descripcion: "Productos varios", color: "#6B7280" },
    ];

    for (const categoria of categoriasPredeterminadas) {
      await client.query(
        `INSERT INTO categorias (usuario_id, nombre, descripcion, color) 
         VALUES ($1, $2, $3, $4)`,
        [
          nuevoUsuario.id,
          categoria.nombre,
          categoria.descripcion,
          categoria.color,
        ]
      );
    }

    console.log(
      `📁 Categorías predeterminadas creadas para usuario ${nuevoUsuario.id}`
    );

    // 7. CONFIRMAR TRANSACCIÓN
    await client.query("COMMIT");

    // 8. GENERAR TOKEN JWT
    const token = jwt.sign(
      {
        userId: nuevoUsuario.id,
        email: nuevoUsuario.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    // 9. RESPONDER
    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        token,
        usuario: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol,
          created_at: nuevoUsuario.created_at,
        },
      },
    });
  } catch (error) {
    // Si hay error, deshacer la transacción
    await client.query("ROLLBACK");
    console.error("❌ Error en registro:", error);
    res.status(500).json({
      success: false,
      error: "Error en el registro",
      message: "Ocurrió un error al registrar el usuario",
    });
  } finally {
    // Siempre liberar el cliente del pool
    client.release();
  }
};

/**
 * LOGIN DE USUARIO
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. VALIDACIONES
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        message: "Email y password son obligatorios",
      });
    }

    // 2. BUSCAR USUARIO POR EMAIL
    const resultado = await db.query(
      `SELECT id, nombre, email, password, rol, activo 
       FROM usuarios 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    // Verificar si existe el usuario
    if (resultado.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
        message: "Email o contraseña incorrectos",
      });
    }

    const usuario = resultado.rows[0];

    // 3. VERIFICAR SI EL USUARIO ESTÁ ACTIVO
    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        error: "Usuario desactivado",
        message: "Tu cuenta ha sido desactivada. Contacta al administrador.",
      });
    }

    // 4. VERIFICAR LA CONTRASEÑA
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
        message: "Email o contraseña incorrectos",
      });
    }

    // 5. GENERAR TOKEN JWT
    const token = jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log(`✅ Login exitoso: ${usuario.email} (ID: ${usuario.id})`);

    // 6. RESPONDER (NO enviar el password en la respuesta)
    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({
      success: false,
      error: "Error en el login",
      message: "Ocurrió un error al iniciar sesión",
    });
  }
};

/**
 * OBTENER PERFIL DEL USUARIO AUTENTICADO
 * GET /api/auth/perfil
 */
const obtenerPerfil = async (req, res) => {
  try {
    // El userId viene del middleware de autenticación
    const { userId } = req;

    // Obtener datos del usuario
    const resultado = await db.query(
      `SELECT id, nombre, email, rol, activo, created_at, updated_at 
       FROM usuarios 
       WHERE id = $1`,
      [userId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
        message: "No se encontró el usuario",
      });
    }

    const usuario = resultado.rows[0];

    res.json({
      success: true,
      data: {
        usuario,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo perfil",
      message: "Ocurrió un error al obtener el perfil",
    });
  }
};

module.exports = {
  registro,
  login,
  obtenerPerfil,
};
