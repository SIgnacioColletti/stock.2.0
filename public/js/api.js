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
const productosAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiRequest(
      `/productos${queryString ? "?" + queryString : ""}`,
      "GET"
    );
  },

  getById: async (id) => {
    return await apiRequest(`/productos/${id}`, "GET");
  },

  create: async (producto) => {
    return await apiRequest("/productos", "POST", producto);
  },

  update: async (id, producto) => {
    return await apiRequest(`/productos/${id}`, "PUT", producto);
  },

  delete: async (id) => {
    return await apiRequest(`/productos/${id}`, "DELETE");
  },

  search: async (params) => {
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
const movimientosAPI = {
  getAll: async () => {
    return await apiRequest("/movimientos", "GET");
  },

  getByProducto: async (productoId) => {
    return await apiRequest(`/movimientos/producto/${productoId}`, "GET");
  },

  registrarEntrada: async (productoId, cantidad, observaciones) => {
    return await apiRequest("/movimientos/entrada", "POST", {
      producto_id: productoId,
      cantidad,
      notas: observaciones,
    });
  },

  registrarVenta: async (productoId, cantidad, observaciones) => {
    return await apiRequest("/movimientos/salida", "POST", {
      producto_id: productoId,
      cantidad,
      notas: observaciones,
    });
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

  getById: async (id) => {
    return await apiRequest(`/proveedores/${id}`, "GET");
  },

  create: async (proveedor) => {
    return await apiRequest("/proveedores", "POST", proveedor);
  },

  update: async (id, proveedor) => {
    return await apiRequest(`/proveedores/${id}`, "PUT", proveedor);
  },

  delete: async (id) => {
    return await apiRequest(`/proveedores/${id}`, "DELETE");
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

// API de Productos (actualizar con nuevos métodos)
