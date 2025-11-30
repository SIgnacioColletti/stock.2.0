// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const reportesContent = document.getElementById("reportesContent");

// Métricas
const metricIngresos = document.getElementById("metricIngresos");
const metricGanancia = document.getElementById("metricGanancia");
const metricUnidades = document.getElementById("metricUnidades");
const metricTransacciones = document.getElementById("metricTransacciones");

// Tablas
const tablaMasVendidos = document.getElementById("tablaMasVendidos");

// Variables globales
let charts = {};
let periodoActual = "mes";

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

// Colores para gráficos
const chartColors = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  teal: "#14b8a6",
};

const backgroundColors = [
  "rgba(99, 102, 241, 0.8)",
  "rgba(16, 185, 129, 0.8)",
  "rgba(245, 158, 11, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(59, 130, 246, 0.8)",
  "rgba(139, 92, 246, 0.8)",
  "rgba(236, 72, 153, 0.8)",
  "rgba(20, 184, 166, 0.8)",
];

// Cargar reportes
const loadReportes = async () => {
  try {
    loadingDiv.style.display = "block";
    reportesContent.style.display = "none";

    console.log("📊 Cargando reportes...");

    // Cargar datos en paralelo
    const [
      masVendidosRes,
      categoriasRes,
      rentabilidadRes,
      stockBajoRes,
      dashboardRes,
    ] = await Promise.allSettled([
      reportesAPI.getMasVendidos({ limite: 10 }),
      reportesAPI.getVentasPorCategoria(),
      reportesAPI.getRentabilidad(),
      alertasAPI.getStockBajo(),
      reportesAPI.getDashboard(),
    ]);

    // Procesar dashboard general
    if (dashboardRes.status === "fulfilled" && dashboardRes.value.success) {
      actualizarMetricas(dashboardRes.value.data);
    }

    // Procesar productos más vendidos
    if (masVendidosRes.status === "fulfilled" && masVendidosRes.value.success) {
      const productos = masVendidosRes.value.data || [];
      renderChartMasVendidos(productos);
      renderTablaMasVendidos(productos);
    } else {
      mostrarSinDatos("noDataMasVendidos", "chartMasVendidos");
    }

    // Procesar ventas por categoría
    if (categoriasRes.status === "fulfilled" && categoriasRes.value.success) {
      const categorias = categoriasRes.value.data || [];
      renderChartCategorias(categorias);
    } else {
      mostrarSinDatos("noDataCategorias", "chartCategorias");
    }

    // Procesar rentabilidad
    if (
      rentabilidadRes.status === "fulfilled" &&
      rentabilidadRes.value.success
    ) {
      const productos = rentabilidadRes.value.data || [];
      renderChartRentabilidad(productos);
    } else {
      mostrarSinDatos("noDataRentabilidad", "chartRentabilidad");
    }

    // Procesar stock bajo
    if (stockBajoRes.status === "fulfilled" && stockBajoRes.value.success) {
      const productos = stockBajoRes.value.data || [];
      renderChartStockBajo(productos);
    } else {
      mostrarSinDatos("noDataStockBajo", "chartStockBajo");
    }

    loadingDiv.style.display = "none";
    reportesContent.style.display = "block";

    console.log("✅ Reportes cargados exitosamente");
  } catch (error) {
    console.error("❌ Error al cargar reportes:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al cargar reportes</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadReportes()">
                    🔄 Reintentar
                </button>
            </div>
        `;
  }
};

// Actualizar métricas principales
const actualizarMetricas = (dashboard) => {
  const ventas = dashboard.ventas?.mes || {};

  metricIngresos.textContent = formatCurrency(ventas.ingresos || 0);
  metricGanancia.textContent = formatCurrency(ventas.ganancia || 0);
  metricUnidades.textContent = (ventas.unidades || 0).toLocaleString("es-AR");
  metricTransacciones.textContent = ventas.transacciones || 0;
};

// Gráfico de productos más vendidos (Barras)
const renderChartMasVendidos = (productos) => {
  if (!productos || productos.length === 0) {
    mostrarSinDatos("noDataMasVendidos", "chartMasVendidos");
    return;
  }

  ocultarSinDatos("noDataMasVendidos", "chartMasVendidos");

  const ctx = document.getElementById("chartMasVendidos");

  // Destruir gráfico anterior si existe
  if (charts.masVendidos) {
    charts.masVendidos.destroy();
  }

  charts.masVendidos = new Chart(ctx, {
    type: "bar",
    data: {
      labels: productos.map((p) =>
        p.nombre.length > 20 ? p.nombre.substring(0, 20) + "..." : p.nombre
      ),
      datasets: [
        {
          label: "Unidades Vendidas",
          data: productos.map((p) => parseInt(p.total_vendido || 0)),
          backgroundColor: chartColors.primary,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const producto = productos[context.dataIndex];
              return `Ingresos: ${formatCurrency(
                producto.ingresos_totales || 0
              )}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
};

// Gráfico de ventas por categoría (Donut)
const renderChartCategorias = (categorias) => {
  if (!categorias || categorias.length === 0) {
    mostrarSinDatos("noDataCategorias", "chartCategorias");
    return;
  }

  ocultarSinDatos("noDataCategorias", "chartCategorias");

  const ctx = document.getElementById("chartCategorias");

  if (charts.categorias) {
    charts.categorias.destroy();
  }

  charts.categorias = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categorias.map((c) => c.categoria),
      datasets: [
        {
          data: categorias.map((c) => parseFloat(c.ingresos_totales || 0)),
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 15,
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const categoria = categorias[context.dataIndex];
              return [
                `${context.label}: ${formatCurrency(context.raw)}`,
                `Unidades: ${categoria.unidades_vendidas}`,
                `Ganancia: ${formatCurrency(categoria.ganancia_total || 0)}`,
              ];
            },
          },
        },
      },
    },
  });
};

// Gráfico de rentabilidad (Barras horizontales)
const renderChartRentabilidad = (productos) => {
  if (!productos || productos.length === 0) {
    mostrarSinDatos("noDataRentabilidad", "chartRentabilidad");
    return;
  }

  ocultarSinDatos("noDataRentabilidad", "chartRentabilidad");

  // Top 10 por margen
  const top10 = productos
    .sort(
      (a, b) =>
        parseFloat(b.margen_porcentaje || 0) -
        parseFloat(a.margen_porcentaje || 0)
    )
    .slice(0, 10);

  const ctx = document.getElementById("chartRentabilidad");

  if (charts.rentabilidad) {
    charts.rentabilidad.destroy();
  }

  charts.rentabilidad = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top10.map((p) =>
        p.nombre.length > 25 ? p.nombre.substring(0, 25) + "..." : p.nombre
      ),
      datasets: [
        {
          label: "Margen de Ganancia (%)",
          data: top10.map((p) => parseFloat(p.margen_porcentaje || 0)),
          backgroundColor: top10.map((p) => {
            const margen = parseFloat(p.margen_porcentaje || 0);
            if (margen >= 50) return chartColors.success;
            if (margen >= 30) return chartColors.primary;
            if (margen >= 15) return chartColors.warning;
            return chartColors.danger;
          }),
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const producto = top10[context.dataIndex];
              return [
                `Ganancia unitaria: ${formatCurrency(
                  producto.ganancia_unitaria || 0
                )}`,
                `Stock actual: ${producto.stock_actual}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => value + "%",
          },
        },
      },
    },
  });
};

// Gráfico de stock bajo (Barras)
const renderChartStockBajo = (productos) => {
  if (!productos || productos.length === 0) {
    mostrarSinDatos("noDataStockBajo", "chartStockBajo");
    return;
  }

  ocultarSinDatos("noDataStockBajo", "chartStockBajo");

  // Limitar a 10 productos
  const top10 = productos.slice(0, 10);

  const ctx = document.getElementById("chartStockBajo");

  if (charts.stockBajo) {
    charts.stockBajo.destroy();
  }

  charts.stockBajo = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top10.map((p) =>
        p.nombre.length > 20 ? p.nombre.substring(0, 20) + "..." : p.nombre
      ),
      datasets: [
        {
          label: "Stock Actual",
          data: top10.map((p) => parseInt(p.stock_actual || 0)),
          backgroundColor: chartColors.danger,
          borderRadius: 8,
        },
        {
          label: "Stock Mínimo",
          data: top10.map((p) => parseInt(p.stock_minimo || 0)),
          backgroundColor: chartColors.warning,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
};

// Renderizar tabla de productos más vendidos
const renderTablaMasVendidos = (productos) => {
  if (!productos || productos.length === 0) {
    tablaMasVendidos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No hay datos de ventas</td>
            </tr>
        `;
    return;
  }

  tablaMasVendidos.innerHTML = productos
    .map((p) => {
      const margen = parseFloat(p.margen_porcentaje || 0);
      let margenColor = chartColors.success;
      if (margen < 30) margenColor = chartColors.warning;
      if (margen < 15) margenColor = chartColors.danger;

      return `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria || "-"}</td>
                <td>${parseInt(p.total_vendido || 0)}</td>
                <td>${formatCurrency(p.ingresos_totales || 0)}</td>
                <td>${formatCurrency(p.ganancia_total || 0)}</td>
                <td style="color: ${margenColor}; font-weight: bold;">
                    ${margen.toFixed(2)}%
                </td>
            </tr>
        `;
    })
    .join("");
};

// Mostrar mensaje de sin datos
const mostrarSinDatos = (noDataId, chartId) => {
  const noDataDiv = document.getElementById(noDataId);
  const chartCanvas = document.getElementById(chartId);

  if (noDataDiv) noDataDiv.style.display = "block";
  if (chartCanvas) chartCanvas.style.display = "none";
};

// Ocultar mensaje de sin datos
const ocultarSinDatos = (noDataId, chartId) => {
  const noDataDiv = document.getElementById(noDataId);
  const chartCanvas = document.getElementById(chartId);

  if (noDataDiv) noDataDiv.style.display = "none";
  if (chartCanvas) chartCanvas.style.display = "block";
};

// Cambiar período (placeholder - implementar filtros si es necesario)
const cambiarPeriodo = (periodo) => {
  periodoActual = periodo;

  // Actualizar UI de tabs
  document
    .querySelectorAll(".filter-tab")
    .forEach((t) => t.classList.remove("active"));
  const tabId = `tab${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`;
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");

  // TODO: Implementar filtros por período en el backend
  console.log(`📅 Período cambiado a: ${periodo}`);
  // loadReportes(); // Descomentar cuando se implementen filtros
};

// Actualizar reportes
const actualizarReportes = () => {
  loadReportes();
};

// Exportar reportes (placeholder)
const exportarReportes = () => {
  alert(
    "🚧 Funcionalidad de exportación en desarrollo\n\nPróximamente podrás exportar los reportes a PDF o Excel"
  );
  // TODO: Implementar exportación
};

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando reportes...");
  loadReportes();
});
