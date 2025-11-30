// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const productosContent = document.getElementById("productosContent");
const productosTableBody = document.getElementById("productosTableBody");
const searchInput = document.getElementById("searchInput");
const paginationInfo = document.getElementById("paginationInfo");

// Modal de venta
const ventaModal = document.getElementById("ventaModal");
const ventaForm = document.getElementById("ventaForm");
const ventaProductoId = document.getElementById("ventaProductoId");
const ventaProductoNombre = document.getElementById("ventaProductoNombre");
const ventaStockDisponible = document.getElementById("ventaStockDisponible");
const ventaCantidad = document.getElementById("ventaCantidad");
const ventaObservaciones = document.getElementById("ventaObservaciones");

// Variables de estado
let productos = [];
let stockDisponible = 0;

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

// Cargar productos
const loadProductos = async (termino = "") => {
  try {
    loadingDiv.style.display = "block";
    productosContent.style.display = "none";

    let response;

    if (termino.trim()) {
      response = await productosAPI.search({ termino, limite: 50 });
    } else {
      response = await productosAPI.getAll({ limite: 50 });
    }

    if (response.success) {
      productos = response.data;
      console.log("RESPONSE:", response);
      console.log("DATA:", response.data);
      console.log("ES ARRAY?", Array.isArray(response.data));

      renderProductos();

      if (response.pagination) {
        paginationInfo.textContent = `
                    Mostrando ${productos.length} de ${response.pagination.total_productos} productos
                `;
      } else {
        paginationInfo.textContent = `Total: ${productos.length} productos`;
      }
    }

    loadingDiv.style.display = "none";
    productosContent.style.display = "block";
  } catch (error) {
    console.error("Error al cargar productos:", error);
    loadingDiv.innerHTML = `
            <p style="color: var(--danger);">
                ❌ Error al cargar productos: ${error.message}
            </p>
            <button class="btn btn-primary" onclick="loadProductos()">
                Reintentar
            </button>
        `;
  }
};

// Renderizar tabla de productos
const renderProductos = () => {
  if (productos.length === 0) {
    productosTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    No se encontraron productos
                </td>
            </tr>
        `;
    return;
  }

  productosTableBody.innerHTML = productos
    .map((producto) => {
      const margen =
        producto.margen_porcentaje ||
        (
          ((producto.precio_venta - producto.precio_compra) /
            producto.precio_compra) *
          100
        ).toFixed(2);

      let stockClass = "";
      if (producto.stock_actual === 0) {
        stockClass = 'style="color: var(--danger); font-weight: bold;"';
      } else if (producto.stock_actual <= producto.stock_minimo) {
        stockClass = 'style="color: var(--warning); font-weight: bold;"';
      }

      return `
            <tr>
                <td>${producto.codigo_barras || "-"}</td>
                <td>${producto.nombre}</td>
                <td>${producto.categoria || "Sin categoría"}</td>
                <td ${stockClass}>
                    ${producto.stock_actual} / ${producto.stock_minimo}
                </td>
                <td>${formatCurrency(producto.precio_compra)}</td>
                <td>${formatCurrency(producto.precio_venta)}</td>
                <td>${margen}%</td>
                <td>
                    <button 
                        class="btn btn-success btn-small" 
                        onclick="showVentaModal(${producto.id}, '${
        producto.nombre
      }', ${producto.stock_actual})"
                        ${producto.stock_actual === 0 ? "disabled" : ""}
                    >
                        🛒 Vender
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
};

// Buscar productos
const buscarProductos = () => {
  const termino = searchInput.value;
  loadProductos(termino);
};

// Buscar al presionar Enter
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    buscarProductos();
  }
});

// Mostrar modal de venta
const showVentaModal = (productoId, nombre, stock) => {
  ventaProductoId.value = productoId;
  ventaProductoNombre.textContent = nombre;
  ventaStockDisponible.textContent = stock;
  stockDisponible = stock;

  ventaCantidad.value = "";
  ventaCantidad.max = stock;
  ventaObservaciones.value = "";

  ventaModal.style.display = "block";
};

// Cerrar modal de venta
const closeVentaModal = () => {
  ventaModal.style.display = "none";
};

// Cerrar modal al hacer click fuera
window.onclick = (event) => {
  if (event.target === ventaModal) {
    closeVentaModal();
  }
};

// Manejar formulario de venta
ventaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const productoId = parseInt(ventaProductoId.value);
  const cantidad = parseInt(ventaCantidad.value);
  const observaciones = ventaObservaciones.value;

  // Validaciones
  if (cantidad <= 0) {
    alert("❌ La cantidad debe ser mayor a 0");
    return;
  }

  if (cantidad > stockDisponible) {
    alert(`❌ No hay suficiente stock. Disponible: ${stockDisponible}`);
    return;
  }

  try {
    const submitBtn = ventaForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando...";

    const response = await movimientosAPI.registrarVenta(
      productoId,
      cantidad,
      observaciones
    );

    if (response.success) {
      alert("✅ Venta registrada exitosamente");
      closeVentaModal();
      loadProductos(searchInput.value); // Recargar productos
    }
  } catch (error) {
    console.error("Error al registrar venta:", error);
    alert("❌ Error al registrar venta: " + error.message);
  } finally {
    const submitBtn = ventaForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "Registrar Venta";
  }
});

// Función placeholder para agregar producto (futuro)
const showAddProductModal = () => {
  alert(
    "🚧 Funcionalidad en desarrollo. Usa Postman para agregar productos por ahora."
  );
};

// Cargar productos al iniciar
document.addEventListener("DOMContentLoaded", () => {
  loadProductos();
});
