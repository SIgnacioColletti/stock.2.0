// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const proveedoresContent = document.getElementById("proveedoresContent");
const proveedoresTableBody = document.getElementById("proveedoresTableBody");
const searchInput = document.getElementById("searchInput");

// Stats
const totalProveedoresEl = document.getElementById("totalProveedores");
const proveedoresActivosEl = document.getElementById("proveedoresActivos");
const proveedoresStockBajoEl = document.getElementById("proveedoresStockBajo");

// Modal proveedor
const proveedorModal = document.getElementById("proveedorModal");
const proveedorForm = document.getElementById("proveedorForm");
const modalTitle = document.getElementById("modalTitle");
const proveedorId = document.getElementById("proveedorId");
const proveedorNombre = document.getElementById("proveedorNombre");
const proveedorContacto = document.getElementById("proveedorContacto");
const proveedorTelefono = document.getElementById("proveedorTelefono");
const proveedorEmail = document.getElementById("proveedorEmail");
const proveedorDireccion = document.getElementById("proveedorDireccion");
const proveedorNotas = document.getElementById("proveedorNotas");
const proveedorActivo = document.getElementById("proveedorActivo");

// Modal productos
const productosModal = document.getElementById("productosModal");
const productosModalTitle = document.getElementById("productosModalTitle");
const productosModalContent = document.getElementById("productosModalContent");

// Variables de estado
let proveedores = [];
let proveedoresFiltrados = [];
let modoEdicion = false;

// Cargar proveedores
const loadProveedores = async () => {
  try {
    loadingDiv.style.display = "block";
    proveedoresContent.style.display = "none";

    console.log("🚚 Cargando proveedores...");

    const response = await proveedoresAPI.getAll();

    if (response.success) {
      proveedores = Array.isArray(response.data) ? response.data : [];
      proveedoresFiltrados = [...proveedores];

      console.log(`✅ ${proveedores.length} proveedores cargados`);

      updateStats();
      renderProveedores();
    }

    loadingDiv.style.display = "none";
    proveedoresContent.style.display = "block";
  } catch (error) {
    console.error("❌ Error al cargar proveedores:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al cargar proveedores</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadProveedores()">
                    🔄 Reintentar
                </button>
            </div>
        `;
  }
};

// Actualizar estadísticas
const updateStats = () => {
  const activos = proveedores.filter((p) => p.activo).length;

  // Contar proveedores con productos con stock bajo
  const conStockBajo = proveedores.filter(
    (p) => p.productos_stock_bajo && parseInt(p.productos_stock_bajo) > 0
  ).length;

  totalProveedoresEl.textContent = proveedores.length;
  proveedoresActivosEl.textContent = activos;
  proveedoresStockBajoEl.textContent = conStockBajo;
};

// Renderizar tabla de proveedores
const renderProveedores = () => {
  if (
    !Array.isArray(proveedoresFiltrados) ||
    proveedoresFiltrados.length === 0
  ) {
    proveedoresTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    ${
                      searchInput.value
                        ? "No se encontraron proveedores"
                        : "No hay proveedores registrados"
                    }
                </td>
            </tr>
        `;
    return;
  }

  proveedoresTableBody.innerHTML = proveedoresFiltrados
    .map((proveedor) => {
      const estado = proveedor.activo
        ? '<span class="badge badge-success">Activo</span>'
        : '<span class="badge" style="background: #e5e7eb; color: #6b7280;">Inactivo</span>';

      const totalProductos = parseInt(proveedor.total_productos) || 0;
      const stockBajo = parseInt(proveedor.productos_stock_bajo) || 0;

      let productosDisplay = `${totalProductos}`;
      if (stockBajo > 0) {
        productosDisplay += ` <span class="badge badge-warning" style="font-size: 0.75rem;">${stockBajo} bajo</span>`;
      }

      return `
            <tr>
                <td><strong>${proveedor.nombre}</strong></td>
                <td>${proveedor.contacto || "-"}</td>
                <td>
                    ${
                      proveedor.telefono
                        ? `<a href="tel:${proveedor.telefono}" style="color: var(--primary);">${proveedor.telefono}</a>`
                        : "-"
                    }
                </td>
                <td>
                    ${
                      proveedor.email
                        ? `<a href="mailto:${proveedor.email}" style="color: var(--primary); font-size: 0.85rem;">${proveedor.email}</a>`
                        : "-"
                    }
                </td>
                <td>
                    ${
                      totalProductos > 0
                        ? `<a href="#" onclick="verProductos(${
                            proveedor.id
                          }, '${proveedor.nombre.replace(
                            /'/g,
                            "\\'"
                          )}'); return false;" style="color: var(--primary);">${productosDisplay}</a>`
                        : "0"
                    }
                </td>
                <td>${estado}</td>
                <td>
                    <button 
                        class="btn btn-small" 
                        style="background: var(--info); color: white; margin-right: 5px;"
                        onclick="editProveedor(${proveedor.id})"
                        title="Editar"
                    >
                        ✏️
                    </button>
                    <button 
                        class="btn btn-danger btn-small" 
                        onclick="deleteProveedor(${
                          proveedor.id
                        }, '${proveedor.nombre.replace(
        /'/g,
        "\\'"
      )}', ${totalProductos})"
                        title="Eliminar"
                    >
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
};

// Búsqueda en tiempo real
searchInput.addEventListener("input", (e) => {
  const termino = e.target.value.toLowerCase().trim();

  if (termino === "") {
    proveedoresFiltrados = [...proveedores];
  } else {
    proveedoresFiltrados = proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        (p.contacto && p.contacto.toLowerCase().includes(termino)) ||
        (p.telefono && p.telefono.toLowerCase().includes(termino)) ||
        (p.email && p.email.toLowerCase().includes(termino))
    );
  }

  renderProveedores();
});

// Mostrar modal de creación
const showCreateModal = () => {
  modoEdicion = false;
  modalTitle.textContent = "Nuevo Proveedor";
  proveedorForm.reset();
  proveedorId.value = "";
  proveedorActivo.checked = true;
  proveedorModal.style.display = "block";
  proveedorNombre.focus();
};

// Editar proveedor
const editProveedor = async (id) => {
  try {
    console.log(`✏️ Editando proveedor ID: ${id}`);

    const proveedor = proveedores.find((p) => p.id === id);

    if (!proveedor) {
      alert("❌ Proveedor no encontrado");
      return;
    }

    modoEdicion = true;
    modalTitle.textContent = "Editar Proveedor";
    proveedorId.value = proveedor.id;
    proveedorNombre.value = proveedor.nombre;
    proveedorContacto.value = proveedor.contacto || "";
    proveedorTelefono.value = proveedor.telefono || "";
    proveedorEmail.value = proveedor.email || "";
    proveedorDireccion.value = proveedor.direccion || "";
    proveedorNotas.value = proveedor.notas || "";
    proveedorActivo.checked = proveedor.activo;

    proveedorModal.style.display = "block";
    proveedorNombre.focus();
  } catch (error) {
    console.error("❌ Error al editar:", error);
    alert("Error al cargar los datos del proveedor");
  }
};

// Eliminar proveedor
const deleteProveedor = async (id, nombre, totalProductos) => {
  if (totalProductos > 0) {
    alert(
      `⚠️ ADVERTENCIA\n\n` +
        `El proveedor "${nombre}" tiene ${totalProductos} producto(s) asociado(s).\n\n` +
        `No se puede eliminar. Primero cambia el proveedor de esos productos o desactiva este proveedor.`
    );
    return;
  }

  const confirmacion = confirm(
    `¿Estás seguro de que deseas eliminar el proveedor "${nombre}"?`
  );

  if (!confirmacion) return;

  try {
    console.log(`🗑️ Eliminando proveedor ID: ${id}`);

    const response = await proveedoresAPI.delete(id);

    if (response.success) {
      alert("✅ Proveedor eliminado exitosamente");
      loadProveedores();
    }
  } catch (error) {
    console.error("❌ Error al eliminar:", error);
    alert("❌ Error al eliminar el proveedor: " + error.message);
  }
};

// Ver productos del proveedor
const verProductos = async (id, nombre) => {
  try {
    productosModalTitle.textContent = `Productos de: ${nombre}`;
    productosModalContent.innerHTML =
      '<p class="text-center">Cargando productos...</p>';
    productosModal.style.display = "block";

    const response = await proveedoresAPI.getById(id);

    if (response.success && response.data.productos) {
      const productos = response.data.productos;

      if (productos.length === 0) {
        productosModalContent.innerHTML =
          '<p class="text-center">No hay productos de este proveedor</p>';
        return;
      }

      productosModalContent.innerHTML = `
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Código</th>
                            <th>Stock</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productos
                          .map((p) => {
                            let estadoStock = "";
                            if (p.stock_actual === 0) {
                              estadoStock =
                                '<span class="badge badge-danger">Sin Stock</span>';
                            } else if (p.stock_actual <= p.stock_minimo) {
                              estadoStock =
                                '<span class="badge badge-warning">Stock Bajo</span>';
                            } else {
                              estadoStock =
                                '<span class="badge badge-success">OK</span>';
                            }

                            return `
                                <tr>
                                    <td>${p.nombre}</td>
                                    <td>${p.codigo_barras || "-"}</td>
                                    <td>${p.stock_actual} / ${
                              p.stock_minimo
                            }</td>
                                    <td>${estadoStock}</td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            `;
    }
  } catch (error) {
    console.error("❌ Error al cargar productos:", error);
    productosModalContent.innerHTML =
      '<p class="text-center" style="color: var(--danger);">Error al cargar productos</p>';
  }
};

// Manejar envío del formulario
proveedorForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = proveedorNombre.value.trim();
  const contacto = proveedorContacto.value.trim();
  const telefono = proveedorTelefono.value.trim();
  const email = proveedorEmail.value.trim();
  const direccion = proveedorDireccion.value.trim();
  const notas = proveedorNotas.value.trim();
  const activo = proveedorActivo.checked;

  // Validaciones
  if (nombre === "") {
    alert("❌ El nombre del proveedor es obligatorio");
    proveedorNombre.focus();
    return;
  }

  if (telefono === "") {
    alert("❌ El teléfono es obligatorio");
    proveedorTelefono.focus();
    return;
  }

  // Validar email si se proporciona
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("❌ El formato del email no es válido");
      proveedorEmail.focus();
      return;
    }
  }

  try {
    const submitBtn = proveedorForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    const data = {
      nombre,
      contacto: contacto || null,
      telefono,
      email: email || null,
      direccion: direccion || null,
      notas: notas || null,
      activo,
    };

    let response;

    if (modoEdicion) {
      response = await proveedoresAPI.update(proveedorId.value, data);
    } else {
      response = await proveedoresAPI.create(data);
    }

    if (response.success) {
      alert(
        `✅ Proveedor ${modoEdicion ? "actualizado" : "creado"} exitosamente`
      );
      closeModal();
      await loadProveedores();
    }
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    alert("❌ Error al guardar el proveedor: " + error.message);
  } finally {
    const submitBtn = proveedorForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Guardar";
  }
});

// Cerrar modales
const closeModal = () => {
  proveedorModal.style.display = "none";
  proveedorForm.reset();
};

const closeProductosModal = () => {
  productosModal.style.display = "none";
};

// Cerrar modal al hacer click fuera
window.onclick = (event) => {
  if (event.target === proveedorModal) {
    closeModal();
  }
  if (event.target === productosModal) {
    closeProductosModal();
  }
};

// Cerrar modal con ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (proveedorModal.style.display === "block") {
      closeModal();
    }
    if (productosModal.style.display === "block") {
      closeProductosModal();
    }
  }
});

// Cargar proveedores al iniciar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando gestión de proveedores...");
  loadProveedores();
});
