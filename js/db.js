/* ==========================================================================
   OmniCore ERP — Capa de datos y autenticación
   Backend principal: Supabase (Postgres + Auth). Modo demo: localStorage.
   ========================================================================== */

/* ---------- Roles y permisos ---------- */
const ROLES = {
  admin: {
    label: "Administrador", badge: "purple",
    routes: "*",
    caps: { users: true, salaries: true, delete: true, approve: true, payroll: true, companySettings: true, audit: true, create: true }
  },
  gerente: {
    label: "Gerente", badge: "info",
    routes: ["dashboard", "empleados", "rrhh", "calendario", "nomina", "inventario", "compras", "ventas", "pos", "facturacion", "crm", "proyectos", "reportes", "notificaciones", "perfil", "configuracion"],
    caps: { salaries: true, approve: true, payroll: true, create: true }
  },
  empleado: {
    label: "Empleado", badge: "cyan",
    routes: ["dashboard", "inventario", "compras", "ventas", "pos", "facturacion", "crm", "proyectos", "notificaciones", "perfil", "configuracion"],
    caps: { create: true }
  }
};

const Can = {
  role: () => ROLES[Store.user?.role] || ROLES.empleado,
  route: (name) => { const r = Can.role(); return r.routes === "*" || r.routes.includes(name); },
  cap: (c) => !!Can.role().caps[c]
};

/* ---------- Store ---------- */
const Store = {
  mode: null,            // 'supabase' | 'local'
  sb: null,              // cliente supabase
  user: null,            // { id, name, email, role, phone, active }
  users: [],             // listado de perfiles (para admin)
  LS_BACKEND: "omnicore_backend",
  LS_LOCALDB: "omnicore_db_v2",
  LS_SESSION: "omnicore_session",

  // Mapa colección → tabla / pk / acceso al cache en memoria (DB)
  cols: {
    employees:     { pk: "id",   get: () => DB.employees,     set: v => DB.employees = v },
    products:      { pk: "sku",  get: () => DB.products,      set: v => DB.products = v },
    warehouses:    { pk: "name", get: () => DB.warehouses,    set: v => DB.warehouses = v },
    suppliers:     { pk: "name", get: () => DB.suppliers,     set: v => DB.suppliers = v },
    purchases:     { pk: "id",   get: () => DB.purchases,     set: v => DB.purchases = v },
    orders:        { pk: "id",   get: () => DB.orders,        set: v => DB.orders = v },
    invoices:      { pk: "id",   get: () => DB.invoices,      set: v => DB.invoices = v },
    deals:         { pk: "id",   get: () => DB.crm.deals,     set: v => DB.crm.deals = v },
    crm_customers: { pk: "name", get: () => DB.crm.customers, set: v => DB.crm.customers = v },
    hr_requests:   { pk: "id",   get: () => DB.hr.requests,   set: v => DB.hr.requests = v },
    notifications: { pk: "id",   get: () => DB.notifications, set: v => DB.notifications = v },
    audit_log:     { pk: "id",   get: () => DB.audit,         set: v => DB.audit = v },
    projects:      { pk: "id",   get: () => DB.projects,      set: v => DB.projects = v },
    tasks:         { pk: "id",   get: () => DB.tasks,         set: v => DB.tasks = v }
  },

  backendConfig() {
    // Credenciales fijas en config.js → la app siempre usa Supabase, sin preguntar
    if (window.OMNICORE_CONFIG.SUPABASE_URL && window.OMNICORE_CONFIG.SUPABASE_ANON_KEY) {
      return { mode: "supabase", url: window.OMNICORE_CONFIG.SUPABASE_URL, key: window.OMNICORE_CONFIG.SUPABASE_ANON_KEY };
    }
    const saved = JSON.parse(localStorage.getItem(this.LS_BACKEND) || "null");
    return { mode: saved?.mode || null, url: saved?.url, key: saved?.key };
  },

  saveBackendConfig(cfg) { localStorage.setItem(this.LS_BACKEND, JSON.stringify(cfg)); },

  /* ========== Inicialización ========== */
  async init() {
    const cfg = this.backendConfig();
    if (cfg.mode === "local" || !cfg.url || !cfg.key) { this.mode = "local"; return this.localInit(); }
    try {
      this.mode = "supabase";
      this.sb = window.supabase.createClient(cfg.url, cfg.key);
      // Flujo de recuperación de contraseña (enlace del correo)
      this.sb.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" && this.onRecovery) this.onRecovery();
      });
      const { data: { session } } = await this.sb.auth.getSession();
      if (!session) return "auth";
      await this.loadProfile(session.user);
      await this.hydrate();
      this.initRealtime();
      return "app";
    } catch (e) {
      console.error("Supabase init error:", e);
      return "auth";
    }
  },

  async testConnection(url, key) {
    const client = window.supabase.createClient(url, key);
    const { error } = await client.from("settings").select("id").limit(1);
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return true;
  },

  /* ========== Autenticación ========== */
  async register({ name, email, password }) {
    if (this.mode === "local") return this.localRegister({ name, email, password });
    const { data, error } = await this.sb.auth.signUp({
      email, password, options: { data: { name } }
    });
    if (error) throw new Error(this.humanError(error.message));
    if (!data.session) return { needsConfirm: true };
    await this.loadProfile(data.session.user);
    await this.hydrate();
    this.initRealtime();
    this.log("REGISTER", "Seguridad", `Nuevo usuario registrado: ${email} (rol: ${this.user.role})`);
    return { ok: true };
  },

  async login(email, password) {
    if (this.mode === "local") return this.localLogin(email, password);
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(this.humanError(error.message));
    await this.loadProfile(data.user);
    if (this.user.active === false) {
      await this.sb.auth.signOut(); this.user = null;
      throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
    }
    await this.hydrate();
    this.initRealtime();
    this.log("LOGIN", "Seguridad", `Inicio de sesión exitoso: ${email}`);
    return { ok: true };
  },

  async requestPasswordReset(email) {
    if (this.mode === "local") throw new Error("En modo local no hay envío de correos. Contacta al administrador.");
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });
    if (error) throw new Error(this.humanError(error.message));
  },

  /* ========== Realtime: sincronización en vivo entre usuarios ========== */
  initRealtime() {
    if (this.mode !== "supabase" || this._rt) return;
    this._rt = this.sb.channel("omnicore-live")
      .on("postgres_changes", { event: "*", schema: "public" }, (p) => {
        if (p.table === "profiles") {
          const i = this.users.findIndex(u => u.id === (p.new?.id || p.old?.id));
          if (p.eventType === "DELETE") { if (i >= 0) this.users.splice(i, 1); }
          else if (i >= 0) this.users[i] = { ...this.users[i], ...p.new };
          if (p.new?.id === this.user?.id) Object.assign(this.user, p.new);
          return;
        }
        if (p.table === "settings" && p.new) { DB.settings = { company: p.new.company, prefs: p.new.prefs }; return; }
        const c = this.cols[p.table];
        if (!c) return;
        const pk = c.pk;
        if (p.eventType === "DELETE") {
          c.set(c.get().filter(r => r[pk] !== p.old[pk]));
        } else {
          const list = c.get();
          const i = list.findIndex(r => r[pk] === p.new[pk]);
          if (i >= 0) list[i] = { ...list[i], ...p.new };
          else if (p.table === "audit_log") list.unshift(p.new);
          else list.unshift(p.new);
        }
        if (window.App?.onRealtime) App.onRealtime(p.table, p.eventType);
      })
      .subscribe();
  },

  /* ========== Storage: avatares e imágenes de producto ========== */
  async uploadAvatar(file) {
    if (this.mode !== "supabase") throw new Error("Las fotos requieren la base de datos online.");
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${this.user.id}/avatar.${ext}`;
    const { error } = await this.sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw new Error("No se pudo subir la imagen: " + error.message + ". ¿Ejecutaste supabase/upgrade.sql?");
    const { data } = this.sb.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl + "?t=" + Date.now();
    await this.updateProfile({ avatar_url: url });
    return url;
  },

  async uploadProductImage(sku, file) {
    if (this.mode !== "supabase") throw new Error("Las imágenes requieren la base de datos online.");
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${sku}.${ext}`;
    const { error } = await this.sb.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) throw new Error("No se pudo subir la imagen: " + error.message + ". ¿Ejecutaste supabase/upgrade.sql?");
    const { data } = this.sb.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl + "?t=" + Date.now();
  },

  async logout() {
    this.log("LOGOUT", "Seguridad", `Cierre de sesión: ${this.user?.email}`);
    if (this.mode === "supabase") await this.sb.auth.signOut();
    else localStorage.removeItem(this.LS_SESSION);
    location.reload();
  },

  async loadProfile(authUser) {
    const { data, error } = await this.sb.from("profiles").select("*").eq("id", authUser.id).single();
    if (error) throw new Error("No se pudo cargar el perfil: " + error.message);
    this.user = data;
  },

  async updateProfile(patch) {
    Object.assign(this.user, patch);
    if (this.mode === "supabase") {
      const { error } = await this.sb.from("profiles").update(patch).eq("id", this.user.id);
      if (error) throw new Error(error.message);
    } else {
      const u = this.localUsers().find(x => x.id === this.user.id);
      if (u) Object.assign(u, patch);
      this.localSaveUsers();
    }
    this.log("UPDATE", "Perfil", `Perfil actualizado: ${this.user.email}`);
  },

  async changePassword(newPass) {
    if (this.mode === "supabase") {
      const { error } = await this.sb.auth.updateUser({ password: newPass });
      if (error) throw new Error(this.humanError(error.message));
    } else {
      const u = this.localUsers().find(x => x.id === this.user.id);
      u.pass = await this.hash(this.user.email + ":" + newPass);
      this.localSaveUsers();
    }
    this.log("UPDATE", "Seguridad", "Cambio de contraseña", "warning");
  },

  /* ---- gestión de usuarios (admin) ---- */
  async fetchUsers() {
    if (this.mode === "supabase") {
      const { data, error } = await this.sb.from("profiles").select("*").order("created_at");
      if (error) throw new Error(error.message);
      this.users = data;
    } else this.users = this.localUsers().map(({ pass, ...u }) => u);
    return this.users;
  },

  async adminUpdateUser(id, patch) {
    if (this.mode === "supabase") {
      const { error } = await this.sb.from("profiles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const u = this.localUsers().find(x => x.id === id);
      Object.assign(u, patch); this.localSaveUsers();
    }
    const target = this.users.find(u => u.id === id);
    if (target) Object.assign(target, patch);
    this.log("UPDATE", "Usuarios", `Usuario ${target?.email || id} modificado: ${JSON.stringify(patch)}`, "warning");
  },

  async deleteUser(id) {
    const target = this.users.find(u => u.id === id);
    if (this.mode === "supabase") {
      const { error } = await this.sb.from("profiles").delete().eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      this.localSaveUsers(this.localUsers().filter(x => x.id !== id));
    }
    this.users = this.users.filter(u => u.id !== id);
    this.log("DELETE", "Usuarios", `Perfil eliminado: ${target?.email || id}`, "critical");
  },

  /* ========== Datos: hidratación y CRUD ========== */
  async hydrate() {
    if (this.mode === "local") return;
    const names = Object.keys(this.cols);
    const results = await Promise.all(names.map(n =>
      this.sb.from(n).select("*").then(r => ({ n, ...r }))));
    for (const r of results) {
      if (r.error) { console.warn("hydrate", r.n, r.error.message); continue; }
      let rows = r.data || [];
      if (r.n === "audit_log") rows.sort((a, b) => b.ts.localeCompare(a.ts));
      if (rows.length || r.n === "audit_log") this.cols[r.n].set(rows);
    }
    const { data: st } = await this.sb.from("settings").select("*").eq("id", "app").single();
    if (st) DB.settings = { company: st.company, prefs: st.prefs };
  },

  async upsert(col, row) {
    const c = this.cols[col];
    const list = c.get();
    const i = list.findIndex(x => x[c.pk] === row[c.pk]);
    if (i >= 0) list[i] = { ...list[i], ...row }; else list.unshift(row);
    if (this.mode === "supabase") {
      const { error } = await this.sb.from(col).upsert(row);
      if (error) { UI.toast("Error guardando en Supabase: " + error.message, "error"); throw error; }
    } else this.localPersist();
    return row;
  },

  async remove(col, id) {
    const c = this.cols[col];
    c.set(c.get().filter(x => x[c.pk] !== id));
    if (this.mode === "supabase") {
      const { error } = await this.sb.from(col).delete().eq(c.pk, id);
      if (error) { UI.toast("Error eliminando en Supabase: " + error.message, "error"); throw error; }
    } else this.localPersist();
  },

  /* Guarda todas las filas de una colección (cambios masivos: kanban, mark-all-read) */
  async persist(col) {
    if (this.mode === "supabase") {
      const rows = this.cols[col].get().filter(r => r[this.cols[col].pk] != null);
      if (rows.length) {
        const { error } = await this.sb.from(col).upsert(rows);
        if (error) UI.toast("Error sincronizando: " + error.message, "error");
      }
    } else this.localPersist();
  },

  async saveSettings() {
    if (this.mode === "supabase") {
      const { error } = await this.sb.from("settings").upsert({ id: "app", company: DB.settings.company, prefs: DB.settings.prefs });
      if (error) UI.toast("Error guardando configuración: " + error.message, "error");
    } else this.localPersist();
  },

  /* ---- auditoría automática ---- */
  log(action, module, detail, severity = "info") {
    const row = {
      ts: new Date().toISOString().replace("T", " ").slice(0, 19),
      username: this.user?.email?.split("@")[0] || "system",
      ip: "10.0.1.2", module, action, detail, severity
    };
    DB.audit.unshift({ id: Date.now(), ...row });
    if (this.mode === "supabase") this.sb.from("audit_log").insert(row).then(() => {});
    else this.localPersist();
  },

  humanError(msg) {
    const map = {
      "Invalid login credentials": "Credenciales incorrectas. Verifica tu correo y contraseña.",
      "User already registered": "Ese correo ya está registrado. Inicia sesión.",
      "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres.",
      "Email not confirmed": "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
    };
    for (const [k, v] of Object.entries(map)) if (msg.includes(k)) return v;
    return msg;
  },

  /* ========== Modo local (demo sin backend) ========== */
  async hash(s) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  },

  localUsers() { return this._localUsers ||= JSON.parse(localStorage.getItem("omnicore_users") || "[]"); },
  localSaveUsers(list) {
    if (list) this._localUsers = list;
    localStorage.setItem("omnicore_users", JSON.stringify(this._localUsers));
  },

  async localInit() {
    // Semilla de admin
    if (!this.localUsers().length) {
      this._localUsers = [{
        id: crypto.randomUUID(), name: "Anderson Espinoza", email: "admin@omnicore.io",
        role: "admin", active: true, phone: "", created_at: new Date().toISOString(),
        pass: await this.hash("admin@omnicore.io:admin1234")
      }];
      this.localSaveUsers();
    }
    // Datos persistidos
    const saved = JSON.parse(localStorage.getItem(this.LS_LOCALDB) || "null");
    if (saved) {
      for (const [n, c] of Object.entries(this.cols)) if (saved[n]) c.set(saved[n]);
      if (saved.settings) DB.settings = saved.settings;
    } else this.localPersist();
    // Sesión
    const sid = localStorage.getItem(this.LS_SESSION);
    const u = sid && this.localUsers().find(x => x.id === sid);
    if (u && u.active !== false) { const { pass, ...pub } = u; this.user = pub; return "app"; }
    return "auth";
  },

  localPersist() {
    const snap = {};
    for (const [n, c] of Object.entries(this.cols)) snap[n] = c.get();
    snap.settings = DB.settings;
    localStorage.setItem(this.LS_LOCALDB, JSON.stringify(snap));
  },

  async localRegister({ name, email, password }) {
    if (this.localUsers().some(u => u.email.toLowerCase() === email.toLowerCase()))
      throw new Error("Ese correo ya está registrado. Inicia sesión.");
    if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
    const u = {
      id: crypto.randomUUID(), name, email, role: "empleado", active: true, phone: "",
      created_at: new Date().toISOString(), pass: await this.hash(email + ":" + password)
    };
    this._localUsers.push(u); this.localSaveUsers();
    localStorage.setItem(this.LS_SESSION, u.id);
    const { pass, ...pub } = u; this.user = pub;
    this.log("REGISTER", "Seguridad", `Nuevo usuario registrado: ${email}`);
    return { ok: true };
  },

  async localLogin(email, password) {
    const u = this.localUsers().find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.pass !== await this.hash(email + ":" + password))
      throw new Error("Credenciales incorrectas. Verifica tu correo y contraseña.");
    if (u.active === false) throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
    localStorage.setItem(this.LS_SESSION, u.id);
    const { pass, ...pub } = u; this.user = pub;
    this.log("LOGIN", "Seguridad", `Inicio de sesión exitoso: ${email}`);
    return { ok: true };
  }
};
