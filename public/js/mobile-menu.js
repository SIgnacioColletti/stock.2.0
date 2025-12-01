/**
 * Sistema de Menú Mobile
 * Maneja el menú hamburguesa y la navegación en dispositivos móviles
 */

// Crear header mobile y overlay
const initMobileMenu = () => {
  // Verificar si ya existe
  if (document.querySelector(".mobile-header")) return;

  // Obtener email del usuario
  const userEmail = localStorage.getItem("userEmail") || "Usuario";

  // Crear header mobile
  const mobileHeader = document.createElement("div");
  mobileHeader.className = "mobile-header";
  mobileHeader.innerHTML = `
        <div class="hamburger" id="hamburgerMenu">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <h2 style="margin: 0; font-size: 1.2rem; color: var(--primary);">🏪 Stock Kiosco</h2>
        <div style="width: 40px;"></div>
    `;

  // Crear overlay
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  overlay.id = "sidebarOverlay";

  // Insertar al inicio del body
  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(mobileHeader, document.body.firstChild);

  // Funcionalidad del menú
  const hamburger = document.getElementById("hamburgerMenu");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  const toggleMenu = () => {
    hamburger.classList.toggle("active");
    sidebar.classList.toggle("active");
    sidebarOverlay.classList.toggle("active");
    document.body.style.overflow = sidebar.classList.contains("active")
      ? "hidden"
      : "";
  };

  const closeMenu = () => {
    hamburger.classList.remove("active");
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
  };

  hamburger.addEventListener("click", toggleMenu);
  sidebarOverlay.addEventListener("click", closeMenu);

  // Cerrar al hacer click en un link
  const navLinks = document.querySelectorAll(".sidebar-nav a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        closeMenu();
      }
    });
  });

  // Cerrar al cambiar tamaño de ventana
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      closeMenu();
    }
  });
};

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileMenu);
} else {
  initMobileMenu();
}
