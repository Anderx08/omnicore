-- ============================================================================
-- OmniCore ERP — PATCH 01: Privacidad del registro de auditoría
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (después de schema.sql y upgrade.sql)
--
-- Antes: cualquier usuario autenticado podía leer TODO el audit_log por la API.
-- Ahora:
--   • Admin    → ve todo el registro
--   • Gerente  → ve solo actividad operativa, sin módulos sensibles
--   • Empleado → ve únicamente SUS PROPIAS acciones
-- ============================================================================

drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_manager() and module not in ('Seguridad','Usuarios','Perfil'))
    or (username = split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
  );

-- El INSERT sigue permitido para todos los autenticados (para poder registrar
-- sus propias acciones); solo se restringió la LECTURA.
-- Listo ✔  Recarga la aplicación.
