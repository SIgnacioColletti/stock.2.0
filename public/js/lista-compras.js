// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const listaContent = document.getElementById("listaContent");
const proveedoresLista = document.getElementById("proveedoresLista");
const sinProductos = document.getElementById("sinProductos");

// Stats
const totalProveedoresEl = document.getElementById("totalProveedores");
const totalProductosEl = document.getElementById("totalProductos");
const totalEstimadoEl = document.getElementById("totalEstimado");

// Función para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};

// Cargar lista de compras
const loadListaCompras = async () => {
  try {
    loadingDiv.style.display = "block";
    listaContent.style.display = "none";
    sinProductos.style.display = "none";

    console.log("🛒 Generando lista de compras...");

    const response = await proveedoresAPI.getListaCompras();

    if (response.success) {
      const proveedores = Array.isArray(response.data) ? response.data : [];

      console.log(`✅ Lista generada: ${proveedores.length} proveedores`);

      if (proveedores.length === 0) {
        loadingDiv.style.display = "none";
        sinProductos.style.display = "block";
        return;
      }

      updateStats(proveedores, response);
      renderListaCompras(proveedores);
    }

    loadingDiv.style.display = "none";
    listaContent.style.display = "block";
  } catch (error) {
    console.error("❌ Error al generar lista:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al generar lista de compras</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadListaCompras()">
                    🔄 Reintentar
                </button>
            </div>
        `;
  }
};

// Actualizar estadísticas
const updateStats = (proveedores, response) => {
  const totalProds = proveedores.reduce(
    (sum, p) => sum + parseInt(p.total_productos || 0),
    0
  );
  const totalEst = parseFloat(response.total_estimado_general || 0);

  totalProveedoresEl.textContent = proveedores.length;
  totalProductosEl.textContent = totalProds;
  totalEstimadoEl.textContent = formatCurrency(totalEst);
};

// Renderizar lista de compras
const renderListaCompras = (proveedores) => {
  proveedoresLista.innerHTML = proveedores
    .map((proveedor) => {
      const productos = proveedor.productos || [];
      const totalEstimado = parseFloat(proveedor.total_estimado || 0);

      return `
            <div class="proveedor-section">
                <div class="proveedor-header">
                    <div class="proveedor-info">
                        <h3>🚚 ${proveedor.proveedor}</h3>
                        <div class="proveedor-contacto">
                            ${
                              proveedor.contacto
                                ? `👤 ${proveedor.contacto}`
                                : ""
                            }
                            ${
                              proveedor.telefono
                                ? `| 📞 <a href="tel:${proveedor.telefono}">${proveedor.telefono}</a>`
                                : ""
                            }
                            ${
                              proveedor.email
                                ? `| 📧 <a href="mailto:${proveedor.email}">${proveedor.email}</a>`
                                : ""
                            }
                        </div>
                    </div>
                    <div class="proveedor-total">
                        <div class="amount">${formatCurrency(
                          totalEstimado
                        )}</div>
                        <div class="label">${productos.length} productos</div>
                    </div>
                </div>

                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Cantidad Sugerida</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                            <th>Urgencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productos
                          .map((producto) => {
                            const urgenciaClass = `urgencia-${producto.urgencia}`;

                            return `
                                <tr>
                                    <td>
                                        <strong>${producto.nombre}</strong>
                                        ${
                                          producto.codigo_barras
                                            ? `<br><small style="color: var(--gray);">${producto.codigo_barras}</small>`
                                            : ""
                                        }
                                    </td>
                                    <td style="color: ${
                                      producto.stock_actual === 0
                                        ? "var(--danger)"
                                        : "inherit"
                                    };">
                                        ${producto.stock_actual}
                                    </td>
                                    <td>${producto.stock_minimo}</td>
                                    <td><strong>${
                                      producto.cantidad_sugerida
                                    }</strong></td>
                                    <td>${formatCurrency(
                                      producto.precio_compra
                                    )}</td>
                                    <td><strong>${formatCurrency(
                                      producto.total_estimado
                                    )}</strong></td>
                                    <td>
                                        <span class="urgencia-badge ${urgenciaClass}">
                                            ${producto.urgencia}
                                        </span>
                                    </td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                    <tfoot>
                        <tr style="background: var(--light-gray); font-weight: bold;">
                            <td colspan="5" style="text-align: right;">Subtotal ${
                              proveedor.proveedor
                            }:</td>
                            <td colspan="2">${formatCurrency(
                              totalEstimado
                            )}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    })
    .join("");
};

// Cargar al iniciar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando lista de compras...");
  loadListaCompras();
});
