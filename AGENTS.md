# AGENTS.md — AgroNexa

## Contexto y fuente de verdad
- AgroNexa es una plataforma académica de Ciencia de Datos para explorar clima y rotaciones de papa y quinua en Puno, Cusco y Arequipa.
- Leer `docs/AGRONEXA_ESPECIFICACION_TECNICA.md` antes de implementar. Si falta, solicitar el archivo; no inventar requisitos.
- Estado inicial: idea, investigación y documentación. No asumir funcionalidades existentes. Inspeccionar el repositorio y `docs/PROGRESS.md`.

## Arquitectura y prioridades
- React + TypeScript + Vite + Tailwind + Leaflet + Recharts; Python + FastAPI + Pandas + NumPy + SQLAlchemy + Alembic; SQLite local, PostgreSQL opcional.
- Primero flujo real NASA POWER, calidad, comparación, exportación y mapa. Luego ficha agrícola y reglas explicables. GPM, SMAP y MODIS después de P0.
- No agregar login, ML, microservicios ni dependencias no justificadas. Documentar desviaciones en `docs/DECISIONS.md`.

## Reglas obligatorias
- No inventar datos científicos, referencias, métricas ni resultados de pruebas. Fixtures sintéticos aislados y etiquetados; nunca servirlos como datos reales.
- Nulos no son ceros. Exponer cobertura, unidades, fuente, periodo, resolución y antigüedad de caché. Precipitación con días faltantes es parcial.
- La evaluación agrícola debe abstenerse cuando no hay evidencia o reglas aprobadas. No presentar predicciones ni recomendaciones definitivas.
- Validar inputs, proteger credenciales y usar `.env.example`. No versionar secretos, caché o bases locales. No exponer trazas internas.
- UI en español, responsive, accesible y con estados de carga, error y ausencia de datos. No añadir cifras decorativas inventadas.

## Flujo de trabajo
1. Leer especificación y progreso; inspeccionar dependencias y cambios existentes.
2. Planificar la fase solicitada y sus criterios de aceptación; hacer cambios acotados.
3. Implementar, probar y revisar; usar tests offline deterministas por defecto. Pruebas reales de NASA separadas y registradas.
4. Ejecutar checks disponibles (`python -m pytest`, `npm run test`, lint y build según scripts reales); no afirmar éxito si no se ejecutaron.
5. Actualizar README, `docs/PROGRESS.md`, decisiones y evidencias. Informar archivos cambiados, comandos, resultados, bloqueos y próximos pasos.

Al iniciar un repositorio vacío, ejecutar fases 0 y 1 primero. No avanzar a P1 si P0 no está estable. Respetar trabajo existente: no revertir cambios ajenos ni sobrescribir archivos sin revisar. Mantener pasos de instalación Windows y Linux/macOS.
