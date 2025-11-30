// Importar el cliente de PostgreSQL y dotenv
const { Pool } = require("pg");
require("dotenv").config();

// Crear pool de conexiones a la base de datos
// El pool maneja múltiples conexiones de forma eficiente
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Configuración adicional para producción
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // Tiempo máximo de espera para conectar
});

// Evento cuando se establece una nueva conexión
pool.on("connect", () => {
  console.log("✅ Conexión a PostgreSQL establecida");
});

// Evento cuando hay un error en el pool
pool.on("error", (err) => {
  console.error("❌ Error inesperado en el cliente de PostgreSQL:", err);
  process.exit(-1);
});

// Función helper para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("🔍 Query ejecutada:", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("❌ Error en query:", error);
    throw error;
  }
};

// Función para obtener un cliente del pool (para transacciones)
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Timeout de 5 segundos para las transacciones
  const timeout = setTimeout(() => {
    console.error("⚠️ Cliente de DB no liberado después de 5 segundos");
  }, 5000);

  // Sobrescribir el método release para limpiar el timeout
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release.apply(client);
  };

  return client;
};

module.exports = {
  query,
  getClient,
  pool,
};
