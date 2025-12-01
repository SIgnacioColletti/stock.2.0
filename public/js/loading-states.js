/**
 * Sistema de Loading States
 * Mejora la UX mostrando estados de carga en botones y elementos
 */

// Agregar loading a un botón
const setButtonLoading = (button, loading = true) => {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove("loading");
    button.disabled = false;
  }
};

// Crear skeleton loader
const createSkeleton = (type = "text", width = "100%") => {
  const skeleton = document.createElement("div");
  skeleton.className = "skeleton";
  skeleton.style.width = width;

  switch (type) {
    case "text":
      skeleton.style.height = "16px";
      break;
    case "title":
      skeleton.style.height = "24px";
      break;
    case "avatar":
      skeleton.style.height = "40px";
      skeleton.style.borderRadius = "50%";
      break;
    case "image":
      skeleton.style.height = "200px";
      break;
  }

  return skeleton;
};

// Mostrar skeleton en tabla
const showTableSkeleton = (tbody, columns = 5, rows = 5) => {
  tbody.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");

    for (let j = 0; j < columns; j++) {
      const td = document.createElement("td");
      td.appendChild(createSkeleton("text", "80%"));
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
};

// Estado vacío para tablas
const showEmptyState = (
  container,
  icon,
  title,
  message,
  actionButton = null
) => {
  container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-text">${message}</p>
            ${actionButton ? actionButton : ""}
        </div>
    `;
};
