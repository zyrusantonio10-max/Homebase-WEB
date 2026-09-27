/* ==========================================================================
   HOMEBASE — APP MODULE (js/app.js), Bootstrap-native version

   Bootstrap's own JS (bootstrap.bundle.min.js, loaded in index.html) already
   handles opening/closing the modal, the backdrop, focus trapping, and the
   mobile navbar collapse via data-bs-* attributes in the markup. This file
   only needs to: switch which form is visible inside the modal, hand form
   submissions to HomebaseAuth, and swap landing <-> dashboard placeholder.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // ---- Element references -------------------------------------------------
  const navbar = document.querySelector(".hb-navbar");
  const landingRoot = document.getElementById("landingRoot");
  const dashboardRoot = document.getElementById("dashboardRoot");
  const dashboardGreeting = document.getElementById("dashboardGreeting");
  const logoutBtn = document.getElementById("logoutBtn");

  const authModalEl = document.getElementById("authModal");
  const authModal = bootstrap.Modal.getOrCreateInstance(authModalEl);
  const authTitle = document.getElementById("authTitle");

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");

  // ---- Panel switching inside the modal --------------------------------------
  // Buttons that open the modal carry data-panel="login" or "register" so we
  // show the right form the moment Bootstrap raises its own show event.
  authModalEl.addEventListener("show.bs.modal", (event) => {
    const trigger = event.relatedTarget;
    const mode = trigger?.dataset.panel || "login";
    showPanel(mode);
  });

  function showPanel(mode) {
    const showLogin = mode === "login";
    loginForm.classList.toggle("d-none", !showLogin);
    registerForm.classList.toggle("d-none", showLogin);
    authTitle.textContent = showLogin ? "Log in" : "Create your account";
    clearErrors();
  }

  function clearErrors() {
    loginError.classList.add("d-none");
    registerError.classList.add("d-none");
    loginError.textContent = "";
    registerError.textContent = "";
  }

  // "New here? Create an account" / "Already have an account? Log in" links
  document.querySelectorAll("[data-switch-to]").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.switchTo));
  });

  authModalEl.addEventListener("hidden.bs.modal", clearErrors);

  // ---- Landing <-> Dashboard placeholder swap --------------------------------
  function showDashboard(user) {
    landingRoot.classList.add("d-none");
    navbar.classList.add("d-none");
    dashboardRoot.classList.remove("d-none");
    dashboardGreeting.textContent = `Welcome back, ${user.name}! Dashboard module loading...`;
  }

  function showLanding() {
    dashboardRoot.classList.add("d-none");
    landingRoot.classList.remove("d-none");
    navbar.classList.remove("d-none");
  }

  // If someone reloads the page while "logged in", keep them on the dashboard
  // placeholder instead of dropping them back on the landing page.
  const existingUser = HomebaseAuth.getCurrentUser();
  if (existingUser) showDashboard(existingUser);

  // ---- Form submissions -------------------------------------------------------
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const result = HomebaseAuth.loginUser(email, password);
    if (!result.ok) {
      loginError.textContent = result.error;
      loginError.classList.remove("d-none");
      return;
    }

    authModal.hide();
    loginForm.reset();
    showDashboard(result.user);
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("registerName").value,
      email: document.getElementById("registerEmail").value,
      password: document.getElementById("registerPassword").value,
      university: document.getElementById("registerUniversity").value,
    };

    const result = HomebaseAuth.registerUser(data);
    if (!result.ok) {
      registerError.textContent = result.error;
      registerError.classList.remove("d-none");
      return;
    }

    authModal.hide();
    registerForm.reset();
    showDashboard(result.user);
  });

  // ---- Logout ------------------------------------------------------------------
  logoutBtn.addEventListener("click", () => {
    HomebaseAuth.logoutUser();
    showLanding();
  });
});