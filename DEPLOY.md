# Deploy

Guía para desplegar la web en Vercel y conectarla con `ramonruizherrero.com`.

## Vercel

1. Conectar el repositorio `ruizherrero1/Web` con Vercel.
2. Crear un proyecto nuevo en Vercel importando el repo.
3. Confirmar que Vercel detecta Next.js.
4. Mantener el directorio raíz como raíz del proyecto.
5. Ejecutar el primer deploy.

## Dominio

1. Ir a `Settings > Domains` dentro del proyecto de Vercel.
2. Añadir `ramonruizherrero.com`.
3. Añadir `www.ramonruizherrero.com`.
4. Copiar los registros DNS indicados por Vercel.
5. Crear o actualizar esos registros en Cloudflare.
6. Esperar propagación DNS.
7. Validar que Vercel emite el certificado SSL.
8. Revisar que `ramonruizherrero.com` y `www.ramonruizherrero.com` resuelven correctamente.

## Cloudflare

- No guardar credenciales en el repo.
- Mantener los registros DNS documentados en `Historico.md` cuando se haga el despliegue real.
- Si Vercel recomienda modo DNS only para algún registro, documentarlo antes de cambiarlo.

## Checklist antes de deploy

- `npm run build` sin errores.
- Enlaces TODO revisados.
- No hay datos sensibles en el código.
- `README.md`, `ROADMAP.md`, `TODO.md` e `Historico.md` actualizados.
