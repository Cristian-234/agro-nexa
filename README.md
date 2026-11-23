# AgroNexa

AgroNexa es una plataforma académica de Ciencia de Datos para consultar el clima histórico de Ilave (Puno), Urubamba (Cusco) y Chivay (Arequipa). Incluye un catálogo web y una API de series diarias de NASA POWER, indicadores agregados y comparaciones entre localidades. Consulta la [especificación técnica](docs/AGRONEXA_ESPECIFICACION_TECNICA.md) y el [estado de las fases](docs/PROGRESS.md).

La [guía de demostración](docs/DEMO.md) reúne la preparación de una base dedicada, el recorrido completo y las verificaciones de la evaluación preliminar de Ilave.

La interfaz reúne en Inicio las localidades del catálogo y el último periodo consultado en la pestaña. En **Explorar clima** puedes paginar la tabla diaria y descargar el CSV completo. **Comparar localidades** conserva un color por localidad. **Rotaciones agrícolas** presenta una ficha de cuatro pasos con revisión editable y un bloque opcional del INIA para Ilave. El estado del encabezado proviene de la consulta al catálogo de AgroNexa.

## Arranque en Windows

Requisitos de ejecución: Python **3.11** con el lanzador `py`, Node.js **22 LTS** desde 22.12 o **24 LTS**, y npm. Ejecuta la instalación desde la raíz del proyecto en PowerShell. Conserva tu `.env` si ya existe.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Set-Location backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed.locations
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

En el directorio donde se verificó la entrega ya está preparado `backend/.venv311` con Python 3.11.18. Puedes iniciar el backend desde `backend` con `.\.venv311\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`.

En una segunda terminal, desde la raíz:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Abre [AgroNexa](http://localhost:5173), [la documentación OpenAPI](http://localhost:8000/docs) o [el estado de la API](http://localhost:8000/health). El proxy de Vite conecta `/api/v1` a `127.0.0.1:8000`. Para otro origen, configura `VITE_API_BASE_URL` y agrega el origen del frontend a `CORS_ORIGINS`. La base SQLite se crea en `backend/agronexa.sqlite3`. Puedes repetir la migración y la carga del catálogo.

### Flujo web

1. En [Explorar](http://localhost:5173/explorar), elige una localidad desde el selector o el mapa. Selecciona **Usar año 2024** y **Consultar clima** para reproducir el periodo de la evidencia.
2. Revisa las tarjetas de cobertura y abre las tablas de apoyo a los gráficos. Usa **Descargar CSV** para guardar la serie visible con la fecha de descarga y los indicadores de calidad por dato.
3. Desde **Comparar localidad**, agrega las otras localidades y ejecuta la comparación con el mismo periodo. La tabla muestra cobertura y diferencias por pares. Los gráficos muestran temperatura media mensual y acumulados mensuales completos. La tabla mensual conserva acumulados parciales.

Si faltan teselas, la selección por nombre y coordenadas sigue disponible. La [metodología](http://localhost:5173/metodologia) explica la procedencia, la resolución y los límites.

### Ficha agrícola y rotaciones

Aplica la migración con `python -m alembic upgrade head`. Abre [Rotaciones](http://localhost:5173/rotaciones) o usa **Abrir ficha agrícola** desde un resultado de exploración para conservar la localidad y el periodo. Elige el cultivo anterior y los candidatos, y registra el contexto de riego y suelo. El pH es opcional y corresponde a una medición.

El catálogo inicial permite evaluar la ficha y devuelve **evidencia insuficiente** por cada alternativa, con la explicación de qué reglas faltan. La sección de resultados identifica las fuentes y los criterios cuando existe una versión aprobada. Consulta las [fuentes agronómicas y el proceso de incorporación](docs/AGRONOMIC_SOURCES.md).

Consulta Ilave para 2024 con la API local:

```powershell
$uri = 'http://127.0.0.1:8000/api/v1/climate/series?location_id=puno-ilave&start=2024-01-01&end=2024-12-31'
$result = Invoke-RestMethod $uri
$result.source | Select-Object provider, fetched_at, cache_status, cache_age_seconds
$result.quality
$result.series[0]
```

La primera consulta requiere acceso saliente HTTPS a NASA POWER. Para precargar las tres localidades en la base local y generar CSV y manifiesto en `data/cache/`, ejecuta desde `backend`:

```powershell
.\.venv\Scripts\python.exe -m app.seed.preload --start 2024-01-01 --end 2024-12-31
```

Agrega `--location puno-ilave` para una localidad o repite `--location` para varias. En una instalación limpia la caché se llena con la consulta a NASA o con la precarga. La [evidencia de ejecución](docs/EVIDENCE.md) incluye datos de Ilave, Urubamba y Chivay para 2024.

### Indicadores y comparación en PowerShell

```powershell
$api = 'http://127.0.0.1:8000/api/v1/climate'
$periodo = 'start=2024-01-01&end=2024-12-31'
$resumen = Invoke-RestMethod "${api}/summary?location_id=puno-ilave&group_by=month&${periodo}"
$resumen.groups[0].indicators
$comparacion = Invoke-RestMethod "${api}/compare?location_ids=puno-ilave&location_ids=cusco-urubamba&location_ids=arequipa-chivay&${periodo}"
$comparacion.comparisons[0].differences
```

El resumen admite `group_by=month|year|period` y usa `period` por defecto. La comparación recibe dos o tres IDs distintos como parámetros repetidos y calcula cada par en orden A−B. Cada localidad incluye el resumen del intervalo y la procedencia de su serie. Consulta la [metodología y los estados](docs/DATA_DICTIONARY.md#indicadores-y-comparación).

## Arranque en Linux o macOS

Desde la raíz, en una terminal:

```sh
test -e .env || cp .env.example .env
cd backend
python3.11 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.seed.locations
python -m uvicorn app.main:app --reload --port 8000
```

Desde la raíz, en otra terminal:

```sh
cd frontend
npm ci
npm run dev
```

Para probar PostgreSQL local, instala `psycopg[binary]==3.2.12` en el entorno virtual, configura `DATABASE_URL` con el esquema `postgresql+psycopg://` y las credenciales de una base dedicada, y ejecuta la migración y la carga del catálogo. La verificación de este ciclo se hizo con SQLite.

## Pruebas

Desde `backend` con el entorno activo, ejecuta `python -m pytest`, `python -m ruff check app tests migrations ../scripts`, `python -m ruff format --check app tests migrations ../scripts` y `python -m alembic check`. En Windows también puedes sustituir `python` por `.\.venv\Scripts\python.exe`. Para la prueba en vivo, usa `$env:AGRONEXA_LIVE = '1'; python -m pytest -m live` en PowerShell o `AGRONEXA_LIVE=1 python -m pytest -m live` en Linux/macOS. La suite predeterminada funciona offline. Los pasos para reproducir el contraste de indicadores con CSV están en la [evidencia de fase 2](docs/EVIDENCE.md#indicadores-y-comparación-de-fase-2).

Desde `frontend`, ejecuta `npm run test`, `npm run lint` y `npm run build`. Usa `npm.cmd` en PowerShell si la política local restringe scripts `.ps1`.

Para la prueba del navegador, deja la API y Vite en ejecución y precarga las tres localidades para 2024 con la misma base de datos. Desde `frontend`, ejecuta `npm run test:browser`. En Windows se usa Microsoft Edge instalado. En Linux o macOS puedes preparar Chromium con `npx playwright install chromium` o definir `AGRONEXA_BROWSER` con un canal instalado. La prueba compara el CSV descargado con el manifiesto de la precarga en `data/cache/`. Puedes cambiar la ubicación con `AGRONEXA_PHASE3_MANIFEST`, la URL de Vite con `AGRONEXA_WEB_BASE` y guardar capturas en una carpeta con `AGRONEXA_EVIDENCE_DIR`.

Con esa misma precarga y el catálogo agronómico inicial, ejecuta `npm run test:rotations-browser` para comprobar el enlace desde la exploración climática, la ficha, las referencias de Illpa INIA y la abstención en Edge o Chromium.

`npm run test:demo` conecta exploración, comparación, descarga y rotaciones en un recorrido de navegador. Para enlazarlo a una precarga específica, usa `AGRONEXA_DEMO_MANIFEST` según la [guía de demostración](docs/DEMO.md#reproducir-las-verificaciones).

## Alcance y procedencia

- `GET /health` verifica la API y la base. `GET /api/v1/locations` devuelve el catálogo. `GET /api/v1/climate/series` recibe localidad y fechas ISO inclusivas de hasta 3660 días.
- La serie incluye unidades, periodo, fuente, estándar solar local (LST), resolución cuando se conoce, cobertura por variable y edad y estado de caché. Los faltantes se conservan como `null`.
- La serie meteorológica representa la celda del producto. Su escala limita su uso en parcelas. La base, la respuesta de NASA y los tratamientos de calidad se describen en el [diccionario de datos](docs/DATA_DICTIONARY.md).
- `GET /api/v1/climate/export` entrega la serie diaria como CSV UTF-8. El navegador envía el hash de la respuesta y la fecha de descarga para recuperar la instantánea que se está mostrando.
- `GET /api/v1/crops` lista los cultivos y `POST /api/v1/rotations/evaluate` devuelve evidencia, criterios, cobertura y estado por alternativa. La [documentación OpenAPI](http://localhost:8000/docs) muestra el contrato de la ficha.
- `GET /api/v1/rotations/references` lista las referencias de fase 6. `POST /api/v1/rotations/preliminary` devuelve el contraste bibliográfico por criterio para papa → quinua en Ilave. La migración `0004` publica `illpa-inia-ilave-v2`. Para actualizar una base existente, ejecuta `python -m alembic upgrade head` desde `backend` usando el mismo `DATABASE_URL` de la API. Si Uvicorn se inició sin `--reload`, reinícialo después.

## Evaluación preliminar en Ilave

Las tres localidades usan la misma ficha básica. Selecciona Ilave, papa como cultivo anterior y quinua como candidata para disponer del bloque opcional **Consultar referencias del INIA**. En ese bloque puedes declarar el cultivar y el historial del lote, fechar la medición de pH anotada en la ficha básica y registrar su método, el drenaje, la humedad y otros datos del lote. Puedes dejar en blanco lo que desconozcas.

**Evaluar alternativas** ejecuta la evaluación general. La base inicial carece de reglas aprobadas y el motor muestra **Evidencia insuficiente**. Dentro del bloque opcional, **Contrastar con las referencias** muestra los resultados por criterio. También está disponible **Clima histórico de campaña en Ilave**, una consulta independiente de NASA POWER para el periodo elegido. [Fuentes y alcance](docs/AGRONOMIC_SOURCES.md#referencias-versionadas-de-fase-6).
