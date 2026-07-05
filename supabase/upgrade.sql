-- ============================================================================
-- OmniCore ERP — UPGRADE v2
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (después de haber ejecutado schema.sql)
--
-- Incluye:
--   1. Seguridad RLS endurecida por rol (a nivel de base de datos)
--   2. Triggers de notificaciones automáticas (stock bajo, tratos ganados)
--   3. Buckets de Storage para avatares e imágenes de productos
--   4. Tablas nuevas: projects y tasks (módulo Proyectos)
--   5. Columnas nuevas: profiles.avatar_url, products.image_url
--   6. Realtime: publica los cambios de las tablas para sync en vivo
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Funciones auxiliares de rol
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active); $$;

create or replace function public.is_manager()
returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','gerente') and active); $$;

-- ---------------------------------------------------------------------------
-- 1. Columnas y tablas nuevas
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.products add column if not exists image_url text not null default '';

create table if not exists public.projects (
  id int primary key,
  name text not null,
  status text not null default 'Activo',
  due text not null default '',
  owner text not null default ''
);

create table if not exists public.tasks (
  id int primary key,
  project_id int not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'Por hacer' check (status in ('Por hacer','En curso','Hecho')),
  assignee text not null default '',
  priority text not null default 'Media' check (priority in ('Alta','Media','Baja')),
  due text not null default ''
);

insert into public.projects (id, name, status, due, owner) values
  (1, 'Migración a la nube', 'Activo', '30 Ago 2026', 'Miguel Torres'),
  (2, 'Apertura almacén Sur',  'Activo', '15 Sep 2026', 'Ricardo Palma')
on conflict (id) do nothing;

insert into public.tasks (id, project_id, title, status, assignee, priority, due) values
  (1, 1, 'Auditoría de servidores actuales',   'Hecho',     'Miguel Torres',  'Alta',  '10 Jul'),
  (2, 1, 'Plan de migración de datos',          'En curso',  'Andrés Solano',  'Alta',  '25 Jul'),
  (3, 1, 'Pruebas de failover',                 'Por hacer', 'Miguel Torres',  'Media', '10 Ago'),
  (4, 2, 'Contrato de arrendamiento',           'Hecho',     'Carlos Mendoza', 'Alta',  '05 Jul'),
  (5, 2, 'Compra de estanterías industriales',  'En curso',  'Ricardo Palma',  'Media', '01 Ago'),
  (6, 2, 'Contratación de personal de bodega',  'Por hacer', 'Laura Jiménez',  'Media', '20 Ago')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. RLS ENDURECIDA POR ROL
--    Lectura: autenticados · Crear: autenticados · Editar: según módulo
--    Eliminar: solo admin · Auditoría: inmutable · Settings: solo admin edita
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- Tablas operativas: leer/crear/editar autenticados, borrar solo admin
  foreach t in array array['products','purchases','orders','invoices','deals',
                           'crm_customers','notifications','projects','tasks']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_all" on public.%I', t, t);
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s_insert" on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy "%s_update" on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy "%s_delete" on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;

  -- Tablas de RRHH: editar/crear solo gerencia (empleados solo leen)
  foreach t in array array['employees','hr_requests','warehouses','suppliers']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_all" on public.%I', t, t);
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s_insert" on public.%I for insert to authenticated with check (public.is_manager() or %L = ''hr_requests'')', t, t, t);
    execute format('create policy "%s_update" on public.%I for update to authenticated using (public.is_manager()) with check (public.is_manager())', t, t);
    execute format('create policy "%s_delete" on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;
end $$;

-- Auditoría: solo insertar y leer; nadie edita ni borra (inmutable)
alter table public.audit_log enable row level security;
drop policy if exists "audit_log_all" on public.audit_log;
drop policy if exists "audit_log_select" on public.audit_log;
drop policy if exists "audit_log_insert" on public.audit_log;
create policy "audit_log_select" on public.audit_log for select to authenticated using (true);
create policy "audit_log_insert" on public.audit_log for insert to authenticated with check (true);

-- Settings: leer todos, editar solo admin
drop policy if exists "settings_all" on public.settings;
drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_insert" on public.settings;
create policy "settings_select" on public.settings for select to authenticated using (true);
create policy "settings_insert" on public.settings for insert to authenticated with check (public.is_admin());
create policy "settings_update" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. TRIGGERS DE NOTIFICACIONES AUTOMÁTICAS
-- ---------------------------------------------------------------------------
create or replace function public.notify_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock <= new."min" and (old.stock is null or old.stock > old."min") then
    insert into public.notifications (id, icon, color, title, body, "time", unread, module)
    values (
      (select coalesce(max(id),0)+1 from public.notifications),
      'warning', 'error',
      'Stock crítico: ' || new.name,
      'Quedan ' || new.stock || ' unidades (mínimo: ' || new."min" || '). Genera una orden de compra.',
      to_char(now(), 'DD Mon HH24:MI'), true, 'inventario'
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_low_stock on public.products;
create trigger trg_low_stock after update of stock on public.products
  for each row execute function public.notify_low_stock();

create or replace function public.notify_deal_won()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage = 'Ganado' and old.stage is distinct from 'Ganado' then
    insert into public.notifications (id, icon, color, title, body, "time", unread, module)
    values (
      (select coalesce(max(id),0)+1 from public.notifications),
      'handshake', 'success',
      'Trato ganado: ' || new.company,
      'Se cerró un contrato por $' || to_char(new.value, 'FM999,999,999') || '.',
      to_char(now(), 'DD Mon HH24:MI'), true, 'crm'
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_deal_won on public.deals;
create trigger trg_deal_won after update of stage on public.deals
  for each row execute function public.notify_deal_won();

-- ---------------------------------------------------------------------------
-- 4. STORAGE: buckets públicos para avatares e imágenes de productos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "storage_read_public" on storage.objects;
create policy "storage_read_public" on storage.objects
  for select using (bucket_id in ('avatars','product-images'));

drop policy if exists "storage_upload_auth" on storage.objects;
create policy "storage_upload_auth" on storage.objects
  for insert to authenticated with check (bucket_id in ('avatars','product-images'));

drop policy if exists "storage_update_auth" on storage.objects;
create policy "storage_update_auth" on storage.objects
  for update to authenticated using (bucket_id in ('avatars','product-images'));

-- ---------------------------------------------------------------------------
-- 5. REALTIME: publicar cambios de las tablas (sync en vivo entre usuarios)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['employees','products','warehouses','suppliers','purchases',
                           'orders','invoices','deals','crm_customers','hr_requests',
                           'notifications','audit_log','settings','projects','tasks','profiles']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Listo ✔  Recarga la aplicación para ver los módulos nuevos y el sync en vivo.
