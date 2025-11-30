// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const movimientosContent = document.getElementById("movimientosContent");
const movimientosTableBody = document.getElementById("movimientosTableBody");

// Filtros
const searchProducto = document.getElementById("searchProducto");
const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");

// Stats
const totalMovimientosEl = document.getElementById("totalMovimientos");
const totalEntradasEl = document.getElementById("totalEntradas");
const totalSalidasEl = document.getElementById("totalSalidas");
const totalAjustesEl = document.getElementById("totalAjustes");

// Modal movimiento
const movimientoModal = document.getElementById("movimientoModal");
const movimientoForm = document.getElementById("movimientoForm");
const tipoMovimiento = document.getElementById("tipoMovimiento");
const productoId = document.getElementById("productoId");
const cantidad = document.getElementById("cantidad");
const motivo = document.getElementById("motivo");
const observaciones = document.getElementById("observaciones");
const stockDisponibleHint = document.getElementById("stockDisponibleHint");

// Modal detalle
const detalleModal = document.getElementById("detalleModal");
const detalleContent = document.getElementById("detalleContent");

// Variables de estado
let movimientos = [];
let movimientosFiltrados = [];
let productos = [];
let tabActual = "todos";

// Motivos por tipo
const motivosPorTipo = {
  entrada: ["compra", "devolución", "ajuste positivo", "otro"],
  salida: ["venta", "merma", "vencimiento", "rotura", "otro"],
  ajuste: ["inventario", "corrección", "otro"],
};

// Cargar productos para el select
const loadProductos = async () => {
  try {
    const response = await productosAPI.getAll({ limite: 1000 });
    if (response.success) {
      productos = response.data || [];

      productoId.innerHTML =
        '<option value="">Seleccione un producto</option>' +
        productos
          .filter((p) => p.activo)
          .map(
            (p) =>
              `<option value="${p.id}" data-stock="${p.stock_actual}">${p.nombre} (Stock: ${p.stock_actual})</option>`
          )
          .join("");
    }
  } catch (error) {
    console.error("❌ Error al cargar productos:", error);
  }
};

// Cargar movimientos
const loadMovimientos = async () => {
  try {
    loadingDiv.style.display = "block";
    movimientosContent.style.display = "none";

    console.log("📋 Cargando movimientos...");

    const response = await movimientosAPI.getAll();

    if (response.success) {
      movimientos = Array.isArray(response.data) ? response.data : [];
      aplicarFiltros();

      console.log(`✅ ${movimientos.length} movimientos cargados`);
    }

    loadingDiv.style.display = "none";
    movimientosContent.style.display = "block";
  } catch (error) {
    console.error("❌ Error al cargar movimientos:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al cargar movimientos</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadMovimientos()">
                    🔄 Reintentar
                </button>
            </div>
        `;
  }
};

// Aplicar filtros
const aplicarFiltros = () => {
  let filtered = [...movimientos];

  // Filtrar por tab actual
  if (tabActual !== "todos") {
    filtered = filtered.filter((m) => m.tipo_movimiento === tabActual);
  }

  // Filtrar por búsqueda
  const busqueda = searchProducto.value.toLowerCase().trim();
  if (busqueda) {
    filtered = filtered.filter(
      (m) =>
        m.producto_nombre?.toLowerCase().includes(busqueda) ||
        m.codigo_barras?.toLowerCase().includes(busqueda)
    );
  }

  // Filtrar por fechas
  if (fechaDesde.value) {
    const desde = new Date(fechaDesde.value);
    filtered = filtered.filter((m) => new Date(m.fecha_movimiento) >= desde);
  }

  if (fechaHasta.value) {
    const hasta = new Date(fechaHasta.value);
    hasta.setHours(23, 59, 59);
    filtered = filtered.filter((m) => new Date(m.fecha_movimiento) <= hasta);
  }

  movimientosFiltrados = filtered;
  updateStats();
  renderMovimientos();
};

// Actualizar estadísticas
const updateStats = () => {
  const entradas = movimientos.filter(
    (m) => m.tipo_movimiento === "entrada"
  ).length;
  const salidas = movimientos.filter(
    (m) => m.tipo_movimiento === "salida"
  ).length;
  const ajustes = movimientos.filter(
    (m) => m.tipo_movimiento === "ajuste"
  ).length;

  totalMovimientosEl.textContent = movimientos.length;
  totalEntradasEl.textContent = entradas;
  totalSalidasEl.textContent = salidas;
  totalAjustesEl.textContent = ajustes;
};

// Renderizar tabla de movimientos
const renderMovimientos = () => {
  if (
    !Array.isArray(movimientosFiltrados) ||
    movimientosFiltrados.length === 0
  ) {
    movimientosTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    No se encontraron movimientos
                </td>
            </tr>
        `;
    return;
  }

  movimientosTableBody.innerHTML = movimientosFiltrados
    .map((mov) => {
      const fecha = new Date(mov.fecha_movimiento).toLocaleString("es-AR");

      let tipoClass = "";
      let tipoTexto = "";
      switch (mov.tipo_movimiento) {
        case "entrada":
          tipoClass = "tipo-entrada";
          tipoTexto = "📥 Entrada";
          break;
        case "salida":
          tipoClass = "tipo-salida";
          tipoTexto = "📤 Salida";
          break;
        case "ajuste":
          tipoClass = "tipo-ajuste";
          tipoTexto = "🔧 Ajuste";
          break;
      }

      return `
            <tr>
                <td>${fecha}</td>
                <td>
                    <strong>${
                      mov.producto_nombre || "Producto eliminado"
                    }</strong>
                    ${
                      mov.codigo_barras
                        ? `<br><small style="color: var(--gray);">${mov.codigo_barras}</small>`
                        : ""
                    }
                </td>
                <td>
                    <span class="badge ${tipoClass}">
                        ${tipoTexto}
                    </span>
                </td>
                <td>${mov.motivo || "-"}</td>
                <td><strong>${mov.cantidad}</strong></td>
                <td>${mov.stock_anterior}</td>
                <td>${mov.stock_posterior}</td>
                <td>${mov.usuario_email || "-"}</td>
                <td>
                    <button 
                        class="btn btn-small" 
                        style="background: var(--info); color: white;"
                        onclick="verDetalle(${mov.id})"
                        title="Ver detalle"
                    >
                        👁️
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
};

// Cambiar tab
const cambiarTab = (tipo) => {
  tabActual = tipo;

  // Actualizar UI de tabs
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .getElementById(`tab${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`)
    .classList.add("active");

  if (tipo === "todos") {
    document.getElementById("tabTodos").classList.add("active");
  }

  aplicarFiltros();
};

// Limpiar filtros
const limpiarFiltros = () => {
  searchProducto.value = "";
  fechaDesde.value = "";
  fechaHasta.value = "";
  aplicarFiltros();
};

// Listeners de filtros
searchProducto.addEventListener("input", aplicarFiltros);
fechaDesde.addEventListener("change", aplicarFiltros);
fechaHasta.addEventListener("change", aplicarFiltros);

// Mostrar modal de nuevo movimiento
const showNuevoMovimientoModal = async () => {
  movimientoForm.reset();
  await loadProductos();
  movimientoModal.style.display = "block";
  tipoMovimiento.focus();
};

// Actualizar formulario según tipo
const actualizarFormulario = () => {
  const tipo = tipoMovimiento.value;

  if (tipo) {
    const motivos = motivosPorTipo[tipo];
    motivo.innerHTML =
      '<option value="">Seleccione un motivo</option>' +
      motivos
        .map(
          (m) =>
            `<option value="${m}">${
              m.charAt(0).toUpperCase() + m.slice(1)
            }</option>`
        )
        .join("");
  } else {
    motivo.innerHTML = '<option value="">Seleccione un motivo</option>';
  }
};

// Actualizar stock disponible
const actualizarStockDisponible = () => {
  const selectedOption = productoId.options[productoId.selectedIndex];
  const stock = selectedOption.getAttribute("data-stock");

  if (stock !== null && tipoMovimiento.value === "salida") {
    stockDisponibleHint.textContent = `Stock disponible: ${stock} unidades`;
    stockDisponibleHint.style.color = "var(--info)";
    cantidad.max = stock;
  } else {
    stockDisponibleHint.textContent = "";
    cantidad.removeAttribute("max");
  }
};

// Manejar envío del formulario
movimientoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const tipo = tipoMovimiento.value;
  const producto = parseInt(productoId.value);
  const cant = parseInt(cantidad.value);
  const mot = motivo.value || null;
  const obs = observaciones.value.trim() || null;

  // Validaciones
  if (!tipo) {
    alert("❌ Debe seleccionar un tipo de movimiento");
    return;
  }

  if (!producto) {
    alert("❌ Debe seleccionar un producto");
    return;
  }

  if (cant <= 0) {
    alert("❌ La cantidad debe ser mayor a 0");
    return;
  }

  // Validar stock disponible para salidas
  if (tipo === "salida") {
    const selectedOption = productoId.options[productoId.selectedIndex];
    const stockDisponible = parseInt(selectedOption.getAttribute("data-stock"));

    if (cant > stockDisponible) {
      alert(`❌ No hay suficiente stock. Disponible: ${stockDisponible}`);
      return;
    }
  }

  try {
    const submitBtn = movimientoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando...";

    let response;

    // Llamar al endpoint correspondiente según el tipo
    switch (tipo) {
      case "entrada":
        response = await movimientosAPI.registrarEntrada(producto, cant, obs);
        break;
      case "salida":
        response = await movimientosAPI.registrarVenta(producto, cant, obs);
        break;
      case "ajuste":
        response = await movimientosAPI.registrarAjuste(
          producto,
          cant,
          mot,
          obs
        );
        break;
    }

    if (response.success) {
      alert(`✅ Movimiento registrado exitosamente`);
      closeMovimientoModal();
      await loadMovimientos();
    }
  } catch (error) {
    console.error("❌ Error al registrar movimiento:", error);
    alert("❌ Error al registrar el movimiento: " + error.message);
  } finally {
    const submitBtn = movimientoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Registrar Movimiento";
  }
});

// Ver detalle de movimiento
const verDetalle = async (id) => {
  try {
    const movimiento = movimientos.find((m) => m.id === id);

    if (!movimiento) {
      alert("❌ Movimiento no encontrado");
      return;
    }

    const fecha = new Date(movimiento.fecha_movimiento).toLocaleString("es-AR");

    let tipoTexto = "";
    let tipoColor = "";
    switch (movimiento.tipo_movimiento) {
      case "entrada":
        tipoTexto = "📥 Entrada";
        tipoColor = "#10b981";
        break;
      case "salida":
        tipoTexto = "📤 Salida";
        tipoColor = "#ef4444";
        break;
      case "ajuste":
        tipoTexto = "🔧 Ajuste";
        tipoColor = "#3b82f6";
        break;
    }

    detalleContent.innerHTML = `
            <div style="padding: 20px 0;">
                <div style="margin-bottom: 20px; padding: 15px; background: ${tipoColor}15; border-left: 4px solid ${tipoColor}; border-radius: 4px;">
                    <h3 style="color: ${tipoColor}; margin: 0;">${tipoTexto}</h3>
                </div>
                
                <div style="display: grid; gap: 15px;">
                    <div>
                        <strong style="color: var(--gray);">Producto:</strong><br>
                        <span style="font-size: 1.1rem;">${
                          movimiento.producto_nombre
                        }</span>
                        ${
                          movimiento.codigo_barras
                            ? `<br><small style="color: var(--gray);">Código: ${movimiento.codigo_barras}</small>`
                            : ""
                        }
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong style="color: var(--gray);">Cantidad:</strong><br>
                            <span style="font-size: 1.5rem; font-weight: bold;">${
                              movimiento.cantidad
                            }</span>
                        </div>
                        <div>
                            <strong style="color: var(--gray);">Motivo:</strong><br>
                            <span>${movimiento.motivo || "-"}</span>
                        </div>
                    </div>
                    
                    <div style="background: var(--light-gray); padding: 15px; border-radius: 8px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                            <div>
                                <small style="color: var(--gray);">Stock Anterior</small><br>
                                <strong style="font-size: 1.2rem;">${
                                  movimiento.stock_anterior
                                }</strong>
                            </div>
                            <div>
                                <small style="color: var(--gray);">Movimiento</small><br>
                                <strong style="font-size: 1.2rem; color: ${tipoColor};">
                                    ${
                                      movimiento.tipo_movimiento === "entrada"
                                        ? "+"
                                        : "-"
                                    }${movimiento.cantidad}
                                </strong>
                            </div>
                            <div>
                                <small style="color: var(--gray);">Stock Posterior</small><br>
                                <strong style="font-size: 1.2rem;">${
                                  movimiento.stock_posterior
                                }</strong>
                            </div>
                        </div>
                    </div>
                    
                    ${
                      movimiento.notas
                        ? `
                        <div>
                            <strong style="color: var(--gray);">Observaciones:</strong><br>
                            <p style="background: var(--light-gray); padding: 10px; border-radius: 4px; margin: 5px 0;">${movimiento.notas}</p>
                        </div>
                    `
                        : ""
                    }
                    
                    <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 10px;">
                        <small style="color: var(--gray);">
                            Registrado por: <strong>${
                              movimiento.usuario_email || "Sistema"
                            }</strong><br>
                            Fecha: <strong>${fecha}</strong>
                        </small>
                    </div>
                </div>
            </div>
        `;

    detalleModal.style.display = "block";
  } catch (error) {
    console.error("❌ Error al ver detalle:", error);
    alert("Error al cargar el detalle del movimiento");
  }
};

// Cerrar modales
const closeMovimientoModal = () => {
  movimientoModal.style.display = "none";
  movimientoForm.reset();
};

const closeDetalleModal = () => {
  detalleModal.style.display = "none";
};

// Cerrar modal al hacer click fuera
window.onclick = (event) => {
  if (event.target === movimientoModal) {
    closeMovimientoModal();
  }
  if (event.target === detalleModal) {
    closeDetalleModal();
  }
};

// Cerrar modal con ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (movimientoModal.style.display === "block") {
      closeMovimientoModal();
    }
    if (detalleModal.style.display === "block") {
      closeDetalleModal();
    }
  }
});

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando gestión de movimientos...");
  loadMovimientos();
});
