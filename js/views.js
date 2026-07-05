/* ==========================================================================
   OmniCore ERP — Vistas de módulos
   Cada vista = { title, crumbs, render(el, params) }
   Persistencia vía Store (Supabase / local) · Permisos vía Can
   ========================================================================== */

const pageHeader = (title, subtitle, actions = "") => `
  <div class="flex justify-between items-end pb-sm flex-wrap gap-md">
    <div>
      <h2 class="text-display-lg text-on-surface">${title}</h2>
      <p class="text-body-md text-on-surface-variant">${subtitle}</p>
    </div>
    <div class="flex gap-sm flex-wrap items-center">${actions}</div>
  </div>`;

const Views = {

  /* ================= DASHBOARD EJECUTIVO ================= */
  dashboard: {
    title: "Dashboard", crumbs: ["Inicio", "Dashboard Ejecutivo"],
    render(el) {
      // KPIs calculados de los datos reales de la base
      const income = DB.invoices.reduce((a, i) => a + i.total, 0);
      const expenses = DB.purchases.filter(p => p.status !== "Cancelada").reduce((a, p) => a + p.total, 0)
                     + DB.employees.reduce((a, e) => a + e.salary / 12, 0);
      const trend = DB.salesTrend;
      const growth = trend.length > 1 ? +((trend.at(-1) - trend.at(-2)) / trend.at(-2) * 100).toFixed(1) : 0;
      const customers = new Set([...DB.crm.customers.map(c => c.name), ...DB.orders.map(o => o.customer)]).size;
      const low = DB.products.filter(p => p.stock <= p.min).length;
      const k = [
        { label: "Ingresos (facturado)", value: Math.round(income), prefix: "$", trend: +12.5, icon: "payments", color: "primary" },
        { label: "Gastos (compras+nómina)", value: Math.round(expenses), prefix: "$", trend: +4.2, icon: "credit_card", color: "secondary", invert: true },
        { label: "Beneficio Neto", value: Math.round(income - expenses), prefix: "$", trend: +18.9, icon: "trending_up", color: "success" },
        { label: "Crecimiento Ventas", value: growth, suffix: "%", trend: +5.1, icon: "monitoring", color: "cyan" },
        { label: "Clientes Activos", value: customers, trend: +8.2, icon: "group", color: "indigo" },
        { label: "Alertas de Stock", value: low, trend: -12.0, icon: "warning", color: "warning", invert: true }
      ];
      el.innerHTML = `
      ${pageHeader(`Hola, ${Store.user.name.split(" ")[0]} 👋`, "Resumen operacional en tiempo real", `
        <button class="btn-ghost">${UI.icon("calendar_month", "text-[18px]")} Últimos 30 días</button>
        <button class="btn-ghost" data-export>${UI.icon("file_download", "text-[18px]")} Exportar</button>`)}

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
        ${k.map(UI.kpiCard).join("")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2">${UI.panel("Ventas vs. Compras", "Comparativa mensual de flujo de caja",
          UI.barChart(DB.salesVsPurchases.months.slice(0, 8), DB.salesVsPurchases.sales.slice(0, 8), DB.salesVsPurchases.purchases.slice(0, 8)))}
        </div>
        <div>${UI.panel("Ingresos por línea", "Distribución del trimestre",
          UI.donutChart(DB.revenueByLine, "42%") + `
          <div class="mt-lg pt-md border-t border-outline-variant/20">
            <div class="flex items-center justify-between">
              <div><p class="text-label-md text-on-surface-variant uppercase">Tendencia de ventas</p>
              <p class="text-headline-sm text-success">+23.4%</p></div>
              ${UI.sparkline(DB.salesTrend)}
            </div>
          </div>`)}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="px-lg py-md border-b border-outline-variant/20 flex justify-between items-center">
            <h4 class="text-headline-sm text-on-surface">Actividad Reciente</h4>
            ${Can.route("auditoria") ? `<button class="text-indigo-acc text-label-md hover:underline font-semibold" data-goto="auditoria">Ver todo</button>` : ""}
          </div>
          <div class="overflow-x-auto"><table class="data-table">
            <thead><tr><th>Usuario</th><th>Acción</th><th>Módulo</th><th class="text-right">Fecha/Hora</th></tr></thead>
            <tbody>${DB.audit.slice(0, 5).map((a, i) => `
              <tr><td><span class="flex items-center gap-sm">${UI.avatar(a.username, i)} ${a.username}</span></td>
              <td class="max-w-sm truncate">${a.detail}</td>
              <td>${UI.badge(a.module, "info")}</td>
              <td class="text-right text-on-surface-variant">${a.ts}</td></tr>`).join("")}
            </tbody></table></div>
        </div>

        <div class="card">
          <div class="px-lg py-md border-b border-outline-variant/20 flex justify-between items-center">
            <h4 class="text-headline-sm text-on-surface">Stock Crítico</h4>
            <span class="w-6 h-6 flex items-center justify-center bg-error text-on-error rounded-full text-[10px] font-bold">${DB.products.filter(p => p.stock <= p.min).length}</span>
          </div>
          <div class="p-md space-y-md">
            ${DB.products.filter(p => p.stock <= p.min).slice(0, 3).map(p => {
              const critical = p.stock <= p.min * 0.5;
              return `
              <div class="flex items-center gap-md p-md rounded-lg border ${critical ? "border-error/20 bg-error/5 hover:bg-error/10" : "border-warning/20 bg-warning/5 hover:bg-warning/10"} transition-colors">
                <div class="p-2 rounded ${critical ? "bg-error/10 text-error" : "bg-warning/10 text-warning"}">${UI.icon(critical ? "warning" : "priority_high", "text-[20px]")}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-on-surface text-[14px] truncate">${p.name}</p>
                  <p class="text-[13px] text-on-surface-variant/80">Solo ${p.stock} unidades restantes</p>
                </div>
                <button class="icon-btn" data-po="${p.sku}" title="Generar orden">${UI.icon("shopping_cart", "text-[20px]")}</button>
              </div>`;
            }).join("") || `<p class="text-body-md text-on-surface-variant text-center py-md">Sin alertas de stock 🎉</p>`}
            ${Can.route("compras") ? `<button class="btn-ghost w-full justify-center py-2.5" data-goto="compras">Ver Órdenes de Compra</button>` : ""}
          </div>
        </div>
      </div>`;

      UI.animateCounters(el);
      el.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => location.hash = "#/" + b.dataset.goto);
      el.querySelectorAll("[data-po]").forEach(b => b.onclick = async () => {
        const p = DB.products.find(x => x.sku === b.dataset.po);
        const id = "PO-" + String(Math.floor(1000 + Math.random() * 9000));
        await Store.upsert("purchases", { id, supplier: p.supplier, items: p.min * 2, total: +(p.price * p.min * 2).toFixed(2), status: "Pendiente", date: "04 Jul 2026", eta: "—" });
        Store.log("CREATE", "Compras", `Orden ${id} generada desde alerta de stock (${p.sku})`);
        UI.toast(`Orden ${id} creada para reponer ${p.name}.`, "success", "Orden generada");
      });
      const exp = el.querySelector("[data-export]");
      if (exp) exp.onclick = () => {
        UI.exportPDF({
          title: "Panel Ejecutivo — " + DB.settings.company.name,
          subtitle: "Resumen operacional generado el 4 de Julio de 2026",
          head: ["KPI", "Valor"],
          body: k.map(x => [x.label, (x.prefix || "") + x.value.toLocaleString("en-US") + (x.suffix || "")]),
          filename: "panel-ejecutivo.pdf"
        });
        Store.log("EXPORT", "Dashboard", "Exportación del panel ejecutivo a PDF");
      };
    }
  },

  /* ================= EMPLEADOS ================= */
  empleados: {
    title: "Empleados", crumbs: ["Inicio", "Capital Humano", "Gestión de Personal"],
    render(el, params) {
      if (params && params[0]) return Views.empleados.renderProfile(el, parseInt(params[0]));
      const canSalary = Can.cap("salaries");
      el.innerHTML = `
      ${pageHeader("Gestión de Personal", `${DB.employees.length} empleados registrados`, `
        <button class="btn-ghost" data-csv>${UI.icon("file_download", "text-[18px]")} Exportar CSV</button>
        <button class="btn-primary" id="btn-add-emp">${UI.icon("person_add", "text-[18px]")} Añadir Empleado</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "Headcount total", value: DB.employees.length, icon: "groups", color: "primary", trend: 2.1 },
          { label: "Activos", value: DB.employees.filter(e => e.status === "Activo").length, icon: "task_alt", color: "success", trend: 1.0 },
          { label: "En vacaciones/licencia", value: DB.employees.filter(e => e.status !== "Activo").length, icon: "beach_access", color: "warning", trend: 0 },
          { label: "Retención anual", value: DB.hr.retention, suffix: "%", icon: "favorite", color: "indigo", trend: 1.2 }
        ].map(UI.kpiCard).join("")}
      </div>
      <div id="emp-table" class="card overflow-hidden"></div>`;

      const statusColors = { "Activo": "success", "Vacaciones": "warning", "Licencia": "info" };
      const cols = [
        { label: "Empleado", key: "name" }, { label: "Departamento", key: "dept" },
        { label: "Rol", key: "role" }, { label: "Estado", key: "status" }
      ];
      if (canSalary) cols.push({ label: "Salario anual", key: "salary", align: "right" });
      cols.push({ label: "Acciones", sortable: false, align: "right" });

      const table = UI.dataTable({
        id: "emp-table", columns: cols, rows: DB.employees, pageSize: 8,
        filters: [
          { key: "dept", label: "Departamento", options: [...new Set(DB.employees.map(e => e.dept))] },
          { key: "status", label: "Estado", options: [...new Set(DB.employees.map(e => e.status))] }
        ],
        renderRow: (e) => `
          <tr data-id="${e.id}" class="cursor-pointer">
            <td><span class="flex items-center gap-sm">${UI.avatar(e.name, e.id)}<span>
              <span class="block font-medium">${e.name}</span>
              <span class="block text-[12px] text-on-surface-variant">${e.email}</span></span></span></td>
            <td>${e.dept}</td><td class="text-on-surface-variant">${e.role}</td>
            <td>${UI.badge(e.status, statusColors[e.status])}</td>
            ${canSalary ? `<td class="text-right font-medium">${fmt.money(e.salary)}</td>` : ""}
            <td class="text-right whitespace-nowrap">
              <button class="icon-btn" data-view="${e.id}" title="Ver perfil">${UI.icon("visibility", "text-[18px]")}</button>
              ${Can.cap("approve") ? `<button class="icon-btn" data-edit="${e.id}" title="Editar">${UI.icon("edit", "text-[18px]")}</button>` : ""}
              ${Can.cap("delete") ? `<button class="icon-btn text-error" data-del="${e.id}" title="Eliminar">${UI.icon("delete", "text-[18px]")}</button>` : ""}
            </td>
          </tr>`,
        onRowClick: (id) => location.hash = "#/empleados/" + id
      });
      table.render();

      el.addEventListener("click", (ev) => {
        const edit = ev.target.closest("[data-edit]"), view = ev.target.closest("[data-view]"), del = ev.target.closest("[data-del]");
        if (edit) { ev.stopPropagation(); Views.empleados.openModal(parseInt(edit.dataset.edit), table); }
        if (view) { ev.stopPropagation(); location.hash = "#/empleados/" + view.dataset.view; }
        if (del) {
          ev.stopPropagation();
          const e = DB.employees.find(x => x.id === parseInt(del.dataset.del));
          UI.confirm({
            title: "Eliminar empleado", danger: true, okLabel: "Eliminar",
            message: `Se eliminará permanentemente la ficha de <b>${e.name}</b> de la base de datos. Esta acción no se puede deshacer.`,
            onOk: async () => {
              await Store.remove("employees", e.id);
              Store.log("DELETE", "Empleados", `Ficha eliminada: ${e.name} (#${e.id})`, "warning");
              table.render(); UI.toast("Empleado eliminado.", "warning", e.name);
            }
          });
        }
      });
      document.getElementById("btn-add-emp").onclick = () => {
        if (!Can.cap("approve")) return UI.toast("Necesitas rol de Gerente o Administrador para crear empleados.", "warning", "Permiso insuficiente");
        Views.empleados.openModal(null, table);
      };
      el.querySelector("[data-csv]").onclick = () => {
        UI.exportExcel(DB.employees.map(e => ({
          ID: e.id, Nombre: e.name, Correo: e.email, Departamento: e.dept, Puesto: e.role,
          Estado: e.status, ...(canSalary ? { "Salario anual": e.salary } : {}), Ubicación: e.location, Contratado: e.hired
        })), "empleados.xlsx", "Empleados");
        Store.log("EXPORT", "Empleados", "Exportación Excel del listado de empleados");
      };
    },

    openModal(id, table) {
      const e = id ? DB.employees.find(x => x.id === id) : null;
      UI.formModal({
        title: e ? "Editar Empleado" : "Nuevo Empleado",
        subtitle: e ? `Actualizando ficha de ${e.name}` : "Se guardará en la base de datos",
        submitLabel: e ? "Guardar cambios" : "Crear empleado",
        fields: [
          { name: "name", label: "Nombre completo", value: e?.name },
          { name: "email", label: "Correo", type: "email", value: e?.email },
          { name: "dept", label: "Departamento", type: "select", options: ["Finanzas", "Ventas", "Operaciones", "TI", "RRHH", "Marketing"], value: e?.dept },
          { name: "role", label: "Puesto", value: e?.role },
          { name: "salary", label: "Salario anual (USD)", type: "number", min: 0, value: e?.salary },
          { name: "status", label: "Estado", type: "select", options: ["Activo", "Vacaciones", "Licencia"], value: e?.status },
          { name: "location", label: "Ubicación", value: e?.location || "San José", required: false },
          { name: "phone", label: "Teléfono", value: e?.phone || "", required: false }
        ],
        onSave: async (data, close) => {
          const row = e
            ? { ...e, ...data }
            : { id: Math.max(0, ...DB.employees.map(x => x.id)) + 1, hired: new Date().toISOString().slice(0, 10), performance: 75, ...data };
          await Store.upsert("employees", row);
          Store.log(e ? "UPDATE" : "CREATE", "Empleados", `${e ? "Ficha actualizada" : "Empleado creado"}: ${row.name} (#${row.id})`);
          close(); table.render();
          UI.toast(e ? "Ficha actualizada en la base de datos." : "Empleado guardado en la base de datos.", "success", row.name);
        }
      });
    },

    renderProfile(el, id) {
      const e = DB.employees.find(x => x.id === id);
      if (!e) { el.innerHTML = `<p class="text-on-surface-variant">Empleado no encontrado.</p>`; return; }
      const canSalary = Can.cap("salaries");
      el.innerHTML = `
      <div>
        <button class="btn-ghost mb-md" onclick="location.hash='#/empleados'">${UI.icon("arrow_back", "text-[18px]")} Volver al listado</button>
        <div class="card p-lg flex flex-wrap gap-lg items-center">
          <span class="avatar !w-20 !h-20 !text-[24px] brand-gradient !text-white">${fmt.initials(e.name)}</span>
          <div class="flex-1 min-w-[220px]">
            <h2 class="text-headline-md text-on-surface">${e.name}</h2>
            <p class="text-body-md text-on-surface-variant">${e.role} · ${e.dept}</p>
            <div class="flex gap-sm mt-sm flex-wrap">${UI.badge(e.status)}${UI.badge("ID-" + String(e.id).padStart(4, "0"), "neutral")}</div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-ghost">${UI.icon("mail", "text-[18px]")} Mensaje</button>
            ${Can.cap("approve") ? `<button class="btn-primary" id="edit-from-profile">${UI.icon("edit", "text-[18px]")} Editar</button>` : ""}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="space-y-lg">
          ${UI.panel("Información de contacto", "", `
            <div class="space-y-md text-body-md">
              ${[["mail", e.email], ["call", e.phone || "—"], ["location_on", e.location], ["event", "Contratado: " + e.hired]]
                .map(([i, v]) => `<div class="flex items-center gap-md text-on-surface">${UI.icon(i, "text-on-surface-variant text-[20px]")}${v}</div>`).join("")}
            </div>`)}
          ${canSalary ? UI.panel("Compensación", "", `
            <p class="text-label-md text-on-surface-variant uppercase">Salario anual</p>
            <p class="text-headline-md text-on-surface counter" data-value="${e.salary}" data-prefix="$">0</p>
            <div class="mt-md pt-md border-t border-outline-variant/20 text-body-md text-on-surface-variant">
              Próxima revisión salarial: <span class="text-on-surface font-medium">Enero 2027</span></div>`)
          : UI.panel("Compensación", "", `<p class="text-body-md text-on-surface-variant flex items-center gap-sm">${UI.icon("lock", "text-[18px]")} Visible solo para Gerencia y Administración</p>`)}
        </div>
        <div class="lg:col-span-2 space-y-lg">
          ${UI.panel("Rendimiento", "Evaluación de los últimos 12 meses", `
            <div class="flex items-center gap-lg flex-wrap">
              <div class="flex-1 min-w-[220px]">${UI.lineChart([62, 70, 65, 74, 78, 72, 81, 85, 80, 88, 91, e.performance], { height: 180, id: "perf" })}</div>
              <div class="text-center px-lg">
                <p class="text-display-lg text-success">${e.performance}</p>
                <p class="text-label-md text-on-surface-variant uppercase">Score global</p>
              </div>
            </div>`)}
          ${UI.panel("Historial reciente", "", `
            <div class="space-y-md">
              ${[["check_circle", "success", "Evaluación anual completada", "15 Jun 2026"],
                 ["school", "info", "Certificación: Seguridad de datos", "02 May 2026"],
                 ["trending_up", "success", "Promoción a " + e.role, "10 Ene 2026"],
                 ["flight_takeoff", "warning", "Vacaciones (8 días)", "Dic 2025"]]
                .map(([i, c, t, d]) => `
                <div class="flex items-center gap-md">
                  <div class="p-2 rounded-lg bg-${c === "info" ? "indigo-acc" : c}/10 text-${c === "info" ? "indigo-acc" : c}">${UI.icon(i, "text-[20px]")}</div>
                  <div class="flex-1"><p class="text-body-md text-on-surface font-medium">${t}</p></div>
                  <span class="text-label-md text-on-surface-variant">${d}</span>
                </div>`).join("")}
            </div>`)}
        </div>
      </div>`;
      UI.animateCounters(el);
      const btn = el.querySelector("#edit-from-profile");
      if (btn) btn.onclick = () => Views.empleados.openModal(id, { render: () => Views.empleados.renderProfile(el, id) });
    }
  },

  /* ================= RRHH ================= */
  rrhh: {
    title: "Recursos Humanos", crumbs: ["Inicio", "Capital Humano", "Panel de RRHH"],
    render(el) {
      const canApprove = Can.cap("approve");
      el.innerHTML = `
      ${pageHeader("Recursos Humanos", "Gestión de talento, ausencias y reclutamiento", `
        <button class="btn-primary" id="new-request">${UI.icon("post_add", "text-[18px]")} Nueva Solicitud</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "Headcount", value: DB.employees.length, icon: "groups", color: "primary", trend: 2.1 },
          { label: "Retención", value: DB.hr.retention, suffix: "%", icon: "favorite", color: "success", trend: 1.2 },
          { label: "Solicitudes pendientes", value: DB.hr.requests.filter(r => r.status === "Pendiente").length, icon: "pending_actions", color: "warning", trend: 0 },
          { label: "Ausentismo", value: DB.hr.absenceRate, suffix: "%", icon: "event_busy", color: "cyan", trend: -0.4, invert: true }
        ].map(UI.kpiCard).join("")}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div class="card overflow-hidden">
          <div class="px-lg py-md border-b border-outline-variant/20"><h4 class="text-headline-sm text-on-surface">Solicitudes</h4></div>
          <div class="overflow-x-auto"><table class="data-table">
            <thead><tr><th>Empleado</th><th>Tipo</th><th>Fechas</th><th>Estado</th><th class="text-right">Acción</th></tr></thead>
            <tbody>${DB.hr.requests.map((r, i) => `
              <tr><td><span class="flex items-center gap-sm">${UI.avatar(r.emp, i)}${r.emp}</span></td>
              <td class="text-on-surface-variant">${r.type}</td><td>${r.range}</td>
              <td>${UI.badge(r.status)}</td>
              <td class="text-right whitespace-nowrap">${r.status === "Pendiente" && canApprove ? `
                <button class="icon-btn text-success" data-approve="${r.id}" title="Aprobar">${UI.icon("check_circle", "text-[20px]")}</button>
                <button class="icon-btn text-error" data-reject="${r.id}" title="Rechazar">${UI.icon("cancel", "text-[20px]")}</button>` : "—"}</td></tr>`).join("")}
            </tbody></table></div>
        </div>
        <div class="space-y-lg">
          ${UI.panel("Reclutamiento activo", "Vacantes abiertas y pipeline de candidatos", `
            <div class="space-y-md">
              ${DB.hr.openPositions.map(p => `
              <div class="p-md rounded-lg bg-surface-container/60 border border-outline-variant/20 hover:border-indigo-acc/40 transition-colors">
                <div class="flex justify-between items-start gap-md">
                  <div><p class="font-semibold text-on-surface text-body-md">${p.title}</p>
                  <p class="text-label-md text-on-surface-variant">${p.dept} · ${p.applicants} candidatos</p></div>
                  ${UI.badge(p.stage, p.stage === "Oferta" ? "success" : p.stage === "Entrevistas" ? "info" : "cyan")}
                </div>
                <div class="stock-bar mt-sm"><div class="bg-indigo-acc" style="width:${p.stage === "Oferta" ? 90 : p.stage === "Entrevistas" ? 60 : 30}%"></div></div>
              </div>`).join("")}
            </div>`)}
          ${UI.panel("Distribución por departamento", "", UI.donutChart([
            { label: "Operaciones", value: 34, color: "var(--c-indigo)" },
            { label: "Ventas", value: 26, color: "var(--c-cyan)" },
            { label: "TI", value: 18, color: "var(--c-purple)" },
            { label: "Otros", value: 22, color: "var(--c-success)" }
          ], String(DB.employees.length), 160))}
        </div>
      </div>`;
      UI.animateCounters(el);

      const setStatus = async (id, status) => {
        const r = DB.hr.requests.find(x => x.id === parseInt(id));
        r.status = status;
        await Store.upsert("hr_requests", r);
        Store.log(status === "Aprobado" ? "APPROVE" : "REJECT", "RRHH", `Solicitud de ${r.emp} (${r.type}) → ${status}`);
        Views.rrhh.render(el);
        UI.toast(`Solicitud ${status.toLowerCase()} y guardada.`, status === "Aprobado" ? "success" : "warning");
      };
      el.querySelectorAll("[data-approve]").forEach(b => b.onclick = () => setStatus(b.dataset.approve, "Aprobado"));
      el.querySelectorAll("[data-reject]").forEach(b => b.onclick = () => setStatus(b.dataset.reject, "Rechazado"));

      document.getElementById("new-request").onclick = () => UI.formModal({
        title: "Nueva solicitud", subtitle: "Vacaciones, licencias o permisos", wide: false,
        fields: [
          { name: "emp", label: "Empleado", type: "select", options: DB.employees.map(e => e.name), value: Store.user.name },
          { name: "type", label: "Tipo", type: "select", options: ["Vacaciones", "Licencia médica", "Día personal", "Teletrabajo"] },
          { name: "range", label: "Fechas (ej. 08 – 19 Jul)" },
          { name: "days", label: "Días", type: "number", min: 0, value: 1 }
        ],
        onSave: async (data, close) => {
          const row = { id: Math.max(0, ...DB.hr.requests.map(r => r.id)) + 1, status: "Pendiente", ...data, days: parseInt(data.days) };
          await Store.upsert("hr_requests", row);
          Store.log("CREATE", "RRHH", `Nueva solicitud de ${row.emp}: ${row.type} (${row.range})`);
          close(); Views.rrhh.render(el);
          UI.toast("Solicitud registrada. Pendiente de aprobación.", "success");
        }
      });
    }
  },

  /* ================= NÓMINA ================= */
  nomina: {
    title: "Nómina", crumbs: ["Inicio", "Capital Humano", "Nómina"],
    render(el) {
      const p = DB.payroll;
      const gross = DB.employees.reduce((a, e) => a + e.salary / 12, 0);
      el.innerHTML = `
      ${pageHeader("Nómina", `Periodo actual: ${p.period} · ${DB.employees.length} empleados`, `
        <button class="btn-ghost">${UI.icon("history", "text-[18px]")} Historial</button>
        ${Can.cap("payroll") ? `<button class="btn-primary" id="run-payroll">${UI.icon("play_arrow", "text-[18px]")} Ejecutar Nómina</button>` : ""}`)}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
        ${[
          { label: "Bruto del periodo", value: Math.round(gross), prefix: "$", icon: "account_balance_wallet", color: "primary", trend: 1.0 },
          { label: "Deducciones (21.25%)", value: Math.round(gross * 0.2125), prefix: "$", icon: "remove_circle", color: "warning", trend: 0.6, invert: true },
          { label: "Neto a pagar", value: Math.round(gross * 0.7875), prefix: "$", icon: "payments", color: "success", trend: 1.1 }
        ].map(UI.kpiCard).join("")}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="px-lg py-md border-b border-outline-variant/20"><h4 class="text-headline-sm text-on-surface">Detalle por empleado</h4></div>
          <div class="overflow-x-auto"><table class="data-table">
            <thead><tr><th>Empleado</th><th>Departamento</th><th class="text-right">Bruto mensual</th><th class="text-right">Deducciones</th><th class="text-right">Neto</th><th>Estado</th></tr></thead>
            <tbody>${DB.employees.slice(0, 8).map((e, i) => {
              const g = e.salary / 12, ded = g * 0.2125;
              return `<tr>
                <td><span class="flex items-center gap-sm">${UI.avatar(e.name, i)}${e.name}</span></td>
                <td class="text-on-surface-variant">${e.dept}</td>
                <td class="text-right">${fmt.money(g)}</td>
                <td class="text-right text-on-surface-variant">−${fmt.money(ded)}</td>
                <td class="text-right font-semibold">${fmt.money(g - ded)}</td>
                <td>${UI.badge(i < 5 ? "Aprobada" : "Pendiente")}</td></tr>`;
            }).join("")}</tbody></table></div>
        </div>
        <div class="space-y-lg">
          ${UI.panel("Ciclos anteriores", "", `
            <div class="space-y-md">${p.runs.map(r => `
              <div class="flex items-center justify-between p-md rounded-lg bg-surface-container/60 border border-outline-variant/20">
                <div><p class="font-semibold text-on-surface text-body-md">${r.period}</p>
                <p class="text-label-md text-on-surface-variant">${r.employees} empleados · ${r.date}</p></div>
                <div class="text-right"><p class="font-semibold text-on-surface">${fmt.moneyShort(r.gross)}</p>${UI.badge(r.status, "success")}</div>
              </div>`).join("")}</div>`)}
          ${UI.panel("Composición de deducciones", "", UI.donutChart([
            { label: "Seguridad social", value: 48, color: "var(--c-indigo)" },
            { label: "Impuesto renta", value: 32, color: "var(--c-cyan)" },
            { label: "Pensiones", value: 14, color: "var(--c-purple)" },
            { label: "Otros", value: 6, color: "var(--c-success)" }
          ], "21.2%", 150))}
        </div>
      </div>`;
      UI.animateCounters(el);
      const run = document.getElementById("run-payroll");
      if (run) run.onclick = () => Views.nomina.runPayroll();
    },

    runPayroll() {
      UI.modal({
        title: "Ejecutar nómina de " + DB.payroll.period,
        subtitle: `Se procesarán ${DB.employees.length} empleados. Esta acción genera asientos contables.`,
        body: `<div class="py-lg text-center space-y-md">
          <div class="w-16 h-16 mx-auto rounded-full border-4 border-outline-variant/30 border-t-indigo-acc spinner"></div>
          <p class="text-body-md text-on-surface-variant" id="payroll-status">Validando datos de empleados…</p>
          <div class="stock-bar max-w-xs mx-auto"><div class="brand-gradient" id="payroll-bar" style="width:5%"></div></div>
        </div>`,
        onMount: (root, close) => {
          const steps = ["Validando datos de empleados…", "Calculando deducciones e impuestos…", "Generando asientos contables…", "Emitiendo comprobantes de pago…"];
          let s = 0;
          const bar = root.querySelector("#payroll-bar"), status = root.querySelector("#payroll-status");
          const iv = setInterval(() => {
            s++;
            if (s < steps.length) { status.textContent = steps[s]; bar.style.width = (s + 1) / (steps.length + 1) * 100 + "%"; }
            else {
              clearInterval(iv); bar.style.width = "100%";
              const net = DB.employees.reduce((a, e) => a + e.salary / 12 * 0.7875, 0);
              Store.log("PAYROLL", "Nómina", `Nómina de ${DB.payroll.period} procesada (${DB.employees.length} empleados, ${fmt.money(net)} netos)`, "warning");
              setTimeout(() => { close(); UI.toast(`Nómina de ${DB.payroll.period} procesada: ${fmt.money(net)} netos.`, "success", "Nómina completada"); }, 400);
            }
          }, 900);
        }
      });
    }
  },

  /* ================= INVENTARIO ================= */
  inventario: {
    title: "Inventario", crumbs: ["Inicio", "Operaciones", "Inventario"],
    render(el) {
      const totalValue = DB.products.reduce((a, p) => a + p.stock * p.price, 0);
      const lowCount = DB.products.filter(p => p.stock <= p.min).length;
      el.innerHTML = `
      ${pageHeader("Gestión de Inventario", "Catálogo, almacenes y niveles de stock en tiempo real", `
        <button class="btn-primary" id="new-product">${UI.icon("add_box", "text-[18px]")} Nuevo Producto</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "SKUs activos", value: DB.products.length, icon: "inventory_2", color: "primary", trend: 3.2 },
          { label: "Valor de inventario", value: Math.round(totalValue), prefix: "$", icon: "attach_money", color: "success", trend: -2.3 },
          { label: "Alertas de stock bajo", value: lowCount, icon: "warning", color: "warning", trend: -12, invert: true },
          { label: "Rotación (días)", value: 34, icon: "sync", color: "cyan", trend: -4.1, invert: true }
        ].map(UI.kpiCard).join("")}
      </div>

      <div>
        <div class="flex items-center justify-between mb-md">
          <h4 class="text-headline-sm text-on-surface">Catálogo de productos</h4>
          <div class="flex gap-xs bg-surface-container rounded-lg p-1">
            <button class="tab-btn active" data-tab="cards">${UI.icon("grid_view", "text-[16px]")}</button>
            <button class="tab-btn" data-tab="table">${UI.icon("table_rows", "text-[16px]")}</button>
          </div>
        </div>
        <div id="prod-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          ${DB.products.map(p => {
            const level = p.stock <= p.min * 0.5 ? ["Crítico", "error"] : p.stock <= p.min ? ["Bajo", "warning"] : ["Óptimo", "success"];
            return `
            <div class="card card-hover p-md flex flex-col gap-sm">
              <div class="flex justify-between items-start">
                ${p.image_url
                  ? `<img src="${p.image_url}" class="w-11 h-11 rounded-xl object-cover border border-outline-variant/20" alt="${p.name}"/>`
                  : `<div class="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">${UI.icon(p.img || "inventory_2")}</div>`}
                ${UI.badge(level[0], level[1])}
              </div>
              <div class="flex-1">
                <p class="font-semibold text-on-surface text-body-md leading-tight">${p.name}</p>
                <p class="text-label-md text-on-surface-variant mt-0.5">${p.sku} · ${p.category}</p>
              </div>
              ${UI.stockBar(p.stock, p.min, p.max)}
              <div class="flex justify-between items-center text-body-md">
                <span class="text-on-surface-variant">${p.stock} uds <span class="opacity-60">/ min ${p.min}</span></span>
                <span class="font-semibold text-on-surface">${fmt.money(p.price)}</span>
              </div>
              <div class="flex gap-xs pt-xs border-t border-outline-variant/15">
                <button class="btn-ghost flex-1 justify-center !py-1.5" data-adjust="${p.sku}">${UI.icon("tune", "text-[16px]")} Ajustar</button>
                ${Can.cap("delete") ? `<button class="icon-btn text-error" data-del-prod="${p.sku}">${UI.icon("delete", "text-[18px]")}</button>` : ""}
              </div>
            </div>`;
          }).join("")}
        </div>
        <div id="prod-table" class="card overflow-hidden hidden"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${UI.panel("Almacenes", "Ocupación y responsables", `
          <div class="space-y-md">${DB.warehouses.map(w => `
            <div class="flex items-center gap-md">
              <div class="p-2.5 rounded-lg bg-indigo-acc/10 text-indigo-acc">${UI.icon("warehouse")}</div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between text-body-md"><span class="font-semibold text-on-surface">${w.name} <span class="text-on-surface-variant font-normal">· ${w.location}</span></span>
                <span class="text-on-surface-variant">${w.capacity}%</span></div>
                <div class="stock-bar mt-1.5"><div class="${w.capacity > 75 ? "bg-warning" : "bg-indigo-acc"}" style="width:${w.capacity}%"></div></div>
                <p class="text-label-md text-on-surface-variant mt-1">${fmt.int(w.items)} artículos · Resp: ${w.manager}</p>
              </div>
            </div>`).join("")}</div>`)}
        ${UI.panel("Proveedores", "Rendimiento de entregas", `
          <div class="overflow-x-auto -m-lg"><table class="data-table">
            <thead><tr><th>Proveedor</th><th>Categoría</th><th class="text-right">Órdenes</th><th class="text-right">A tiempo</th><th class="text-right">Rating</th></tr></thead>
            <tbody>${DB.suppliers.map(s => `
              <tr><td class="font-medium">${s.name}</td><td class="text-on-surface-variant">${s.category}</td>
              <td class="text-right">${s.orders}</td>
              <td class="text-right">${UI.badge(s.onTime + "%", s.onTime >= 95 ? "success" : s.onTime >= 90 ? "info" : "warning")}</td>
              <td class="text-right"><span class="inline-flex items-center gap-xs font-semibold">${UI.icon("star", "text-warning text-[16px]")}${s.rating}</span></td></tr>`).join("")}
            </tbody></table></div>`)}
      </div>`;

      UI.animateCounters(el);
      const levelOf = p => p.stock <= p.min * 0.5 ? "Crítico" : p.stock <= p.min ? "Bajo" : "Óptimo";
      const table = UI.dataTable({
        id: "prod-table",
        columns: [
          { label: "Producto", key: "name" }, { label: "SKU", key: "sku" }, { label: "Categoría", key: "category" },
          { label: "Stock", key: "stock" }, { label: "Precio", key: "price", align: "right" }, { label: "Estado", sortable: false }
        ],
        rows: DB.products, pageSize: 8,
        filters: [{ key: "category", label: "Categoría", options: [...new Set(DB.products.map(p => p.category))] }],
        renderRow: (p) => `
          <tr><td class="font-medium">${p.name}</td><td class="text-on-surface-variant">${p.sku}</td>
          <td>${p.category}</td>
          <td><div class="w-28">${UI.stockBar(p.stock, p.min, p.max)}<span class="text-label-md text-on-surface-variant">${p.stock} uds</span></div></td>
          <td class="text-right font-medium">${fmt.money(p.price)}</td>
          <td>${UI.badge(levelOf(p), levelOf(p) === "Crítico" ? "error" : levelOf(p) === "Bajo" ? "warning" : "success")}</td></tr>`
      });
      el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => {
        el.querySelectorAll("[data-tab]").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        const cards = document.getElementById("prod-cards"), tbl = document.getElementById("prod-table");
        if (b.dataset.tab === "table") { cards.classList.add("hidden"); tbl.classList.remove("hidden"); table.render(); }
        else { tbl.classList.add("hidden"); cards.classList.remove("hidden"); }
      });

      const productForm = (p) => UI.formModal({
        title: p ? `Ajustar ${p.sku}` : "Nuevo Producto",
        subtitle: "Se guardará en la base de datos",
        submitLabel: p ? "Guardar cambios" : "Crear producto",
        fields: [
          { name: "sku", label: "SKU", value: p?.sku || "SKU-" + Math.floor(1000 + Math.random() * 9000), readonly: !!p },
          { name: "name", label: "Nombre", value: p?.name },
          { name: "category", label: "Categoría", type: "select", options: ["Redes", "Cableado", "Servidores", "Periféricos", "Energía", "Equipos"], value: p?.category },
          { name: "price", label: "Precio (USD)", type: "number", min: 0, step: "0.01", value: p?.price },
          { name: "stock", label: "Stock actual", type: "number", min: 0, value: p?.stock ?? 0 },
          { name: "min", label: "Stock mínimo", type: "number", min: 0, value: p?.min ?? 5 },
          { name: "max", label: "Stock máximo", type: "number", min: 1, value: p?.max ?? 100 },
          { name: "warehouse", label: "Almacén", type: "select", options: DB.warehouses.map(w => w.name), value: p?.warehouse },
          { name: "supplier", label: "Proveedor", type: "select", options: DB.suppliers.map(s => s.name), value: p?.supplier },
          ...(Store.mode === "supabase" ? [{ name: "imagefile", label: "Imagen del producto (opcional)", type: "file", accept: "image/*", required: false, cols: 2 }] : [])
        ],
        onSave: async (data, close) => {
          data.stock = parseInt(data.stock); data.min = parseInt(data.min); data.max = parseInt(data.max);
          const imageFile = data.imagefile; delete data.imagefile;
          const row = { img: p?.img || "inventory_2", ...(p || {}), ...data };
          if (imageFile && imageFile.size > 0) {
            try { row.image_url = await Store.uploadProductImage(row.sku, imageFile); }
            catch (ex) { UI.toast(ex.message, "warning"); }
          }
          await Store.upsert("products", row);
          Store.log(p ? "UPDATE" : "CREATE", "Inventario", `${p ? "Ajuste de producto" : "Producto creado"}: ${row.sku} (stock: ${row.stock})`, p && row.stock <= row.min ? "warning" : "info");
          close(); Views.inventario.render(el);
          UI.toast("Producto guardado en la base de datos.", "success", row.name);
        }
      });

      document.getElementById("new-product").onclick = () => productForm(null);
      el.querySelectorAll("[data-adjust]").forEach(b => b.onclick = () => productForm(DB.products.find(p => p.sku === b.dataset.adjust)));
      el.querySelectorAll("[data-del-prod]").forEach(b => b.onclick = () => {
        const p = DB.products.find(x => x.sku === b.dataset.delProd);
        UI.confirm({
          title: "Eliminar producto", danger: true, okLabel: "Eliminar",
          message: `Se eliminará <b>${p.name}</b> (${p.sku}) del catálogo y de la base de datos.`,
          onOk: async () => {
            await Store.remove("products", p.sku);
            Store.log("DELETE", "Inventario", `Producto eliminado: ${p.sku} — ${p.name}`, "warning");
            Views.inventario.render(el); UI.toast("Producto eliminado.", "warning", p.sku);
          }
        });
      });
    }
  },

  /* ================= COMPRAS ================= */
  compras: {
    title: "Compras", crumbs: ["Inicio", "Operaciones", "Compras"],
    render(el) {
      el.innerHTML = `
      ${pageHeader("Órdenes de Compra", "Aprovisionamiento y relación con proveedores", `
        <button class="btn-primary" id="new-po">${UI.icon("add_shopping_cart", "text-[18px]")} Nueva Orden</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "Órdenes registradas", value: DB.purchases.length, icon: "shopping_cart", color: "primary", trend: 8.3 },
          { label: "Gasto acumulado", value: Math.round(DB.purchases.filter(p => p.status !== "Cancelada").reduce((a, p) => a + p.total, 0)), prefix: "$", icon: "payments", color: "indigo", trend: 4.2 },
          { label: "Pendientes de aprobar", value: DB.purchases.filter(p => p.status === "Pendiente").length, icon: "pending_actions", color: "warning", trend: 0 },
          { label: "Entrega a tiempo", value: 94, suffix: "%", icon: "local_shipping", color: "success", trend: 2.0 }
        ].map(UI.kpiCard).join("")}
      </div>
      <div id="po-table" class="card overflow-hidden"></div>`;

      const table = UI.dataTable({
        id: "po-table",
        columns: [
          { label: "Orden #", key: "id" }, { label: "Proveedor", key: "supplier" }, { label: "Ítems", key: "items" },
          { label: "Total", key: "total", align: "right" }, { label: "Fecha", key: "date" }, { label: "ETA", key: "eta" },
          { label: "Estado", key: "status" }, { label: "", sortable: false, align: "right" }
        ],
        rows: DB.purchases, pageSize: 8,
        filters: [{ key: "status", label: "Estado", options: [...new Set(DB.purchases.map(p => p.status))] }],
        renderRow: (p) => `
          <tr><td class="font-semibold text-indigo-acc">${p.id}</td><td>${p.supplier}</td>
          <td class="text-on-surface-variant">${p.items}</td>
          <td class="text-right font-medium">${fmt.money(p.total)}</td>
          <td class="text-on-surface-variant">${p.date}</td><td class="text-on-surface-variant">${p.eta}</td>
          <td>${UI.badge(p.status)}</td>
          <td class="text-right whitespace-nowrap">
            ${p.status === "Pendiente" && Can.cap("approve") ? `<button class="icon-btn text-success" data-approve-po="${p.id}" title="Aprobar">${UI.icon("check_circle", "text-[18px]")}</button>` : ""}
            ${Can.cap("delete") ? `<button class="icon-btn text-error" data-del-po="${p.id}" title="Eliminar">${UI.icon("delete", "text-[18px]")}</button>` : ""}
          </td></tr>`
      });
      table.render();
      UI.animateCounters(el);

      el.addEventListener("click", async (ev) => {
        const ap = ev.target.closest("[data-approve-po]"), del = ev.target.closest("[data-del-po]");
        if (ap) {
          const p = DB.purchases.find(x => x.id === ap.dataset.approvePo);
          p.status = "Aprobada"; await Store.upsert("purchases", p);
          Store.log("APPROVE", "Compras", `Orden ${p.id} aprobada (${fmt.money(p.total)})`);
          table.render(); UI.toast(`Orden ${p.id} aprobada.`, "success");
        }
        if (del) {
          const p = DB.purchases.find(x => x.id === del.dataset.delPo);
          UI.confirm({
            title: "Eliminar orden", danger: true, okLabel: "Eliminar",
            message: `Se eliminará la orden <b>${p.id}</b> (${p.supplier}, ${fmt.money(p.total)}).`,
            onOk: async () => {
              await Store.remove("purchases", p.id);
              Store.log("DELETE", "Compras", `Orden eliminada: ${p.id}`, "warning");
              table.render(); UI.toast("Orden eliminada.", "warning", p.id);
            }
          });
        }
      });

      document.getElementById("new-po").onclick = () => UI.formModal({
        title: "Nueva Orden de Compra", subtitle: "Se guardará en la base de datos",
        fields: [
          { name: "supplier", label: "Proveedor", type: "select", options: DB.suppliers.map(s => s.name) },
          { name: "items", label: "Cantidad de ítems", type: "number", min: 1, value: 1 },
          { name: "total", label: "Total (USD)", type: "number", min: 0, step: "0.01" },
          { name: "eta", label: "Fecha estimada de entrega", value: "—", required: false }
        ],
        onSave: async (data, close) => {
          const row = { id: "PO-" + String(Math.floor(1000 + Math.random() * 9000)), status: "Pendiente", date: "04 Jul 2026", ...data, items: parseInt(data.items) };
          await Store.upsert("purchases", row);
          Store.log("CREATE", "Compras", `Orden ${row.id} creada para ${row.supplier} (${fmt.money(row.total)})`);
          close(); Views.compras.render(el);
          UI.toast(`Orden ${row.id} registrada.`, "success", row.supplier);
        }
      });
    }
  },

  /* ================= VENTAS ================= */
  ventas: {
    title: "Ventas", crumbs: ["Inicio", "Comercial", "Ventas"],
    render(el) {
      el.innerHTML = `
      ${pageHeader("Módulo de Ventas", "Pedidos, analítica y rendimiento comercial", `
        <button class="btn-primary" id="new-order">${UI.icon("add", "text-[18px]")} Nuevo Pedido</button>`)}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2">${UI.panel("Analítica de ventas", "Ingresos mensuales (miles USD)",
          UI.lineChart(DB.salesTrend.map(v => v * 13), { height: 240, stroke: "rgb(var(--cyan-acc))", id: "sales" }))}</div>
        <div class="space-y-lg">
          ${UI.panel("Por canal", "", UI.donutChart([
            { label: "Directo", value: 46, color: "var(--c-indigo)" },
            { label: "E-commerce", value: 31, color: "var(--c-cyan)" },
            { label: "Partners", value: 23, color: "var(--c-purple)" }
          ], "$1.28M", 150))}
          <div class="card p-lg">
            <p class="text-label-md text-on-surface-variant uppercase">Ticket promedio</p>
            <p class="text-headline-lg text-on-surface counter" data-value="${Math.round(DB.orders.reduce((a, o) => a + o.total, 0) / (DB.orders.length || 1))}" data-prefix="$">0</p>
            <span class="badge badge-success mt-xs">+6.8% ${UI.icon("trending_up", "text-[14px]")}</span>
          </div>
        </div>
      </div>
      <div id="orders-table" class="card overflow-hidden"></div>`;

      const table = UI.dataTable({
        id: "orders-table",
        columns: [
          { label: "Pedido #", key: "id" }, { label: "Cliente", key: "customer" }, { label: "Canal", key: "channel" },
          { label: "Ítems", key: "items" }, { label: "Total", key: "total", align: "right" }, { label: "Fecha", key: "date" },
          { label: "Estado", key: "status" }, { label: "", sortable: false, align: "right" }
        ],
        rows: DB.orders, pageSize: 8,
        filters: [
          { key: "status", label: "Estado", options: [...new Set(DB.orders.map(o => o.status))] },
          { key: "channel", label: "Canal", options: [...new Set(DB.orders.map(o => o.channel))] }
        ],
        renderRow: (o) => `
          <tr><td class="font-semibold text-indigo-acc">${o.id}</td><td>${o.customer}</td>
          <td>${UI.badge(o.channel, o.channel === "Directo" ? "info" : o.channel === "Partner" ? "purple" : "cyan")}</td>
          <td class="text-on-surface-variant">${o.items}</td>
          <td class="text-right font-medium">${fmt.money(o.total)}</td>
          <td class="text-on-surface-variant">${o.date}</td>
          <td>${UI.badge(o.status)}</td>
          <td class="text-right whitespace-nowrap">
            <button class="icon-btn" data-invoice="${o.id}" title="Generar factura">${UI.icon("receipt_long", "text-[18px]")}</button>
            ${Can.cap("delete") ? `<button class="icon-btn text-error" data-del-so="${o.id}" title="Eliminar">${UI.icon("delete", "text-[18px]")}</button>` : ""}
          </td></tr>`
      });
      table.render();
      UI.animateCounters(el);

      el.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-invoice]"), del = ev.target.closest("[data-del-so]");
        if (b) {
          const o = DB.orders.find(x => x.id === b.dataset.invoice);
          const inv = DB.invoices.find(i => i.customer === o.customer);
          if (inv) Views.facturacion.preview(inv);
          else UI.confirm({
            title: "Generar factura", okLabel: "Generar",
            message: `¿Emitir factura para el pedido <b>${o.id}</b> de ${o.customer} por ${fmt.money(o.total)}?`,
            onOk: async () => {
              const num = Math.max(2098, ...DB.invoices.map(i => parseInt(i.id.split("-")[1]) || 0)) + 1;
              const row = { id: "FAC-" + num, customer: o.customer, date: "04 Jul 2026", due: "03 Ago 2026", total: o.total, status: "Emitida", compliance: "En revisión" };
              await Store.upsert("invoices", row);
              Store.log("CREATE", "Facturación", `Factura ${row.id} emitida desde pedido ${o.id}`);
              UI.toast(`Factura ${row.id} emitida y guardada.`, "success");
            }
          });
        }
        if (del) {
          const o = DB.orders.find(x => x.id === del.dataset.delSo);
          UI.confirm({
            title: "Eliminar pedido", danger: true, okLabel: "Eliminar",
            message: `Se eliminará el pedido <b>${o.id}</b> (${o.customer}).`,
            onOk: async () => {
              await Store.remove("orders", o.id);
              Store.log("DELETE", "Ventas", `Pedido eliminado: ${o.id}`, "warning");
              table.render(); UI.toast("Pedido eliminado.", "warning", o.id);
            }
          });
        }
      });

      document.getElementById("new-order").onclick = () => UI.formModal({
        title: "Nuevo Pedido de Venta", subtitle: "Se guardará en la base de datos",
        fields: [
          { name: "customer", label: "Cliente" },
          { name: "channel", label: "Canal", type: "select", options: ["Directo", "E-commerce", "Partner"] },
          { name: "items", label: "Cantidad de ítems", type: "number", min: 1, value: 1 },
          { name: "total", label: "Total (USD)", type: "number", min: 0, step: "0.01" }
        ],
        onSave: async (data, close) => {
          const num = Math.max(2201, ...DB.orders.map(o => parseInt(o.id.split("-")[1]) || 0)) + 1;
          const row = { id: "SO-" + num, status: "Procesando", date: "04 Jul 2026", ...data, items: parseInt(data.items) };
          await Store.upsert("orders", row);
          Store.log("CREATE", "Ventas", `Pedido ${row.id} creado para ${row.customer} (${fmt.money(row.total)})`);
          close(); Views.ventas.render(el);
          UI.toast(`Pedido ${row.id} registrado.`, "success", row.customer);
        }
      });
    }
  },

  /* ================= FACTURACIÓN ================= */
  facturacion: {
    title: "Facturación", crumbs: ["Inicio", "Comercial", "Facturación"],
    render(el) {
      const pending = DB.invoices.filter(i => i.status === "Pendiente").reduce((a, i) => a + i.total, 0);
      const overdue = DB.invoices.filter(i => i.status === "Vencida").reduce((a, i) => a + i.total, 0);
      el.innerHTML = `
      ${pageHeader("Gestión de Facturas", "Facturación electrónica y compliance fiscal", `
        <button class="btn-primary" id="new-invoice">${UI.icon("post_add", "text-[18px]")} Nueva Factura</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "Facturado total", value: Math.round(DB.invoices.reduce((a, i) => a + i.total, 0)), prefix: "$", icon: "receipt_long", color: "primary", trend: 9.4 },
          { label: "Por cobrar", value: Math.round(pending), prefix: "$", icon: "schedule", color: "warning", trend: 3.1, invert: true },
          { label: "Vencido", value: Math.round(overdue), prefix: "$", icon: "error", color: "warning", trend: -8.2, invert: true },
          { label: "DSO (días cobro)", value: 28, icon: "timer", color: "cyan", trend: -2.5, invert: true }
        ].map(UI.kpiCard).join("")}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div id="inv-table" class="lg:col-span-2 card overflow-hidden"></div>
        <div class="space-y-lg">
          ${UI.panel("Próximos vencimientos", "", `
            <div class="space-y-md">${DB.invoices.filter(i => i.status !== "Pagada").slice(0, 4).map(i => `
              <div class="flex items-center gap-md p-sm rounded-lg hover:bg-surface-container/60 transition-colors">
                <div class="p-2 rounded-lg ${i.status === "Vencida" ? "bg-error/10 text-error" : "bg-warning/10 text-warning"}">${UI.icon(i.status === "Vencida" ? "warning" : "hourglass_top", "text-[20px]")}</div>
                <div class="flex-1 min-w-0"><p class="font-semibold text-body-md text-on-surface">${i.id} · ${i.customer}</p>
                <p class="text-label-md text-on-surface-variant">Vence: ${i.due}</p></div>
                <span class="font-semibold text-on-surface">${fmt.moneyShort(i.total)}</span>
              </div>`).join("") || `<p class="text-body-md text-on-surface-variant text-center py-md">Todo cobrado 🎉</p>`}</div>`)}
          ${UI.panel("Certificado digital", "Firma electrónica para compliance", `
            <div class="flex items-center gap-md">
              <div class="p-3 rounded-xl bg-success/10 text-success">${UI.icon("verified_user", "text-[28px]")}</div>
              <div><p class="font-semibold text-on-surface text-body-md">Certificado activo</p>
              <p class="text-label-md text-on-surface-variant">Expira: 12 Mar 2027 · Autoridad: HaciendaCR</p></div>
            </div>
            <div class="stock-bar mt-md"><div class="bg-success" style="width:72%"></div></div>
            <p class="text-label-md text-on-surface-variant mt-xs">252 días restantes de validez</p>`)}
        </div>
      </div>`;

      const table = UI.dataTable({
        id: "inv-table",
        columns: [
          { label: "Factura #", key: "id" }, { label: "Cliente", key: "customer" }, { label: "Fecha", key: "date" },
          { label: "Total", key: "total", align: "right" }, { label: "Estado", key: "status" },
          { label: "Compliance", key: "compliance" }, { label: "", sortable: false, align: "right" }
        ],
        rows: DB.invoices, pageSize: 7,
        filters: [{ key: "status", label: "Estado", options: [...new Set(DB.invoices.map(i => i.status))] }],
        renderRow: (i) => `
          <tr><td class="font-semibold text-indigo-acc">${i.id}</td><td>${i.customer}</td>
          <td class="text-on-surface-variant">${i.date}</td>
          <td class="text-right font-medium">${fmt.money(i.total)}</td>
          <td>${UI.badge(i.status)}</td><td>${UI.badge(i.compliance)}</td>
          <td class="text-right whitespace-nowrap">
            <button class="icon-btn" data-preview="${i.id}" title="Vista previa">${UI.icon("visibility", "text-[18px]")}</button>
            ${i.status !== "Pagada" ? `<button class="icon-btn text-success" data-pay="${i.id}" title="Marcar pagada">${UI.icon("price_check", "text-[18px]")}</button>` : ""}
          </td></tr>`
      });
      table.render();
      UI.animateCounters(el);

      el.addEventListener("click", async (ev) => {
        const pv = ev.target.closest("[data-preview]"), pay = ev.target.closest("[data-pay]");
        if (pv) Views.facturacion.preview(DB.invoices.find(i => i.id === pv.dataset.preview));
        if (pay) {
          const i = DB.invoices.find(x => x.id === pay.dataset.pay);
          i.status = "Pagada"; await Store.upsert("invoices", i);
          Store.log("UPDATE", "Facturación", `Factura ${i.id} marcada como pagada (${fmt.money(i.total)})`);
          Views.facturacion.render(el); UI.toast(`Factura ${i.id} cobrada.`, "success");
        }
      });

      document.getElementById("new-invoice").onclick = () => UI.formModal({
        title: "Nueva Factura", subtitle: "Se guardará en la base de datos",
        fields: [
          { name: "customer", label: "Cliente" },
          { name: "total", label: "Total con IVA (USD)", type: "number", min: 0, step: "0.01" },
          { name: "due", label: "Fecha de vencimiento", value: "03 Ago 2026" },
          { name: "status", label: "Estado", type: "select", options: ["Emitida", "Pendiente", "Pagada"] }
        ],
        onSave: async (data, close) => {
          const num = Math.max(2098, ...DB.invoices.map(i => parseInt(i.id.split("-")[1]) || 0)) + 1;
          const row = { id: "FAC-" + num, date: "04 Jul 2026", compliance: "En revisión", ...data };
          await Store.upsert("invoices", row);
          Store.log("CREATE", "Facturación", `Factura ${row.id} emitida a ${row.customer} (${fmt.money(row.total)})`);
          close(); Views.facturacion.render(el);
          UI.toast(`Factura ${row.id} emitida y guardada.`, "success", row.customer);
        }
      });
    },

    preview(inv) {
      const net = inv.total / 1.13, tax = inv.total - net;
      UI.modal({
        title: "Vista previa de factura", subtitle: inv.id + " · " + inv.customer, wide: true,
        body: `
        <div class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg space-y-lg">
          <div class="flex justify-between items-start flex-wrap gap-md">
            <div class="flex items-center gap-sm">
              <div class="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white">${UI.icon("hub")}</div>
              <div><p class="font-bold text-on-surface">${DB.settings.company.name}</p>
              <p class="text-label-md text-on-surface-variant">CIF ${DB.settings.company.taxId} · ${DB.settings.company.address}</p></div>
            </div>
            <div class="text-right">
              <p class="text-headline-sm text-on-surface">${inv.id}</p>
              ${UI.badge(inv.status)}
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-md text-body-md">
            ${[["Cliente", inv.customer], ["Emisión", inv.date], ["Vencimiento", inv.due], ["Condiciones", "Crédito 30 días"]]
              .map(([l, v]) => `<div><p class="text-label-md text-on-surface-variant uppercase">${l}</p><p class="font-medium text-on-surface">${v}</p></div>`).join("")}
          </div>
          <table class="data-table rounded-lg overflow-hidden">
            <thead><tr><th>Concepto</th><th class="text-right">Cant.</th><th class="text-right">Precio</th><th class="text-right">Importe</th></tr></thead>
            <tbody>
              <tr><td>Equipamiento de red empresarial</td><td class="text-right">4</td><td class="text-right">${fmt.money(net * 0.55 / 4)}</td><td class="text-right">${fmt.money(net * 0.55)}</td></tr>
              <tr><td>Servicios de instalación y configuración</td><td class="text-right">1</td><td class="text-right">${fmt.money(net * 0.3)}</td><td class="text-right">${fmt.money(net * 0.3)}</td></tr>
              <tr><td>Soporte premium (12 meses)</td><td class="text-right">1</td><td class="text-right">${fmt.money(net * 0.15)}</td><td class="text-right">${fmt.money(net * 0.15)}</td></tr>
            </tbody>
          </table>
          <div class="flex justify-end"><div class="w-64 space-y-xs text-body-md">
            <div class="flex justify-between text-on-surface-variant"><span>Subtotal</span><span>${fmt.money(net)}</span></div>
            <div class="flex justify-between text-on-surface-variant"><span>IVA (13%)</span><span>${fmt.money(tax)}</span></div>
            <div class="flex justify-between font-bold text-on-surface text-body-lg pt-xs border-t border-outline-variant/30"><span>Total</span><span>${fmt.money(inv.total)}</span></div>
          </div></div>
        </div>`,
        footer: `<button class="btn-ghost" data-close2>Cerrar</button>
          <button class="btn-ghost">${UI.icon("send", "text-[18px]")} Enviar por correo</button>
          <button class="btn-primary" data-pdf2>${UI.icon("picture_as_pdf", "text-[18px]")} Descargar PDF</button>`,
        onMount: (root, close) => {
          root.querySelector("[data-close2]").onclick = close;
          root.querySelector("[data-pdf2]").onclick = () => { UI.invoicePDF(inv); Store.log("EXPORT", "Facturación", `Descarga PDF de ${inv.id}`); };
        }
      });
    }
  },

  /* ================= CRM ================= */
  crm: {
    title: "CRM", crumbs: ["Inicio", "Comercial", "CRM"],
    render(el) {
      const pipeline = DB.crm.deals.reduce((a, d) => a + (d.stage !== "Ganado" ? d.value : 0), 0);
      el.innerHTML = `
      ${pageHeader("CRM · Pipeline Comercial", `Valor del pipeline abierto: ${fmt.moneyShort(pipeline)}`, `
        <button class="btn-primary" id="new-lead">${UI.icon("person_add", "text-[18px]")} Nuevo Lead</button>`)}
      <div class="overflow-x-auto pb-sm -mx-lg px-lg">
        <div id="kanban" class="flex gap-md min-w-[1100px]">
          ${DB.crm.stages.map(stage => {
            const deals = DB.crm.deals.filter(d => d.stage === stage);
            const sum = deals.reduce((a, d) => a + d.value, 0);
            return `
            <div class="kanban-col flex-1 min-w-[210px] rounded-xl bg-surface-container/50 border border-outline-variant/20 flex flex-col" data-stage="${stage}">
              <div class="px-md py-sm flex items-center justify-between border-b border-outline-variant/20">
                <span class="font-semibold text-body-md text-on-surface">${stage}</span>
                <span class="badge badge-neutral">${deals.length} · ${fmt.moneyShort(sum)}</span>
              </div>
              <div class="p-sm space-y-sm flex-1 min-h-[120px]" data-dropzone>
                ${deals.map(d => Views.crm.dealCard(d)).join("")}
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${UI.panel("Cuentas clave", "Clientes con mayor valor de vida (LTV)", `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-md">
            ${DB.crm.customers.map((c, i) => `
            <div class="card card-hover p-md">
              <div class="flex items-center gap-sm mb-sm">${UI.avatar(c.name, i)}
                <div class="min-w-0"><p class="font-semibold text-body-md text-on-surface truncate">${c.name}</p>
                <p class="text-label-md text-on-surface-variant">${c.industry} · desde ${c.since}</p></div></div>
              <div class="flex justify-between items-center text-body-md">
                <span class="text-on-surface-variant">LTV</span><span class="font-semibold text-on-surface">${fmt.moneyShort(c.ltv)}</span></div>
              <div class="flex justify-between items-center text-body-md mt-xs">
                <span class="text-on-surface-variant">Salud</span>
                <span class="font-semibold ${c.health > 80 ? "text-success" : c.health > 65 ? "text-warning" : "text-error"}">${c.health}%</span></div>
              <div class="stock-bar mt-sm"><div class="${c.health > 80 ? "bg-success" : c.health > 65 ? "bg-warning" : "bg-error"}" style="width:${c.health}%"></div></div>
            </div>`).join("")}
          </div>`)}
        ${UI.panel("Conversión por etapa", "Tasa de avance del pipeline (últimos 90 días)",
          UI.barChart(["Prosp.", "Calif.", "Prop.", "Negoc.", "Ganado"], [100, 68, 42, 27, 18], [90, 61, 38, 22, 15], "Este trimestre", "Anterior"))}
      </div>`;

      Views.crm.initDrag(el);
      UI.animateCounters(el);

      document.getElementById("new-lead").onclick = () => UI.formModal({
        title: "Nuevo Lead", subtitle: "Se guardará en la base de datos", wide: false,
        fields: [
          { name: "company", label: "Empresa" },
          { name: "contact", label: "Contacto" },
          { name: "value", label: "Valor estimado (USD)", type: "number", min: 0 },
          { name: "score", label: "Lead score (0–100)", type: "number", min: 0, value: 50 }
        ],
        onSave: async (data, close) => {
          const row = { id: Math.max(0, ...DB.crm.deals.map(d => d.id)) + 1, stage: "Prospecto", days: 0, ...data, score: Math.min(100, parseInt(data.score)) };
          await Store.upsert("deals", row);
          Store.log("CREATE", "CRM", `Lead creado: ${row.company} (${fmt.moneyShort(row.value)})`);
          close(); Views.crm.render(el);
          UI.toast("Lead añadido al pipeline.", "success", row.company);
        }
      });
    },

    dealCard(d) {
      const scoreColor = d.score >= 80 ? "success" : d.score >= 60 ? "warning" : "error";
      return `
      <div class="kanban-card card p-md space-y-sm" draggable="true" data-deal="${d.id}">
        <div class="flex justify-between items-start gap-xs">
          <p class="font-semibold text-body-md text-on-surface leading-tight">${d.company}</p>
          <span class="badge badge-${scoreColor}" title="Lead score">${d.score}</span>
        </div>
        <p class="text-label-md text-on-surface-variant">${UI.icon("person", "text-[13px] align-middle")} ${d.contact}</p>
        <div class="flex justify-between items-center pt-xs border-t border-outline-variant/15">
          <span class="font-bold text-on-surface text-body-md">${fmt.moneyShort(d.value)}</span>
          <span class="text-label-md text-on-surface-variant">${d.days} días</span>
        </div>
      </div>`;
    },

    initDrag(el) {
      let dragged = null;
      el.querySelectorAll(".kanban-card").forEach(card => {
        card.addEventListener("dragstart", () => { dragged = card; setTimeout(() => card.classList.add("dragging"), 0); });
        card.addEventListener("dragend", () => { card.classList.remove("dragging"); dragged = null; });
      });
      el.querySelectorAll(".kanban-col").forEach(col => {
        col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drag-over"); });
        col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
        col.addEventListener("drop", async e => {
          e.preventDefault(); col.classList.remove("drag-over");
          if (!dragged) return;
          const deal = DB.crm.deals.find(d => d.id === parseInt(dragged.dataset.deal));
          const newStage = col.dataset.stage;
          if (deal && deal.stage !== newStage) {
            deal.stage = newStage;
            await Store.upsert("deals", deal);
            Store.log("UPDATE", "CRM", `${deal.company} movido a etapa "${newStage}"`);
            Views.crm.render(el);
            UI.toast(`${deal.company} movido a "${newStage}" y guardado.`, newStage === "Ganado" ? "success" : "info", newStage === "Ganado" ? "¡Trato ganado! 🎉" : "Pipeline actualizado");
          }
        });
      });
    }
  },

  /* ================= REPORTES FINANCIEROS ================= */
  reportes: {
    title: "Reportes Financieros", crumbs: ["Inicio", "Finanzas", "Reportes"],
    render(el) {
      const f = DB.finance;
      const totalIncome = f.pnl.income.reduce((a, b) => a + b, 0) * 1000;
      const totalExp = f.pnl.expenses.reduce((a, b) => a + b, 0) * 1000;
      el.innerHTML = `
      ${pageHeader("Reportes Financieros", "Estado de resultados, balance y ratios clave", `
        <div class="flex items-center gap-xs">
          <input type="date" value="2026-01-01" class="input-field w-auto py-1.5"/>
          <span class="text-on-surface-variant">→</span>
          <input type="date" value="2026-06-30" class="input-field w-auto py-1.5"/>
        </div>
        <button class="btn-ghost" data-export="pdf">${UI.icon("picture_as_pdf", "text-[18px]")} PDF</button>
        <button class="btn-ghost" data-export="excel">${UI.icon("table_view", "text-[18px]")} Excel</button>`)}

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${f.ratios.map(r => `
        <div class="card card-hover p-lg">
          <p class="text-label-md text-on-surface-variant uppercase tracking-wider">${r.label}</p>
          <div class="flex items-end justify-between mt-xs">
            <h3 class="text-headline-lg text-on-surface">${r.value}</h3>
            <span class="badge ${r.trend >= 0 ? "badge-success" : "badge-error"}">${r.trend > 0 ? "+" : ""}${r.trend}</span>
          </div>
        </div>`).join("")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="lg:col-span-2">${UI.panel("Pérdidas y Ganancias", "Ingresos vs. gastos (miles USD) · Ene–Jun 2026",
          UI.barChart(f.pnl.months, f.pnl.income.map(v => v / 13), f.pnl.expenses.map(v => v / 13), "Ingresos", "Gastos") + `
          <div class="grid grid-cols-3 gap-md mt-lg pt-md border-t border-outline-variant/20 text-center">
            <div><p class="text-label-md text-on-surface-variant uppercase">Ingresos</p><p class="text-headline-sm text-on-surface">${fmt.moneyShort(totalIncome)}</p></div>
            <div><p class="text-label-md text-on-surface-variant uppercase">Gastos</p><p class="text-headline-sm text-on-surface">${fmt.moneyShort(totalExp)}</p></div>
            <div><p class="text-label-md text-on-surface-variant uppercase">Resultado</p><p class="text-headline-sm text-success">${fmt.moneyShort(totalIncome - totalExp)}</p></div>
          </div>`)}</div>
        <div class="space-y-lg">
          ${UI.panel("Resumen de balance", "Al 30 de Junio, 2026", `
            <div class="space-y-sm">${f.balance.map(b => `
              <div class="flex justify-between items-center py-sm border-b border-outline-variant/10 text-body-md">
                <span class="text-on-surface-variant">${b.concept}</span>
                <span class="font-semibold ${b.amount < 0 ? "text-error" : "text-on-surface"}">${b.amount < 0 ? "−" : ""}${fmt.moneyShort(Math.abs(b.amount))}</span>
              </div>`).join("")}
            </div>`)}
          ${UI.panel("Flujo de caja proyectado", "", UI.lineChart([420, 445, 480, 462, 510, 545, 590, 610], { height: 150, stroke: "rgb(var(--purple-acc))", id: "cash" }))}
        </div>
      </div>`;

      el.querySelectorAll("[data-export]").forEach(b => b.onclick = () => {
        const kind = b.dataset.export;
        const pnlRows = f.pnl.months.map((m, i) => ({
          Mes: m + " 2026", "Ingresos (miles)": f.pnl.income[i], "Gastos (miles)": f.pnl.expenses[i],
          "Resultado (miles)": f.pnl.income[i] - f.pnl.expenses[i]
        }));
        if (kind === "excel") {
          UI.exportExcel(pnlRows, "reporte-financiero.xlsx", "P&L");
        } else {
          UI.exportPDF({
            title: "Reporte Financiero — " + DB.settings.company.name,
            subtitle: "Pérdidas y Ganancias · Enero a Junio 2026 (miles USD)",
            head: ["Mes", "Ingresos", "Gastos", "Resultado"],
            body: pnlRows.map(r => [r.Mes, r["Ingresos (miles)"], r["Gastos (miles)"], r["Resultado (miles)"]]),
            filename: "reporte-financiero.pdf"
          });
        }
        Store.log("EXPORT", "Reportes", `Reporte financiero Ene–Jun 2026 exportado a ${kind.toUpperCase()}`);
      });
      UI.animateCounters(el);
    }
  },

  /* ================= NOTIFICACIONES ================= */
  notificaciones: {
    title: "Notificaciones", crumbs: ["Inicio", "Sistema", "Notificaciones"],
    render(el) {
      el.innerHTML = `
      ${pageHeader("Centro de Notificaciones", `${DB.notifications.filter(n => n.unread).length} sin leer`, `
        <button class="btn-ghost" id="mark-all">${UI.icon("done_all", "text-[18px]")} Marcar todo como leído</button>`)}
      <div class="card overflow-hidden divide-y divide-outline-variant/10">
        ${DB.notifications.map(n => Views.notificaciones.item(n, true)).join("") ||
          `<p class="p-xl text-body-md text-on-surface-variant text-center">Sin notificaciones</p>`}
      </div>`;
      el.querySelectorAll("[data-notif]").forEach(item => item.onclick = () => {
        const n = DB.notifications.find(x => x.id === parseInt(item.dataset.notif));
        n.unread = false; Store.persist("notifications"); App.updateNotifBadge();
        if (Can.route(n.module)) location.hash = "#/" + n.module;
      });
      document.getElementById("mark-all").onclick = () => {
        DB.notifications.forEach(n => n.unread = false);
        Store.persist("notifications");
        App.updateNotifBadge(); Views.notificaciones.render(el);
        UI.toast("Todas las notificaciones marcadas como leídas.", "info");
      };
    },
    item(n, full = false) {
      const colors = { error: "bg-error/10 text-error", warning: "bg-warning/10 text-warning", success: "bg-success/10 text-success", info: "bg-indigo-acc/10 text-indigo-acc", neutral: "bg-surface-container-high text-on-surface-variant" };
      return `
      <div class="flex gap-md p-md ${full ? "px-lg" : ""} hover:bg-surface-container/60 transition-colors cursor-pointer ${n.unread ? "bg-indigo-acc/[.05]" : ""}" data-notif="${n.id}">
        <div class="p-2 h-fit rounded-lg ${colors[n.color] || colors.info}">${UI.icon(n.icon, "text-[20px]")}</div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-body-md text-on-surface flex items-center gap-sm">${n.title}
            ${n.unread ? '<span class="w-2 h-2 rounded-full bg-indigo-acc inline-block"></span>' : ""}</p>
          <p class="text-body-md text-on-surface-variant ${full ? "" : "truncate"}">${n.body}</p>
          <p class="text-label-md text-on-surface-variant/70 mt-xs">${n.time}</p>
        </div>
      </div>`;
    }
  },

  /* ================= AUDITORÍA ================= */
  auditoria: {
    title: "Auditoría", crumbs: ["Inicio", "Sistema", "Registros de Auditoría"],
    render(el) {
      el.innerHTML = `
      ${pageHeader("Registros de Auditoría", "Trazabilidad completa de acciones del sistema (retención: 7 años)", `
        <button class="btn-ghost" data-log-export>${UI.icon("download", "text-[18px]")} Exportar log</button>`)}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-md">
        ${[
          { label: "Eventos registrados", value: DB.audit.length, icon: "receipt", color: "primary", trend: 4.0 },
          { label: "Usuarios únicos", value: new Set(DB.audit.map(a => a.username)).size, icon: "person", color: "cyan", trend: 1.2 },
          { label: "Advertencias", value: DB.audit.filter(a => a.severity === "warning").length, icon: "warning", color: "warning", trend: -8.0, invert: true },
          { label: "Eventos críticos", value: DB.audit.filter(a => a.severity === "critical").length, icon: "gpp_maybe", color: "warning", trend: 0, invert: true }
        ].map(UI.kpiCard).join("")}
      </div>
      <div id="audit-table" class="card overflow-hidden"></div>`;

      UI.dataTable({
        id: "audit-table",
        columns: [
          { label: "Timestamp", key: "ts" }, { label: "Usuario", key: "username" },
          { label: "Módulo", key: "module" }, { label: "Acción", key: "action" }, { label: "Detalle", sortable: false }, { label: "Severidad", key: "severity" }
        ],
        rows: DB.audit, pageSize: 10,
        filters: [
          { key: "module", label: "Módulo", options: [...new Set(DB.audit.map(a => a.module))] },
          { key: "severity", label: "Severidad", options: ["info", "warning", "critical"] }
        ],
        renderRow: (a) => `
          <tr class="${a.severity === "critical" ? "!bg-error/5" : ""}">
            <td class="font-mono text-[12px] text-on-surface-variant whitespace-nowrap">${a.ts}</td>
            <td class="font-medium">${a.username}</td>
            <td>${a.module}</td>
            <td><span class="badge badge-neutral font-mono">${a.action}</span></td>
            <td class="text-on-surface-variant max-w-md truncate" title="${a.detail}">${a.detail}</td>
            <td>${UI.badge(a.severity === "critical" ? "Crítico" : a.severity === "warning" ? "Advertencia" : "Info",
                 a.severity === "critical" ? "error" : a.severity === "warning" ? "warning" : "neutral")}</td>
          </tr>`
      }).render();
      UI.animateCounters(el);
      el.querySelector("[data-log-export]").onclick = () => {
        UI.exportExcel(DB.audit.map(a => ({
          Timestamp: a.ts, Usuario: a.username, IP: a.ip, "Módulo": a.module,
          "Acción": a.action, Detalle: a.detail, Severidad: a.severity
        })), "auditoria.xlsx", "Auditoría");
        Store.log("EXPORT", "Auditoría", "Exportación Excel del log de auditoría");
      };
    }
  },

  /* ================= USUARIOS (ADMIN) ================= */
  usuarios: {
    title: "Usuarios", crumbs: ["Inicio", "Sistema", "Gestión de Usuarios"],
    async render(el) {
      el.innerHTML = UI.skeletonPage();
      try { await Store.fetchUsers(); } catch (e) { UI.toast(e.message, "error"); }
      const roleOptions = Object.entries(ROLES);
      el.innerHTML = `
      ${pageHeader("Gestión de Usuarios", `${Store.users.length} cuentas con acceso al sistema`, `
        <button class="btn-primary" id="invite-user">${UI.icon("person_add", "text-[18px]")} ${Store.mode === "supabase" ? "Invitar usuario" : "Crear usuario"}</button>`)}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
        ${roleOptions.map(([key, r]) => `
        <div class="card p-lg">
          <div class="flex items-center justify-between mb-sm">
            <span class="badge badge-${r.badge}">${r.label}</span>
            <span class="text-headline-md text-on-surface">${Store.users.filter(u => u.role === key).length}</span>
          </div>
          <p class="text-body-md text-on-surface-variant">${key === "admin" ? "Acceso total: usuarios, auditoría, nómina, configuración y eliminación de registros."
            : key === "gerente" ? "Gestiona empleados, RRHH y nómina, y aprueba solicitudes. Sin gestión de usuarios."
            : "Opera ventas, inventario, compras y CRM. No ve salarios ni auditoría."}</p>
        </div>`).join("")}
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto"><table class="data-table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Registrado</th><th class="text-right">Acciones</th></tr></thead>
          <tbody>
            ${Store.users.map((u, i) => {
              const self = u.id === Store.user.id;
              return `
              <tr>
                <td><span class="flex items-center gap-sm">${UI.avatar(u.name, i)}
                  <span class="font-medium">${u.name} ${self ? '<span class="badge badge-info ml-xs">Tú</span>' : ""}</span></span></td>
                <td class="text-on-surface-variant">${u.email}</td>
                <td>
                  <select data-role="${u.id}" class="input-field w-auto !py-1 text-body-md" ${self ? "disabled title='No puedes cambiar tu propio rol'" : ""}>
                    ${roleOptions.map(([key, r]) => `<option value="${key}" ${u.role === key ? "selected" : ""}>${r.label}</option>`).join("")}
                  </select>
                </td>
                <td>${UI.badge(u.active !== false ? "Activa" : "Desactivada", u.active !== false ? "success" : "error")}</td>
                <td class="text-on-surface-variant">${(u.created_at || "").slice(0, 10)}</td>
                <td class="text-right whitespace-nowrap">
                  ${!self ? `
                  <button class="icon-btn ${u.active !== false ? "text-warning" : "text-success"}" data-toggle="${u.id}" title="${u.active !== false ? "Desactivar" : "Activar"}">
                    ${UI.icon(u.active !== false ? "block" : "check_circle", "text-[18px]")}</button>
                  <button class="icon-btn text-error" data-del-user="${u.id}" title="Eliminar">${UI.icon("delete", "text-[18px]")}</button>` : "—"}
                </td>
              </tr>`;
            }).join("")}
          </tbody></table></div>
      </div>

      ${Store.mode === "supabase" ? `
      <div class="card p-lg flex gap-md items-start">
        <div class="p-2.5 rounded-xl bg-indigo-acc/10 text-indigo-acc">${UI.icon("info", "text-[24px]")}</div>
        <div class="text-body-md text-on-surface-variant">
          <p class="font-semibold text-on-surface mb-xs">¿Cómo se registran los usuarios de tu empresa?</p>
          <p>Comparte la URL de la app: cada persona crea su cuenta desde <b>"Crear cuenta"</b> y entra automáticamente con rol <b>Empleado</b>. Desde esta pantalla les asignas el rol adecuado o desactivas su acceso. Todas las cuentas y datos viven en tu proyecto de Supabase.</p>
        </div>
      </div>` : ""}`;

      el.querySelectorAll("[data-role]").forEach(s => s.onchange = async () => {
        await Store.adminUpdateUser(s.dataset.role, { role: s.value });
        UI.toast(`Rol actualizado a ${ROLES[s.value].label}.`, "success");
        Views.usuarios.render(el);
      });
      el.querySelectorAll("[data-toggle]").forEach(b => b.onclick = async () => {
        const u = Store.users.find(x => x.id === b.dataset.toggle);
        await Store.adminUpdateUser(u.id, { active: !(u.active !== false) });
        UI.toast(u.active !== false ? "Cuenta activada." : "Cuenta desactivada. El usuario ya no podrá iniciar sesión.", "info", u.email);
        Views.usuarios.render(el);
      });
      el.querySelectorAll("[data-del-user]").forEach(b => b.onclick = () => {
        const u = Store.users.find(x => x.id === b.dataset.delUser);
        UI.confirm({
          title: "Eliminar usuario", danger: true, okLabel: "Eliminar",
          message: `Se eliminará el perfil de <b>${u.name}</b> (${u.email}). ${Store.mode === "supabase" ? "La cuenta de acceso debe eliminarse también en Supabase → Authentication → Users." : ""}`,
          onOk: async () => { await Store.deleteUser(u.id); Views.usuarios.render(el); UI.toast("Usuario eliminado.", "warning", u.email); }
        });
      });
      document.getElementById("invite-user").onclick = () => {
        if (Store.mode === "supabase") {
          UI.modal({
            title: "Invitar usuario", wide: false,
            body: `<div class="space-y-md text-body-md text-on-surface-variant">
              <p>Comparte este enlace con la persona que quieres invitar. Al registrarse entrará con rol <b>Empleado</b> y podrás cambiarle el rol aquí.</p>
              <div class="flex gap-sm">
                <input class="input-field flex-1" readonly value="${location.origin + location.pathname}" id="invite-link"/>
                <button class="btn-primary" id="copy-link">${UI.icon("content_copy", "text-[18px]")} Copiar</button>
              </div></div>`,
            onMount: (root, close) => {
              root.querySelector("#copy-link").onclick = () => {
                navigator.clipboard.writeText(root.querySelector("#invite-link").value);
                UI.toast("Enlace copiado al portapapeles.", "success"); close();
              };
            }
          });
        } else {
          UI.formModal({
            title: "Crear usuario", wide: false, submitLabel: "Crear cuenta",
            fields: [
              { name: "name", label: "Nombre completo" },
              { name: "email", label: "Correo", type: "email" },
              { name: "password", label: "Contraseña temporal", type: "text", value: "Cambiar123" },
              { name: "role", label: "Rol", type: "select", options: ["empleado", "gerente", "admin"] }
            ],
            onSave: async (data, close) => {
              const me = Store.user;
              await Store.localRegister({ name: data.name, email: data.email, password: data.password });
              await Store.adminUpdateUser(Store.user.id, { role: data.role });
              Store.user = me; localStorage.setItem(Store.LS_SESSION, me.id);
              close(); Views.usuarios.render(el);
              UI.toast(`Cuenta creada con rol ${ROLES[data.role].label}.`, "success", data.email);
            }
          });
        }
      };
    }
  },

  /* ================= MI PERFIL ================= */
  perfil: {
    title: "Mi Perfil", crumbs: ["Inicio", "Cuenta", "Mi Perfil"],
    render(el) {
      const u = Store.user, role = ROLES[u.role];
      const myActivity = DB.audit.filter(a => a.username === u.email.split("@")[0]).slice(0, 6);
      el.innerHTML = `
      ${pageHeader("Mi Perfil", "Tu información personal y actividad en el sistema")}
      <div class="card p-lg flex flex-wrap gap-lg items-center">
        <div class="relative group">
          ${u.avatar_url
            ? `<img src="${u.avatar_url}" class="w-20 h-20 rounded-full object-cover border-2 border-outline-variant/30" alt="avatar"/>`
            : `<span class="avatar !w-20 !h-20 !text-[24px] brand-gradient !text-white">${fmt.initials(u.name)}</span>`}
          <label class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full brand-gradient text-white flex items-center justify-center cursor-pointer shadow-glow hover:scale-110 transition-transform" title="Cambiar foto">
            ${UI.icon("photo_camera", "text-[16px]")}
            <input type="file" id="avatar-input" accept="image/*" class="hidden"/>
          </label>
        </div>
        <div class="flex-1 min-w-[220px]">
          <h2 class="text-headline-md text-on-surface">${u.name}</h2>
          <p class="text-body-md text-on-surface-variant">${u.email}</p>
          <div class="flex gap-sm mt-sm flex-wrap">
            <span class="badge badge-${role.badge}">${role.label}</span>
            ${UI.badge(Store.mode === "supabase" ? "Cuenta en Supabase" : "Cuenta local", Store.mode === "supabase" ? "success" : "warning")}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div class="space-y-lg">
          ${UI.panel("Datos personales", "Se guardan en tu perfil de la base de datos", `
            <form id="profile-form" class="space-y-md">
              <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Nombre completo</span>
                <input name="name" required class="input-field mt-xs" value="${u.name}"/></label>
              <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Teléfono</span>
                <input name="phone" class="input-field mt-xs" value="${u.phone || ""}" placeholder="+506 8888-8888"/></label>
              <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Correo (no editable)</span>
                <input class="input-field mt-xs opacity-60" value="${u.email}" readonly/></label>
              <button type="submit" class="btn-primary">${UI.icon("save", "text-[18px]")} Guardar cambios</button>
            </form>`)}
          ${UI.panel("Seguridad", "", `
            <form id="pass-form" class="space-y-md">
              <div class="grid grid-cols-2 gap-md">
                <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Nueva contraseña</span>
                  <input name="p1" type="password" required minlength="6" class="input-field mt-xs"/></label>
                <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Confirmar</span>
                  <input name="p2" type="password" required minlength="6" class="input-field mt-xs"/></label>
              </div>
              <button type="submit" class="btn-ghost">${UI.icon("key", "text-[18px]")} Cambiar contraseña</button>
            </form>`)}
        </div>
        <div class="space-y-lg">
          ${UI.panel("Permisos de tu rol", role.label, `
            <div class="space-y-sm">
              ${[["Ver dashboard y módulos operativos", true],
                 ["Crear registros (ventas, compras, CRM)", Can.cap("create")],
                 ["Ver salarios y nómina", Can.cap("salaries")],
                 ["Aprobar solicitudes y órdenes", Can.cap("approve")],
                 ["Eliminar registros", Can.cap("delete")],
                 ["Gestionar usuarios y roles", Can.cap("users")],
                 ["Ver auditoría del sistema", Can.cap("audit")]]
                .map(([t, ok]) => `
                <div class="flex items-center gap-sm text-body-md ${ok ? "text-on-surface" : "text-on-surface-variant/50"}">
                  ${UI.icon(ok ? "check_circle" : "cancel", ok ? "text-success text-[18px]" : "text-[18px] opacity-40")} ${t}
                </div>`).join("")}
            </div>`)}
          ${UI.panel("Mi actividad reciente", "", myActivity.length ? `
            <div class="space-y-sm">${myActivity.map(a => `
              <div class="flex items-center gap-md py-xs text-body-md">
                <span class="badge badge-neutral font-mono">${a.action}</span>
                <span class="flex-1 text-on-surface-variant truncate">${a.detail}</span>
                <span class="text-label-md text-on-surface-variant/70 whitespace-nowrap">${a.ts.slice(5, 16)}</span>
              </div>`).join("")}</div>`
            : `<p class="text-body-md text-on-surface-variant">Aún no hay actividad registrada con tu cuenta.</p>`)}
        </div>
      </div>`;

      el.querySelector("#profile-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
          await Store.updateProfile({ name: data.name, phone: data.phone });
          document.getElementById("btn-profile").textContent = fmt.initials(data.name);
          UI.toast("Perfil actualizado en la base de datos.", "success");
        } catch (ex) { UI.toast(ex.message, "error"); }
      });
      el.querySelector("#pass-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        if (data.p1 !== data.p2) return UI.toast("Las contraseñas no coinciden.", "error");
        try { await Store.changePassword(data.p1); e.target.reset(); UI.toast("Contraseña actualizada.", "success"); }
        catch (ex) { UI.toast(ex.message, "error"); }
      });
      const avatarInput = el.querySelector("#avatar-input");
      if (avatarInput) avatarInput.onchange = async () => {
        const file = avatarInput.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return UI.toast("La imagen debe pesar menos de 2 MB.", "warning");
        try {
          UI.toast("Subiendo foto…", "info");
          await Store.uploadAvatar(file);
          App.refreshAvatar();
          Views.perfil.render(el);
          UI.toast("Foto de perfil actualizada.", "success");
        } catch (ex) { UI.toast(ex.message, "error"); }
      };
    }
  },

  /* ================= CONFIGURACIÓN ================= */
  configuracion: {
    title: "Configuración", crumbs: ["Inicio", "Cuenta", "Configuración"],
    render(el) {
      const s = DB.settings;
      const canCompany = Can.cap("companySettings");
      el.innerHTML = `
      ${pageHeader("Configuración", "Preferencias de la aplicación y de la empresa")}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div class="space-y-lg">
          ${UI.panel("Empresa", canCompany ? "Datos fiscales usados en facturas y reportes" : "Solo lectura (requiere rol Administrador)", `
            <form id="company-form" class="space-y-md">
              ${[["name", "Nombre legal"], ["taxId", "Identificación fiscal"], ["address", "Dirección"]].map(([k, l]) => `
              <label class="block"><span class="text-label-md text-on-surface-variant uppercase">${l}</span>
                <input name="${k}" class="input-field mt-xs" value="${s.company[k] || ""}" ${canCompany ? "" : "readonly"}/></label>`).join("")}
              <div class="grid grid-cols-2 gap-md">
                <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Moneda</span>
                  <select name="currency" class="input-field mt-xs" ${canCompany ? "" : "disabled"}>
                    ${["USD", "CRC", "EUR", "MXN"].map(c => `<option ${s.company.currency === c ? "selected" : ""}>${c}</option>`).join("")}
                  </select></label>
                <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Inicio año fiscal</span>
                  <select name="fiscalYear" class="input-field mt-xs" ${canCompany ? "" : "disabled"}>
                    ${["Enero", "Abril", "Julio", "Octubre"].map(m => `<option ${s.company.fiscalYear === m ? "selected" : ""}>${m}</option>`).join("")}
                  </select></label>
              </div>
              ${canCompany ? `<button type="submit" class="btn-primary">${UI.icon("save", "text-[18px]")} Guardar empresa</button>` : ""}
            </form>`)}
          ${UI.panel("Apariencia", "", `
            <div class="flex items-center justify-between py-sm">
              <div><p class="text-body-md text-on-surface font-medium">Tema de la interfaz</p>
              <p class="text-label-md text-on-surface-variant">Claro u oscuro, se recuerda en este dispositivo</p></div>
              <div class="flex gap-xs bg-surface-container rounded-lg p-1">
                <button class="tab-btn" data-theme="light">${UI.icon("light_mode", "text-[16px]")} Claro</button>
                <button class="tab-btn" data-theme="dark">${UI.icon("dark_mode", "text-[16px]")} Oscuro</button>
              </div>
            </div>`)}
        </div>
        <div class="space-y-lg">
          ${UI.panel("Notificaciones", "Preferencias guardadas en la base de datos", `
            <div class="space-y-sm">
              ${[["emailNotifs", "Notificaciones por correo", "Resúmenes y alertas importantes"],
                 ["stockAlerts", "Alertas de stock crítico", "Aviso inmediato al cruzar el mínimo"],
                 ["weeklyReport", "Reporte semanal automático", "KPIs cada lunes a las 8:00"],
                 ["mfa", "Autenticación en dos pasos (MFA)", "Requiere verificación adicional al entrar"]]
                .map(([k, t, d]) => `
                <label class="flex items-center justify-between py-sm cursor-pointer group">
                  <span><span class="block text-body-md text-on-surface font-medium">${t}</span>
                  <span class="block text-label-md text-on-surface-variant">${d}</span></span>
                  <input type="checkbox" data-pref="${k}" ${s.prefs[k] ? "checked" : ""}
                    class="rounded border-outline-variant bg-surface-container text-indigo-acc focus:ring-indigo-acc/40 w-5 h-5"/>
                </label>`).join("")}
            </div>`)}
          ${UI.panel("Base de datos", "Conexión actual del sistema", `
            <div class="flex items-center gap-md mb-md">
              <div class="p-3 rounded-xl ${Store.mode === "supabase" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}">${UI.icon(Store.mode === "supabase" ? "cloud_done" : "cloud_off", "text-[26px]")}</div>
              <div>
                <p class="font-semibold text-on-surface text-body-md">${Store.mode === "supabase" ? "Supabase (Postgres en la nube)" : "Modo local (localStorage)"}</p>
                <p class="text-label-md text-on-surface-variant">${Store.mode === "supabase" ? "Todos los registros y usuarios se guardan online" : "Los datos solo viven en este navegador"}</p>
              </div>
            </div>`)}
        </div>
      </div>`;

      // Tema
      const markTheme = () => {
        const dark = document.documentElement.classList.contains("dark");
        el.querySelectorAll("[data-theme]").forEach(b => b.classList.toggle("active", b.dataset.theme === (dark ? "dark" : "light")));
      };
      markTheme();
      el.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => {
        document.documentElement.classList.toggle("dark", b.dataset.theme === "dark");
        localStorage.setItem("omnicore_theme", b.dataset.theme);
        markTheme();
      });

      // Empresa
      const cf = el.querySelector("#company-form");
      if (canCompany) cf.addEventListener("submit", async (e) => {
        e.preventDefault();
        Object.assign(DB.settings.company, Object.fromEntries(new FormData(cf)));
        await Store.saveSettings();
        Store.log("CONFIG", "Configuración", "Datos de empresa actualizados");
        document.getElementById("company-name").textContent = DB.settings.company.name;
        UI.toast("Configuración de empresa guardada.", "success");
      });

      // Preferencias
      el.querySelectorAll("[data-pref]").forEach(c => c.onchange = async () => {
        DB.settings.prefs[c.dataset.pref] = c.checked;
        await Store.saveSettings();
        UI.toast("Preferencia guardada.", "info");
      });

    }
  },

  /* ================= PUNTO DE VENTA (POS) ================= */
  pos: {
    title: "Punto de Venta", crumbs: ["Inicio", "Comercial", "Punto de Venta"],
    cart: [],
    render(el) {
      Views.pos.cart = [];
      el.innerHTML = `
      ${pageHeader("Punto de Venta", "Cobra en segundos: crea pedido + factura y descuenta stock automáticamente")}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        <div class="lg:col-span-2">
          <div class="relative mb-md">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input id="pos-search" class="input-field pl-10" placeholder="Buscar producto por nombre o SKU…"/>
          </div>
          <div id="pos-grid" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-md"></div>
        </div>
        <div class="card p-lg lg:sticky lg:top-20 space-y-md">
          <h4 class="text-headline-sm text-on-surface flex items-center gap-sm">${UI.icon("shopping_bag")} Carrito</h4>
          <label class="block"><span class="text-label-md text-on-surface-variant uppercase">Cliente</span>
            <input id="pos-customer" class="input-field mt-xs" placeholder="Cliente de mostrador"/></label>
          <div id="pos-cart" class="space-y-sm max-h-72 overflow-y-auto"></div>
          <div id="pos-totals" class="pt-md border-t border-outline-variant/20 space-y-xs text-body-md"></div>
          <button id="pos-charge" class="btn-primary w-full justify-center py-3">${UI.icon("point_of_sale", "text-[20px]")} Cobrar</button>
        </div>
      </div>`;

      const renderGrid = (q = "") => {
        const grid = document.getElementById("pos-grid");
        if (!grid) return;
        const items = DB.products.filter(p => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
        grid.innerHTML = items.map(p => `
          <button class="card card-hover p-md text-left flex flex-col gap-xs ${p.stock <= 0 ? "opacity-40 pointer-events-none" : ""}" data-add="${p.sku}">
            ${p.image_url
              ? `<img src="${p.image_url}" class="w-10 h-10 rounded-lg object-cover"/>`
              : `<div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant">${UI.icon(p.img || "inventory_2", "text-[20px]")}</div>`}
            <p class="font-semibold text-body-md text-on-surface leading-tight">${p.name}</p>
            <div class="flex justify-between items-center w-full mt-auto">
              <span class="text-label-md text-on-surface-variant">${p.stock} uds</span>
              <span class="font-bold text-on-surface">${fmt.money(p.price)}</span>
            </div>
          </button>`).join("") || `<p class="col-span-full text-center text-on-surface-variant py-lg">Sin productos</p>`;
        grid.querySelectorAll("[data-add]").forEach(b => b.onclick = () => addToCart(b.dataset.add));
      };

      const renderCart = () => {
        const cartEl = document.getElementById("pos-cart");
        const totalsEl = document.getElementById("pos-totals");
        if (!cartEl) return;
        const cart = Views.pos.cart;
        cartEl.innerHTML = cart.length ? cart.map((it, i) => `
          <div class="flex items-center gap-sm p-sm rounded-lg bg-surface-container/60">
            <div class="flex-1 min-w-0"><p class="text-body-md font-medium text-on-surface truncate">${it.name}</p>
            <p class="text-label-md text-on-surface-variant">${fmt.money(it.price)} c/u</p></div>
            <div class="flex items-center gap-xs">
              <button class="icon-btn !p-1" data-qty="${i}:-1">${UI.icon("remove", "text-[16px]")}</button>
              <span class="w-6 text-center font-semibold text-body-md">${it.qty}</span>
              <button class="icon-btn !p-1" data-qty="${i}:1">${UI.icon("add", "text-[16px]")}</button>
            </div>
            <span class="font-semibold text-body-md w-20 text-right">${fmt.money(it.price * it.qty)}</span>
          </div>`).join("")
          : `<p class="text-body-md text-on-surface-variant text-center py-md">${UI.icon("production_quantity_limits", "text-[32px] opacity-40 block mx-auto mb-xs")}Añade productos del catálogo</p>`;
        const total = cart.reduce((a, it) => a + it.price * it.qty, 0);
        const net = total / 1.13;
        totalsEl.innerHTML = `
          <div class="flex justify-between text-on-surface-variant"><span>Subtotal</span><span>${fmt.money(net)}</span></div>
          <div class="flex justify-between text-on-surface-variant"><span>IVA (13%)</span><span>${fmt.money(total - net)}</span></div>
          <div class="flex justify-between font-bold text-on-surface text-body-lg"><span>Total</span><span>${fmt.money(total)}</span></div>`;
        cartEl.querySelectorAll("[data-qty]").forEach(b => b.onclick = () => {
          const [i, d] = b.dataset.qty.split(":").map(Number);
          const it = cart[i], prod = DB.products.find(p => p.sku === it.sku);
          it.qty += d;
          if (it.qty <= 0) cart.splice(i, 1);
          else if (it.qty > prod.stock) { it.qty = prod.stock; UI.toast("No hay más stock disponible.", "warning"); }
          renderCart();
        });
      };

      const addToCart = (sku) => {
        const p = DB.products.find(x => x.sku === sku);
        const it = Views.pos.cart.find(x => x.sku === sku);
        if (it) { if (it.qty < p.stock) it.qty++; else UI.toast("Stock máximo alcanzado.", "warning"); }
        else Views.pos.cart.push({ sku: p.sku, name: p.name, price: p.price, qty: 1 });
        renderCart();
      };

      document.getElementById("pos-search").addEventListener("input", e => renderGrid(e.target.value));
      document.getElementById("pos-charge").onclick = async () => {
        const cart = Views.pos.cart;
        if (!cart.length) return UI.toast("El carrito está vacío.", "warning");
        const customer = document.getElementById("pos-customer").value.trim() || "Cliente de mostrador";
        const total = cart.reduce((a, it) => a + it.price * it.qty, 0);
        const soNum = Math.max(2201, ...DB.orders.map(o => parseInt(o.id.split("-")[1]) || 0)) + 1;
        const facNum = Math.max(2098, ...DB.invoices.map(i => parseInt(i.id.split("-")[1]) || 0)) + 1;
        const order = { id: "SO-" + soNum, customer, items: cart.reduce((a, it) => a + it.qty, 0), total, status: "Completada", date: "04 Jul 2026", channel: "Directo" };
        const invoice = { id: "FAC-" + facNum, customer, date: "04 Jul 2026", due: "04 Jul 2026", total, status: "Pagada", compliance: "Validada" };
        await Store.upsert("orders", order);
        await Store.upsert("invoices", invoice);
        for (const it of cart) {
          const p = DB.products.find(x => x.sku === it.sku);
          p.stock -= it.qty;
          await Store.upsert("products", p);
        }
        Store.log("CREATE", "Ventas", `Venta POS ${order.id} → ${invoice.id} (${customer}, ${fmt.money(total)})`);
        Views.pos.cart = [];
        renderCart(); renderGrid();
        UI.toast(`Pedido ${order.id} y factura ${invoice.id} creados; stock actualizado.`, "success", "💰 Venta completada");
        Views.facturacion.preview(invoice);
      };

      renderGrid(); renderCart();
    }
  },

  /* ================= PROYECTOS (KANBAN DE TAREAS) ================= */
  proyectos: {
    title: "Proyectos", crumbs: ["Inicio", "Gestión", "Proyectos"],
    stages: ["Por hacer", "En curso", "Hecho"],
    render(el) {
      if (!DB.projects.length && !DB.tasks.length) {
        el.innerHTML = `${pageHeader("Proyectos", "Gestión de proyectos y tareas del equipo")}
        <div class="card p-xl text-center space-y-md">
          ${UI.icon("view_kanban", "text-[48px] text-indigo-acc block mx-auto")}
          <h3 class="text-headline-sm text-on-surface">Activa el módulo de Proyectos</h3>
          <p class="text-body-md text-on-surface-variant max-w-md mx-auto">Ejecuta <code class="px-1.5 py-0.5 rounded bg-surface-container-high text-[12px]">supabase/upgrade.sql</code> en el SQL Editor de tu proyecto de Supabase para crear las tablas de proyectos y tareas, y recarga la página.</p>
          <button class="btn-primary mx-auto" id="proj-demo">${UI.icon("add", "text-[18px]")} O crea tu primer proyecto ahora</button>
        </div>`;
        document.getElementById("proj-demo").onclick = () => Views.proyectos.newProject(el);
        return;
      }
      const progress = (pid) => {
        const ts = DB.tasks.filter(t => t.project_id === pid);
        return ts.length ? Math.round(ts.filter(t => t.status === "Hecho").length / ts.length * 100) : 0;
      };
      el.innerHTML = `
      ${pageHeader("Proyectos", `${DB.projects.length} proyectos · ${DB.tasks.length} tareas`, `
        <button class="btn-ghost" id="new-project">${UI.icon("create_new_folder", "text-[18px]")} Nuevo Proyecto</button>
        <button class="btn-primary" id="new-task">${UI.icon("add_task", "text-[18px]")} Nueva Tarea</button>`)}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        ${DB.projects.map(p => `
        <div class="card card-hover p-lg">
          <div class="flex justify-between items-start gap-md">
            <div><p class="font-semibold text-body-lg text-on-surface">${p.name}</p>
            <p class="text-label-md text-on-surface-variant">Responsable: ${p.owner} · Entrega: ${p.due}</p></div>
            ${UI.badge(p.status, p.status === "Activo" ? "info" : "success")}
          </div>
          <div class="flex items-center gap-md mt-md">
            <div class="stock-bar flex-1"><div class="brand-gradient" style="width:${progress(p.id)}%"></div></div>
            <span class="text-body-md font-semibold text-on-surface">${progress(p.id)}%</span>
          </div>
        </div>`).join("")}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
        ${Views.proyectos.stages.map(stage => {
          const tasks = DB.tasks.filter(t => t.status === stage);
          return `
          <div class="kanban-col rounded-xl bg-surface-container/50 border border-outline-variant/20 flex flex-col" data-stage="${stage}">
            <div class="px-md py-sm flex items-center justify-between border-b border-outline-variant/20">
              <span class="font-semibold text-body-md text-on-surface">${stage}</span>
              <span class="badge badge-neutral">${tasks.length}</span>
            </div>
            <div class="p-sm space-y-sm flex-1 min-h-[140px]">
              ${tasks.map(t => {
                const prio = t.priority === "Alta" ? "error" : t.priority === "Media" ? "warning" : "info";
                const proj = DB.projects.find(p => p.id === t.project_id);
                return `
                <div class="kanban-card card p-md space-y-xs" draggable="true" data-task="${t.id}">
                  <div class="flex justify-between items-start gap-xs">
                    <p class="font-semibold text-body-md text-on-surface leading-tight">${t.title}</p>
                    <span class="badge badge-${prio}">${t.priority}</span>
                  </div>
                  <p class="text-label-md text-on-surface-variant">${proj?.name || "—"}</p>
                  <div class="flex justify-between items-center pt-xs border-t border-outline-variant/15">
                    <span class="flex items-center gap-xs text-label-md text-on-surface-variant">${UI.avatar(t.assignee || "?", t.id)} ${t.assignee}</span>
                    <span class="text-label-md text-on-surface-variant">${t.due}</span>
                  </div>
                </div>`;
              }).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>`;

      // drag & drop de tareas
      let dragged = null;
      el.querySelectorAll(".kanban-card").forEach(card => {
        card.addEventListener("dragstart", () => { dragged = card; setTimeout(() => card.classList.add("dragging"), 0); });
        card.addEventListener("dragend", () => { card.classList.remove("dragging"); dragged = null; });
      });
      el.querySelectorAll(".kanban-col").forEach(col => {
        col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drag-over"); });
        col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
        col.addEventListener("drop", async e => {
          e.preventDefault(); col.classList.remove("drag-over");
          if (!dragged) return;
          const task = DB.tasks.find(t => t.id === parseInt(dragged.dataset.task));
          const newStage = col.dataset.stage;
          if (task && task.status !== newStage) {
            task.status = newStage;
            await Store.upsert("tasks", task);
            Store.log("UPDATE", "Proyectos", `Tarea "${task.title}" → ${newStage}`);
            Views.proyectos.render(el);
            UI.toast(`"${task.title}" movida a ${newStage}.`, newStage === "Hecho" ? "success" : "info");
          }
        });
      });

      document.getElementById("new-project").onclick = () => Views.proyectos.newProject(el);
      document.getElementById("new-task").onclick = () => {
        if (!DB.projects.length) return UI.toast("Crea primero un proyecto.", "warning");
        UI.formModal({
          title: "Nueva Tarea", wide: false,
          fields: [
            { name: "title", label: "Título" },
            { name: "project_id", label: "Proyecto", type: "select", options: DB.projects.map(p => p.id + " · " + p.name) },
            { name: "assignee", label: "Asignada a", type: "select", options: DB.employees.map(e => e.name) },
            { name: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] },
            { name: "due", label: "Fecha límite", value: "15 Ago" }
          ],
          onSave: async (data, close) => {
            const row = { id: Math.max(0, ...DB.tasks.map(t => t.id)) + 1, status: "Por hacer", ...data, project_id: parseInt(data.project_id) };
            await Store.upsert("tasks", row);
            Store.log("CREATE", "Proyectos", `Tarea creada: ${row.title}`);
            close(); Views.proyectos.render(el);
            UI.toast("Tarea añadida al tablero.", "success");
          }
        });
      };
    },

    newProject(el) {
      UI.formModal({
        title: "Nuevo Proyecto", wide: false,
        fields: [
          { name: "name", label: "Nombre del proyecto" },
          { name: "owner", label: "Responsable", type: "select", options: DB.employees.map(e => e.name) },
          { name: "due", label: "Fecha de entrega", value: "30 Sep 2026" }
        ],
        onSave: async (data, close) => {
          const row = { id: Math.max(0, ...DB.projects.map(p => p.id)) + 1, status: "Activo", ...data };
          await Store.upsert("projects", row);
          Store.log("CREATE", "Proyectos", `Proyecto creado: ${row.name}`);
          close(); Views.proyectos.render(el);
          UI.toast("Proyecto creado.", "success", row.name);
        }
      });
    }
  },

  /* ================= CALENDARIO RRHH ================= */
  calendario: {
    title: "Calendario", crumbs: ["Inicio", "Capital Humano", "Calendario"],
    render(el) {
      const daysInMonth = 31, firstDow = 3; // Julio 2026 empieza miércoles
      const today = 4;
      const events = DB.hr.requests
        .filter(r => r.status !== "Rechazado" && /\d/.test(r.range))
        .map((r, i) => {
          const start = parseInt(r.range.match(/\d+/)[0]);
          return { start, len: Math.max(r.days, 1), emp: r.emp, type: r.type, status: r.status,
                   color: ["indigo-acc", "cyan-acc", "purple-acc", "success", "warning"][i % 5] };
        });
      const holidays = { 25: "Anexión de Guanacaste" };

      const cells = [];
      for (let i = 0; i < firstDow; i++) cells.push(`<div class="min-h-[92px]"></div>`);
      for (let d = 1; d <= daysInMonth; d++) {
        const dayEvents = events.filter(e => d >= e.start && d < e.start + e.len);
        cells.push(`
        <div class="min-h-[92px] rounded-lg border ${d === today ? "border-indigo-acc/60 bg-indigo-acc/[.06]" : "border-outline-variant/15 bg-surface-container-low/50"} p-1.5 space-y-1 overflow-hidden">
          <div class="flex justify-between items-center">
            <span class="text-label-md font-bold ${d === today ? "w-5 h-5 rounded-full brand-gradient text-white flex items-center justify-center" : "text-on-surface-variant"}">${d}</span>
            ${holidays[d] ? UI.icon("celebration", "text-warning text-[14px]") : ""}
          </div>
          ${holidays[d] ? `<p class="text-[10px] text-warning font-semibold leading-tight">${holidays[d]}</p>` : ""}
          ${dayEvents.slice(0, 2).map(e => `
            <div class="text-[10px] font-semibold px-1.5 py-0.5 rounded truncate bg-${e.color}/15 text-${e.color} ${e.status === "Pendiente" ? "opacity-60 border border-dashed border-current" : ""}" title="${e.emp} · ${e.type} (${e.status})">
              ${e.emp.split(" ")[0]} · ${e.type}
            </div>`).join("")}
          ${dayEvents.length > 2 ? `<p class="text-[10px] text-on-surface-variant">+${dayEvents.length - 2} más</p>` : ""}
        </div>`);
      }

      el.innerHTML = `
      ${pageHeader("Calendario de RRHH", "Vacaciones, licencias y eventos del equipo · Julio 2026", `
        <div class="flex items-center gap-sm">
          <button class="btn-ghost !px-2.5">${UI.icon("chevron_left", "text-[18px]")}</button>
          <span class="font-semibold text-body-lg text-on-surface px-sm">Julio 2026</span>
          <button class="btn-ghost !px-2.5">${UI.icon("chevron_right", "text-[18px]")}</button>
        </div>`)}
      <div class="card p-lg overflow-x-auto">
        <div class="min-w-[640px]">
          <div class="grid grid-cols-7 gap-1.5 mb-sm">
            ${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => `<div class="text-center text-label-sm text-on-surface-variant uppercase py-xs">${d}</div>`).join("")}
          </div>
          <div class="grid grid-cols-7 gap-1.5">${cells.join("")}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${UI.panel("Ausencias del mes", `${events.length} registradas`, `
          <div class="space-y-sm">${events.map(e => `
            <div class="flex items-center gap-md p-sm rounded-lg hover:bg-surface-container/60 transition-colors">
              ${UI.avatar(e.emp, e.start)}
              <div class="flex-1"><p class="text-body-md font-medium text-on-surface">${e.emp}</p>
              <p class="text-label-md text-on-surface-variant">${e.type} · del ${e.start} al ${e.start + e.len - 1} de Julio</p></div>
              ${UI.badge(e.status)}
            </div>`).join("") || `<p class="text-body-md text-on-surface-variant text-center py-md">Sin ausencias este mes 🎉</p>`}</div>`)}
        ${UI.panel("Cobertura del equipo", "Personal disponible por semana", UI.barChart(
          ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
          [96, 88, 82, 91], [100, 100, 100, 100], "Disponibles %", "Plantilla"))}
      </div>`;
    }
  }
};
