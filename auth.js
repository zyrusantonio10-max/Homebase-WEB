
const HomebaseAuth = (() => {
  const USERS_KEY = "homebase_users";
  const SESSION_KEY = "homebase_currentUser";

 
  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      
      console.error("Homebase: could not read users from storage", err);
      return [];
    }
  }

  
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  /**
   * Register a new user.
   * @param {{name:string, email:string, password:string, university:string}} data
   * @returns {{ok:true, user:object}|{ok:false, error:string}}
   */
  function registerUser({ name, email, password, university }) {
    const cleanEmail = normalizeEmail(email);
    const users = getUsers();

    if (!name || !cleanEmail || !password || !university) {
      return { ok: false, error: "Please fill in every field." };
    }
    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }
    if (users.some((u) => u.email === cleanEmail)) {
      return { ok: false, error: "An account with that email already exists." };
    }

    // NOTE: storing plaintext password is only acceptable because this is a
    // no-backend academic prototype. A real build must hash/salt server-side
    // and never keep credentials in LocalStorage.
    const newUser = {
      name: name.trim(),
      email: cleanEmail,
      password,
      university,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, cleanEmail);

    return { ok: true, user: newUser };
  }

  /**
   * Validate credentials against stored users.
   * @param {string} email
   * @param {string} password
   * @returns {{ok:true, user:object}|{ok:false, error:string}}
   */
  function loginUser(email, password) {
    const cleanEmail = normalizeEmail(email);
    const users = getUsers();
    const match = users.find((u) => u.email === cleanEmail);

    if (!match || match.password !== password) {
      return { ok: false, error: "Incorrect email or password." };
    }

    localStorage.setItem(SESSION_KEY, cleanEmail);
    return { ok: true, user: match };
  }

  /** Clear the current session (does not delete the account). */
  function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
  }


  function getCurrentUser() {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return null;
    return getUsers().find((u) => u.email === email) || null;
  }

  // Public API consumed by app.js (and later, the dashboard module).
  return {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
  };
})();