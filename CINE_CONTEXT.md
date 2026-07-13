# Cine - contexto tecnico vivo

Ultima actualizacion: 2026-07-13

Este fichero es la memoria estable de la app Cine. Debe actualizarse cuando cambie arquitectura, datos, despliegue, seguridad, APIs externas o flujo de usuario. No guardar secretos reales aqui.

## Objetivo

Cine es una PWA privada para Ramon Ruiz Herrero y Laura Badia. Sirve para descubrir peliculas y series incluidas en suscripciones de streaming en Espana, ver posters y valoraciones, marcar pendientes, indicar quien la ha visto y poner notas individuales.

La app vive dentro del repo `ruizherrero1/Web` y se accede desde la web principal. El catalogo y los estados personales se guardan en Supabase.

## Usuarios y privacidad

Usuarios previstos:

- RR: `ruizherrero1@gmail.com`
- LB: `laura.badia.s94@gmail.com`

La app usa una puerta privada con password compartida guardada en Vercel como `CINE_SHARED_PASSWORD`. No debe escribirse la password real en git. Despues del login se guarda una cookie firmada para no pedirla en cada visita.

Cada usuario puede ver las valoraciones y marcas del otro. Los filtros deben permitir buscar por nota de RR, nota de LB, visto por RR, visto por LB o visto por ambos.

## Rutas principales

Frontend:

- `src/app/apps/cine/page.tsx`
- `src/app/apps/cine/_components/CineApp.tsx`
- `src/app/apps/cine/_lib/types.ts`

APIs internas:

- `src/app/api/cine/pass/route.ts`: valida la password compartida y crea cookie.
- `src/app/api/cine/session/route.ts`: devuelve sesion privada.
- `src/app/api/cine/catalog/route.ts`: lee catalogo importado desde Supabase.
- `src/app/api/cine/state/route.ts`: guarda/borra notas y estados por usuario.
- `src/app/api/cine/pending/route.ts`: listas de pendientes.
- `src/app/api/cine/sync/route.ts`: importa/actualiza catalogo desde proveedores externos.
- `src/app/api/cine/_tmdb.ts`: integracion TMDB.
- `src/app/api/cine/_rt.ts`: integracion RapidAPI/Rotten Tomatoes si hay key configurada.

## Datos y Supabase

Proyecto Supabase: `gymlog-web`

Tablas relevantes:

- `cine_profiles`: usuarios RR/LB.
- `cine_titles`: titulo normalizado, poster, genero, tipo, ratings y campos de busqueda.
- `cine_availability`: disponibilidad por proveedor/plataforma.
- `cine_user_title_states`: nota y estado por usuario y titulo.
- `cine_pending_categories`: categorias de pendientes.
- `cine_pending_items`: titulos guardados como pendientes.
- `cine_user_marks`: tabla antigua/compatibilidad.

Migraciones relevantes:

- `supabase/migrations/20260713_cine.sql`
- `supabase/migrations/20260713_cine_user_marks.sql`
- `supabase/migrations/20260713_cine_catalog_sync.sql`
- `supabase/migrations/20260713_cine_rls_helper.sql`
- `supabase/migrations/20260713_cine_api_grants.sql`
- `supabase/migrations/20260713_cine_search_titles.sql`

Notas de seguridad:

- Las politicas RLS usan `private.is_cine_user()` para evitar recursion en `cine_profiles`.
- No abrir tablas de Cine publicamente.
- No meter service-role keys en cliente ni en repo.

## Fuentes externas

TMDB es la fuente principal para catalogo, posters, popularidad, proveedores y nota media. El importador usa `watch_region=ES`, `with_watch_providers` y `with_watch_monetization_types=flatrate` para traer titulos incluidos en suscripcion.

Plataformas objetivo:

- Movistar Plus+
- Netflix
- Prime Video
- HBO Max / Max
- Disney+

Rotten Tomatoes:

- Hay codigo preparado para RapidAPI (`ROTTENTOMATO_RAPIDAPI_KEY`), pero la key no debe subirse a Vercel sin aprobacion explicita del propietario.
- En pruebas, el endpoint RapidAPI devolvio muchos campos de score como `null`; tratarlo como fuente secundaria y cacheada.
- La API oficial de Rotten Tomatoes/Fandango no parece ser self-service publica normal; normalmente requiere aprobacion/licencia.

IMDb:

- TMDB puede enlazar con IDs externos, pero las notas IMDb reales requieren fuente adicional.
- OMDb puede servir como alternativa para ratings externos si se aporta key.

## Variables de entorno

Configuradas en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TMDB_API_KEY`
- `CINE_SHARED_PASSWORD`
- `CINE_COOKIE_SECRET`
- `CINE_TMDB_PAGES_PER_PROVIDER`

Pendientes/opcionales:

- `ROTTENTOMATO_RAPIDAPI_KEY`
- `CINE_RT_SYNC_LIMIT`

No escribir valores reales en este fichero.

## Flujo de sincronizacion

El catalogo no debe pedir TMDB en cada carga de usuario. El flujo correcto es:

1. Usuario autenticado entra en Cine.
2. Pulsa "Actualizar catalogo" cuando quiera refrescar.
3. `/api/cine/sync` consulta TMDB, normaliza titulos y actualiza Supabase.
4. La app lee `/api/cine/catalog`, que responde desde Supabase.

Estado conocido:

- El catalogo llego a importar 1228 titulos en produccion el 2026-07-13.
- Tras la migracion `search_titles`, conviene ejecutar de nuevo "Actualizar catalogo" para rellenar busqueda bilingue.

## UX actual

Estilo pedido: cine premium oscuro, mobile-first.

Funciones principales:

- Login privado.
- Catalogo de peliculas y series.
- Filtros por tipo, plataforma, busqueda, nota minima y orden.
- Poster, nota TMDB, proveedores, genero y ano.
- Notas enteras del 1 al 10 por usuario.
- Toggle de visto por usuario o por ambos.
- Pendientes por categorias.

## Reglas para futuras IAs

- Antes de tocar Cine, leer este fichero y `CINE_HANDOFF.md`.
- Mantener secrets fuera del repo.
- Preferir cambios pequenos y verificables.
- Ejecutar `npm run build` antes de subir cambios que afecten app/API.
- Si se cambia Supabase, anadir migracion en `supabase/migrations`.
- Si se cambia el importador, documentar impacto en este fichero.
- Si se cambia comportamiento visible o flujo, documentarlo en `CINE_HANDOFF.md`.
- No eliminar compatibilidad con RR/LB salvo peticion expresa.
