/* ==========================================================================
   OmniCore ERP — Núcleo de la aplicación
   Arranque: boot → (setup | auth) → app · Router con permisos por rol
   ========================================================================== */

const App = {

  nav: [
    { section: "Principal" },
    { route: "dashboard",     icon: "dashboard",      label: "Dashboard" },
    { section: "Capital Humano" },
    { route: "empleados",     icon: "badge",          label: "Empleados" },
    { route: "rrhh",          icon: "diversity_3",    label: "Recursos Humanos" },
    { route: "calendario",    icon: "calendar_month", label: "Calendario" },
    { route: "nomina",        icon: "account_balance_wallet", label: "Nómina" },
    { section: "Operaciones" },
    { route: "inventario",    icon: "inventory_2",    label: "Inventario" },
    { route: "compras",       icon: "shopping_cart",  label: "Compras" },
    { section: "Comercial" },
    { route: "ventas",        icon: "payments",       label: "Ventas" },
    { route: "pos",           icon: "point_of_sale",  label: "Punto de Venta" },
    { route: "facturacion",   icon: "receipt_long",   label: "Facturación" },
    { route: "crm",           icon: "contact_page",   label: "CRM" },
    { section: "Gestión" },
    { route: "proyectos",     icon: "view_kanban",    label: "Proyectos" },
    { route: "reportes",      icon: "monitoring",     label: "Reportes Financieros" },
    { section: "Sistema" },
    { route: "notificaciones",icon: "notifications",  label: "Notificaciones", badge: () => DB.notifications.filter(n => n.unread).length || null },
    { route: "usuarios",      icon: "manage_accounts",label: "Usuarios" },
    { route: "auditoria",     icon: "policy",         label: "Auditoría" }
  ],

  current: null,

  /* ========== Arranque ========== */
  async boot() {
    this.bindAuthScreens();
    // Flujo de recuperación de contraseña (llega desde el enlace del correo)
    Store.onRecovery = () => this.recoveryModal();
    let state;
    try { state = await Store.init(); }
    catch (e) { console.error(e); state = "auth"; }
    document.getElementById("boot-screen").remove();
    this.show(state);
  },

  recoveryModal() {
    UI.modal({
      title: "Establecer nueva contraseña",
      subtitle: "Llegaste desde el enlace de recuperación. Define tu nueva contraseña.",
      wide: false,
      body: `<form id="recovery-form" class="space-y-md">
        <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Nueva contraseña</span>
          <input name="p1" type="password" required minlength="6" class="input-field mt-xs"/></label>
        <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Confirmar contraseña</span>
          <input name="p2" type="password" required minlength="6" class="input-field mt-xs"/></label>
      </form>`,
      footer: `<button class="btn-primary" data-set-pass>${UI.icon("key", "text-[18px]")} Guardar y entrar</button>`,
      onMount: (root, close) => {
        root.querySelector("[data-set-pass]").onclick = async () => {
          const form = root.querySelector("#recovery-form");
          if (!form.reportValidity()) return;
          const d = Object.fromEntries(new FormData(form));
          if (d.p1 !== d.p2) return UI.toast("Las contraseñas no coinciden.", "error");
          try {
            const { error } = await Store.sb.auth.updateUser({ password: d.p1 });
            if (error) throw new Error(Store.humanError(error.message));
            close();
            UI.toast("Contraseña actualizada. ¡Bienvenido de nuevo!", "success");
            history.replaceState(null, "", location.pathname);
            location.reload();
          } catch (ex) { UI.toast(ex.message, "error"); }
        };
      }
    });
  },

  /* Realtime: llega un cambio de otro usuario */
  onRealtime(table, eventType) {
    if (table === "notifications") this.updateNotifBadge();
    const routesByTable = {
      employees: ["empleados", "nomina", "rrhh"], products: ["inventario", "pos", "dashboard"],
      orders: ["ventas", "dashboard"], invoices: ["facturacion", "dashboard"], deals: ["crm"],
      purchases: ["compras"], hr_requests: ["rrhh", "calendario"], notifications: ["notificaciones"],
      audit_log: ["auditoria"], projects: ["proyectos"], tasks: ["proyectos"]
    };
    const affected = routesByTable[table] || [];
    if (!affected.includes(this.current)) return;
    if (document.getElementById("modal-root").children.length) return;       // no interrumpir modales
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    clearTimeout(this._rtTimer);
    this._rtTimer = setTimeout(() => {
      const view = Views[this.current];
      if (view) view.render(document.getElementById("view"), []);
      if (!this._rtToastAt || Date.now() - this._rtToastAt > 5000) {
        this._rtToastAt = Date.now();
        UI.toast("Otro usuario actualizó los datos. Vista sincronizada.", "info", "🔄 Tiempo real");
      }
    }, 400);
  },

  refreshAvatar() {
    const btn = document.getElementById("btn-profile");
    btn.innerHTML = Store.user.avatar_url
      ? `<img src="${Store.user.avatar_url}" class="w-full h-full rounded-full object-cover" alt="avatar"/>`
      : fmt.initials(Store.user.name);
  },

  show(state) {
    document.getElementById("login-screen").classList.toggle("hidden", state !== "auth");
    if (state === "auth") {
      const ind = document.getElementById("mode-indicator");
      ind.textContent = Store.mode === "supabase" ? "☁ Supabase" : "Modo local";
      ind.className = "badge align-middle " + (Store.mode === "supabase" ? "badge-success" : "badge-warning");
    }
    if (state === "app") this.enter();
  },

  bindAuthScreens() {
    /* --- Tabs login/registro --- */
    document.querySelectorAll("[data-auth-tab]").forEach(t => t.onclick = () => {
      document.querySelectorAll("[data-auth-tab]").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      document.getElementById("login-form").classList.toggle("hidden", t.dataset.authTab !== "login");
      document.getElementById("register-form").classList.toggle("hidden", t.dataset.authTab !== "register");
    });

    const showErr = (id, msg) => { const el = document.getElementById(id); el.textContent = msg; el.classList.remove("hidden"); };
    const busy = (id, on, html) => {
      const b = document.getElementById(id); b.disabled = on;
      b.innerHTML = on ? `<span class="w-4 h-4 rounded-full border-2 border-white/40 border-t-white spinner inline-block"></span> Procesando…` : html;
    };

    /* --- Login --- */
    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      document.getElementById("login-error").classList.add("hidden");
      busy("login-submit", true);
      try {
        await Store.login(document.getElementById("login-email").value.trim(), document.getElementById("login-pass").value);
        this.transitionToApp();
      } catch (ex) {
        showErr("login-error", ex.message);
        busy("login-submit", false, `<span class="material-symbols-outlined text-[20px]">login</span> Iniciar sesión`);
      }
    });

    /* --- Registro --- */
    /* --- Recuperar contraseña --- */
    document.getElementById("forgot-pass").addEventListener("click", (e) => {
      e.preventDefault();
      UI.formModal({
        title: "Recuperar contraseña", wide: false, submitLabel: "Enviar enlace",
        subtitle: "Te enviaremos un correo con un enlace para restablecerla.",
        fields: [{ name: "email", label: "Correo de tu cuenta", type: "email", value: document.getElementById("login-email").value }],
        onSave: async (data, close) => {
          try {
            await Store.requestPasswordReset(data.email.trim());
            close();
            UI.toast("Revisa tu bandeja de entrada (y spam). El enlace te traerá de vuelta aquí.", "success", "✉ Correo enviado");
          } catch (ex) { UI.toast(ex.message, "error"); }
        }
      });
    });

    document.getElementById("register-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      document.getElementById("register-error").classList.add("hidden");
      const p1 = document.getElementById("reg-pass").value, p2 = document.getElementById("reg-pass2").value;
      if (p1 !== p2) return showErr("register-error", "Las contraseñas no coinciden.");
      busy("register-submit", true);
      try {
        const res = await Store.register({
          name: document.getElementById("reg-name").value.trim(),
          email: document.getElementById("reg-email").value.trim(),
          password: p1
        });
        if (res.needsConfirm) {
          showErr("register-error", "✉ Cuenta creada. Revisa tu correo y confirma tu email para poder iniciar sesión. (Puedes desactivar la confirmación en Supabase → Authentication → Providers → Email).");
          busy("register-submit", false, `<span class="material-symbols-outlined text-[20px]">person_add</span> Registrarme`);
          return;
        }
        this.transitionToApp(true);
      } catch (ex) {
        showErr("register-error", ex.message);
        busy("register-submit", false, `<span class="material-symbols-outlined text-[20px]">person_add</span> Registrarme`);
      }
    });

  },

  transitionToApp(isNew = false) {
    const login = document.getElementById("login-screen");
    login.style.transition = "opacity .4s ease, transform .4s ease";
    login.style.opacity = "0"; login.style.transform = "scale(1.02)";
    setTimeout(() => {
      login.classList.add("hidden");
      this.enter();
      UI.toast(
        isNew ? `Tu cuenta fue creada con rol "${ROLES[Store.user.role].label}".` : `Sesión iniciada como ${Store.user.email}`,
        "success",
        `${isNew ? "Bienvenido" : "Hola de nuevo"}, ${Store.user.name.split(" ")[0]} 👋`
      );
    }, 400);
  },

  /* ========== App ========== */
  enter() {
    document.getElementById("app").classList.remove("hidden");
    this.refreshAvatar();
    document.getElementById("company-name").textContent = DB.settings.company.name || "Global Operations";
    const dbs = document.getElementById("db-status");
    dbs.innerHTML = Store.mode === "supabase"
      ? `${UI.icon("cloud_done", "text-[13px]")} Supabase`
      : `${UI.icon("cloud_off", "text-[13px]")} Local`;
    dbs.className = "hidden xl:inline-flex badge " + (Store.mode === "supabase" ? "badge-success" : "badge-warning");

    this.renderNav();
    this.bindShell();
    this.updateNotifBadge();
    window.addEventListener("hashchange", () => this.route());
    if (!location.hash || location.hash === "#" || location.hash.includes("access_token")) location.hash = "#/dashboard";
    else this.route();
    // Tour de bienvenida (solo la primera vez, en escritorio)
    if (!localStorage.getItem("omnicore_tour_done") && window.innerWidth > 900) {
      setTimeout(() => this.startTour(), 1200);
    }
  },

  /* ---------- Tour de bienvenida ---------- */
  startTour() {
    const steps = [
      { sel: "#sidebar-nav", title: "Tus módulos", text: "Navega entre Dashboard, Ventas, Inventario, CRM, Proyectos y más. Lo que ves depende de tu rol." },
      { sel: "#global-search", title: "Búsqueda global", text: "Encuentra empleados, productos, facturas o clientes al instante. Atajo: Ctrl+K." },
      { sel: "#btn-new-tx", title: "Crear en un clic", text: "Facturas, pedidos, empleados u oportunidades desde cualquier pantalla." },
      { sel: "#btn-profile", title: "Tu cuenta", text: "Edita tu perfil, sube tu foto y gestiona la configuración desde aquí." }
    ];
    let i = 0;
    const overlay = document.createElement("div");
    overlay.id = "tour-overlay";
    document.body.appendChild(overlay);
    const showStep = () => {
      const s = steps[i];
      const target = document.querySelector(s.sel);
      if (!target) return end();
      const r = target.getBoundingClientRect();
      overlay.innerHTML = `
        <div class="tour-spot" style="top:${r.top - 8}px;left:${r.left - 8}px;width:${r.width + 16}px;height:${r.height + 16}px"></div>
        <div class="tour-tip card p-md" style="top:${Math.min(r.bottom + 14, innerHeight - 180)}px;left:${Math.min(Math.max(r.left, 16), innerWidth - 336)}px">
          <p class="text-label-md text-indigo-acc font-bold uppercase">Paso ${i + 1} de ${steps.length}</p>
          <p class="font-semibold text-body-lg text-on-surface mt-xs">${s.title}</p>
          <p class="text-body-md text-on-surface-variant mt-xs">${s.text}</p>
          <div class="flex justify-between items-center mt-md">
            <button class="text-label-md text-on-surface-variant hover:text-on-surface" data-tour-skip>Saltar tour</button>
            <button class="btn-primary" data-tour-next>${i === steps.length - 1 ? "¡Empezar!" : "Siguiente"}</button>
          </div>
        </div>`;
      overlay.querySelector("[data-tour-next]").onclick = () => { i++; i < steps.length ? showStep() : end(); };
      overlay.querySelector("[data-tour-skip]").onclick = end;
    };
    const end = () => { overlay.remove(); localStorage.setItem("omnicore_tour_done", "1"); };
    showStep();
  },

  /* ---------- Router con permisos ---------- */
  route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "dashboard").split("/");
    let name = parts[0], params = parts.slice(1);
    if (!Views[name]) name = "dashboard";
    if (!Can.route(name)) {
      UI.toast(`Tu rol (${ROLES[Store.user.role].label}) no tiene acceso al módulo "${Views[name].title}".`, "warning", "Acceso restringido");
      if (location.hash !== "#/dashboard") { location.hash = "#/dashboard"; return; }
      name = "dashboard"; params = [];
    }
    const view = Views[name];
    this.current = name;

    document.querySelectorAll("#sidebar-nav [data-route]").forEach(a =>
      a.classList.toggle("active", a.dataset.route === name));

    document.getElementById("breadcrumbs").innerHTML = view.crumbs
      .map((c, i) => i === view.crumbs.length - 1
        ? `<span class="text-on-surface font-medium">${c}</span>`
        : `<a href="#/dashboard" class="hover:text-indigo-acc transition-colors">${c}</a><span class="material-symbols-outlined text-[16px] opacity-50">chevron_right</span>`)
      .join("");

    document.title = view.title + " — OmniCore ERP";

    const el = document.getElementById("view");
    UI.destroyCharts();
    document.body.classList.remove("mobile-nav-open");
    el.classList.remove("page-enter");
    el.innerHTML = UI.skeletonPage();
    setTimeout(() => {
      el.classList.add("page-enter");
      view.render(el, params);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 250);
  },

  /* ---------- Sidebar (filtrado por rol) ---------- */
  renderNav() {
    const nav = document.getElementById("sidebar-nav");
    let html = "", pendingSection = null;
    for (const item of this.nav) {
      if (item.section) { pendingSection = item.section; continue; }
      if (!Can.route(item.route)) continue;
      if (pendingSection) { html += `<div class="nav-section">${pendingSection}</div>`; pendingSection = null; }
      const badge = item.badge && item.badge();
      html += `
      <a class="nav-item" href="#/${item.route}" data-route="${item.route}" title="${item.label}">
        ${UI.icon(item.icon)}
        <span class="sidebar-label text-body-md flex-1 whitespace-nowrap">${item.label}</span>
        ${badge ? `<span class="sidebar-label badge badge-error">${badge}</span>` : ""}
      </a>`;
    }
    nav.innerHTML = html;
  },

  updateNotifBadge() {
    const count = DB.notifications.filter(n => n.unread).length;
    const dot = document.getElementById("notif-dot");
    dot.textContent = count;
    dot.classList.toggle("hidden", count === 0);
    this.renderNav();
    if (this.current) document.querySelectorAll("#sidebar-nav [data-route]").forEach(a =>
      a.classList.toggle("active", a.dataset.route === this.current));
  },

  /* ---------- Shell ---------- */
  bindShell() {
    if (this._shellBound) return;
    this._shellBound = true;

    // Tema (persistente)
    const savedTheme = localStorage.getItem("omnicore_theme");
    if (savedTheme) document.documentElement.classList.toggle("dark", savedTheme === "dark");
    const themeBtn = document.getElementById("theme-toggle");
    const applyThemeLabel = () => {
      const dark = document.documentElement.classList.contains("dark");
      document.getElementById("theme-icon").textContent = dark ? "light_mode" : "dark_mode";
      themeBtn.querySelector(".sidebar-label").textContent = dark ? "Modo claro" : "Modo oscuro";
    };
    themeBtn.onclick = () => {
      document.documentElement.classList.toggle("dark");
      localStorage.setItem("omnicore_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
      applyThemeLabel();
      this.route(); // re-renderiza los gráficos con los colores del nuevo tema
    };
    applyThemeLabel();

    // Menú móvil (hamburguesa)
    const mobileBtn = document.getElementById("btn-mobile-menu");
    if (mobileBtn) mobileBtn.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle("mobile-nav-open"); };
    document.getElementById("mobile-backdrop")?.addEventListener("click", () => document.body.classList.remove("mobile-nav-open"));

    // Colapso sidebar
    document.getElementById("sidebar-collapse").onclick = () => {
      document.body.classList.toggle("sidebar-collapsed");
      document.getElementById("collapse-icon").textContent =
        document.body.classList.contains("sidebar-collapsed") ? "left_panel_open" : "left_panel_close";
    };

    // Dropdowns
    const toggle = (btnId, panelId, renderFn) => {
      const btn = document.getElementById(btnId), panel = document.getElementById(panelId);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = panel.classList.contains("hidden");
        document.querySelectorAll("#notif-panel,#profile-panel,#search-results").forEach(p => p.classList.add("hidden"));
        if (willOpen) { renderFn(panel); panel.classList.remove("hidden"); }
      });
    };
    document.addEventListener("click", () =>
      document.querySelectorAll("#notif-panel,#profile-panel,#search-results").forEach(p => p.classList.add("hidden")));

    // Notificaciones
    toggle("btn-notifications", "notif-panel", (panel) => {
      panel.innerHTML = `
        <div class="px-md py-sm border-b border-outline-variant/20 flex justify-between items-center">
          <span class="font-semibold text-body-md text-on-surface">Notificaciones</span>
          <a href="#/notificaciones" class="text-label-md text-indigo-acc font-semibold hover:underline">Ver centro</a>
        </div>
        <div class="max-h-96 overflow-y-auto divide-y divide-outline-variant/10">
          ${DB.notifications.slice(0, 4).map(n => Views.notificaciones.item(n)).join("") ||
            `<p class="p-lg text-body-md text-on-surface-variant text-center">Sin notificaciones</p>`}
        </div>`;
      panel.querySelectorAll("[data-notif]").forEach(item => item.onclick = () => {
        const n = DB.notifications.find(x => x.id === parseInt(item.dataset.notif));
        n.unread = false; Store.persist("notifications"); this.updateNotifBadge();
        location.hash = "#/" + n.module;
        panel.classList.add("hidden");
      });
    });

    // Perfil
    toggle("btn-profile", "profile-panel", (panel) => {
      const role = ROLES[Store.user.role];
      panel.innerHTML = `
        <div class="px-md py-md border-b border-outline-variant/20 flex items-center gap-sm">
          <span class="avatar brand-gradient !text-white">${fmt.initials(Store.user.name)}</span>
          <div class="min-w-0">
            <p class="font-semibold text-body-md text-on-surface truncate">${Store.user.name}</p>
            <p class="text-label-md text-on-surface-variant truncate">${Store.user.email}</p>
            <span class="badge badge-${role.badge} mt-1">${role.label}</span>
          </div>
        </div>
        <div class="p-sm">
          <a href="#/perfil" class="nav-item w-full">${UI.icon("person", "text-[20px]")}<span class="text-body-md">Mi perfil</span></a>
          <a href="#/configuracion" class="nav-item w-full">${UI.icon("settings", "text-[20px]")}<span class="text-body-md">Configuración</span></a>
          ${Can.cap("users") ? `<a href="#/usuarios" class="nav-item w-full">${UI.icon("manage_accounts", "text-[20px]")}<span class="text-body-md">Gestionar usuarios</span></a>` : ""}
          <div class="border-t border-outline-variant/20 mt-sm pt-sm">
            <button class="nav-item w-full text-error" id="logout">${UI.icon("logout", "text-[20px]")}<span class="text-body-md">Cerrar sesión</span></button>
          </div>
        </div>`;
      panel.querySelector("#logout").onclick = () => Store.logout();
      panel.querySelectorAll("a").forEach(a => a.onclick = () => panel.classList.add("hidden"));
    });

    // Panel de widgets
    document.getElementById("btn-widgets").onclick = () => {
      const open = document.body.classList.toggle("widgets-open");
      if (open) this.renderWidgets();
    };

    // Nueva transacción
    document.getElementById("btn-new-tx").onclick = () => {
      const options = [
        ["receipt_long", "Factura de venta", "facturacion"],
        ["shopping_cart", "Orden de compra", "compras"],
        ["person_add", "Nuevo empleado", "empleados"],
        ["handshake", "Oportunidad CRM", "crm"]
      ].filter(([, , r]) => Can.route(r));
      UI.modal({
        title: "Nueva Transacción", subtitle: "Selecciona el tipo de documento a crear",
        body: `<div class="grid grid-cols-2 gap-sm">
          ${options.map(([i, l, r]) => `
            <button class="card card-hover p-md flex flex-col items-center gap-sm text-center" data-tx="${r}">
              <div class="p-3 rounded-xl bg-indigo-acc/10 text-indigo-acc">${UI.icon(i, "text-[26px]")}</div>
              <span class="font-semibold text-body-md text-on-surface">${l}</span>
            </button>`).join("")}
        </div>`,
        onMount: (root, close) => root.querySelectorAll("[data-tx]").forEach(b =>
          b.onclick = () => { close(); location.hash = "#/" + b.dataset.tx; })
      });
    };

    // Búsqueda global (Ctrl+K)
    const search = document.getElementById("global-search");
    const results = document.getElementById("search-results");
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.focus(); }
      if (e.key === "Escape") results.classList.add("hidden");
    });
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) { results.classList.add("hidden"); return; }
      const hits = [];
      DB.employees.filter(x => x.name.toLowerCase().includes(q)).slice(0, 3)
        .forEach(x => hits.push({ icon: "badge", label: x.name, sub: x.role, route: "empleados/" + x.id }));
      DB.products.filter(x => (x.name + x.sku).toLowerCase().includes(q)).slice(0, 3)
        .forEach(x => hits.push({ icon: "inventory_2", label: x.name, sub: x.sku, route: "inventario" }));
      DB.invoices.filter(x => (x.id + x.customer).toLowerCase().includes(q)).slice(0, 3)
        .forEach(x => hits.push({ icon: "receipt_long", label: x.id, sub: x.customer, route: "facturacion" }));
      DB.crm.deals.filter(x => x.company.toLowerCase().includes(q)).slice(0, 2)
        .forEach(x => hits.push({ icon: "handshake", label: x.company, sub: "Pipeline · " + x.stage, route: "crm" }));
      const allowed = hits.filter(h => Can.route(h.route.split("/")[0]));

      results.innerHTML = allowed.length ? allowed.map(h => `
        <button class="nav-item w-full" data-go="${h.route}">
          ${UI.icon(h.icon, "text-[20px]")}
          <span class="flex-1 text-left"><span class="block text-body-md text-on-surface">${h.label}</span>
          <span class="block text-label-md text-on-surface-variant">${h.sub}</span></span>
          ${UI.icon("north_east", "text-[16px] opacity-50")}
        </button>`).join("")
        : `<p class="p-md text-body-md text-on-surface-variant text-center">Sin resultados para "${search.value}"</p>`;
      results.classList.remove("hidden");
      results.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
        location.hash = "#/" + b.dataset.go;
        results.classList.add("hidden"); search.value = "";
      });
    });
    search.addEventListener("click", e => e.stopPropagation());
  },

  /* ---------- Widgets laterales ---------- */
  renderWidgets() {
    const panel = document.getElementById("widgets-panel");
    panel.innerHTML = `
    <div class="p-md space-y-md">
      <div class="flex justify-between items-center">
        <h4 class="text-headline-sm text-on-surface">Widgets</h4>
        <button class="icon-btn" onclick="document.body.classList.remove('widgets-open')">${UI.icon("close")}</button>
      </div>
      <div class="card p-md">
        <p class="text-label-md text-on-surface-variant uppercase mb-sm">Objetivo mensual de ventas</p>
        <div class="flex items-end justify-between"><span class="text-headline-md text-on-surface">78%</span>
        <span class="text-label-md text-on-surface-variant">$1.28M / $1.65M</span></div>
        <div class="stock-bar mt-sm"><div class="brand-gradient" style="width:78%"></div></div>
      </div>
      <div class="card p-md">
        <p class="text-label-md text-on-surface-variant uppercase mb-sm">Tareas de hoy</p>
        ${[["Aprobar nómina de Julio", true], ["Revisar PO-0948 pendiente", false], ["Llamada Grupo Pacífico 3:00 PM", false]]
          .map(([t, done]) => `
          <label class="flex items-center gap-sm py-xs cursor-pointer group">
            <input type="checkbox" ${done ? "checked" : ""} class="rounded border-outline-variant bg-surface-container text-indigo-acc focus:ring-indigo-acc/40"/>
            <span class="text-body-md ${done ? "line-through text-on-surface-variant" : "text-on-surface"} group-hover:text-indigo-acc transition-colors">${t}</span>
          </label>`).join("")}
      </div>
      <div class="card p-md">
        <p class="text-label-md text-on-surface-variant uppercase mb-sm">Accesos rápidos</p>
        <div class="grid grid-cols-2 gap-sm">
          ${[["receipt_long", "Facturar", "facturacion"], ["person_add", "Contratar", "empleados"], ["monitoring", "Reportes", "reportes"], ["policy", "Auditoría", "auditoria"]]
            .filter(([, , r]) => Can.route(r))
            .map(([i, l, r]) => `<a href="#/${r}" class="btn-ghost justify-center py-sm">${UI.icon(i, "text-[18px]")} ${l}</a>`).join("")}
        </div>
      </div>
      <div class="card p-md">
        <p class="text-label-md text-on-surface-variant uppercase mb-sm">Estado del sistema</p>
        ${[["Base de datos", Store.mode === "supabase" ? "Supabase ☁" : "Local", Store.mode === "supabase" ? "success" : "warning"],
           ["API Core", "Operativo", "success"], ["Facturación electrónica", "Operativo", "success"]]
          .map(([s, st, c]) => `
          <div class="flex justify-between items-center py-xs text-body-md">
            <span class="text-on-surface-variant">${s}</span>${UI.badge(st, c)}
          </div>`).join("")}
      </div>
    </div>`;
  }
};

document.addEventListener("DOMContentLoaded", () => App.boot());
