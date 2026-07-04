-- ============================================================================
-- OmniCore ERP — Esquema completo para Supabase
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- Incluye: tablas, seguridad (RLS), trigger de perfiles (primer usuario = admin)
-- y datos iniciales de demostración.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERFILES DE USUARIO (vinculados a Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuario',
  email text not null,
  role text not null default 'empleado' check (role in ('admin','gerente','empleado')),
  active boolean not null default true,
  phone text not null default '',
  created_at timestamptz not null default now()
);

-- El PRIMER usuario que se registra se convierte en ADMIN automáticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'empleado' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Función auxiliar para políticas (evita recursión en RLS de profiles)
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- 2. TABLAS DE NEGOCIO
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id int primary key,
  name text not null,
  email text not null default '',
  dept text not null default '',
  "role" text not null default '',
  status text not null default 'Activo',
  salary numeric not null default 0,
  hired text not null default '',
  location text not null default '',
  phone text not null default '',
  performance int not null default 75
);

create table if not exists public.products (
  sku text primary key,
  name text not null,
  category text not null default '',
  stock int not null default 0,
  "min" int not null default 0,
  "max" int not null default 0,
  price numeric not null default 0,
  warehouse text not null default '',
  supplier text not null default '',
  img text not null default 'inventory_2'
);

create table if not exists public.warehouses (
  name text primary key,
  location text not null default '',
  items int not null default 0,
  capacity int not null default 0,
  manager text not null default ''
);

create table if not exists public.suppliers (
  name text primary key,
  category text not null default '',
  rating numeric not null default 4.0,
  orders int not null default 0,
  "onTime" int not null default 90
);

create table if not exists public.purchases (
  id text primary key,
  supplier text not null,
  items int not null default 1,
  total numeric not null default 0,
  status text not null default 'Pendiente',
  date text not null default '',
  eta text not null default '—'
);

create table if not exists public.orders (
  id text primary key,
  customer text not null,
  items int not null default 1,
  total numeric not null default 0,
  status text not null default 'Procesando',
  date text not null default '',
  channel text not null default 'Directo'
);

create table if not exists public.invoices (
  id text primary key,
  customer text not null,
  date text not null default '',
  due text not null default '',
  total numeric not null default 0,
  status text not null default 'Emitida',
  compliance text not null default 'En revisión'
);

create table if not exists public.deals (
  id int primary key,
  company text not null,
  contact text not null default '',
  value numeric not null default 0,
  stage text not null default 'Prospecto',
  score int not null default 50,
  days int not null default 0
);

create table if not exists public.crm_customers (
  name text primary key,
  industry text not null default '',
  ltv numeric not null default 0,
  since int not null default 2024,
  health int not null default 75
);

create table if not exists public.hr_requests (
  id int primary key,
  emp text not null,
  type text not null default '',
  range text not null default '',
  days int not null default 0,
  status text not null default 'Pendiente'
);

create table if not exists public.notifications (
  id int primary key,
  icon text not null default 'info',
  color text not null default 'info',
  title text not null,
  body text not null default '',
  "time" text not null default '',
  unread boolean not null default true,
  module text not null default 'dashboard'
);

create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  ts text not null,
  username text not null default 'system',
  ip text not null default '—',
  module text not null default 'Sistema',
  action text not null default 'INFO',
  detail text not null default '',
  severity text not null default 'info'
);

create table if not exists public.settings (
  id text primary key default 'app',
  company jsonb not null default '{}'::jsonb,
  prefs jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 3. SEGURIDAD (Row Level Security)
--    Usuarios autenticados: acceso a datos de negocio.
--    Perfiles: cada quien edita el suyo; solo admin edita/borra otros.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated using (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['employees','products','warehouses','suppliers','purchases',
                           'orders','invoices','deals','crm_customers','hr_requests',
                           'notifications','audit_log','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_all" on public.%I', t, t);
    execute format('create policy "%s_all" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. DATOS INICIALES (seed)
-- ---------------------------------------------------------------------------
insert into public.employees (id, name, email, dept, "role", status, salary, hired, location, phone, performance) values
  (1,  'Carlos Mendoza',  'c.mendoza@omnicore.io',  'Finanzas',    'Director Financiero',  'Activo',     98000, '2019-03-12', 'San José',   '+506 8812-4471', 92),
  (2,  'Sofía Robles',    's.robles@omnicore.io',   'Ventas',      'Gerente de Ventas',    'Activo',     76000, '2020-07-01', 'San José',   '+506 8845-1120', 88),
  (3,  'Ricardo Palma',   'r.palma@omnicore.io',    'Operaciones', 'Jefe de Almacén',      'Activo',     54000, '2018-01-15', 'Heredia',    '+506 8722-9034', 79),
  (4,  'Elena Vargas',    'e.vargas@omnicore.io',   'Ventas',      'Ejecutiva CRM',        'Vacaciones', 48000, '2021-04-20', 'Alajuela',   '+506 8656-7781', 95),
  (5,  'Miguel Torres',   'm.torres@omnicore.io',   'TI',          'DevOps Engineer',      'Activo',     82000, '2020-11-09', 'Remoto',     '+506 8590-3327', 91),
  (6,  'Laura Jiménez',   'l.jimenez@omnicore.io',  'RRHH',        'HR Business Partner',  'Activo',     61000, '2019-09-30', 'San José',   '+506 8433-6650', 86),
  (7,  'Andrés Solano',   'a.solano@omnicore.io',   'TI',          'Full Stack Developer', 'Licencia',   72000, '2022-02-14', 'Remoto',     '+506 8318-2245', 84),
  (8,  'Patricia Núñez',  'p.nunez@omnicore.io',    'Finanzas',    'Contadora Senior',     'Activo',     58000, '2017-06-05', 'Cartago',    '+506 8290-1108', 90),
  (9,  'Jorge Castro',    'j.castro@omnicore.io',   'Operaciones', 'Analista Logístico',   'Activo',     46000, '2023-01-23', 'Heredia',    '+506 8177-5593', 74),
  (10, 'María Fernández', 'm.fernandez@omnicore.io','Marketing',   'Growth Manager',       'Activo',     67000, '2021-10-11', 'San José',   '+506 8064-8812', 89),
  (11, 'Daniel Rojas',    'd.rojas@omnicore.io',    'Ventas',      'Account Executive',    'Activo',     52000, '2022-08-08', 'Guanacaste', '+506 8951-2237', 81),
  (12, 'Gabriela Mora',   'g.mora@omnicore.io',     'Marketing',   'Diseñadora UX',        'Vacaciones', 55000, '2023-05-02', 'Remoto',     '+506 8846-6674', 93)
on conflict (id) do nothing;

insert into public.products (sku, name, category, stock, "min", "max", price, warehouse, supplier, img) values
  ('SKU-1024', 'Switch 24 Puertos L3',      'Redes',       2,  10, 60,  489.00,  'Central A', 'NetSupply Corp',  'lan'),
  ('SKU-0882', 'Cable Fibra Óptica 10m',    'Cableado',    3,  25, 200, 24.50,   'Central A', 'FiberTech SA',    'cable'),
  ('SKU-0455', 'Conectores RJ45 Cat6',      'Cableado',    12, 50, 500, 0.85,    'Norte B',   'FiberTech SA',    'settings_input_hdmi'),
  ('SKU-2201', 'Router Empresarial AX6000', 'Redes',       45, 15, 80,  329.99,  'Central A', 'NetSupply Corp',  'router'),
  ('SKU-3310', 'Servidor Rack 2U Xeon',     'Servidores',  8,  4,  20,  3899.00, 'Central A', 'DataCore Ltd.',   'dns'),
  ('SKU-4102', 'Monitor 27" 4K IPS',        'Periféricos', 67, 20, 120, 419.00,  'Norte B',   'ViewMax Inc.',    'desktop_windows'),
  ('SKU-5580', 'UPS 1500VA Online',         'Energía',     23, 10, 50,  549.00,  'Sur C',     'PowerSafe Group', 'battery_charging_full'),
  ('SKU-6021', 'Laptop Pro 16" 32GB',       'Equipos',     31, 12, 60,  2199.00, 'Central A', 'DataCore Ltd.',   'laptop_mac')
on conflict (sku) do nothing;

insert into public.warehouses (name, location, items, capacity, manager) values
  ('Central A', 'San José', 5240, 82, 'Ricardo Palma'),
  ('Norte B',   'Heredia',  3180, 64, 'Jorge Castro'),
  ('Sur C',     'Cartago',  1420, 37, 'Ana Céspedes')
on conflict (name) do nothing;

insert into public.suppliers (name, category, rating, orders, "onTime") values
  ('NetSupply Corp',  'Redes',      4.8, 142, 97),
  ('FiberTech SA',    'Cableado',   4.5, 98,  92),
  ('DataCore Ltd.',   'Servidores', 4.9, 61,  99),
  ('PowerSafe Group', 'Energía',    4.2, 45,  88),
  ('ViewMax Inc.',    'Periféricos',4.4, 52,  93)
on conflict (name) do nothing;

insert into public.purchases (id, supplier, items, total, status, date, eta) values
  ('PO-0951', 'NetSupply Corp',  12, 14820.00, 'Aprobada',    '02 Jul 2026', '10 Jul 2026'),
  ('PO-0950', 'FiberTech SA',    30, 4275.50,  'En tránsito', '28 Jun 2026', '05 Jul 2026'),
  ('PO-0949', 'DataCore Ltd.',   4,  15596.00, 'Recibida',    '21 Jun 2026', '30 Jun 2026'),
  ('PO-0948', 'PowerSafe Group', 8,  4392.00,  'Pendiente',   '20 Jun 2026', '—'),
  ('PO-0947', 'ViewMax Inc.',    25, 10475.00, 'Recibida',    '12 Jun 2026', '22 Jun 2026'),
  ('PO-0946', 'NetSupply Corp',  6,  2939.94,  'Cancelada',   '08 Jun 2026', '—')
on conflict (id) do nothing;

insert into public.orders (id, customer, items, total, status, date, channel) values
  ('SO-2201', 'TechNova Group',     8,  24890.00, 'Completada', '03 Jul 2026', 'Directo'),
  ('SO-2200', 'Alfa Logística',     15, 8340.50,  'Enviada',    '02 Jul 2026', 'E-commerce'),
  ('SO-2199', 'Grupo Meridiano',    3,  11697.00, 'Procesando', '02 Jul 2026', 'Directo'),
  ('SO-2198', 'Clínica San Rafael', 22, 5480.00,  'Completada', '01 Jul 2026', 'Partner'),
  ('SO-2197', 'EducaPlus',          40, 16760.00, 'Enviada',    '30 Jun 2026', 'E-commerce'),
  ('SO-2196', 'Hotel Ventisca',     5,  2745.00,  'Cancelada',  '29 Jun 2026', 'Directo'),
  ('SO-2195', 'AgroExport CR',      12, 9214.80,  'Completada', '28 Jun 2026', 'Partner')
on conflict (id) do nothing;

insert into public.invoices (id, customer, date, due, total, status, compliance) values
  ('FAC-2098', 'TechNova Group',     '03 Jul 2026', '02 Ago 2026', 24890.00, 'Emitida',   'Validada'),
  ('FAC-2097', 'Alfa Logística',     '02 Jul 2026', '01 Ago 2026', 8340.50,  'Pagada',    'Validada'),
  ('FAC-2096', 'Grupo Meridiano',    '28 Jun 2026', '12 Jul 2026', 11697.00, 'Pendiente', 'Validada'),
  ('FAC-2095', 'Clínica San Rafael', '25 Jun 2026', '09 Jul 2026', 5480.00,  'Pendiente', 'En revisión'),
  ('FAC-2094', 'EducaPlus',          '20 Jun 2026', '04 Jul 2026', 16760.00, 'Vencida',   'Validada'),
  ('FAC-2093', 'Hotel Ventisca',     '15 Jun 2026', '29 Jun 2026', 2745.00,  'Vencida',   'Rechazada'),
  ('FAC-2092', 'AgroExport CR',      '10 Jun 2026', '24 Jun 2026', 9214.80,  'Pagada',    'Validada')
on conflict (id) do nothing;

insert into public.deals (id, company, contact, value, stage, score, days) values
  (1, 'Banco Delta',       'V. Herrera', 85000,  'Prospecto',   42, 3),
  (2, 'RetailMax',         'P. Quirós',  32000,  'Prospecto',   58, 7),
  (3, 'Seguros Andinos',   'M. Brenes',  47500,  'Calificado',  71, 12),
  (4, 'LogiTrans',         'F. Araya',   21000,  'Calificado',  64, 5),
  (5, 'Grupo Pacífico',    'R. Salas',   118000, 'Propuesta',   83, 18),
  (6, 'EnerSol',           'C. Vindas',  56000,  'Propuesta',   77, 9),
  (7, 'Universidad Ágora', 'L. Campos',  94000,  'Negociación', 88, 26),
  (8, 'TechNova Group',    'A. Fallas',  145000, 'Ganado',      96, 31)
on conflict (id) do nothing;

insert into public.crm_customers (name, industry, ltv, since, health) values
  ('TechNova Group',  'Tecnología', 412000, 2021, 94),
  ('Grupo Meridiano', 'Retail',     238000, 2020, 81),
  ('Alfa Logística',  'Logística',  187500, 2022, 76),
  ('EducaPlus',       'Educación',  96400,  2023, 62)
on conflict (name) do nothing;

insert into public.hr_requests (id, emp, type, range, days, status) values
  (1, 'Elena Vargas',  'Vacaciones',      '08 – 19 Jul', 10, 'Pendiente'),
  (2, 'Miguel Torres', 'Teletrabajo',     'Permanente',  0,  'Aprobado'),
  (3, 'Jorge Castro',  'Licencia médica', '01 – 03 Jul', 3,  'Aprobado'),
  (4, 'Daniel Rojas',  'Vacaciones',      '22 – 26 Jul', 5,  'Pendiente'),
  (5, 'Laura Jiménez', 'Día personal',    '15 Jul',      1,  'Rechazado')
on conflict (id) do nothing;

insert into public.notifications (id, icon, color, title, body, "time", unread, module) values
  (1, 'warning',        'error',   'Stock crítico: Switch 24 Puertos L3', 'Solo quedan 2 unidades (mínimo: 10). Genera una orden de compra.',        'Hace 12 min',  true,  'inventario'),
  (2, 'receipt_long',   'warning', 'Factura FAC-2094 vencida',            'EducaPlus tiene un saldo pendiente de $16,760.00 desde el 04 Jul.',       'Hace 1 h',     true,  'facturacion'),
  (3, 'handshake',      'success', 'Trato ganado: TechNova Group',        'Se cerró un contrato por $145,000.',                                      'Hace 3 h',     true,  'crm'),
  (4, 'flight',         'info',    'Solicitud de vacaciones',             'Elena Vargas solicita 10 días (08–19 Jul). Requiere aprobación.',         'Ayer',         false, 'rrhh'),
  (5, 'local_shipping', 'info',    'PO-0950 en tránsito',                 'FiberTech SA confirmó el envío. ETA: 05 Jul 2026.',                       'Ayer',         false, 'compras'),
  (6, 'backup',         'neutral', 'Copia de seguridad completada',       'Backup automático de base de datos finalizado sin errores.',              'Hace 2 días',  false, 'auditoria')
on conflict (id) do nothing;

insert into public.audit_log (ts, username, ip, module, action, detail, severity) values
  ('2026-07-04 10:42:18', 'c.mendoza',   '10.0.4.18',  'Compras',     'APPROVE',    'Aprobación de orden PO-0951 ($14,820.00)',                        'info'),
  ('2026-07-04 09:15:02', 's.robles',    '10.0.4.22',  'Facturación', 'CREATE',     'Emisión de factura FAC-2098 a TechNova Group',                    'info'),
  ('2026-07-03 17:30:11', 'r.palma',     '10.0.5.31',  'Inventario',  'UPDATE',     'Ajuste manual de stock SKU-0882: 25 → 3 unidades',                'warning'),
  ('2026-07-03 16:22:57', 'desconocido', '185.22.9.4', 'Seguridad',   'LOGIN_FAIL', '3 intentos fallidos de acceso para cuenta admin',                 'critical'),
  ('2026-07-03 14:08:23', 'l.jimenez',   '10.0.4.40',  'RRHH',        'UPDATE',     'Modificación de salario empleado #7 (requiere doble firma)',      'warning'),
  ('2026-07-03 11:55:40', 'm.torres',    '10.0.9.7',   'Sistema',     'CONFIG',     'Rotación de claves API del entorno de producción',                'info'),
  ('2026-07-03 02:00:00', 'system',      '127.0.0.1',  'Sistema',     'BACKUP',     'Backup diario completado (42.8 GB, 11m 32s)',                     'info');

insert into public.settings (id, company, prefs) values
  ('app',
   '{"name":"OmniCore Systems S.A.","taxId":"3-101-887342","currency":"USD","address":"San José, Costa Rica","fiscalYear":"Enero"}'::jsonb,
   '{"emailNotifs":true,"stockAlerts":true,"weeklyReport":true,"mfa":false}'::jsonb)
on conflict (id) do nothing;

-- Listo ✔  Ahora en la app: Configura la URL + anon key y registra tu usuario.
-- El primer usuario registrado será ADMINISTRADOR automáticamente.
