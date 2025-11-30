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

    console.log("🔍 Cargando dashboard...");

    // Cargar datos en paralelo con manejo de errores individual
    const [dashboardData, alertasData, stockBajoData] =
      await Promise.allSettled([
        reportesAPI.getDashboard(),
        alertasAPI.getDashboard(),
        alertasAPI.getStockBajo(),
      ]);

    // Procesar dashboard general
    if (dashboardData.status === "fulfilled" && dashboardData.value.success) {
      const data = dashboardData.value.data;

      totalProductosEl.textContent = data.productos.activos || 0;
      valorInventarioEl.textContent = formatCurrency(
        data.inventario.valor_venta || 0
      );
      ventasHoyEl.textContent = formatCurrency(data.ventas.hoy.ingresos || 0);

      // Ventas del mes
      ingresosMesEl.textContent = formatCurrency(data.ventas.mes.ingresos || 0);
      costosMesEl.textContent = formatCurrency(data.ventas.mes.costos || 0);
      gananciaMesEl.textContent = formatCurrency(data.ventas.mes.ganancia || 0);
      transaccionesMesEl.textContent = data.ventas.mes.transacciones || 0;

      console.log("✅ Dashboard general cargado");
    } else {
      console.error("❌ Error en dashboard general:", dashboardData.reason);
      // Valores por defecto
      totalProductosEl.textContent = "0";
      valorInventarioEl.textContent = formatCurrency(0);
      ventasHoyEl.textContent = formatCurrency(0);
      ingresosMesEl.textContent = formatCurrency(0);
      costosMesEl.textContent = formatCurrency(0);
      gananciaMesEl.textContent = formatCurrency(0);
      transaccionesMesEl.textContent = "0";
    }

    // Procesar alertas
    if (alertasData.status === "fulfilled" && alertasData.value.success) {
      const data = alertasData.value.data;

      stockBajoEl.textContent = data.stock_bajo.total || 0;
      proximosVencerEl.textContent = data.proximos_vencer.total || 0;
      sinMovimientoEl.textContent = data.sin_movimiento.total || 0;
      alertasTotalEl.textContent = data.alertas_totales || 0;

      console.log("✅ Alertas cargadas");
    } else {
      console.error("❌ Error en alertas:", alertasData.reason);
      // Valores por defecto
      stockBajoEl.textContent = "0";
      proximosVencerEl.textContent = "0";
      sinMovimientoEl.textContent = "0";
      alertasTotalEl.textContent = "0";
    }

    // Procesar stock bajo
    if (stockBajoData.status === "fulfilled" && stockBajoData.value.success) {
      renderStockBajoTable(stockBajoData.value.data);
      console.log("✅ Stock bajo cargado");
    } else {
      console.error("❌ Error en stock bajo:", stockBajoData.reason);
      renderStockBajoTable([]);
    }

    loadingDiv.style.display = "none";
    dashboardContent.style.display = "block";

    console.log("✅ Dashboard completamente cargado");
  } catch (error) {
    console.error("❌ Error crítico al cargar dashboard:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al cargar el dashboard</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    🔄 Recargar Página
                </button>
            </div>
        `;
  }
};

// Renderizar tabla de productos con stock bajo
const renderStockBajoTable = (productos) => {
  if (!productos || productos.length === 0) {
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
      let nivelTexto = producto.nivel_alerta || "ADVERTENCIA";

      if (nivelTexto === "CRÍTICO") {
        badgeClass = "badge-danger";
      } else if (nivelTexto === "URGENTE") {
        badgeClass = "badge-warning";
      }

      return `
            <tr>
                <td>${producto.nombre || "Sin nombre"}</td>
                <td>${producto.stock_actual || 0}</td>
                <td>${producto.stock_minimo || 0}</td>
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
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando carga del dashboard...");
  loadDashboard();
});
