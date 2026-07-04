/* ==========================================================================
   OmniCore ERP — Datos de demostración (mock data para todos los módulos)
   ========================================================================== */

const DB = {

  settings: {
    company: { name: "OmniCore Systems S.A.", taxId: "3-101-887342", currency: "USD", address: "San José, Costa Rica", fiscalYear: "Enero" },
    prefs: { emailNotifs: true, stockAlerts: true, weeklyReport: true, mfa: false }
  },

  kpis: {
    revenue:   { label: "Ingresos",           value: 1284500, prefix: "$", trend: +12.5, icon: "payments",     color: "primary" },
    expenses:  { label: "Gastos",             value: 743200,  prefix: "$", trend: +4.2,  icon: "credit_card",  color: "secondary", invert: true },
    profit:    { label: "Beneficio Neto",     value: 541300,  prefix: "$", trend: +18.9, icon: "trending_up",  color: "success" },
    growth:    { label: "Crecimiento Ventas", value: 23.4,    suffix: "%", trend: +5.1,  icon: "monitoring",   color: "cyan" },
    customers: { label: "Clientes Activos",   value: 1842,    trend: +8.2,  icon: "group",        color: "indigo" },
    lowstock:  { label: "Alertas de Stock",   value: 18,      trend: -12.0, icon: "warning",      color: "warning", invert: true }
  },

  salesVsPurchases: {
    months: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    sales:     [85, 70, 95, 60, 88, 75, 92, 81, 97, 89, 105, 112],
    purchases: [40, 55, 30, 80, 45, 50, 48, 61, 38, 52, 58, 63]
  },

  revenueByLine: [
    { label: "Hardware",   value: 42, color: "var(--c-indigo)" },
    { label: "Software",   value: 28, color: "var(--c-cyan)" },
    { label: "Servicios",  value: 19, color: "var(--c-purple)" },
    { label: "Soporte",    value: 11, color: "var(--c-success)" }
  ],

  salesTrend: [32, 45, 38, 52, 48, 61, 55, 72, 68, 79, 84, 96],

  activity: [
    { user: "Carlos Mendoza", initials: "CM", action: "Aprobó orden #PO-942",        module: "Compras",    time: "Hoy, 10:42 AM", color: "indigo" },
    { user: "Sofía Robles",   initials: "SR", action: "Nueva factura FAC-2098",      module: "Ventas",     time: "Hoy, 09:15 AM", color: "cyan" },
    { user: "Ricardo Palma",  initials: "RP", action: "Modificó stock SKU-882",      module: "Inventario", time: "Ayer, 05:30 PM", color: "purple" },
    { user: "Elena Vargas",   initials: "EV", action: "Cerró trato con TechNova",    module: "CRM",        time: "Ayer, 03:12 PM", color: "success" },
    { user: "Sistema",        initials: "SY", action: "Copia de seguridad exitosa",  module: "Sistema",    time: "Ayer, 02:00 AM", color: "neutral" }
  ],

  employees: [
    { id: 1,  name: "Carlos Mendoza",  email: "c.mendoza@omnicore.io",  dept: "Finanzas",    role: "Director Financiero",   status: "Activo",     salary: 98000, hired: "2019-03-12", location: "San José",  phone: "+506 8812-4471", performance: 92 },
    { id: 2,  name: "Sofía Robles",    email: "s.robles@omnicore.io",   dept: "Ventas",      role: "Gerente de Ventas",     status: "Activo",     salary: 76000, hired: "2020-07-01", location: "San José",  phone: "+506 8845-1120", performance: 88 },
    { id: 3,  name: "Ricardo Palma",   email: "r.palma@omnicore.io",    dept: "Operaciones", role: "Jefe de Almacén",       status: "Activo",     salary: 54000, hired: "2018-01-15", location: "Heredia",   phone: "+506 8722-9034", performance: 79 },
    { id: 4,  name: "Elena Vargas",    email: "e.vargas@omnicore.io",   dept: "Ventas",      role: "Ejecutiva CRM",         status: "Vacaciones", salary: 48000, hired: "2021-04-20", location: "Alajuela",  phone: "+506 8656-7781", performance: 95 },
    { id: 5,  name: "Miguel Torres",   email: "m.torres@omnicore.io",   dept: "TI",          role: "DevOps Engineer",       status: "Activo",     salary: 82000, hired: "2020-11-09", location: "Remoto",    phone: "+506 8590-3327", performance: 91 },
    { id: 6,  name: "Laura Jiménez",   email: "l.jimenez@omnicore.io",  dept: "RRHH",        role: "HR Business Partner",   status: "Activo",     salary: 61000, hired: "2019-09-30", location: "San José",  phone: "+506 8433-6650", performance: 86 },
    { id: 7,  name: "Andrés Solano",   email: "a.solano@omnicore.io",   dept: "TI",          role: "Full Stack Developer",  status: "Licencia",   salary: 72000, hired: "2022-02-14", location: "Remoto",    phone: "+506 8318-2245", performance: 84 },
    { id: 8,  name: "Patricia Núñez",  email: "p.nunez@omnicore.io",    dept: "Finanzas",    role: "Contadora Senior",      status: "Activo",     salary: 58000, hired: "2017-06-05", location: "Cartago",   phone: "+506 8290-1108", performance: 90 },
    { id: 9,  name: "Jorge Castro",    email: "j.castro@omnicore.io",   dept: "Operaciones", role: "Analista Logístico",    status: "Activo",     salary: 46000, hired: "2023-01-23", location: "Heredia",   phone: "+506 8177-5593", performance: 74 },
    { id: 10, name: "María Fernández", email: "m.fernandez@omnicore.io",dept: "Marketing",   role: "Growth Manager",        status: "Activo",     salary: 67000, hired: "2021-10-11", location: "San José",  phone: "+506 8064-8812", performance: 89 },
    { id: 11, name: "Daniel Rojas",    email: "d.rojas@omnicore.io",    dept: "Ventas",      role: "Account Executive",     status: "Activo",     salary: 52000, hired: "2022-08-08", location: "Guanacaste",phone: "+506 8951-2237", performance: 81 },
    { id: 12, name: "Gabriela Mora",   email: "g.mora@omnicore.io",     dept: "Marketing",   role: "Diseñadora UX",         status: "Vacaciones", salary: 55000, hired: "2023-05-02", location: "Remoto",    phone: "+506 8846-6674", performance: 93 }
  ],

  hr: {
    requests: [
      { id: 1, emp: "Elena Vargas",  type: "Vacaciones",       range: "08 – 19 Jul", days: 10, status: "Pendiente" },
      { id: 2, emp: "Miguel Torres", type: "Teletrabajo",      range: "Permanente",  days: 0,  status: "Aprobado" },
      { id: 3, emp: "Jorge Castro",  type: "Licencia médica",  range: "01 – 03 Jul", days: 3,  status: "Aprobado" },
      { id: 4, emp: "Daniel Rojas",  type: "Vacaciones",       range: "22 – 26 Jul", days: 5,  status: "Pendiente" },
      { id: 5, emp: "Laura Jiménez", type: "Día personal",     range: "15 Jul",      days: 1,  status: "Rechazado" }
    ],
    openPositions: [
      { title: "Backend Engineer (Node.js)", dept: "TI", applicants: 34, stage: "Entrevistas" },
      { title: "Ejecutivo de Cuentas",       dept: "Ventas", applicants: 58, stage: "Screening" },
      { title: "Analista Financiero Jr.",    dept: "Finanzas", applicants: 21, stage: "Oferta" }
    ],
    absenceRate: 3.2, headcount: 842, retention: 94.2, avgTenure: 3.8
  },

  payroll: {
    period: "Julio 2026",
    totalGross: 2412000, totalDeductions: 512400, totalNet: 1899600,
    runs: [
      { period: "Junio 2026",  employees: 842, gross: 2388000, status: "Pagada",     date: "30 Jun 2026" },
      { period: "Mayo 2026",   employees: 836, gross: 2361500, status: "Pagada",     date: "30 May 2026" },
      { period: "Abril 2026",  employees: 828, gross: 2344100, status: "Pagada",     date: "30 Abr 2026" }
    ]
  },

  products: [
    { sku: "SKU-1024", name: "Switch 24 Puertos L3",     category: "Redes",       stock: 2,   min: 10, max: 60,  price: 489.00, warehouse: "Central A",  supplier: "NetSupply Corp",   img: "lan" },
    { sku: "SKU-0882", name: "Cable Fibra Óptica 10m",   category: "Cableado",    stock: 3,   min: 25, max: 200, price: 24.50,  warehouse: "Central A",  supplier: "FiberTech SA",     img: "cable" },
    { sku: "SKU-0455", name: "Conectores RJ45 Cat6",     category: "Cableado",    stock: 12,  min: 50, max: 500, price: 0.85,   warehouse: "Norte B",    supplier: "FiberTech SA",     img: "settings_input_hdmi" },
    { sku: "SKU-2201", name: "Router Empresarial AX6000",category: "Redes",       stock: 45,  min: 15, max: 80,  price: 329.99, warehouse: "Central A",  supplier: "NetSupply Corp",   img: "router" },
    { sku: "SKU-3310", name: "Servidor Rack 2U Xeon",    category: "Servidores",  stock: 8,   min: 4,  max: 20,  price: 3899.0, warehouse: "Central A",  supplier: "DataCore Ltd.",    img: "dns" },
    { sku: "SKU-4102", name: "Monitor 27\" 4K IPS",      category: "Periféricos", stock: 67,  min: 20, max: 120, price: 419.00, warehouse: "Norte B",    supplier: "ViewMax Inc.",     img: "desktop_windows" },
    { sku: "SKU-5580", name: "UPS 1500VA Online",        category: "Energía",     stock: 23,  min: 10, max: 50,  price: 549.00, warehouse: "Sur C",      supplier: "PowerSafe Group",  img: "battery_charging_full" },
    { sku: "SKU-6021", name: "Laptop Pro 16\" 32GB",     category: "Equipos",     stock: 31,  min: 12, max: 60,  price: 2199.0, warehouse: "Central A",  supplier: "DataCore Ltd.",    img: "laptop_mac" }
  ],

  warehouses: [
    { name: "Central A", location: "San José",   items: 5240, capacity: 82, manager: "Ricardo Palma" },
    { name: "Norte B",   location: "Heredia",    items: 3180, capacity: 64, manager: "Jorge Castro" },
    { name: "Sur C",     location: "Cartago",    items: 1420, capacity: 37, manager: "Ana Céspedes" }
  ],

  suppliers: [
    { name: "NetSupply Corp",  category: "Redes",      rating: 4.8, orders: 142, onTime: 97 },
    { name: "FiberTech SA",    category: "Cableado",   rating: 4.5, orders: 98,  onTime: 92 },
    { name: "DataCore Ltd.",   category: "Servidores", rating: 4.9, orders: 61,  onTime: 99 },
    { name: "PowerSafe Group", category: "Energía",    rating: 4.2, orders: 45,  onTime: 88 }
  ],

  purchases: [
    { id: "PO-0951", supplier: "NetSupply Corp",  items: 12, total: 14820.00, status: "Aprobada",   date: "02 Jul 2026", eta: "10 Jul 2026" },
    { id: "PO-0950", supplier: "FiberTech SA",    items: 30, total: 4275.50,  status: "En tránsito",date: "28 Jun 2026", eta: "05 Jul 2026" },
    { id: "PO-0949", supplier: "DataCore Ltd.",   items: 4,  total: 15596.00, status: "Recibida",   date: "21 Jun 2026", eta: "30 Jun 2026" },
    { id: "PO-0948", supplier: "PowerSafe Group", items: 8,  total: 4392.00,  status: "Pendiente",  date: "20 Jun 2026", eta: "—" },
    { id: "PO-0947", supplier: "ViewMax Inc.",    items: 25, total: 10475.00, status: "Recibida",   date: "12 Jun 2026", eta: "22 Jun 2026" },
    { id: "PO-0946", supplier: "NetSupply Corp",  items: 6,  total: 2939.94,  status: "Cancelada",  date: "08 Jun 2026", eta: "—" }
  ],

  orders: [
    { id: "SO-2201", customer: "TechNova Group",     items: 8,  total: 24890.00, status: "Completada", date: "03 Jul 2026", channel: "Directo" },
    { id: "SO-2200", customer: "Alfa Logística",     items: 15, total: 8340.50,  status: "Enviada",    date: "02 Jul 2026", channel: "E-commerce" },
    { id: "SO-2199", customer: "Grupo Meridiano",    items: 3,  total: 11697.00, status: "Procesando", date: "02 Jul 2026", channel: "Directo" },
    { id: "SO-2198", customer: "Clínica San Rafael", items: 22, total: 5480.00,  status: "Completada", date: "01 Jul 2026", channel: "Partner" },
    { id: "SO-2197", customer: "EducaPlus",          items: 40, total: 16760.00, status: "Enviada",    date: "30 Jun 2026", channel: "E-commerce" },
    { id: "SO-2196", customer: "Hotel Ventisca",     items: 5,  total: 2745.00,  status: "Cancelada",  date: "29 Jun 2026", channel: "Directo" },
    { id: "SO-2195", customer: "AgroExport CR",      items: 12, total: 9214.80,  status: "Completada", date: "28 Jun 2026", channel: "Partner" }
  ],

  invoices: [
    { id: "FAC-2098", customer: "TechNova Group",     date: "03 Jul 2026", due: "02 Ago 2026", total: 24890.00, status: "Emitida",  compliance: "Validada" },
    { id: "FAC-2097", customer: "Alfa Logística",     date: "02 Jul 2026", due: "01 Ago 2026", total: 8340.50,  status: "Pagada",   compliance: "Validada" },
    { id: "FAC-2096", customer: "Grupo Meridiano",    date: "28 Jun 2026", due: "12 Jul 2026", total: 11697.00, status: "Pendiente",compliance: "Validada" },
    { id: "FAC-2095", customer: "Clínica San Rafael", date: "25 Jun 2026", due: "09 Jul 2026", total: 5480.00,  status: "Pendiente",compliance: "En revisión" },
    { id: "FAC-2094", customer: "EducaPlus",          date: "20 Jun 2026", due: "04 Jul 2026", total: 16760.00, status: "Vencida",  compliance: "Validada" },
    { id: "FAC-2093", customer: "Hotel Ventisca",     date: "15 Jun 2026", due: "29 Jun 2026", total: 2745.00,  status: "Vencida",  compliance: "Rechazada" },
    { id: "FAC-2092", customer: "AgroExport CR",      date: "10 Jun 2026", due: "24 Jun 2026", total: 9214.80,  status: "Pagada",   compliance: "Validada" }
  ],

  crm: {
    stages: ["Prospecto", "Calificado", "Propuesta", "Negociación", "Ganado"],
    deals: [
      { id: 1, company: "Banco Delta",      contact: "V. Herrera",  value: 85000, stage: "Prospecto",   score: 42, days: 3 },
      { id: 2, company: "RetailMax",        contact: "P. Quirós",   value: 32000, stage: "Prospecto",   score: 58, days: 7 },
      { id: 3, company: "Seguros Andinos",  contact: "M. Brenes",   value: 47500, stage: "Calificado",  score: 71, days: 12 },
      { id: 4, company: "LogiTrans",        contact: "F. Araya",    value: 21000, stage: "Calificado",  score: 64, days: 5 },
      { id: 5, company: "Grupo Pacífico",   contact: "R. Salas",    value: 118000,stage: "Propuesta",   score: 83, days: 18 },
      { id: 6, company: "EnerSol",          contact: "C. Vindas",   value: 56000, stage: "Propuesta",   score: 77, days: 9 },
      { id: 7, company: "Universidad Ágora",contact: "L. Campos",   value: 94000, stage: "Negociación", score: 88, days: 26 },
      { id: 8, company: "TechNova Group",   contact: "A. Fallas",   value: 145000,stage: "Ganado",      score: 96, days: 31 }
    ],
    customers: [
      { name: "TechNova Group",  industry: "Tecnología", ltv: 412000, since: 2021, health: 94 },
      { name: "Grupo Meridiano", industry: "Retail",     ltv: 238000, since: 2020, health: 81 },
      { name: "Alfa Logística",  industry: "Logística",  ltv: 187500, since: 2022, health: 76 },
      { name: "EducaPlus",       industry: "Educación",  ltv: 96400,  since: 2023, health: 62 }
    ]
  },

  finance: {
    pnl: {
      months: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      income:   [980, 1050, 1120, 990, 1210, 1284],
      expenses: [610, 640, 720, 680, 705, 743]
    },
    balance: [
      { concept: "Activos corrientes",    amount: 2841000 },
      { concept: "Activos fijos",         amount: 1560000 },
      { concept: "Pasivos corrientes",    amount: -984000 },
      { concept: "Pasivos a largo plazo", amount: -1210000 },
      { concept: "Patrimonio neto",       amount: 2207000 }
    ],
    ratios: [
      { label: "Margen bruto",      value: "42.1%", trend: +2.4 },
      { label: "Margen operativo",  value: "27.8%", trend: +1.1 },
      { label: "Liquidez corriente",value: "2.89",  trend: +0.3 },
      { label: "ROE",               value: "24.5%", trend: -0.8 }
    ]
  },

  notifications: [
    { id: 1, icon: "warning",      color: "error",   title: "Stock crítico: Switch 24 Puertos L3", body: "Solo quedan 2 unidades (mínimo: 10). Genera una orden de compra.", time: "Hace 12 min", unread: true, module: "inventario" },
    { id: 2, icon: "receipt_long", color: "warning", title: "Factura FAC-2094 vencida",            body: "EducaPlus tiene un saldo pendiente de $16,760.00 desde el 04 Jul.", time: "Hace 1 h",   unread: true, module: "facturacion" },
    { id: 3, icon: "handshake",    color: "success", title: "Trato ganado: TechNova Group",        body: "Elena Vargas cerró un contrato por $145,000.", time: "Hace 3 h",   unread: true, module: "crm" },
    { id: 4, icon: "flight",       color: "info",    title: "Solicitud de vacaciones",             body: "Elena Vargas solicita 10 días (08–19 Jul). Requiere aprobación.", time: "Ayer",       unread: false, module: "rrhh" },
    { id: 5, icon: "local_shipping",color:"info",    title: "PO-0950 en tránsito",                 body: "FiberTech SA confirmó el envío. ETA: 05 Jul 2026.", time: "Ayer",       unread: false, module: "compras" },
    { id: 6, icon: "backup",       color: "neutral", title: "Copia de seguridad completada",       body: "Backup automático de base de datos finalizado sin errores.", time: "Hace 2 días", unread: false, module: "auditoria" }
  ],

  audit: [
    { ts: "2026-07-04 10:42:18", username: "c.mendoza",  ip: "10.0.4.18",  module: "Compras",     action: "APPROVE",  detail: "Aprobación de orden PO-0951 ($14,820.00)", severity: "info" },
    { ts: "2026-07-04 09:15:02", username: "s.robles",   ip: "10.0.4.22",  module: "Facturación", action: "CREATE",   detail: "Emisión de factura FAC-2098 a TechNova Group", severity: "info" },
    { ts: "2026-07-04 08:03:44", username: "admin",      ip: "10.0.1.2",   module: "Seguridad",   action: "LOGIN",    detail: "Inicio de sesión exitoso (MFA verificado)", severity: "info" },
    { ts: "2026-07-03 17:30:11", username: "r.palma",    ip: "10.0.5.31",  module: "Inventario",  action: "UPDATE",   detail: "Ajuste manual de stock SKU-0882: 25 → 3 unidades", severity: "warning" },
    { ts: "2026-07-03 16:22:57", username: "desconocido",ip: "185.22.9.4", module: "Seguridad",   action: "LOGIN_FAIL",detail: "3 intentos fallidos de acceso para cuenta admin", severity: "critical" },
    { ts: "2026-07-03 14:08:23", username: "l.jimenez",  ip: "10.0.4.40",  module: "RRHH",        action: "UPDATE",   detail: "Modificación de salario empleado #7 (requiere doble firma)", severity: "warning" },
    { ts: "2026-07-03 11:55:40", username: "m.torres",   ip: "10.0.9.7",   module: "Sistema",     action: "CONFIG",   detail: "Rotación de claves API del entorno de producción", severity: "info" },
    { ts: "2026-07-03 02:00:00", username: "system",     ip: "127.0.0.1",  module: "Sistema",     action: "BACKUP",   detail: "Backup diario completado (42.8 GB, 11m 32s)", severity: "info" }
  ]
};

/* ---- helpers de formato ---- */
const fmt = {
  money: (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  moneyShort: (n) => {
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n.toFixed(0);
  },
  int: (n) => n.toLocaleString("en-US"),
  initials: (name) => name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
};
