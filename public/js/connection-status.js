/**
 * Indicador de Estado de Conexión
 * Muestra cuando el usuario pierde/recupera conexión
 */

let isOnline = navigator.onLine;

const showConnectionStatus = (online) => {
  if (online) {
    toast.success("Conexión restaurada", 2000);
  } else {
    toast.error("Sin conexión a Internet", 0); // 0 = no auto-cerrar
  }
};

window.addEventListener("online", () => {
  if (!isOnline) {
    isOnline = true;
    showConnectionStatus(true);
  }
});

window.addEventListener("offline", () => {
  if (isOnline) {
    isOnline = false;
    showConnectionStatus(false);
  }
});

// Verificar al cargar
if (!navigator.onLine) {
  setTimeout(() => {
    toast.warning("Sin conexión a Internet", 0);
  }, 1000);
}
