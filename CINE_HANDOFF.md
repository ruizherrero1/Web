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
- Despues de desplegar el cambio de `search_titles`, ejecutar de nuevo la sincronizacion.

Rotten Tomatoes:

- Hay integracion preparada via RapidAPI, pero la key no esta configurada en Vercel por seguridad.
- Antes de subir la key, pedir aprobacion explicita al propietario.
- En pruebas, RapidAPI devolvio muchos scores `null`; no asumir que cubre todo el catalogo.

## Cambios recientes

### 2026-07-13 - Documentacion viva y mejoras de catalogo

Pendiente de subir en el commit actual:

- Creados `CINE_CONTEXT.md` y `CINE_HANDOFF.md`.
- Titulos principales pasan a ingles, con titulo espanol guardado para busqueda.
- Busqueda normalizada por titulo ingles, titulo espanol, titulo original y generos.
- Filtro de plataformas permite seleccionar varias a la vez.
- Orden por mejor nota, popularidad o fecha reciente.
- Toggle de nota: pulsar la misma nota la borra.
- Toggle de visto: permite marcar y desmarcar visto por mi o por ambos.
- Fix visual de mojibake en metadatos de tarjetas usando separadores ASCII.
- Migracion `20260713_cine_search_titles.sql` para `cine_titles.search_titles`.

### Commits ya subidos

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

- Ejecutar sincronizacion en produccion tras desplegar `search_titles`.
- Confirmar que el boton "Actualizar catalogo" muestra estado de carga completo en movil.
- Validar que borrar notas y desmarcar vistos persiste correctamente.
- Validar multi-filtro de plataformas en movil.

Media prioridad:

- Anadir fuente fiable para IMDb/Rotten Tomatoes si el propietario aporta acceso valido.
- Guardar timestamp `ratings_updated_at` si se refrescan ratings externos.
- Mejorar "Pendientes" con categorias reales, mover entre categorias y quitar rapido.
- Anadir filtros "vistas por RR", "vistas por LB", "pendientes", "sin nota", "sin ver".
- Anadir recomendaciones: mejor nota compartida, diferencias RR/LB, popular con baja duracion.

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

## Procedimiento de deploy

1. Commit a `main`.
2. Push a GitHub.
3. Esperar despliegue Vercel Ready.
4. Probar login privado.
5. Probar catalogo.
6. Ejecutar sincronizacion si cambio importador/schema.
7. Actualizar esta bitacora si aparece cualquier incidencia.
