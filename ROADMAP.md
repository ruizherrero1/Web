# Roadmap

## Fase 1: Web personal y catálogo de apps

- Home profesional.
- Catálogo visual de aplicaciones.
- Páginas informativas de GymLog y Recetario.
- CV resumido.
- Contacto.
- Placeholder de acceso privado.
- Documentación inicial.

## Fase 2: Mejoras visuales y CV

- Añadir enlaces reales de LinkedIn, email y CV.
- Preparar assets visuales propios.
- Refinar copy profesional.
- Añadir Open Graph image.

## Fase 3: Login con Supabase

- Supabase Auth.
- Login por email.
- Usuarios invitados.
- Roles `admin`, `user` y `guest`.
- Row Level Security en todas las tablas con datos de usuario.

## Fase 4: GymLog multiusuario

- Rutinas por usuario.
- Sesiones de entrenamiento.
- Historial.
- Progreso.
- Plantillas compartibles.
- Exportar/importar datos.

## Fase 5: Recetario multiusuario

- Crear, editar y eliminar recetas.
- Importar JSON.
- Etiquetas.
- Favoritos.
- Búsqueda.
- Modo cocina.
- Lista de compra.
- Recetas públicas y privadas.

## Fase 6: Panel admin

- Gestión de usuarios.
- Gestión de accesos por app.
- Métricas básicas.
- Auditoría de cambios relevantes.

## Modelo futuro Supabase

```sql
profiles
- id uuid primary key
- email text
- full_name text
- role text
- created_at timestamp

app_access
- id uuid primary key
- user_id uuid
- app_slug text
- can_access boolean
- created_at timestamp

recipes
- id uuid primary key
- user_id uuid
- title text
- description text
- ingredients jsonb
- steps jsonb
- tags text[]
- is_public boolean
- created_at timestamp
- updated_at timestamp

workout_routines
- id uuid primary key
- user_id uuid
- name text
- description text
- exercises jsonb
- is_template boolean
- created_at timestamp
- updated_at timestamp

workout_sessions
- id uuid primary key
- user_id uuid
- routine_id uuid
- started_at timestamp
- ended_at timestamp
- exercises jsonb
- notes text
```
