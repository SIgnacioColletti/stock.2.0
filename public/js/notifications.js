/**
 * Sistema de Notificaciones Toast
 * Reemplaza los alerts nativos con notificaciones elegantes
 */

// Crear contenedor de notificaciones si no existe
const createToastContainer = () => {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
    document.body.appendChild(container);
  }
};

// Tipos de notificación
const toastTypes = {
  success: {
    icon: "✅",
    color: "#10b981",
    bg: "#d1fae5",
  },
  error: {
    icon: "❌",
    color: "#ef4444",
    bg: "#fee2e2",
  },
  warning: {
    icon: "⚠️",
    color: "#f59e0b",
    bg: "#fef3c7",
  },
  info: {
    icon: "ℹ️",
    color: "#3b82f6",
    bg: "#dbeafe",
  },
};

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: success, error, warning, info
 * @param {number} duration - Duración en ms (default: 3000)
 */
const showToast = (message, type = "info", duration = 3000) => {
  createToastContainer();

  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const config = toastTypes[type] || toastTypes.info;

  toast.className = "toast";
  toast.style.cssText = `
        background: ${config.bg};
        color: ${config.color};
        padding: 16px 20px;
        border-radius: 12px;
        border-left: 4px solid ${config.color};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.95rem;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        transition: all 0.3s ease;
    `;

  toast.innerHTML = `
        <span style="font-size: 1.5rem;">${config.icon}</span>
        <span style="flex: 1;">${message}</span>
        <span style="opacity: 0.7; font-size: 1.2rem;">×</span>
    `;

  // Cerrar al hacer click
  toast.addEventListener("click", () => {
    removeToast(toast);
  });

  // Hover effect
  toast.addEventListener("mouseenter", () => {
    toast.style.transform = "translateX(-5px)";
    toast.style.boxShadow = "0 15px 30px rgba(0, 0, 0, 0.15)";
  });

  toast.addEventListener("mouseleave", () => {
    toast.style.transform = "translateX(0)";
    toast.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.1)";
  });

  container.appendChild(toast);

  // Auto-cerrar
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
};

// Remover notificación
const removeToast = (toast) => {
  toast.style.animation = "slideOut 0.3s ease-out";
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

// Atajos para tipos específicos
const toast = {
  success: (message, duration) => showToast(message, "success", duration),
  error: (message, duration) => showToast(message, "error", duration),
  warning: (message, duration) => showToast(message, "warning", duration),
  info: (message, duration) => showToast(message, "info", duration),
};

// Diálogo de confirmación elegante
const confirm = (message, title = "¿Estás seguro?") => {
  return new Promise((resolve) => {
    // Crear overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

    // Crear diálogo
    const dialog = document.createElement("div");
    dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
            animation: scaleIn 0.3s ease-out;
        `;

    dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 1.3rem;">
                ${title}
            </h3>
            <p style="margin: 0 0 25px 0; color: #6b7280; line-height: 1.6;">
                ${message}
            </p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="confirmCancel" style="
                    padding: 10px 24px;
                    border: 2px solid #e5e7eb;
                    background: white;
                    color: #6b7280;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    Cancelar
                </button>
                <button id="confirmOk" style="
                    padding: 10px 24px;
                    border: none;
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    Confirmar
                </button>
            </div>
        `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus en el botón de confirmación
    setTimeout(() => {
      document.getElementById("confirmOk").focus();
    }, 100);

    // Handlers
    const close = (result) => {
      overlay.style.animation = "fadeOut 0.2s ease-out";
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    document.getElementById("confirmOk").onclick = () => close(true);
    document.getElementById("confirmCancel").onclick = () => close(false);

    // Cerrar con ESC
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        close(false);
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);

    // Cerrar al hacer click fuera
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        close(false);
      }
    };
  });
};

// Animaciones CSS
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    #confirmOk:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
    }
    
    #confirmCancel:hover {
        background: #f9fafb;
        border-color: #d1d5db;
    }
`;
document.head.appendChild(style);
