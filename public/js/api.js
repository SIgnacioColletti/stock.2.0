// Configuración de la API
const API_URL = "http://localhost:3000/api";

// Obtener el token del localStorage
const getToken = () => {
  return localStorage.getItem("token");
};

// Guardar el token en localStorage
const setToken = (token) => {
  localStorage.setItem("token", token);
};

// Guardar email del usuario
const setUserEmail = (email) => {
  localStorage.setItem("userEmail", email);
};

// Obtener email del usuario
const getUserEmail = () => {
  return localStorage.getItem("userEmail");
};

// Eliminar el token (logout)
const removeToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
};

// Verificar si el usuario está autenticado
const isAuthenticated = () => {
  return !!getToken();
};

// Realizar petición a la API
const apiRequest = async (endpoint, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
  };

  // Agregar token si existe
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    // Si el token expiró o es inválido, redirigir al login
    if (response.status === 401) {
      removeToken();
      window.location.href = "/login.html";
      throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || "Error en la petición");
    }

    return data;
  } catch (error) {
    console.error("Error en apiRequest:", error);
    throw error;
  }
};

// API de Autenticación
const authAPI = {
  // Registro
  register: async (nombre, email, password) => {
    return await apiRequest("/auth/registro", "POST", {
      nombre,
      email,
      password,
    });
  },

  // Login
  login: async (email, password) => {
    const response = await apiRequest("/auth/login", "POST", {
      email,
      password,
    });

    // Guardar token y email
    if (response.success && response.data.token) {
      setToken(response.data.token);
      setUserEmail(response.data.usuario.email);
    }

    return response;
  },

  // Obtener perfil
  getProfile: async () => {
    return await apiRequest("/auth/perfil", "GET");
  },
};

// API de Productos
const productosAPI = {
  // Listar productos
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(
      `/productos${queryString ? "?" + queryString : ""}`,
      "GET"
    );
  },

  // Obtener un producto
  getById: async (id) => {
    return await apiRequest(`/productos/${id}`, "GET");
  },

  // Crear producto
  create: async (producto) => {
    return await apiRequest("/productos", "POST", producto);
  },

  // Actualizar producto
  update: async (id, producto) => {
    return await apiRequest(`/productos/${id}`, "PUT", producto);
  },

  // Eliminar producto
  delete: async (id) => {
    return await apiRequest(`/productos/${id}`, "DELETE");
  },

  // Búsqueda avanzada
  search: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(`/productos/buscar?${queryString}`, "GET");
  },
};

// API de Categorías

const categoriasAPI = {
  getAll: async () => {
    return await apiRequest("/categorias", "GET");
  },

  getById: async (id) => {
    return await apiRequest(`/categorias/${id}`, "GET");
  },

  create: async (categoria) => {
    return await apiRequest("/categorias", "POST", categoria);
  },

  update: async (id, categoria) => {
    return await apiRequest(`/categorias/${id}`, "PUT", categoria);
  },

  delete: async (id) => {
    return await apiRequest(`/categorias/${id}`, "DELETE");
  },
};

// API de Movimientos
const movimientosAPI = {
  // Registrar venta (salida de stock)
  registrarVenta: async (producto_id, cantidad, observaciones = "") => {
    return await apiRequest("/movimientos", "POST", {
      producto_id,
      tipo_movimiento: "salida",
      cantidad,
      motivo: "venta",
      observaciones,
    });
  },

  // Registrar compra (entrada de stock)
  registrarCompra: async (producto_id, cantidad, observaciones = "") => {
    return await apiRequest("/movimientos", "POST", {
      producto_id,
      tipo_movimiento: "entrada",
      cantidad,
      motivo: "compra",
      observaciones,
    });
  },

  // Obtener historial
  getHistorial: async (producto_id) => {
    return await apiRequest(`/movimientos/producto/${producto_id}`, "GET");
  },
};

// API de Reportes
const reportesAPI = {
  // Dashboard general
  getDashboard: async () => {
    return await apiRequest("/reportes/dashboard", "GET");
  },

  // Productos más vendidos
  getMasVendidos: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(
      `/reportes/mas-vendidos${queryString ? "?" + queryString : ""}`,
      "GET"
    );
  },

  // Rentabilidad
  getRentabilidad: async () => {
    return await apiRequest("/reportes/rentabilidad", "GET");
  },
};

// API de Alertas
const alertasAPI = {
  // Dashboard de alertas
  getDashboard: async () => {
    return await apiRequest("/alertas/dashboard", "GET");
  },

  // Stock bajo
  getStockBajo: async () => {
    return await apiRequest("/alertas/stock-bajo", "GET");
  },

  // Próximos a vencer
  getProximosVencer: async (dias = 7) => {
    return await apiRequest(`/alertas/proximos-vencer?dias=${dias}`, "GET");
  },

  // Sin movimiento
  getSinMovimiento: async (dias = 30) => {
    return await apiRequest(`/alertas/sin-movimiento?dias=${dias}`, "GET");
  },
};

// API de Proveedores
const proveedoresAPI = {
  getAll: async () => {
    return await apiRequest("/proveedores", "GET");
  },

  getListaCompras: async () => {
    return await apiRequest("/proveedores/lista-compras", "GET");
  },
};

// Función de logout global
const logout = () => {
  removeToken();
  window.location.href = "/login.html";
};

// Verificar autenticación en páginas protegidas
const checkAuth = () => {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
  }
};

// Mostrar email del usuario en el sidebar
const displayUserEmail = () => {
  const emailElement = document.getElementById("userEmail");
  if (emailElement) {
    emailElement.textContent = getUserEmail() || "Usuario";
  }
};
