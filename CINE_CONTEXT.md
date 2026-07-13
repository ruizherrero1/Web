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

- `src/app/api/cine/pass/route.ts`: valida la password compartida y crea cookie. `GET` indica si la cookie es valida.
- `src/app/api/cine/catalog/route.ts`: lee catalogo importado desde Supabase (incluye notas multi-fuente y runtime).
- `src/app/api/cine/state/route.ts`: guarda/borra notas y estados por usuario.
- `src/app/api/cine/pending/route.ts`: listas de pendientes.
- `src/app/api/cine/sync/route.ts`: importa/actualiza catalogo desde TMDB y enriquece notas via OMDb.
- `src/app/api/cine/_tmdb.ts`: integracion TMDB (discover + generos).
- `src/app/api/cine/_omdb.ts`: enriquecimiento de notas via OMDb (IMDb, Rotten Tomatoes, Metacritic y runtime).

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
- `supabase/migrations/20260713_cine_rating_sources.sql` (imdb_id, runtime_minutes, metascore, ratings_updated_at)

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

OMDb (fuente de notas externas, activa):

- Una sola llamada a OMDb devuelve nota IMDb, votos IMDb, Rotten Tomatoes (criticos), Metacritic y runtime real.
- Requiere `OMDB_API_KEY` en Vercel. Free tier ~1000 req/dia.
- `sync` enriquece por lotes (`CINE_OMDB_SYNC_LIMIT`, 40 por defecto) ordenando por `ratings_updated_at` (los mas obsoletos primero) para cubrir el catalogo en varias sincronizaciones sin agotar la cuota.
- Cada titulo enriquecido guarda `imdb_id` para futuras consultas estables por id.
- Sustituye a la antigua integracion RapidAPI/Rotten Tomatoes, que devolvia muchos `null` y se ha eliminado (`_ratings.ts`).

Notas:

- `cine_titles.tmdb_vote` (nota media TMDB) sigue siendo la nota base siempre presente.
- `rt_popcornmeter` (audiencia RT) no lo aporta OMDb; queda sin fuente por ahora.
- OMDb queda configurado en Vercel Production como `OMDB_API_KEY` para enriquecer ratings externos.

## Variables de entorno

Configuradas en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TMDB_API_KEY` (o `TMDB_ACCESS_TOKEN`; el codigo prefiere el token bearer si existe)
- `CINE_SHARED_PASSWORD`
- `CINE_COOKIE_SECRET` (importante: sin este, la cookie se deriva de la propia password)
- `CINE_TMDB_PAGES_PER_PROVIDER`
- `OMDB_API_KEY`
- `CINE_OMDB_SYNC_LIMIT`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Notas externas (OMDb):

- `OMDB_API_KEY` (necesaria para poblar IMDb/RT/Metacritic/runtime)
- `CINE_OMDB_SYNC_LIMIT` (opcional, titulos enriquecidos por sync; 40 por defecto, max 200)

Cron y sync automatico:

- `CRON_SECRET` (Vercel lo envia como `Authorization: Bearer` a las rutas cron; protege `/api/cine/cron/sync`).
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; el cron no tiene sesion de usuario y usa cliente service-role que salta RLS). NUNCA exponer en cliente ni `NEXT_PUBLIC_*`.

No escribir valores reales en este fichero.

## Flujo de sincronizacion

El catalogo no debe pedir TMDB en cada carga de usuario. El flujo correcto es:

1. Usuario autenticado entra en Cine.
2. Pulsa "Actualizar catalogo" cuando quiera refrescar.
3. `/api/cine/sync` consulta TMDB, normaliza titulos y actualiza Supabase.
4. La app lee `/api/cine/catalog`, que responde desde Supabase.

Estado conocido:

- El catalogo importo 1228 titulos en produccion el 2026-07-13.
- Tras la migracion `search_titles`, la sincronizacion final dejo `searchTitles` poblado en los 1228 titulos.

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
- El subdominio `cine.ramonruizherrero.com` no resolvia DNS el 2026-07-13; usar `https://www.ramonruizherrero.com/apps/cine` mientras no se configure dominio.
- No eliminar compatibilidad con RR/LB salvo peticion expresa.
