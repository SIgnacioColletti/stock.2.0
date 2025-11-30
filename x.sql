-- ============================================
-- SCHEMA PARA SISTEMA DE CONTROL DE STOCK
-- ============================================

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda rápida por email
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ============================================
-- TABLA: categorias
-- ============================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Color hex para UI
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda por usuario
CREATE INDEX idx_categorias_usuario ON categorias(usuario_id);

-- ============================================
-- TABLA: proveedores
-- ============================================
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    cuit VARCHAR(13),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda por usuario
CREATE INDEX idx_proveedores_usuario ON proveedores(usuario_id);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    codigo_barras VARCHAR(50) UNIQUE,
    sku VARCHAR(50),
    
    -- Información de stock
    stock_actual INTEGER DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INTEGER DEFAULT 5,
    unidad_medida VARCHAR(20) DEFAULT 'unidad', -- unidad, kg, litro, etc.
    
    -- Información de precios
    precio_compra DECIMAL(10, 2) DEFAULT 0,
    precio_venta DECIMAL(10, 2) NOT NULL,
    margen_ganancia DECIMAL(5, 2) GENERATED ALWAYS AS 
        (CASE 
            WHEN precio_compra > 0 THEN ((precio_venta - precio_compra) / precio_compra * 100)
            ELSE 0 
        END) STORED,
    
    -- Información de vencimiento
    fecha_vencimiento DATE,
    lote VARCHAR(50),
    
    -- Ubicación física
    ubicacion VARCHAR(100),
    
    -- Control
    activo BOOLEAN DEFAULT true,
    eliminado BOOLEAN DEFAULT false, -- Soft delete
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_productos_usuario ON productos(usuario_id);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_stock_minimo ON productos(stock_actual, stock_minimo);

-- ============================================
-- TABLA: movimientos
-- ============================================
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    motivo VARCHAR(50), -- compra, venta, merma, vencimiento, rotura, inventario, etc.
    
    -- Información adicional
    precio_unitario DECIMAL(10, 2),
    total DECIMAL(10, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    
    -- Stock antes y después del movimiento (para auditoría)
    stock_anterior INTEGER NOT NULL,
    stock_posterior INTEGER NOT NULL,
    
    -- Información de compra/venta
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    numero_factura VARCHAR(50),
    
    notas TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas de reportes
CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha_movimiento);
CREATE INDEX idx_movimientos_usuario ON movimientos(usuario_id);

-- ============================================
-- FUNCIÓN: Actualizar timestamp de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Actualización automática de updated_at
-- ============================================
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Puedes comentar esta sección si no quieres datos de prueba

-- Usuario de prueba (password: "admin123" - se hasheará en la app)
-- INSERT INTO usuarios (nombre, email, password, rol) VALUES
-- ('Administrador', 'admin@stock.com', 'admin123', 'admin');

COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema';
COMMENT ON TABLE categorias IS 'Categorías de productos';
COMMENT ON TABLE proveedores IS 'Proveedores de productos';
COMMENT ON TABLE productos IS 'Inventario de productos';
COMMENT ON TABLE movimientos IS 'Historial de movimientos de stock';