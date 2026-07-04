# OmniCore ERP — Enterprise Suite

Plataforma ERP SaaS para PYMEs con **base de datos online en Supabase** (Postgres + Auth), usuarios con roles, y diseño basado en el proyecto de Google Stitch *"OmniCore Enterprise ERP Suite"*.

## 🚀 Puesta en marcha (5 minutos)

1. **Crea la base de datos**: entra a [supabase.com](https://supabase.com) → *New project* (plan gratuito).
2. **Ejecuta el esquema**: en el dashboard de Supabase → **SQL Editor** → pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Esto crea las 14 tablas, la seguridad (RLS), el trigger de perfiles y los datos de ejemplo.
3. *(Recomendado)* En **Authentication → Providers → Email**, desactiva *Confirm email* para que el registro entre directo sin verificación por correo.
4. **Sirve la app**:
   ```bash
   python -m http.server 8791
   # → http://localhost:8791
   ```
5. Al abrir la app, pega la **Project URL** y la **anon public key** (Supabase → *Settings → API*) en la pantalla de conexión.
6. **Regístrate**: el **primer usuario registrado se convierte en Administrador automáticamente**. Los siguientes entran como Empleados y el admin les asigna rol en **Usuarios**.

> Sin conexión configurada, la app ofrece un **modo demo local** (localStorage) con admin `admin@omnicore.io` / `admin1234`.

## 👥 Roles y permisos

| Capacidad | Admin | Gerente | Empleado |
|---|:-:|:-:|:-:|
| Dashboard, ventas, inventario, compras, CRM, facturación | ✅ | ✅ | ✅ |
| Crear registros (pedidos, facturas, productos, leads) | ✅ | ✅ | ✅ |
| Ver salarios / RRHH / ejecutar nómina | ✅ | ✅ | ❌ |
| Aprobar solicitudes y órdenes de compra | ✅ | ✅ | ❌ |
| Eliminar registros | ✅ | ❌ | ❌ |
| Gestionar usuarios y roles · Auditoría · Config. de empresa | ✅ | ❌ | ❌ |

## 📦 Qué incluye

- **Auth completa**: registro, login, logout, cambio de contraseña, cuentas desactivables.
- **12 módulos** + **Mi Perfil**, **Configuración** y **Gestión de Usuarios**.
- **CRUD persistente en Supabase**: empleados, productos, pedidos, facturas, órdenes de compra, leads CRM (kanban drag & drop), solicitudes RRHH, notificaciones.
- **Auditoría automática**: cada acción (login, create, update, delete, aprobaciones, nómina, exportaciones) se registra en `audit_log`.
- Búsqueda global (Ctrl+K), notificaciones, panel de widgets, breadcrumbs, modo claro/oscuro, sidebar colapsable.

## 🗂 Estructura

```
index.html            Shell + conexión + auth + config Tailwind
css/styles.css        Design tokens light/dark + componentes + animaciones
js/config.js          Credenciales de Supabase (opcional: la UI también las pide)
js/db.js              Store: auth, roles/permisos, CRUD, auditoría (Supabase/local)
js/data.js            Cache en memoria + datos semilla
js/components.js      Librería UI (tablas, modales, charts, toasts…)
js/views.js           Vistas de los 15 módulos
js/app.js             Arranque, router con guards, shell
supabase/schema.sql   Esquema completo: tablas + RLS + triggers + seeds
```

## 🔐 Notas de seguridad

- La **anon key** es pública por diseño; la protección real la da **RLS** (solo usuarios autenticados acceden a los datos).
- Las políticas actuales son de nivel demo (todo usuario autenticado lee/escribe datos de negocio; los perfiles solo los edita su dueño o un admin). Para producción, endurece las políticas por rol usando `public.is_admin()` como referencia.
- Eliminar un usuario desde la app borra su **perfil**; la cuenta de acceso se elimina en *Supabase → Authentication → Users*.
