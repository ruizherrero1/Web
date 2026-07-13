# Cine - handoff y bitacora para agentes

Ultima actualizacion: 2026-07-13

Este fichero es para Codex y otras IAs que trabajen a la vez en Cine. Mantiene el estado operativo, decisiones recientes, pendientes y una checklist para evitar regresiones. No guardar secretos reales aqui.

## Como trabajar sin romper

1. Leer `CINE_CONTEXT.md`.
2. Revisar `git status --short` y no revertir cambios ajenos.
3. Si se toca frontend/API, ejecutar `npm run build`.
4. Si se toca Supabase, crear migracion y aplicarla antes de depender de ella.
5. Si se toca catalogo, probar login, catalogo y sincronizacion.
6. Actualizar este fichero con cambios hechos, pruebas y pendientes.
7. Subir a `main` solo cuando build y estado basico esten correctos.

## Estado actual

Produccion:

- La app Cine esta desplegada en Vercel dentro del proyecto web principal.
- La password privada se valida con `CINE_SHARED_PASSWORD` y cookie firmada.
- Supabase ya tiene usuarios RR/LB, catalogo y estados personales.
- La app lee el catalogo importado desde Supabase, no desde TMDB en cada visita.

Catalogo:

- Importacion previa: 1228 titulos en produccion el 2026-07-13.
- Se anadio campo `search_titles` para buscar en ingles y espanol.
- La sincronizacion final del 2026-07-13 dejo 1228/1228 titulos con `searchTitles` poblado.

Notas externas (OMDb):

- Fuente activa para IMDb, Rotten Tomatoes (criticos), Metacritic y runtime real.
- Requiere `OMDB_API_KEY` en Vercel. Se enriquece por lotes en cada sync (los mas obsoletos primero).
- Con ~1228 titulos y free tier ~1000/dia, el catalogo tarda varios syncs en cubrirse. Los titulos sin datos muestran "-".
- La antigua integracion RapidAPI/Rotten Tomatoes se ha eliminado (devolvia demasiados `null`).

## Cambios recientes

### 2026-07-13 - Deuda menor: limpieza + consenso + offline writes

Rama `cine/pwa` (mismo stack; ultimo commit).

- Eliminado `rt_popcornmeter` del tipo, del catalog y de los datos demo (OMDb no lo aporta; la columna DB queda huerfana, se puede dropear cuando se quiera).
- Recomendador "Hoy": ahora combina el blend de notas (60%) con **consenso por afinidad de genero RR/LB** (40%). Para "los dos" usa el minimo de las afinidades previstas (favorece que guste a ambos).
- PWA fase 2: **cola de escrituras offline** (`_lib/offline.ts`). Nota/visto/pendiente sin conexion se encolan en localStorage y se reproducen al reconectar (`flushQueue` en `CineApp`). El badge muestra "N por sincronizar" / "Sincronizando".

### 2026-07-13 - PWA real con service worker

Rama `cine/pwa` (apilada sobre `cine/today-recommender`).

- `public/cine-sw.js`: cachea app shell + `_next/static` (SWR), posters/backdrops de `image.tmdb.org` (cache-first, offline) y la ultima respuesta de `/api/cine/catalog` (network-first, lectura offline).
- `src/app/cine.webmanifest/route.ts` (manifest propio, scope `/apps/cine`), `apps/cine/apple-icon.tsx` (icono claqueta) y `apps/cine/layout.tsx` (enlaza manifest + `appleWebApp`, registra el SW via `CineServiceWorker`).
- `globals.css`: en `display-mode: standalone` oculta cabecera/pie del sitio para las paginas de Cine (patron travelkit/mundial).
- Alcance: instalable + offline de solo lectura. Las escrituras (nota/visto/pendiente) siguen requiriendo conexion; background-sync queda como fase 2.

### 2026-07-13 - Recomendador "Que vemos hoy"

Rama `cine/today-recommender` (apilada sobre `cine/title-detail`).

- Nueva pestana "Hoy" (nav pasa a 5 columnas) con heuristica 100% en cliente: filtra por no-vista (para los dos o solo el usuario activo), plataforma disponible, genero y tiempo disponible (usa runtime real). Puntua con blend de todas las notas (IMDb/TMDB/RT/Metacritic) y muestra 5 sugerencias.
- Boton "Otra ruleta" (jitter determinista por seed) para rebarajar entre las buenas candidatas.
- Sin backend nuevo. Evolucion futura: consenso por afinidad de genero RR/LB.

### 2026-07-13 - Ficha de detalle por titulo

Rama `cine/title-detail` (apilada sobre `cine/cron-sync`).

- Nueva `GET /api/cine/title/[tmdbId]?type=movie|series` que llama a TMDB (`append_to_response=credits,videos,watch/providers`) y cachea 24h. Devuelve reparto, direccion/creadores, trailer de YouTube, runtime, generos, proveedores flatrate ES y enlace JustWatch.
- Frontend: bottom-sheet `TitleDetailSheet` con backdrop, sinopsis, trailer, reparto (scroll horizontal), proveedores y los controles de nota/visto/pendiente. Se abre desde "Ver ficha completa" en el Hero y el icono info de cada tarjeta.
- Datos compartidos (no por-usuario) => cacheados; no golpea TMDB en cada apertura.

### 2026-07-13 - Sync reutilizable + Vercel Cron

Rama `cine/cron-sync` (apilada sobre `cine/perf-catalog`).

- Logica de sync extraida a `src/app/api/cine/_sync.ts` (`runCatalogSync`, `runRatingsSync`). La ruta `POST /api/cine/sync` queda fina y con `maxDuration = 60`.
- Nueva ruta `GET /api/cine/cron/sync` protegida por `CRON_SECRET`, usa cliente service-role (`getSupabaseServiceClient`) porque el cron no tiene sesion de usuario. `?mode=ratings` hace solo enriquecimiento OMDb.
- `vercel.json`: cron semanal (lunes 5:00, sync completo) y diario (5:00, solo ratings). El boton manual sigue igual.
- Env nuevas: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
- Nota Hobby: Vercel Hobby limita crons a ~1/dia y 2 jobs; esta config (semanal + diario) encaja. Si se quiere mas frecuencia, hace falta Pro.

### 2026-07-13 - Rendimiento: catalog deja de leer marcas legacy

Rama `cine/perf-catalog` (apilada sobre `cine/fix-ratings-bugs`).

- `/api/cine/catalog` ya no lee `cine_user_marks` en cada carga (una query menos de tabla completa + join). El `sync` sigue migrando esas marcas a `cine_user_title_states` via `migrateLegacyMarks`, que es la unica fuente que lee el catalogo.
- Riesgo controlado: una marca legacy de un titulo aun no importado no aparece hasta el siguiente sync (se autocorrige). No hay perdida de datos.

### 2026-07-13 - Notas multi-fuente (OMDb), runtime real y filtros

Rama `cine/fix-ratings-bugs` (pendiente de merge). Requiere aplicar migracion y anadir `OMDB_API_KEY` en Vercel.

- Bug: `sync` definia el enriquecimiento de Rotten Tomatoes pero nunca lo llamaba. Ahora `sync` llama a `enrichRatingsFromOmdb` y devuelve `ratings: { attempted, updated, skipped }`.
- Bug: el filtro "IMDb minimo" filtraba en realidad por nota TMDB (imdb_rating nunca se poblaba). Ahora hay notas reales por fuente.
- Bug: la UI optimista de notas/vistos no revertia si la API fallaba. `persistState` recarga el catalogo y avisa si falla.
- OMDb aporta en una sola llamada: nota IMDb, votos IMDb, Rotten Tomatoes (criticos), Metacritic y runtime real. Se elimina la integracion RapidAPI (`_ratings.ts`).
- Nueva migracion `20260713_cine_rating_sources.sql`: `imdb_id`, `runtime_minutes`, `metascore`, `ratings_updated_at`.
- `catalog` expone `tmdbRating` (separado de `imdbRating`), `metascore`, `runtimeMinutes`, `imdbId`, `ratingsUpdatedAt`.
- Frontend: RatingStrip muestra TMDB / IMDb / RT / Metacritic. Filtro por fuente de nota + nota minima normalizada. Nuevos filtros de estado: sin ver juntos, vistas RR, vistas LB, sin nota mia, en pendientes. Runtime real en metadatos.
- Env nuevas: `OMDB_API_KEY`, `CINE_OMDB_SYNC_LIMIT`. Retiradas: `ROTTENTOMATO_RAPIDAPI_KEY`, `CINE_RT_SYNC_LIMIT`.
- Verificado en local: `npm run lint` (0 errores), `npm run build` OK. Falta probar en produccion con la migracion aplicada y `OMDB_API_KEY` puesta.

### 2026-07-13 - Documentacion viva y mejoras de catalogo

Subido a `main`:

- Creados `CINE_CONTEXT.md` y `CINE_HANDOFF.md`.
- Titulos principales pasan a ingles, con titulo espanol guardado para busqueda.
- Busqueda normalizada por titulo ingles, titulo espanol, titulo original y generos.
- Filtro de plataformas permite seleccionar varias a la vez.
- Orden por mejor nota, popularidad o fecha reciente.
- Toggle de nota: pulsar la misma nota la borra.
- Toggle de visto: permite marcar y desmarcar visto por mi o por ambos.
- Fix visual de mojibake en metadatos de tarjetas usando separadores ASCII.
- `catalog` expone `searchTitles` y sanea textos con posible mojibake antes de responder.
- Migracion `20260713_cine_search_titles.sql` para `cine_titles.search_titles`.

### Commits ya subidos

- `596cba4 Fix Cine catalog aliases`
- `03d57e1 Improve Cine catalog filters and handoff docs`
- `8ea29dc Add Rotten Tomatoes rating sync`
- `91fb66e Fix Cine Supabase access`
- `60234e4 Add Cine catalog sync`
- `dd339d7 Simplify Cine private login`
- `97b4ada Add remembered Cine password gate`
- `4974b61 Add Cine TMDB attribution`
- `18b1572 Connect Cine to Supabase and TMDB`
- `496cec2 Show Cine watched state feedback`

## Checklist antes de finalizar cambios

- `git status --short` revisado.
- `npm run build` ejecutado si se toca codigo.
- Migraciones aplicadas si se toca schema.
- Login probado con usuario permitido.
- `/api/cine/catalog` responde datos de Supabase.
- Boton "Actualizar catalogo" probado o, si no se prueba, dejar nota clara.
- No hay secretos reales en archivos tracked.
- `CINE_CONTEXT.md` y este fichero actualizados.

## Pendientes funcionales

Alta prioridad:

- Confirmar que el boton "Actualizar catalogo" muestra estado de carga completo en movil.
- Validar que borrar notas y desmarcar vistos persiste correctamente.
- Validar multi-filtro de plataformas en movil.

Media prioridad:

- [HECHO 2026-07-13] Fuente fiable de IMDb/RT/Metacritic via OMDb.
- [HECHO 2026-07-13] Timestamp `ratings_updated_at` al refrescar ratings externos.
- [HECHO 2026-07-13] Filtros "vistas por RR", "vistas por LB", "pendientes", "sin nota mia", "sin ver juntos" y filtro por fuente de nota.
- Mejorar "Pendientes" con mover entre categorias y quitar rapido desde la vista de pendientes.
- Anadir recomendaciones: mejor nota compartida, diferencias RR/LB, popular con baja duracion (ya hay runtime real para esto).
- Cron semanal de sync (Vercel Cron) manteniendo el boton manual, y trocear el sync para no arriesgar timeout.

Ideas futuras:

- Cron semanal de sincronizacion, manteniendo boton manual.
- Pagina de detalle por titulo.
- Historial de cambios de notas.
- Modo "que vemos hoy" con duracion, genero, plataforma y consenso RR/LB.
- Export/import de estados personales.

## Fuentes recomendadas

Catalogo y popularidad:

- TMDB Discover es la fuente principal para filtros por proveedores, region, popularidad y nota.
- Para "mas populares", usar `sort_by=popularity.desc` o endpoints populares de TMDB.

Ratings externos:

- Rotten Tomatoes oficial requiere aprobacion/licencia; no asumir acceso libre.
- RapidAPI puede ser util si devuelve datos, pero debe tratarse como cache parcial.
- OMDb puede aportar ratings externos con key propia, pero hay que validar cobertura.

## Incidencias conocidas

- `cine.ramonruizherrero.com` no resolvia DNS el 2026-07-13. La ruta sana es `https://www.ramonruizherrero.com/apps/cine`.
- `vercel env pull` puede descargar variables sensibles como cadenas vacias; no usarlo como prueba de que faltan en runtime.

## Procedimiento de deploy

1. Commit a `main`.
2. Push a GitHub.
3. Esperar despliegue Vercel Ready.
4. Probar login privado.
5. Probar catalogo.
6. Ejecutar sincronizacion si cambio importador/schema.
7. Actualizar esta bitacora si aparece cualquier incidencia.
