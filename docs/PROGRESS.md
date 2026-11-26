# Avance de AgroNexa

**Última actualización:** 23 de noviembre de 2026 (America/Lima).

El directorio inicial contenía `AGENTS.md` y la especificación técnica. Se inicializó Git y se construyó la base local a partir de esos documentos.

| Fase | Estado | Entrega |
| --- | --- | --- |
| 0 | Completada | Monorepo, configuración reproducible, FastAPI y OpenAPI, migración Alembic, catálogo con fuentes oficiales y frontend React en español. |
| 1 | Implementación inicial verificada | Consulta diaria de NASA POWER, calendario inclusivo, normalización, cobertura, transacciones, caché por intervalo, precarga y evidencia real. |
| 2 | Completada | Indicadores por mes, año y periodo, comparación por pares, cobertura por variable, contratos OpenAPI y TypeScript y contraste independiente con datos reales. |
| 3 | Completada | Pantallas de exploración, comparación y metodología, gráficos y tablas accesibles, mapa interactivo y exportación CSV de la instantánea consultada. |
| 4 | Completada | Ficha agrícola anónima, catálogo versionado de papa y quinua y motor de evaluación con abstención explicable. |
| 5 | Completada | Instalación reproducible, precarga real, contraste independiente y ensayo integral de la demo con evidencias. |
| 6 | Completada | Diagnóstico de Ilave incorporado en el catálogo bibliográfico v2, ficha de lote, clima histórico de campaña y demo con abstención. |

## Verificación registrada

Windows, Python 3.11.18, Node.js 24.12.0 y npm 11.6.0.

| Comando | Resultado |
| --- | --- |
| `python -m pytest` | 12 pruebas offline aprobadas y 1 prueba en vivo omitida por defecto. |
| `AGRONEXA_LIVE=1` y `python -m pytest -m live` | 1 prueba en vivo aprobada. Ilave 2024, HTTP 200 y calendario de 366 días. |
| `python -m ruff check app tests migrations` y `python -m ruff format --check app tests migrations` | Verificaciones aprobadas. |
| `python -m alembic upgrade head`, `python -m app.seed.locations` dos veces y `python -m alembic check` | Base SQLite limpia migrada, 3 localidades en ambas cargas y esquema sin operaciones adicionales. |
| `python -m app.seed.preload --location puno-ilave --output ../docs/evidence` | CSV y manifiesto reales. 366 días válidos por variable. |
| `npm ci`, `npm run test`, `npm run lint` y `npm run build` | Instalación reproducible, 2 pruebas aprobadas, lint y compilación aprobados. |
| `npm audit fix --package-lock-only` | Lockfile actualizado. npm informó cero vulnerabilidades en el lockfile final. |
| Arranque local con Uvicorn y Vite desde SQLite limpia | Health OK, 3 localidades vía proxy y consulta Ilave 2024 vía API con HTTP 200 de NASA y 366 días. Primera respuesta `fresh` y segunda `cached` con el mismo SHA-256 de origen. |

La suite usa SQLite temporal y respuestas sintéticas aisladas. El aislamiento de Windows impidió la conexión de loopback que utiliza el bucle de eventos de Python. La suite offline se completó con acceso a loopback habilitado. El intento directo a NASA dentro del aislamiento de red falló por DNS. La prueba y la precarga reales funcionaron con acceso de red autorizado. Ver [evidencia y comprobación independiente](EVIDENCE.md).

## Verificación de fase 2

Windows, Python 3.11.18 y Node.js 24.12.0. Las pruebas nuevas cubren T05–T07 y los contratos de los dos endpoints, incluidas coberturas desiguales, lluvia parcial, rechazo de parámetros inválidos y periodos que cruzan un año.

| Comando | Resultado |
| --- | --- |
| `python -m pytest` | 18 pruebas offline aprobadas y 1 prueba en vivo omitida por defecto. |
| `AGRONEXA_LIVE=1` y `python -m pytest -m live` | 1 prueba en vivo aprobada. |
| `python -m app.seed.preload --start 2024-01-01 --end 2024-12-31 --output ../docs/evidence/phase2` | HTTP 200 y 366 días válidos por variable en cada una de las tres localidades. |
| `python ../scripts/verify_phase2.py` contra Uvicorn local | 252 indicadores y 18 diferencias verificados por HTTP contra el cálculo desde los CSV. |
| Medición HTTP local con caché caliente | p95 de 172,9 ms para el resumen mensual y 153,5 ms para la comparación de tres localidades. Condiciones en [evidencia](EVIDENCE.md#indicadores-y-comparación-de-fase-2). |
| `python -m ruff check`, `python -m ruff format --check` y `python -m alembic check` | Lint, formato y esquema aprobados. |
| `npm run test`, `npm run lint` y `npm run build` | 2 pruebas aprobadas, lint y compilación aprobados. |

## Verificación de fase 3

Windows, Python 3.11.18 y Node.js 24.12.0. Se probaron T12 y T13 con datos de prueba aislados y el tramo climático de T15 con series reales.

| Comando | Resultado |
| --- | --- |
| `python -m pytest` | 26 pruebas offline aprobadas y 1 prueba en vivo omitida por defecto. |
| `AGRONEXA_LIVE=1` y `python -m pytest -m live` | 1 prueba en vivo aprobada. |
| `python -m ruff check`, `python -m ruff format --check` y `python -m alembic check` | Lint, formato y esquema aprobados. |
| `npm run test`, `npm run lint` y `npm run build` | 6 pruebas aprobadas, lint y compilación aprobados. |
| `npm audit` | El registro no reportó vulnerabilidades en el lockfile instalado. |
| `npm run test:browser` | Flujo en Edge a 360, 768 y 1440 px, CSV con el mismo SHA-256 de la precarga y selección funcional con las teselas bloqueadas. [Resultados y capturas](EVIDENCE.md#flujo-web-de-fase-3). |

## Verificación de fase 4

Windows, Python 3.11.18, Node.js 24.12.0 y Edge. El catálogo inicial contiene dos cultivos y cero reglas aprobadas. La demostración de producción devuelve evidencia insuficiente. Los casos de puntuación, empate, cobertura y restricciones usan exclusivamente reglas sintéticas TEST en bases temporales.

| Comando | Resultado |
| --- | --- |
| `python -m pytest` | 44 pruebas offline aprobadas y 1 prueba en vivo omitida por defecto. Los casos nuevos cubren T10–T11 y la validación de la ficha. |
| `AGRONEXA_LIVE=1` y `python -m pytest -m live` | 1 prueba en vivo aprobada. |
| `python -m alembic upgrade head` y `python -m alembic check` | Migración 0002 aplicada a las bases locales de trabajo y verificación. Esquema comprobado. |
| `python -m ruff check` y `python -m ruff format --check` | Lint y formato aprobados. |
| `npm run test`, `npm run lint` y `npm run build` | 8 pruebas aprobadas, lint y compilación aprobados. |
| `npm run test:rotations-browser` | Ficha y abstención verificadas a 360, 768 y 1440 px. El flujo de escritorio conserva localidad y periodo desde la exploración con NASA POWER en caché vigente. [Resultados y capturas](EVIDENCE.md#ficha-y-abstención-de-fase-4). |

## Verificación de fase 5

22 de noviembre de 2026, hora de Perú. Windows, Python 3.11.18, Node.js 24.12.0, npm 11.6.0 y Edge 158.0.4370.33.

| Comando | Resultado |
| --- | --- |
| `python -m pytest` y prueba separada `python -m pytest -m live` con `AGRONEXA_LIVE=1` | 44 pruebas offline y 1 prueba en vivo aprobadas. |
| `python -m ruff check` y `python -m ruff format --check` | Lint y formato aprobados. |
| `python -m alembic upgrade head`, `python -m app.seed.locations` y `python -m alembic check` | Base dedicada creada desde cero, revisión 0002 y esquema comprobado. |
| `python -m app.seed.preload --start 2024-01-01 --end 2024-12-31` | Tres respuestas HTTP 200. 366 días válidos por variable y localidad, y 4392 observaciones guardadas. |
| `npm ci`, `npm run test`, `npm run lint` y `npm run build` | Instalación limpia desde el lockfile, 8 pruebas aprobadas, lint y compilación aprobados. |
| `python ../scripts/verify_phase2.py` con los CSV de fase 5 | 252 indicadores y 18 diferencias verificados en 42 grupos. |
| `npm run test:demo` | Recorrido completo aprobado a 360, 768 y 1440 px con la salida de la API a NASA bloqueada. CSV idéntico al de la precarga. Abstención verificada. |

Windows bloqueó el primer `npm ci` en el directorio de trabajo por un binario en uso. La instalación limpia y los controles se completaron en una copia aislada con el mismo hash del lockfile. `npm install --no-save` restableció el árbol de dependencias del directorio habitual y `npm ls --depth=0` comprobó sus dependencias directas.

[Guía de demostración](DEMO.md) · [Datos, resultados y capturas](EVIDENCE.md#ensayo-integral-de-fase-5)

## Pendientes de alcance

- Validar el dialecto PostgreSQL en una instancia real si se elige ese entorno. Los pasos de Linux y macOS están documentados y las verificaciones de este ciclo se ejecutaron en Windows.
- La incorporación de reglas reales requiere la revisión documentada de cada criterio por el equipo o asesor. [Fuentes y proceso](AGRONOMIC_SOURCES.md).

## Borrador agronómico de Ilave

Se documentaron seis criterios preliminares para papa → quinua a partir de fuentes primarias del INIA, con Illpa INIA como referencia. Las observaciones históricas y los rangos descriptivos se separaron de los predicados pendientes de revisión. [Borrador y guía para el asesor](AGRONOMIC_SOURCES.md#borrador-para-revisión-de-papa--quinua-en-ilave).

El cotejo de los tres PDF adjuntos confirmó el antecedente local del cultivar y corrigió la ubicación impresa de la figura 11 del manual de papa. El manual de Cusco quedó referenciado como contexto complementario de rotación, textura y drenaje para revisión. [Páginas cotejadas](AGRONOMIC_SOURCES.md#cotejo-de-los-documentos-adjuntos).

## Fase 6

La ficha de Ilave implementa el contraste preliminar de papa → quinua mediante siete tarjetas con valor de entrada, referencia, estado, explicación, limitaciones, datos pendientes y fuente versionada. La ficha distingue cultivar confirmado, pH medido con fecha, textura franco-arenosa, drenaje y humedad de establecimiento. El motor de rotaciones conserva la abstención con el catálogo inicial. [Referencias y alcance](AGRONOMIC_SOURCES.md#referencias-versionadas-de-fase-6).

Verificación del 22 de noviembre de 2026 en Windows, con Python 3.11.18 y Edge 158.0.4370.33.

| Comprobación | Resultado |
| --- | --- |
| `python -m pytest -m "not live"` | 71 pruebas aprobadas, incluidas 27 nuevas de evaluación preliminar. |
| `AGRONEXA_LIVE=1`, `python -m pytest -m live` | Una consulta de prueba aprobada en vivo para Ilave 2024, en una base temporal. |
| `python -m alembic upgrade head` y `python -m alembic check` | Revisión 0003 aplicada y esquema comprobado. La huella de las tablas climáticas de cada base local coincide antes y después de la migración. |
| `python -m ruff check` y `python -m ruff format --check` | Lint y formato aprobados. |
| `npm run test`, `npm run lint`, `npm run build` | Nueve pruebas aprobadas, lint y compilación de producción aprobados. |
| `npm run test:demo` | Recorrido con caché real de fase 5 a 360, 768 y 1440 px, con CSV reproducible, fuentes consultables y abstención. |

Pendientes para el asesor. Confirmar el cultivar y el protocolo de pH, documentar el historial de la parcela, validar indicadores locales de drenaje y humedad, y precisar las definiciones de los intervalos climáticos. El catálogo de reglas conserva cero aprobaciones en las bases locales verificadas. [Guía del ensayo](DEMO.md) y [evidencia de fase 6](EVIDENCE.md#evaluación-preliminar-de-fase-6).

### Incorporación del diagnóstico de Ilave

El 23 de noviembre se incorporaron los seis criterios del diagnóstico a `illpa-inia-ilave-v2`. La versión clasifica R-01 a R-03 como candidatas en borrador, R-04 como no evaluable y R-05 a R-06 como referencias documentales. El drenaje se presenta como observación independiente. La ficha admite historial, fechas y métodos, inundación y contexto del lote. El panel de campaña usa el resumen histórico ya implementado.

| Comprobación | Antes | Después |
| --- | --- | --- |
| `python -m pytest -m "not live"` | 71 aprobadas | 87 aprobadas |
| `npm run test`, `npm run lint`, `npm run build` | 9 aprobadas, lint y compilación aprobados | 10 aprobadas, lint y compilación aprobados |
| `python -m ruff check` y `python -m ruff format --check` | — | Lint y formato aprobados |
| Prueba en vivo de NASA POWER | — | 1 aprobada |
| `python -m alembic upgrade head` y `python -m alembic check` | Revisión 0003 | Revisión 0004 en las dos bases locales. Huellas de las tablas climáticas y de reglas sin diferencias. |
| `npm run test:demo` | — | Edge a 360, 768 y 1440 px con precarga real, abstención y contraste de tres indicadores contra CSV. |

La revisión agronómica sigue pendiente para protocolo y representatividad del muestreo, drenaje, humedad, residuos y definiciones de los rangos climáticos. La aplicación conserva cero reglas aprobadas en las bases verificadas. [Cotejo de criterios](AGRONOMIC_SOURCES.md#contraste-del-diagnóstico-incorporado) y [evidencia del ensayo](EVIDENCE.md#diagnóstico-de-ilave-y-consulta-de-campaña).

La ficha básica es común para Ilave, Chivay y Urubamba. El bloque **Consultar referencias del INIA** se abre de forma opcional para papa → quinua en Ilave y tiene su propio botón de contraste. Las 12 pruebas de frontend, el lint y la compilación pasaron tras el ajuste. La demo en Edge verificó la ficha básica y el contraste opcional a 360, 768 y 1440 px.

## Rediseño del frontend

Se renovaron el layout, Inicio, Explorar, Comparar, Rotaciones y Metodología. La navegación incluye una barra de escritorio colapsable y un menú móvil operable por teclado. Inicio muestra el catálogo real y el último periodo completado en la pestaña. La exploración suma una tabla diaria paginada y la comparación muestra resúmenes y gráficos antes de la tabla general. Rotaciones agrega una revisión editable y un cuarto paso para resultados, con las referencias de Ilave bajo el bloque opcional.

| Área | Archivos principales |
| --- | --- |
| Navegación, diseño y componentes | `frontend/src/app/App.tsx`, `AppShell.tsx`, `ui.tsx`, `frontend/src/styles/index.css`, `dashboard.css`, `frontend/src/main.tsx` y `frontend/index.html`. |
| Pantallas | `frontend/src/pages/Home.tsx`, `Explore.tsx`, `Compare.tsx`, `Rotations.tsx` y `Methodology.tsx`. |
| Clima y ficha | `frontend/src/features/climate/Charts.tsx`, `LocationMap.tsx`, `ResultDetails.tsx`, `filters.tsx`, `frontend/src/features/rotation/Preliminary.tsx` y `CampaignClimate.tsx`. |
| Recursos y verificación | `frontend/public/assets/`, las tres pruebas de interfaz y `frontend/scripts/verify-phase3.mjs`. |

La evaluación agronómica conserva los resultados de la API, incluida la abstención por falta de reglas aprobadas. La descarga CSV cubre el periodo completo. [Capturas y pruebas reproducibles](EVIDENCE.md#rediseño-del-frontend).

La suite conservó las 12 pruebas aprobadas de la línea base. El lint y la compilación de producción de la versión final pasaron. `npm run test:demo` verificó en Edge los anchos de 360, 768, 1024, 1440 y 1920 px, el ajuste del mapa al colapsar la barra y el selector cuando se bloquea el mapa base.

## Simulación de rotaciones

La vista `/rotaciones?modo=demo` permite mostrar la comparación con posiciones y el incumplimiento de un criterio crítico. Los casos se generan con el mismo motor a partir de reglas TEST en memoria. La evaluación de campo sigue usando el catálogo de reglas aprobadas. [Recorrido](DEMO.md#simulación-del-motor-de-rotaciones) · [Verificaciones](EVIDENCE.md#simulación-de-rotaciones).

Verificación del 26 de noviembre de 2026. Pasaron 88 pruebas offline de backend, 13 de frontend y la compilación de producción. Edge comprobó ambos escenarios a 360 y 1440 px.

## Correcciones del mapa y de la ficha de parcela

El mapa encuadra Ilave, Chivay y Urubamba al abrirse. Se puede acercar a la localidad seleccionada y recuperar la vista general. Las cuatro capas se eligen con un selector nativo y muestran los créditos de los proveedores activos. La ficha valida el orden de las fechas en la interfaz y en la API, y muestra en resultados el contexto declarado en esa evaluación, incluida la abstención.

El 26 de noviembre de 2026 pasaron 92 pruebas offline de backend, 14 de frontend, Ruff, ESLint y la compilación de producción. La demo de Edge pasó a 360 px con emulación táctil y a 768, 1024, 1440 y 1920 px con la caché real de NASA POWER. [Evidencia del ensayo](EVIDENCE.md#correcciones-del-mapa-y-de-la-ficha-de-parcela).

## Asistente de planificación de siembra

- La migración `0005` amplía `crops` con perfiles documentales y agrega cebada y haba. Conserva las fichas anteriores y las tablas de clima y reglas.
- La ficha móvil pregunta por terreno, campañas, anterior, próxima siembra, agua y suelo. Conserva las respuestas al retroceder, admite fechas por mes y ofrece una revisión editable. Las mediciones y observaciones ampliadas son opcionales.
- Los resultados presentan notas de la matriz regional v0.3, precisan los datos que faltan y consultan el resumen histórico de NASA POWER. Las reglas aprobadas y el contraste Illpa INIA siguen disponibles en sus propios ámbitos.
- Inicio prioriza el acceso al asistente y a Explorar. En Comparar las tarjetas principales aparecen antes de los ajustes, con fuentes e indicadores ampliados desplegables.

La revisión `0005` ya se aplicó a la base SQLite local. Pasaron 107 pruebas offline de backend, 14 de frontend y la demo de Edge en cinco anchos. Se verificó la descarga de la evaluación en JSON y la simulación TEST a 360 px. [Evidencia](EVIDENCE.md#asistente-de-planificación-de-siembra).

[Guía de demostración](DEMO.md) · [Fuentes regionales](AGRONOMIC_SOURCES.md#matriz-regional-v03-para-el-asistente).
