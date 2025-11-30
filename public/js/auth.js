// Verificar si ya está autenticado
if (isAuthenticated()) {
  window.location.href = "/dashboard.html";
}

// Referencias a elementos del DOM
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegisterLink = document.getElementById("showRegister");
const showLoginLink = document.getElementById("showLogin");
const messageDiv = document.getElementById("authMessage");

// Función para mostrar mensajes
const showMessage = (message, type = "success") => {
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = "block";

  // Ocultar después de 5 segundos
  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
};

// Alternar entre formularios
showRegisterLink.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  messageDiv.style.display = "none";
});

showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  messageDiv.style.display = "none";
});

// Manejar el login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    // Deshabilitar botón
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Ingresando...";

    const response = await authAPI.login(email, password);

    if (response.success) {
      showMessage("✅ Inicio de sesión exitoso. Redirigiendo...", "success");

      // Redirigir al dashboard después de 1 segundo
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1000);
    }
  } catch (error) {
    console.error("Error en login:", error);
    showMessage("❌ " + error.message, "error");

    // Rehabilitar botón
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
  }
});

// Manejar el registro
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("registerNombre").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  // Validaciones básicas
  if (password.length < 6) {
    showMessage("❌ La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }

  try {
    // Deshabilitar botón
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando...";

    const response = await authAPI.register(nombre, email, password);

    if (response.success) {
      showMessage("✅ Registro exitoso. Ahora inicia sesión.", "success");

      // Cambiar al formulario de login después de 2 segundos
      setTimeout(() => {
        registerForm.style.display = "none";
        loginForm.style.display = "block";
        registerForm.reset();

        // Pre-llenar el email en el login
        document.getElementById("loginEmail").value = email;
      }, 2000);
    }
  } catch (error) {
    console.error("Error en registro:", error);
    showMessage("❌ " + error.message, "error");

    // Rehabilitar botón
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = "Registrarse";
  }
});
