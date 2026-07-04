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

  /* ---------- Charts SVG ---------- */
  barChart(labels, seriesA, seriesB, legendA = "Ventas", legendB = "Compras") {
    const cols = labels.map((l, i) => `
      <div class="flex-1 flex flex-col items-center gap-xs h-full min-w-0">
        <div class="flex-1 flex items-end gap-1.5 w-full justify-center chart-tip" data-tip="${l}: ${seriesA[i]} / ${seriesB[i]}">
          <div class="chart-bar w-1/3 max-w-[26px] bg-primary" style="--target-height:${seriesA[i]}%; height:0;"></div>
          <div class="chart-bar w-1/3 max-w-[26px] bg-secondary-container" style="--target-height:${seriesB[i]}%; height:0; animation-delay:.1s"></div>
        </div>
        <span class="text-label-md text-on-surface-variant">${l}</span>
      </div>`).join("");
    return `
    <div>
      <div class="flex gap-md items-center justify-end mb-md">
        <span class="flex items-center gap-xs text-label-md text-on-surface"><span class="w-3 h-3 rounded-full bg-primary"></span>${legendA}</span>
        <span class="flex items-center gap-xs text-label-md text-on-surface"><span class="w-3 h-3 rounded-full bg-secondary-container"></span>${legendB}</span>
      </div>
      <div class="h-[280px] flex items-end gap-sm relative">
        <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          ${`<div class="w-full border-t border-outline-variant"></div>`.repeat(5)}
        </div>
        ${cols}
      </div>
    </div>`;
  },

  lineChart(data, { height = 220, stroke = "rgb(var(--indigo-acc))", fill = true, id = "lc" } = {}) {
    const w = 600, h = height, pad = 10;
    const max = Math.max(...data) * 1.15;
    const pts = data.map((v, i) => [pad + i * (w - 2 * pad) / (data.length - 1), h - pad - (v / max) * (h - 2 * pad)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = path + ` L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
    return `
    <svg viewBox="0 0 ${w} ${h}" class="w-full" preserveAspectRatio="none" style="height:${height}px">
      <defs>
        <linearGradient id="grad-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${stroke}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${w}" y1="${h * f}" y2="${h * f}" stroke="rgb(var(--outline-variant))" stroke-opacity=".2"/>`).join("")}
      ${fill ? `<path d="${area}" fill="url(#grad-${id})"/>` : ""}
      <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" class="chart-line"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${stroke}" opacity="0"><animate attributeName="opacity" to="1" dur="0.3s" begin="1.2s" fill="freeze"/></circle>`).join("")}
    </svg>`;
  },

  donutChart(segments, centerLabel = "", size = 190) {
    const total = segments.reduce((a, s) => a + s.value, 0);
    const r = 15.915; let offset = 25;
    const circles = segments.map((s, i) => {
      const pct = s.value / total * 100;
      const el = `<circle r="${r}" cx="21" cy="21" fill="transparent" stroke="${s.color}" stroke-width="4.5"
        stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${offset}" class="donut-seg" style="animation-delay:${i * .12}s"></circle>`;
      offset -= pct;
      return el;
    }).join("");
    const legend = segments.map(s => `
      <div class="flex items-center justify-between gap-md text-body-md">
        <span class="flex items-center gap-sm text-on-surface-variant"><span class="w-2.5 h-2.5 rounded-full" style="background:${s.color}"></span>${s.label}</span>
        <span class="font-semibold text-on-surface">${s.value}%</span>
      </div>`).join("");
    return `
    <div class="flex items-center gap-lg flex-wrap justify-center">
      <div class="relative" style="width:${size}px;height:${size}px">
        <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">${circles}</svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-headline-md text-on-surface">${centerLabel}</span>
          <span class="text-label-md text-on-surface-variant">del total</span>
        </div>
      </div>
      <div class="flex-1 min-w-[160px] space-y-sm">${legend}</div>
    </div>`;
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
