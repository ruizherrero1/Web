# Web

Web personal y portal inicial de aplicaciones de Ramón Ruiz Herrero.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Vercel para despliegue
- Supabase como evolución futura para auth, base de datos y almacenamiento

## Estructura

```text
src/
  app/          Rutas públicas y páginas
  components/   Componentes reutilizables
  data/         Catálogo inicial de apps
  lib/          Constantes y enlaces TODO
```

## Rutas

- `/`: home personal y profesional
- `/apps`: catálogo de aplicaciones
- `/apps/gym`: página informativa de GymLog
- `/apps/recetas`: página informativa del Recetario
- `/cv`: CV resumido
- `/contacto`: contacto
- `/privado`: placeholder de acceso privado

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Scripts

- `npm run dev`: servidor local
- `npm run build`: build de producción
- `npm run start`: servidor de producción
- `npm run lint`: revisión de lint

## Enlaces

Los enlaces principales están centralizados en:

```text
src/lib/constants.ts
```

Actualmente incluye:

- LinkedIn
- emails de contacto
- teléfono
- PDF de CV
- URL pendiente de GymLog: `#TODO_URL_GYMLOG_ACTUAL`
