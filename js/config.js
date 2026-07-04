/* ==========================================================================
   OmniCore ERP — Configuración de backend
   Para conectar la base de datos online (Supabase):
     1. Crea un proyecto gratis en https://supabase.com
     2. Ejecuta supabase/schema.sql en el SQL Editor del proyecto
     3. Pega aquí la URL y la anon key (Settings → API),
        o configúralas desde la app en Configuración → Base de datos.
   Si se dejan vacías, la app funciona en modo local (localStorage).
   ========================================================================== */

window.OMNICORE_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
