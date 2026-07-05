/* ==========================================================================
   OmniCore ERP — Librería de componentes reutilizables
   Cada componente devuelve un string HTML; los interactivos exponen init().
   ========================================================================== */

const UI = {

  icon: (name, cls = "") => `<span class="material-symbols-outlined ${cls}">${name}</span>`,

  /* ---------- Badges de estado ---------- */
  badge(text, kind) {
    const map = {
      "Activo": "success", "Pagada": "success", "Completada": "success", "Aprobado": "success", "Aprobada": "success", "Recibida": "success", "Validada": "success", "Ganado": "success",
      "Pendiente": "warning", "Procesando": "warning", "Vacaciones": "warning", "En revisión": "warning", "En tránsito": "cyan", "Enviada": "cyan", "Emitida": "info",
      "Vencida": "error", "Cancelada": "error", "Rechazado": "error", "Rechazada": "error", "Licencia": "info",
      "info": "info", "warning": "warning", "critical": "error"
    };
    const k = kind || map[text] || "neutral";
    return `<span class="badge badge-${k}">${text}</span>`;
  },

  avatar(name, colorIdx = 0) {
    const colors = [
      "bg-indigo-acc/20 text-indigo-acc", "bg-cyan-acc/20 text-cyan-acc",
      "bg-purple-acc/20 text-purple-acc", "bg-success/20 text-success",
      "bg-warning/20 text-warning", "bg-secondary-container text-on-secondary-container"
    ];
    return `<span class="avatar ${colors[colorIdx % colors.length]}">${fmt.initials(name)}</span>`;
  },

  /* ---------- KPI card con contador animado ---------- */
  kpiCard(k, idx = 0) {
    const up = k.trend >= 0;
    const good = k.invert ? !up : up;
    const trendCls = k.trend === 0 ? "badge-neutral" : good ? "badge-success" : "badge-error";
    const trendIcon = k.trend === 0 ? "horizontal_rule" : up ? "trending_up" : "trending_down";
    const iconColors = {
      primary: "bg-primary/10 text-primary", secondary: "bg-secondary/10 text-secondary",
      success: "bg-success/10 text-success", warning: "bg-warning/10 text-warning",
      indigo: "bg-indigo-acc/10 text-indigo-acc", cyan: "bg-cyan-acc/10 text-cyan-acc"
    };
    return `
    <div class="card card-hover p-lg group">
      <div class="flex justify-between items-start mb-sm">
        <div class="p-2 rounded-lg ${iconColors[k.color] || iconColors.primary}">${UI.icon(k.icon)}</div>
        <span class="badge ${trendCls}">${k.trend > 0 ? "+" : ""}${k.trend}% ${UI.icon(trendIcon, "text-[14px]")}</span>
      </div>
      <p class="text-label-md text-on-surface-variant uppercase tracking-wider">${k.label}</p>
      <h3 class="text-headline-lg mt-xs text-on-surface counter" data-value="${k.value}" data-prefix="${k.prefix || ""}" data-suffix="${k.suffix || ""}">0</h3>
      <p class="text-[11px] text-on-surface-variant mt-sm">vs. periodo anterior</p>
    </div>`;
  },

  animateCounters(root = document) {
    root.querySelectorAll(".counter").forEach(el => {
      const target = parseFloat(el.dataset.value);
      const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
      const decimals = target % 1 !== 0 ? 1 : 0;
      const dur = 1100, t0 = performance.now();
      const setVal = (v) => el.textContent = prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        setVal(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      // rAF se pausa en pestañas ocultas: garantiza el valor final
      setTimeout(() => setVal(target), dur + 150);
    });
  },

  /* ---------- Charts interactivos (ApexCharts) ---------- */
  _cid: 0,
  _charts: {},

  /* Resuelve "var(--x)" o "rgb(var(--x))" al color computado real */
  resolveColor(str) {
    if (!str || !str.includes("var(--")) return str;
    const alias = { "c-indigo": "indigo-acc", "c-cyan": "cyan-acc", "c-purple": "purple-acc", "c-success": "success" };
    let name = str.match(/var\(--([a-z-]+)\)/)[1];
    if (alias[name]) name = alias[name];
    const triplet = getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
    return triplet.includes(" ") ? `rgb(${triplet.replace(/ /g, ",")})` : (triplet || str);
  },

  _theme() {
    const c = (n) => this.resolveColor(`var(--${n})`);
    return {
      fore: c("on-surface-variant"), grid: c("outline-variant"),
      indigo: c("indigo-acc"), cyan: c("cyan-acc"), purple: c("purple-acc"),
      success: c("success"), primary: c("primary"), secondary: c("secondary")
    };
  },

  _mount(id, options) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el || typeof ApexCharts === "undefined") return;
      try { UI._charts[id]?.destroy(); } catch (e) {}
      const ch = new ApexCharts(el, options);
      ch.render();
      UI._charts[id] = ch;
    }, 60);
  },

  destroyCharts() {
    Object.values(UI._charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    UI._charts = {};
  },

  _baseOptions(t, height) {
    return {
      chart: { height, background: "transparent", toolbar: { show: false }, fontFamily: "Inter, sans-serif",
               animations: { easing: "easeout", speed: 700 }, foreColor: t.fore },
      grid: { borderColor: t.grid, strokeDashArray: 3, opacity: 0.2 },
      tooltip: { theme: document.documentElement.classList.contains("dark") ? "dark" : "light" },
      dataLabels: { enabled: false }
    };
  },

  barChart(labels, seriesA, seriesB, legendA = "Ventas", legendB = "Compras") {
    const id = "chart-" + (++UI._cid);
    const t = UI._theme();
    UI._mount(id, {
      ...UI._baseOptions(t, 300),
      chart: { ...UI._baseOptions(t, 300).chart, type: "bar" },
      series: [{ name: legendA, data: seriesA }, { name: legendB, data: seriesB }],
      colors: [t.indigo, t.cyan],
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 5, borderRadiusApplication: "end" } },
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
      legend: { position: "top", horizontalAlign: "right", markers: { radius: 12 } },
      fill: { opacity: [1, 0.55] }
    });
    return `<div id="${id}" class="min-h-[300px]"></div>`;
  },

  lineChart(data, { height = 220, stroke = "rgb(var(--indigo-acc))", id = "lc", labels = null } = {}) {
    const cid = "chart-" + (++UI._cid);
    const t = UI._theme();
    const color = UI.resolveColor(stroke);
    UI._mount(cid, {
      ...UI._baseOptions(t, height),
      chart: { ...UI._baseOptions(t, height).chart, type: "area", sparkline: { enabled: false } },
      series: [{ name: "Valor", data }],
      colors: [color],
      stroke: { curve: "smooth", width: 3 },
      fill: { type: "gradient", gradient: { shadeIntensity: 0.6, opacityFrom: 0.35, opacityTo: 0.02 } },
      xaxis: { categories: labels || data.map((_, i) => i + 1), labels: { show: !!labels }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v) => Math.round(v).toLocaleString() } }
    });
    return `<div id="${cid}" style="min-height:${height}px"></div>`;
  },

  donutChart(segments, centerLabel = "", size = 190) {
    const id = "chart-" + (++UI._cid);
    const t = UI._theme();
    UI._mount(id, {
      ...UI._baseOptions(t, size + 40),
      chart: { ...UI._baseOptions(t, size + 40).chart, type: "donut" },
      series: segments.map(s => s.value),
      labels: segments.map(s => s.label),
      colors: segments.map(s => UI.resolveColor(s.color)),
      legend: { position: "right", fontSize: "13px" },
      stroke: { show: false },
      plotOptions: { pie: { donut: { size: "74%", labels: { show: true, total: {
        show: true, label: "del total", fontSize: "12px", color: t.fore,
        formatter: () => centerLabel || segments.reduce((a, s) => a + s.value, 0) + "%"
      } } } } },
      responsive: [{ breakpoint: 640, options: { legend: { position: "bottom" } } }]
    });
    return `<div id="${id}"></div>`;
  },

  /* ---------- Exportaciones reales ---------- */
  exportExcel(rows, filename = "export.xlsx", sheet = "Datos") {
    if (typeof XLSX === "undefined") return UI.toast("Librería de Excel no disponible.", "error");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, filename);
    UI.toast(filename + " descargado.", "success", "Exportación Excel");
  },

  exportPDF({ title, subtitle = "", head, body, filename = "reporte.pdf" }) {
    if (typeof jspdf === "undefined") return UI.toast("Librería PDF no disponible.", "error");
    const doc = new jspdf.jsPDF();
    doc.setFontSize(16); doc.setFont(undefined, "bold");
    doc.text(title, 14, 18);
    doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(120);
    doc.text(subtitle, 14, 25);
    doc.autoTable({
      head: [head], body, startY: 32, theme: "grid",
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });
    doc.save(filename);
    UI.toast(filename + " descargado.", "success", "Exportación PDF");
  },

  invoicePDF(inv) {
    if (typeof jspdf === "undefined") return UI.toast("Librería PDF no disponible.", "error");
    const net = inv.total / 1.13, tax = inv.total - net;
    const doc = new jspdf.jsPDF();
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255); doc.setFontSize(18); doc.setFont(undefined, "bold");
    doc.text(DB.settings.company.name, 14, 14);
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    doc.text(`CIF ${DB.settings.company.taxId} · ${DB.settings.company.address}`, 14, 21);
    doc.setFontSize(16); doc.text(inv.id, 196, 14, { align: "right" });
    doc.setFontSize(10); doc.text(inv.status, 196, 21, { align: "right" });
    doc.setTextColor(60); doc.setFontSize(10);
    doc.text(`Cliente: ${inv.customer}`, 14, 42);
    doc.text(`Emisión: ${inv.date}   ·   Vencimiento: ${inv.due}   ·   Condiciones: Crédito 30 días`, 14, 49);
    doc.autoTable({
      head: [["Concepto", "Cant.", "Precio", "Importe"]],
      body: [
        ["Equipamiento de red empresarial", "4", fmt.money(net * 0.55 / 4), fmt.money(net * 0.55)],
        ["Servicios de instalación y configuración", "1", fmt.money(net * 0.3), fmt.money(net * 0.3)],
        ["Soporte premium (12 meses)", "1", fmt.money(net * 0.15), fmt.money(net * 0.15)]
      ],
      startY: 56, theme: "striped", headStyles: { fillColor: [30, 41, 59] }, styles: { fontSize: 9 }
    });
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${fmt.money(net)}`, 196, y, { align: "right" });
    doc.text(`IVA (13%): ${fmt.money(tax)}`, 196, y + 6, { align: "right" });
    doc.setFont(undefined, "bold"); doc.setFontSize(12);
    doc.text(`Total: ${fmt.money(inv.total)}`, 196, y + 14, { align: "right" });
    doc.save(inv.id + ".pdf");
    UI.toast(inv.id + ".pdf descargada.", "success", "Factura PDF");
  },

  sparkline(data, color = "rgb(var(--success))") {
    const w = 100, h = 32;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => `${(i * w / (data.length - 1)).toFixed(1)},${(h - 3 - (v - min) / (max - min) * (h - 6)).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" class="w-24 h-8"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" class="chart-line"/></svg>`;
  },

  stockBar(stock, min, max) {
    const pct = Math.min(stock / max * 100, 100);
    const color = stock <= min * 0.5 ? "bg-error" : stock <= min ? "bg-warning" : "bg-success";
    return `<div class="stock-bar w-full"><div class="${color}" style="width:${pct}%"></div></div>`;
  },

  /* ---------- Card genérica con header ---------- */
  panel(title, subtitle, bodyHtml, actionsHtml = "") {
    return `
    <div class="card overflow-hidden">
      <div class="px-lg py-md border-b border-outline-variant/20 flex justify-between items-center gap-md flex-wrap">
        <div>
          <h4 class="text-headline-sm text-on-surface">${title}</h4>
          ${subtitle ? `<p class="text-body-md text-on-surface-variant">${subtitle}</p>` : ""}
        </div>
        <div class="flex gap-sm items-center">${actionsHtml}</div>
      </div>
      <div class="p-lg">${bodyHtml}</div>
    </div>`;
  },

  /* ---------- Toasts ---------- */
  toast(message, kind = "success", title = null) {
    const icons = { success: "check_circle", error: "error", warning: "warning", info: "info" };
    const colors = { success: "text-success", error: "text-error", warning: "text-warning", info: "text-indigo-acc" };
    const el = document.createElement("div");
    el.className = "toast glass rounded-xl p-md flex gap-md items-start shadow-overlay";
    el.innerHTML = `
      ${UI.icon(icons[kind], colors[kind] + " text-[22px] shrink-0")}
      <div class="flex-1 min-w-0">
        ${title ? `<p class="font-semibold text-on-surface text-body-md">${title}</p>` : ""}
        <p class="text-body-md text-on-surface-variant">${message}</p>
      </div>
      <button class="icon-btn -m-1 p-1">${UI.icon("close", "text-[18px]")}</button>`;
    el.querySelector("button").onclick = () => dismiss();
    document.getElementById("toast-root").appendChild(el);
    const dismiss = () => { el.classList.add("leaving"); setTimeout(() => el.remove(), 300); };
    setTimeout(dismiss, 4500);
  },

  /* ---------- Modal ---------- */
  modal({ title, subtitle = "", body, footer = "", wide = false, onMount = null }) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
    <div class="fixed inset-0 z-[110] flex items-center justify-center p-md modal-backdrop">
      <div class="modal-card card w-full ${wide ? "max-w-3xl" : "max-w-lg"} bg-surface-container-low max-h-[90vh] flex flex-col">
        <div class="px-lg py-md border-b border-outline-variant/20 flex justify-between items-start">
          <div>
            <h3 class="text-headline-sm text-on-surface">${title}</h3>
            ${subtitle ? `<p class="text-body-md text-on-surface-variant">${subtitle}</p>` : ""}
          </div>
          <button class="icon-btn" data-close>${UI.icon("close")}</button>
        </div>
        <div class="p-lg overflow-y-auto">${body}</div>
        ${footer ? `<div class="px-lg py-md border-t border-outline-variant/20 flex justify-end gap-sm">${footer}</div>` : ""}
      </div>
    </div>`;
    const close = () => root.innerHTML = "";
    root.querySelector("[data-close]").onclick = close;
    root.firstElementChild.addEventListener("click", e => { if (e.target === root.firstElementChild) close(); });
    if (onMount) onMount(root, close);
    return close;
  },

  /* ---------- Modal de formulario genérico ---------- */
  formModal({ title, subtitle = "", fields, submitLabel = "Guardar", wide = true, onSave }) {
    const body = `
    <form id="generic-form" class="grid grid-cols-1 ${wide ? "md:grid-cols-2" : ""} gap-md">
      ${fields.map(f => {
        const base = `name="${f.name}" ${f.required !== false ? "required" : ""} class="input-field mt-xs"`;
        const label = `<span class="text-label-md text-on-surface-variant uppercase tracking-wider">${f.label}</span>`;
        const span = f.cols === 2 ? "md:col-span-2" : "";
        if (f.type === "select")
          return `<label class="block ${span}">${label}<select ${base}>${f.options.map(o =>
            `<option value="${o}" ${f.value === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
        if (f.type === "textarea")
          return `<label class="block ${span}">${label}<textarea ${base} rows="3" placeholder="${f.placeholder || ""}">${f.value ?? ""}</textarea></label>`;
        if (f.type === "file")
          return `<label class="block ${span}">${label}<input type="file" name="${f.name}" ${f.accept ? `accept="${f.accept}"` : ""} class="input-field mt-xs !py-2 file:mr-3 file:rounded file:border-0 file:bg-indigo-acc/15 file:text-indigo-acc file:px-3 file:py-1 file:text-[12px] file:font-semibold"/></label>`;
        return `<label class="block ${span}">${label}<input type="${f.type || "text"}" ${base}
          value="${f.value ?? ""}" placeholder="${f.placeholder || ""}" ${f.min != null ? `min="${f.min}"` : ""} ${f.step ? `step="${f.step}"` : ""} ${f.readonly ? "readonly" : ""}/></label>`;
      }).join("")}
    </form>`;
    UI.modal({
      title, subtitle, wide, body,
      footer: `<button class="btn-ghost" data-cancel>Cancelar</button>
               <button class="btn-primary" data-save>${UI.icon("save", "text-[18px]")} ${submitLabel}</button>`,
      onMount: (root, close) => {
        root.querySelector("[data-cancel]").onclick = close;
        root.querySelector("[data-save]").onclick = async () => {
          const form = root.querySelector("#generic-form");
          if (!form.reportValidity()) return;
          const data = Object.fromEntries(new FormData(form));
          fields.filter(f => f.type === "number").forEach(f => data[f.name] = parseFloat(data[f.name]) || 0);
          await onSave(data, close);
        };
      }
    });
  },

  /* ---------- Confirmación ---------- */
  confirm({ title = "¿Estás seguro?", message, okLabel = "Confirmar", danger = false, onOk }) {
    UI.modal({
      title, wide: false,
      body: `<div class="flex gap-md items-start">
        <div class="p-2.5 rounded-xl ${danger ? "bg-error/10 text-error" : "bg-warning/10 text-warning"}">${UI.icon(danger ? "delete_forever" : "help", "text-[26px]")}</div>
        <p class="text-body-md text-on-surface-variant pt-1.5">${message}</p></div>`,
      footer: `<button class="btn-ghost" data-cancel>Cancelar</button>
               <button class="${danger ? "btn-danger" : "btn-primary"}" data-ok>${okLabel}</button>`,
      onMount: (root, close) => {
        root.querySelector("[data-cancel]").onclick = close;
        root.querySelector("[data-ok]").onclick = async () => { await onOk(); close(); };
      }
    });
  },

  /* ---------- Skeleton de carga ---------- */
  skeletonPage() {
    return `
    <div class="space-y-lg">
      <div class="skeleton h-10 w-72"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        ${`<div class="skeleton h-36"></div>`.repeat(4)}
      </div>
      <div class="skeleton h-80"></div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div class="skeleton h-64 lg:col-span-2"></div><div class="skeleton h-64"></div>
      </div>
    </div>`;
  },

  /* ---------- DataTable interactiva (búsqueda + orden + paginación) ---------- */
  dataTable({ id, columns, rows, pageSize = 8, searchable = true, filters = [], renderRow, onRowClick = null, actionsHtml = "" }) {
    const state = { page: 1, query: "", sortKey: null, sortDir: 1, filterValues: {} };

    const filtered = () => {
      let out = [...rows];
      if (state.query) {
        const q = state.query.toLowerCase();
        out = out.filter(r => JSON.stringify(Object.values(r)).toLowerCase().includes(q));
      }
      for (const [key, val] of Object.entries(state.filterValues)) {
        if (val) out = out.filter(r => String(r[key]) === val);
      }
      if (state.sortKey) {
        out.sort((a, b) => {
          const va = a[state.sortKey], vb = b[state.sortKey];
          return (typeof va === "number" ? va - vb : String(va).localeCompare(String(vb))) * state.sortDir;
        });
      }
      return out;
    };

    const render = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const data = filtered();
      const pages = Math.max(1, Math.ceil(data.length / pageSize));
      state.page = Math.min(state.page, pages);
      const slice = data.slice((state.page - 1) * pageSize, state.page * pageSize);

      el.innerHTML = `
      <div class="px-lg py-md border-b border-outline-variant/20 flex items-center gap-md flex-wrap">
        ${searchable ? `
        <div class="relative flex-1 min-w-[200px] max-w-xs">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input data-search class="input-field pl-9 py-1.5" placeholder="Buscar..." value="${state.query}"/>
        </div>` : ""}
        ${filters.map(f => `
        <select data-filter="${f.key}" class="input-field w-auto py-1.5 pr-9 text-body-md">
          <option value="">${f.label}: Todos</option>
          ${f.options.map(o => `<option ${state.filterValues[f.key] === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>`).join("")}
        <div class="ml-auto flex gap-sm items-center">
          <span class="text-label-md text-on-surface-variant">${data.length} registros</span>
          ${actionsHtml}
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr>
            ${columns.map(c => `
            <th class="${c.sortable !== false ? "sortable" : ""} ${c.align === "right" ? "text-right" : ""}" data-sort="${c.key || ""}">
              <span class="inline-flex items-center gap-xs">${c.label}
                ${state.sortKey === c.key ? UI.icon(state.sortDir === 1 ? "arrow_upward" : "arrow_downward", "text-[14px]") : ""}
              </span>
            </th>`).join("")}
          </tr></thead>
          <tbody>
            ${slice.length ? slice.map(r => renderRow(r)).join("") :
              `<tr><td colspan="${columns.length}" class="text-center py-xl text-on-surface-variant">
                 ${UI.icon("search_off", "text-[40px] opacity-40 block mx-auto mb-sm")}Sin resultados para los filtros aplicados</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="px-lg py-md border-t border-outline-variant/20 flex items-center justify-between flex-wrap gap-md">
        <span class="text-body-md text-on-surface-variant">Página ${state.page} de ${pages}</span>
        <div class="flex gap-xs">
          <button data-page="prev" class="btn-ghost !px-2.5 ${state.page === 1 ? "opacity-40 pointer-events-none" : ""}">${UI.icon("chevron_left", "text-[18px]")}</button>
          ${Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map(p => `
            <button data-page="${p}" class="${p === state.page ? "btn-primary" : "btn-ghost"} !px-3">${p}</button>`).join("")}
          <button data-page="next" class="btn-ghost !px-2.5 ${state.page === pages ? "opacity-40 pointer-events-none" : ""}">${UI.icon("chevron_right", "text-[18px]")}</button>
        </div>
      </div>`;

      const search = el.querySelector("[data-search]");
      if (search) {
        search.addEventListener("input", e => { state.query = e.target.value; state.page = 1; renderPreserveFocus(); });
      }
      el.querySelectorAll("[data-filter]").forEach(s => s.addEventListener("change", e => {
        state.filterValues[s.dataset.filter] = e.target.value; state.page = 1; render();
      }));
      el.querySelectorAll("th.sortable").forEach(th => th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (!key) return;
        if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
        render();
      }));
      el.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.page;
        state.page = v === "prev" ? state.page - 1 : v === "next" ? state.page + 1 : parseInt(v);
        render();
      }));
      if (onRowClick) el.querySelectorAll("tbody tr[data-id]").forEach(tr =>
        tr.addEventListener("click", (e) => { if (!e.target.closest("button")) onRowClick(tr.dataset.id); }));
    };

    const renderPreserveFocus = () => {
      render();
      const s = document.querySelector(`#${id} [data-search]`);
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    };

    return { render };
  }
};
