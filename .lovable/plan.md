# Respaldo del código en ZIP

Generar un archivo comprimido con todo el código fuente del proyecto para descargar y consultar offline.

## Qué incluye

- Todo el código fuente: `src/` (rutas, features, servicios, componentes, temas, integraciones), `public/` (íconos, manifest), y archivos de configuración (`package.json`, `vite.config.ts`, `tsconfig.json`, `components.json`).
- Las migraciones y configuración de la base (`supabase/`).
- Documentación del proyecto (`README.md`, `AGENTS.md`).

## Qué se excluye

- `node_modules/`, `dist/`, `.output/` y cachés de build (se regeneran con `npm i` / `npm run build`).
- Historial de git interno.
- Nota: las claves privadas del backend no viajan en el ZIP; se administran del lado del servidor.

## Entrega

El archivo se deja como artefacto descargable en el chat, con nombre `schreiber-instituto-vision-codigo.zip`, y se verifica el listado de contenidos antes de entregarlo.

## Recomendación adicional (opcional, no incluida)

Un ZIP es una foto fija de hoy. Para respaldo continuo conviene conectar GitHub desde Lovable; puedo guiarte cuando quieras.
