// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const dashboardContent = document.getElementById("dashboardContent");

// Elementos de estadísticas
const totalProductosEl = document.getElementById("totalProductos");
const valorInventarioEl = document.getElementById("valorInventario");
const alertasTotalEl = document.getElementById("alertasTotal");
const ventasHoyEl = document.getElementById("ventasHoy");

// Elementos de alertas
const stockBajoEl = document.getElementById("stockBajo");
const proximosVencerEl = document.getElementById("proximosVencer");
const sinMovimientoEl = document.getElementById("sinMovimiento");

// Elementos de ventas
const ingresosMesEl = document.getElementById("ingresosMes");
const costosMesEl = document.getElementById("costosMes");
const gananciaMesEl = document.getElementById("gananciaMes");
const transaccionesMesEl = document.getElementById("transaccionesMes");

// Tabla de productos con stock bajo
const productosStockBajoTbody = document.getElementById("productosStockBajo");

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

// Cargar dashboard
const loadDashboard = async () => {
  try {
    loadingDiv.style.display = "block";
    dashboardContent.style.display = "none";

    // Cargar datos en paralelo
    const [dashboardData, alertasData, stockBajoData] = await Promise.all([
      reportesAPI.getDashboard(),
      alertasAPI.getDashboard(),
      alertasAPI.getStockBajo(),
    ]);

    // Actualizar estadísticas generales
    if (dashboardData.success) {
      const data = dashboardData.data;

      totalProductosEl.textContent = data.productos.activos;
      valorInventarioEl.textContent = formatCurrency(
        data.inventario.valor_venta
      );
      ventasHoyEl.textContent = formatCurrency(data.ventas.hoy.ingresos);

      // Ventas del mes
      ingresosMesEl.textContent = formatCurrency(data.ventas.mes.ingresos);
      costosMesEl.textContent = formatCurrency(data.ventas.mes.costos);
      gananciaMesEl.textContent = formatCurrency(data.ventas.mes.ganancia);
      transaccionesMesEl.textContent = data.ventas.mes.transacciones;
    }

    // Actualizar alertas
    if (alertasData.success) {
      const data = alertasData.data;

      stockBajoEl.textContent = data.stock_bajo.total;
      proximosVencerEl.textContent = data.proximos_vencer.total;
      sinMovimientoEl.textContent = data.sin_movimiento.total;
      alertasTotalEl.textContent = data.alertas_totales;
    }

    // Actualizar tabla de productos con stock bajo
    if (stockBajoData.success) {
      renderStockBajoTable(stockBajoData.data);
    }

    loadingDiv.style.display = "none";
    dashboardContent.style.display = "block";
  } catch (error) {
    console.error("Error al cargar dashboard:", error);
    loadingDiv.innerHTML = `
            <p style="color: var(--danger);">
                ❌ Error al cargar el dashboard: ${error.message}
            </p>
            <button class="btn btn-primary" onclick="loadDashboard()">
                Reintentar
            </button>
        `;
  }
};

// Renderizar tabla de productos con stock bajo
const renderStockBajoTable = (productos) => {
  if (productos.length === 0) {
    productosStockBajoTbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    ✅ No hay productos con stock bajo
                </td>
            </tr>
        `;
    return;
  }

  // Mostrar solo los primeros 10
  const productosLimitados = productos.slice(0, 10);

  productosStockBajoTbody.innerHTML = productosLimitados
    .map((producto) => {
      let badgeClass = "badge-warning";
      let nivelTexto = producto.nivel_alerta;

      if (producto.nivel_alerta === "CRÍTICO") {
        badgeClass = "badge-danger";
      }

      return `
            <tr>
                <td>${producto.nombre}</td>
                <td>${producto.stock_actual}</td>
                <td>${producto.stock_minimo}</td>
                <td>
                    <span class="badge ${badgeClass}">
                        ${nivelTexto}
                    </span>
                </td>
                <td>${producto.proveedor || "Sin proveedor"}</td>
            </tr>
        `;
    })
    .join("");
};

// Cargar el dashboard al cargar la página
document.addEventListener("DOMContentLoaded", loadDashboard);
