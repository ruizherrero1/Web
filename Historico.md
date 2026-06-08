# Histórico

Bitácora del proyecto `ramonruizherrero.com`.

Este archivo debe revisarse antes de modificar la web. Su objetivo es conservar decisiones, despliegues, cambios relevantes, incidencias y próximos pasos para que el proyecto sea fácil de retomar.

## 2026-06-08: Creación de la base inicial

### Contexto

- Dominio previsto: `ramonruizherrero.com`.
- Repositorio GitHub previsto: `ruizherrero1/Web`.
- Objetivo inicial: web personal, portfolio y hub visual de aplicaciones.
- No se implementa backend ni autenticación en esta fase.

### Decisiones

- Usar Next.js con TypeScript, Tailwind CSS y App Router.
- Usar el repositorio como raíz del proyecto para facilitar deploy en Vercel.
- Mantener Supabase como fase futura, no como dependencia inicial.
- Centralizar el catálogo de apps en `src/data/apps.ts`.
- Centralizar enlaces pendientes en `src/lib/constants.ts`.
- Usar placeholders explícitos para LinkedIn, email, CV y URL actual de GymLog.

### Rutas creadas

- `/`
- `/apps`
- `/apps/gym`
- `/apps/recetas`
- `/cv`
- `/contacto`
- `/privado`

### Apps iniciales

- GymLog
- Recetario
- TravelKit
- FinanceLab

### Documentación creada

- `README.md`
- `DEPLOY.md`
- `ROADMAP.md`
- `TODO.md`
- `Historico.md`

### Validación realizada

- `git diff --check` sin errores.
- `package.json` validado como JSON correcto.
- Estructura de rutas, componentes, datos y documentación creada.
- Node.js LTS instalado con `winget` para disponer de `npm`.
- `npm install` ejecutado correctamente tras priorizar `C:\Program Files\nodejs` en `PATH`.
- La red de Node detectó `self-signed certificate in certificate chain`; la instalación se hizo con verificación SSL relajada solo en ese comando.
- `npm run lint` ejecutado sin errores.
- `npm run build` ejecutado sin errores.
- `npm audit --audit-level=moderate` reporta 2 vulnerabilidades moderadas por `postcss <8.5.10` dentro de `next`.
- No se aplica `npm audit fix --force` porque npm propone un cambio agresivo que instalaría `next@9.3.3`.
- Servidor local arrancado en `http://127.0.0.1:3000`.
- Home comprobada por HTTP con estado `200`.
- Remoto local configurado como `https://github.com/ruizherrero1/Web.git`.
- El navegador interno de Codex no pudo abrirse por un problema de sandbox de Windows, así que queda pendiente revisión visual manual.

### Pendiente de este hito

- Revisar visualmente `http://127.0.0.1:3000` en navegador.
- Revisar las 2 vulnerabilidades moderadas reportadas por `npm audit`.
- Subir primer commit.
- Importar en Vercel.
- Configurar dominio en Vercel y DNS en Cloudflare.

## 2026-06-08: Datos reales de contacto, CV y ajuste visual

### Cambio

- Añadido LinkedIn real: `https://es.linkedin.com/in/ramon-ruiz-herrero`.
- Añadidos emails: `ruizherrero1@hotmail.com` y `ruizherrero1@gmail.com`.
- Añadido teléfono: `+34 649 925 463`.
- Copiado CV a `public/cv-ramon-ruiz-herrero.pdf`.
- Incorporado cargo: CEO y Partner de Stratos Consulting.
- Ajustado hero: eliminada la caja derecha y reorganizada la información en vertical.
- Añadido azul oscuro como color principal del diseño.
- Página CV enriquecida con experiencia resumida desde el PDF.

### Validación

- `npm run lint` sin errores.
- `npm run build` sin errores.

## 2026-06-08: Ajuste final antes de subida

### Cambio

- Reordenados los botones del hero: Ver CV, LinkedIn, Ver aplicaciones, Contacto.
- Forzado texto blanco en secciones con fondo azul oscuro.

### Validación

- `npm run lint` sin errores.
- `npm run build` sin errores.

## 2026-06-08: Primer despliegue público y dominio

### Cambio

- Proyecto desplegado en Vercel.
- URL temporal de Vercel: `https://ramonruizherrero-web.vercel.app/`.
- Dominio raíz conectado: `https://ramonruizherrero.com/`.
- DNS gestionado en Cloudflare.
- Registro configurado en Cloudflare:
  - Type: `CNAME`
  - Name: `@`
  - Target: `4a48584edcea627b.vercel-dns-017.com`
  - Proxy status: `DNS only`

### Validación

- `https://ramonruizherrero.com/` responde con estado `200`.
- `http://ramonruizherrero.com/` responde con estado `200`.
- `www.ramonruizherrero.com` todavía no tiene registro DNS configurado.

### Pendiente

- Añadir `www.ramonruizherrero.com` como alias o redirección si se quiere que también funcione con `www`.

## 2026-06-08: Corrección de color en botones

### Cambio

- Corregido el CSS global para que los enlaces con clases propias no hereden el color negro del texto base.
- Los botones con fondo azul oscuro vuelven a respetar `text-white`.

### Validación

- `npm run lint` sin errores.
- `npm run build` sin errores.

## Plantilla para futuros cambios

### Fecha: YYYY-MM-DD

### Cambio

Describe qué se ha cambiado.

### Motivo

Describe por qué se ha cambiado.

### Archivos afectados

- `ruta/al/archivo`

### Validación

- Comandos ejecutados.
- Resultado visual.
- Incidencias.

### Deploy

- Plataforma.
- URL.
- Estado.
- DNS si aplica.
