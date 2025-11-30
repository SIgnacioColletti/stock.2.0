// Verificar autenticación
checkAuth();
displayUserEmail();

// Referencias a elementos del DOM
const loadingDiv = document.getElementById("loading");
const categoriasContent = document.getElementById("categoriasContent");
const categoriasTableBody = document.getElementById("categoriasTableBody");
const searchInput = document.getElementById("searchInput");

// Stats
const totalCategoriasEl = document.getElementById("totalCategorias");
const categoriasActivasEl = document.getElementById("categoriasActivas");
const productosTotalEl = document.getElementById("productosTotal");

// Modal
const categoriaModal = document.getElementById("categoriaModal");
const categoriaForm = document.getElementById("categoriaForm");
const modalTitle = document.getElementById("modalTitle");
const categoriaId = document.getElementById("categoriaId");
const categoriaNombre = document.getElementById("categoriaNombre");
const categoriaDescripcion = document.getElementById("categoriaDescripcion");
const categoriaActivo = document.getElementById("categoriaActivo");

// Variables de estado
let categorias = [];
let categoriasFiltradas = [];
let modoEdicion = false;

// Cargar categorías
const loadCategorias = async () => {
  try {
    loadingDiv.style.display = "block";
    categoriasContent.style.display = "none";

    console.log("📋 Cargando categorías...");

    const response = await categoriasAPI.getAll();

    if (response.success) {
      categorias = Array.isArray(response.data) ? response.data : [];
      categoriasFiltradas = [...categorias];

      console.log(`✅ ${categorias.length} categorías cargadas`);

      updateStats();
      renderCategorias();
    }

    loadingDiv.style.display = "none";
    categoriasContent.style.display = "block";
  } catch (error) {
    console.error("❌ Error al cargar categorías:", error);
    loadingDiv.innerHTML = `
            <div style="color: var(--danger); text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Error al cargar categorías</h3>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadCategorias()">
                    🔄 Reintentar
                </button>
            </div>
        `;
  }
};

// Actualizar estadísticas
const updateStats = () => {
  const activas = categorias.filter((c) => c.activo).length;
  const totalProductos = categorias.reduce(
    (sum, c) => sum + (parseInt(c.total_productos) || 0),
    0
  );

  totalCategoriasEl.textContent = categorias.length;
  categoriasActivasEl.textContent = activas;
  productosTotalEl.textContent = totalProductos;
};

// Renderizar tabla de categorías
const renderCategorias = () => {
  if (!Array.isArray(categoriasFiltradas) || categoriasFiltradas.length === 0) {
    categoriasTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    ${
                      searchInput.value
                        ? "No se encontraron categorías"
                        : "No hay categorías creadas"
                    }
                </td>
            </tr>
        `;
    return;
  }

  categoriasTableBody.innerHTML = categoriasFiltradas
    .map((categoria) => {
      const fecha = new Date(categoria.created_at).toLocaleDateString("es-AR");
      const estado = categoria.activo
        ? '<span class="badge badge-success">Activa</span>'
        : '<span class="badge" style="background: #e5e7eb; color: #6b7280;">Inactiva</span>';

      return `
            <tr>
                <td><strong>${categoria.nombre}</strong></td>
                <td>${categoria.descripcion || "-"}</td>
                <td>${categoria.total_productos || 0} productos</td>
                <td>${estado}</td>
                <td>${fecha}</td>
                <td>
                    <button 
                        class="btn btn-small" 
                        style="background: var(--info); color: white; margin-right: 5px;"
                        onclick="editCategoria(${categoria.id})"
                        title="Editar"
                    >
                        ✏️
                    </button>
                    <button 
                        class="btn btn-danger btn-small" 
                        onclick="deleteCategoria(${
                          categoria.id
                        }, '${categoria.nombre.replace(/'/g, "\\'")}', ${
        categoria.total_productos || 0
      })"
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
    categoriasFiltradas = [...categorias];
  } else {
    categoriasFiltradas = categorias.filter(
      (c) =>
        c.nombre.toLowerCase().includes(termino) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(termino))
    );
  }

  renderCategorias();
});

// Mostrar modal de creación
const showCreateModal = () => {
  modoEdicion = false;
  modalTitle.textContent = "Nueva Categoría";
  categoriaForm.reset();
  categoriaId.value = "";
  categoriaActivo.checked = true;
  categoriaModal.style.display = "block";
  categoriaNombre.focus();
};

// Editar categoría
const editCategoria = async (id) => {
  try {
    console.log(`✏️ Editando categoría ID: ${id}`);

    const categoria = categorias.find((c) => c.id === id);

    if (!categoria) {
      alert("❌ Categoría no encontrada");
      return;
    }

    modoEdicion = true;
    modalTitle.textContent = "Editar Categoría";
    categoriaId.value = categoria.id;
    categoriaNombre.value = categoria.nombre;
    categoriaDescripcion.value = categoria.descripcion || "";
    categoriaActivo.checked = categoria.activo;

    categoriaModal.style.display = "block";
    categoriaNombre.focus();
  } catch (error) {
    console.error("❌ Error al editar:", error);
    alert("Error al cargar los datos de la categoría");
  }
};

// Eliminar categoría
const deleteCategoria = async (id, nombre, totalProductos) => {
  if (totalProductos > 0) {
    const confirmacion = confirm(
      `⚠️ ADVERTENCIA\n\n` +
        `La categoría "${nombre}" tiene ${totalProductos} producto(s) asociado(s).\n\n` +
        `Si eliminas esta categoría, los productos quedarán sin categoría.\n\n` +
        `¿Deseas continuar?`
    );

    if (!confirmacion) return;
  } else {
    const confirmacion = confirm(
      `¿Estás seguro de que deseas eliminar la categoría "${nombre}"?`
    );

    if (!confirmacion) return;
  }

  try {
    console.log(`🗑️ Eliminando categoría ID: ${id}`);

    const response = await categoriasAPI.delete(id);

    if (response.success) {
      alert("✅ Categoría eliminada exitosamente");
      loadCategorias();
    }
  } catch (error) {
    console.error("❌ Error al eliminar:", error);
    alert("❌ Error al eliminar la categoría: " + error.message);
  }
};

// Manejar envío del formulario
categoriaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = categoriaNombre.value.trim();
  const descripcion = categoriaDescripcion.value.trim();
  const activo = categoriaActivo.checked;

  // Validaciones
  if (nombre === "") {
    alert("❌ El nombre de la categoría es obligatorio");
    categoriaNombre.focus();
    return;
  }

  if (nombre.length < 3) {
    alert("❌ El nombre debe tener al menos 3 caracteres");
    categoriaNombre.focus();
    return;
  }

  // Verificar duplicados (excepto al editar la misma)
  const idActual = categoriaId.value ? parseInt(categoriaId.value) : null;
  const duplicado = categorias.find(
    (c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== idActual
  );

  if (duplicado) {
    alert(`❌ Ya existe una categoría con el nombre "${nombre}"`);
    categoriaNombre.focus();
    return;
  }

  try {
    const submitBtn = categoriaForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    const data = {
      nombre,
      descripcion: descripcion || null,
      activo,
    };

    let response;

    if (modoEdicion) {
      // Actualizar
      response = await categoriasAPI.update(categoriaId.value, data);
    } else {
      // Crear nueva
      response = await categoriasAPI.create(data);
    }

    if (response.success) {
      alert(
        `✅ Categoría ${modoEdicion ? "actualizada" : "creada"} exitosamente`
      );
      closeModal();
      loadCategorias();
    }
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    alert("❌ Error al guardar la categoría: " + error.message);
  } finally {
    const submitBtn = categoriaForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Guardar";
  }
});

// Cerrar modal
const closeModal = () => {
  categoriaModal.style.display = "none";
  categoriaForm.reset();
};

// Cerrar modal al hacer click fuera
window.onclick = (event) => {
  if (event.target === categoriaModal) {
    closeModal();
  }
};

// Cerrar modal con ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && categoriaModal.style.display === "block") {
    closeModal();
  }
});

// Cargar categorías al iniciar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando gestión de categorías...");
  loadCategorias();
});
