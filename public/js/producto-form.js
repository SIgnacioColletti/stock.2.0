// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const pageTitle = document.getElementById("pageTitle");
const productoForm = document.getElementById("productoForm");
const productoId = document.getElementById("productoId");
const nombre = document.getElementById("nombre");
const codigoBarras = document.getElementById("codigoBarras");
const categoriaId = document.getElementById("categoriaId");
const proveedorId = document.getElementById("proveedorId");
const descripcion = document.getElementById("descripcion");
const precioCompra = document.getElementById("precioCompra");
const precioVenta = document.getElementById("precioVenta");
const stockActual = document.getElementById("stockActual");
const stockMinimo = document.getElementById("stockMinimo");
const fechaVencimiento = document.getElementById("fechaVencimiento");
const activo = document.getElementById("activo");

// Preview de ganancia
const gananciaPreview = document.getElementById("gananciaPreview");
const gananciaUnitaria = document.getElementById("gananciaUnitaria");
const margenPorcentaje = document.getElementById("margenPorcentaje");

// Variables
let modoEdicion = false;

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

// Cargar categorías y proveedores
const loadSelects = async () => {
  try {
    // Cargar categorías
    const categoriasResponse = await categoriasAPI.getAll();
    if (categoriasResponse.success) {
      const categorias = categoriasResponse.data || [];
      categoriaId.innerHTML =
        '<option value="">Seleccione una categoría</option>' +
        categorias
          .filter((c) => c.activo)
          .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
          .join("");
    }

    // Cargar proveedores
    const proveedoresResponse = await proveedoresAPI.getAll();
    if (proveedoresResponse.success) {
      const proveedores = proveedoresResponse.data || [];
      proveedorId.innerHTML =
        '<option value="">Sin proveedor</option>' +
        proveedores
          .filter((p) => p.activo)
          .map((p) => `<option value="${p.id}">${p.nombre}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("❌ Error al cargar selects:", error);
  }
};

// Calcular ganancia en tiempo real
const calcularGanancia = () => {
  const compra = parseFloat(precioCompra.value) || 0;
  const venta = parseFloat(precioVenta.value) || 0;

  if (compra > 0 && venta > 0) {
    const ganancia = venta - compra;
    const margen = ((ganancia / compra) * 100).toFixed(2);

    gananciaUnitaria.textContent = formatCurrency(ganancia);
    margenPorcentaje.textContent = `${margen}%`;

    // Cambiar color según rentabilidad
    if (margen < 0) {
      margenPorcentaje.style.color = "var(--danger)";
    } else if (margen < 20) {
      margenPorcentaje.style.color = "var(--warning)";
    } else {
      margenPorcentaje.style.color = "var(--success)";
    }

    gananciaPreview.style.display = "block";
  } else {
    gananciaPreview.style.display = "none";
  }
};

// Listeners para cálculo en tiempo real
precioCompra.addEventListener("input", calcularGanancia);
precioVenta.addEventListener("input", calcularGanancia);

// Cargar producto si es edición
const loadProducto = async (id) => {
  try {
    console.log(`📦 Cargando producto ID: ${id}`);

    const response = await productosAPI.getById(id);

    if (response.success) {
      const producto = response.data;

      modoEdicion = true;
      pageTitle.textContent = "Editar Producto";

      productoId.value = producto.id;
      nombre.value = producto.nombre;
      codigoBarras.value = producto.codigo_barras || "";
      categoriaId.value = producto.categoria_id || "";
      proveedorId.value = producto.proveedor_id || "";
      descripcion.value = producto.descripcion || "";
      precioCompra.value = producto.precio_compra;
      precioVenta.value = producto.precio_venta;
      stockActual.value = producto.stock_actual;
      stockMinimo.value = producto.stock_minimo;

      if (producto.fecha_vencimiento) {
        const fecha = new Date(producto.fecha_vencimiento);
        fechaVencimiento.value = fecha.toISOString().split("T")[0];
      }

      activo.checked = producto.activo;

      calcularGanancia();
    }
  } catch (error) {
    console.error("❌ Error al cargar producto:", error);
    alert("Error al cargar el producto");
    window.location.href = "/productos.html";
  }
};

// Manejar envío del formulario
productoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validaciones
  if (nombre.value.trim() === "") {
    alert("❌ El nombre del producto es obligatorio");
    nombre.focus();
    return;
  }

  if (!categoriaId.value) {
    alert("❌ Debe seleccionar una categoría");
    categoriaId.focus();
    return;
  }

  const compra = parseFloat(precioCompra.value);
  const venta = parseFloat(precioVenta.value);

  if (compra <= 0) {
    alert("❌ El precio de compra debe ser mayor a 0");
    precioCompra.focus();
    return;
  }

  if (venta <= 0) {
    alert("❌ El precio de venta debe ser mayor a 0");
    precioVenta.focus();
    return;
  }

  if (venta < compra) {
    const confirmar = confirm(
      "⚠️ ADVERTENCIA\n\n" +
        "El precio de venta es menor al precio de compra.\n" +
        "Esto generará pérdidas.\n\n" +
        "¿Desea continuar de todos modos?"
    );
    if (!confirmar) return;
  }

  if (parseInt(stockActual.value) < 0) {
    alert("❌ El stock actual no puede ser negativo");
    stockActual.focus();
    return;
  }

  try {
    const submitBtn = productoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    const data = {
      nombre: nombre.value.trim(),
      codigo_barras: codigoBarras.value.trim() || null,
      categoria_id: parseInt(categoriaId.value),
      proveedor_id: proveedorId.value ? parseInt(proveedorId.value) : null,
      descripcion: descripcion.value.trim() || null,
      precio_compra: compra,
      precio_venta: venta,
      stock_actual: parseInt(stockActual.value),
      stock_minimo: parseInt(stockMinimo.value),
      fecha_vencimiento: fechaVencimiento.value || null,
      activo: activo.checked,
    };

    let response;

    if (modoEdicion) {
      response = await productosAPI.update(productoId.value, data);
    } else {
      response = await productosAPI.create(data);
    }

    if (response.success) {
      alert(
        `✅ Producto ${modoEdicion ? "actualizado" : "creado"} exitosamente`
      );
      window.location.href = "/productos.html";
    }
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    alert("❌ Error al guardar el producto: " + error.message);
  } finally {
    const submitBtn = productoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Guardar Producto";
  }
});

// Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando formulario de producto...");

  await loadSelects();

  // Verificar si es edición (viene de URL)
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  if (id) {
    await loadProducto(id);
  }
});
