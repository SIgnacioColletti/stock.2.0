// Middleware para verificar tokens JWT y proteger rutas
const jwt = require("jsonwebtoken");

/**
 * Middleware de autenticación
 * Verifica que el token JWT sea válido y extrae la información del usuario
 */
const verificarToken = async (req, res, next) => {
  try {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    // Verificar que exista el header
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "No se proporcionó token de autenticación",
        message: "Debes incluir el header Authorization con el token",
      });
    }

    // 2. El formato esperado es: "Bearer TOKEN"
    // Verificar que tenga el formato correcto
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Formato de token inválido",
        message: "El token debe tener el formato: Bearer [token]",
      });
    }

    // 3. Extraer el token (separar "Bearer" del token real)
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token no proporcionado",
        message: "El token está vacío",
      });
    }

    // 4. Verificar y decodificar el token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 5. Agregar la información del usuario a la request
      // Esto estará disponible en todos los controladores que usen este middleware
      req.userId = decoded.userId;
      req.userEmail = decoded.email;

      console.log(
        `✅ Usuario autenticado: ${decoded.email} (ID: ${decoded.userId})`
      );

      // 6. Continuar con el siguiente middleware o controlador
      next();
    } catch (jwtError) {
      // Manejar errores específicos de JWT
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expirado",
          message:
            "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        });
      }

      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Token inválido",
          message: "El token proporcionado no es válido.",
        });
      }

      // Otro error de JWT
      throw jwtError;
    }
  } catch (error) {
    console.error("❌ Error en middleware de autenticación:", error);
    return res.status(500).json({
      success: false,
      error: "Error en la autenticación",
      message: "Ocurrió un error al verificar el token",
    });
  }
};

/**
 * Middleware opcional de autenticación
 * Verifica el token si existe, pero no bloquea si no hay token
 * Útil para rutas que funcionan diferente con/sin autenticación
 */
const verificarTokenOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Si no hay token, continuar sin autenticación
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.userId = null;
      req.userEmail = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      req.userId = null;
      req.userEmail = null;
      return next();
    }

    // Intentar verificar el token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      console.log(`✅ Usuario autenticado (opcional): ${decoded.email}`);
    } catch (jwtError) {
      // Si el token es inválido, continuar sin autenticación
      req.userId = null;
      req.userEmail = null;
      console.log(
        "⚠️ Token inválido en verificación opcional, continuando sin auth"
      );
    }

    next();
  } catch (error) {
    console.error("❌ Error en middleware de autenticación opcional:", error);
    // En caso de error, continuar sin autenticación
    req.userId = null;
    req.userEmail = null;
    next();
  }
};

module.exports = {
  verificarToken,
  verificarTokenOpcional,
};
