# 🏪 Sistema de Control de Stock para Kioscos

Sistema web completo para la gestión de inventario de kioscos y almacenes locales.

## 📋 Características

### Gestión de Inventario

- ✅ CRUD completo de productos
- ✅ Categorización de productos
- ✅ Control de stock en tiempo real
- ✅ Registro de entradas y salidas
- ✅ Alertas de stock mínimo
- ✅ Productos próximos a vencer

### Reportes y Análisis

- ✅ Dashboard con métricas en tiempo real
- ✅ Productos más y menos vendidos
- ✅ Análisis de rentabilidad
- ✅ Reportes de ventas por período
- ✅ Ventas por categoría

### Proveedores

- ✅ Gestión de proveedores
- ✅ Lista de compras sugeridas
- ✅ Relación productos-proveedores

### Seguridad

- ✅ Autenticación con JWT
- ✅ Protección de rutas
- ✅ Encriptación de contraseñas

## 🛠️ Stack Tecnológico

### Backend

- Node.js v16+
- Express.js
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs

### Frontend

- HTML5
- CSS3
- JavaScript (Vanilla)

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd stock-kiosco
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

### 4. Configurar PostgreSQL

Crear la base de datos:

```sql
CREATE DATABASE stock_kiosco;
```

Ejecutar las migraciones (crear tablas):

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de categorías
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proveedores
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    direccion TEXT,
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    categoria_id INTEGER REFERENCES categorias(id),
    proveedor_id INTEGER REFERENCES proveedores(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo_barras VARCHAR(50) UNIQUE,
    precio_compra DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    fecha_vencimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de movimientos
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    producto_id INTEGER REFERENCES productos(id),
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
    cantidad INTEGER NOT NULL,
    motivo VARCHAR(50) NOT NULL,
    observaciones TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo_movimiento);
```

### 5. Iniciar el servidor

**Modo desarrollo:**

```bash
npm run dev
```

**Modo producción:**

```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 🚀 Uso

### Acceder a la aplicación

1. Abrir navegador en: `http://localhost:3000/login.html`
2. Crear una cuenta nueva
3. Iniciar sesión
4. ¡Listo para usar!

### Endpoints de la API

#### Autenticación

```
POST /api/auth/registro      - Registrar nuevo usuario
POST /api/auth/login         - Iniciar sesión
GET  /api/auth/perfil        - Obtener perfil (requiere token)
```

#### Productos

```
GET    /api/productos              - Listar productos
GET    /api/productos/buscar       - Búsqueda avanzada
GET    /api/productos/:id          - Obtener producto
POST   /api/productos              - Crear producto
PUT    /api/productos/:id          - Actualizar producto
DELETE /api/productos/:id          - Eliminar producto
```

#### Categorías

```
GET    /api/categorias             - Listar categorías
POST   /api/categorias             - Crear categoría
PUT    /api/categorias/:id         - Actualizar categoría
DELETE /api/categorias/:id         - Eliminar categoría
```

#### Movimientos

```
GET  /api/movimientos/producto/:id - Historial de producto
POST /api/movimientos              - Registrar movimiento
GET  /api/movimientos              - Listar movimientos
```

#### Alertas

```
GET /api/alertas/dashboard         - Dashboard de alertas
GET /api/alertas/stock-bajo        - Productos con stock bajo
GET /api/alertas/proximos-vencer   - Productos próximos a vencer
GET /api/alertas/sin-movimiento    - Productos sin movimiento
```

#### Reportes

```
GET /api/reportes/dashboard        - Dashboard general
GET /api/reportes/mas-vendidos     - Productos más vendidos
GET /api/reportes/menos-vendidos   - Productos menos vendidos
GET /api/reportes/rentabilidad     - Análisis de rentabilidad
GET /api/reportes/ventas-categoria - Ventas por categoría
```

#### Proveedores

```
GET    /api/proveedores            - Listar proveedores
GET    /api/proveedores/:id        - Obtener proveedor
POST   /api/proveedores            - Crear proveedor
PUT    /api/proveedores/:id        - Actualizar proveedor
DELETE /api/proveedores/:id        - Eliminar proveedor
GET    /api/proveedores/lista-compras - Lista de compras sugeridas
```

## 📱 Capturas de Pantalla

### Dashboard

![Dashboard](docs/dashboard.png)

### Gestión de Productos

![Productos](docs/productos.png)

## 🔒 Seguridad

- Contraseñas encriptadas con bcrypt
- Tokens JWT para autenticación
- Validación de datos en backend
- Protección contra inyección SQL
- CORS configurado

## 📈 Próximas Mejoras

- [ ] Gráficos y visualizaciones
- [ ] Exportar reportes a PDF/Excel
- [ ] Código de barras con escáner
- [ ] Notificaciones por email
- [ ] Modo offline
- [ ] App móvil
- [ ] Multi-sucursales
- [ ] Facturación integrada

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork del proyecto
2. Crear rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto es de código abierto bajo licencia MIT.

## 👨‍💻 Autor

Desarrollado por [Tu Nombre]

## 📞 Soporte

Para soporte, crear un issue en GitHub o contactar a: tu@email.com

---

⭐ Si este proyecto te fue útil, dale una estrella en GitHub!
