# Ensayo de AgroNexa

La demostración usa Ilave, Urubamba y Chivay para el periodo del 1 de enero al 31 de diciembre de 2024. Para papa como cultivo anterior y quinua como candidata, la ficha muestra la evaluación bibliográfica de Ilave y el resultado **Evidencia insuficiente** del motor de rotaciones, con puntuación y posición nulas.

## Preparar una base de demostración

Instala las dependencias de [README](../README.md). Los siguientes comandos de PowerShell se ejecutan desde la raíz. Usa una base SQLite dedicada al ensayo con el catálogo inicial.

```powershell
Set-Location backend
$env:DATABASE_URL = 'sqlite:///./agronexa-demo.sqlite3'
python -m alembic upgrade head
python -m app.seed.locations
python -m alembic check
python -m app.seed.preload --start 2024-01-01 --end 2024-12-31 --output ../data/cache/phase5
python -m app.seed.preload --location puno-ilave --start 2023-10-01 --end 2024-04-30 --output ../data/cache/ilave-diagnosis-campaign
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Si usas `backend/.venv311`, sustituye `python` por `.\.venv311\Scripts\python.exe`. En Linux/macOS, activa el entorno virtual y usa `export DATABASE_URL=sqlite:///./agronexa-demo.sqlite3`. La descarga inicial necesita acceso HTTPS a NASA POWER. La caché histórica vigente permite repetir las mismas consultas con sus fechas exactas aunque NASA esté temporalmente inaccesible. La pantalla identifica la caché y su antigüedad. Las teselas de OpenStreetMap se solicitan aparte y el selector funciona si fallan. Los [CSV de evidencia y su manifiesto](evidence/phase5/dataset/manifest_2024-01-01_2024-12-31.json) documentan el ensayo registrado.

Si la base de fase 5 ya tiene caché vigente para 2024, conserva esa precarga y aplica `python -m alembic upgrade head` para incorporar la versión `illpa-inia-ilave-v2`. Precarga el segundo intervalo si vas a ensayar la consulta de campaña sin conexión. Para repetir una precarga ya disponible, usa su manifiesto.

En otra terminal, desde la raíz, ejecuta `cd frontend` y `npm run dev`. Abre [AgroNexa](http://localhost:5173). El desarrollo local usa el proxy de Vite hacia Uvicorn. Los pasos para Windows y Linux/macOS están en el [README](../README.md).

## Recorrido

1. En **Explorar**, selecciona Ilave en el mapa, pulsa **Usar año 2024** y consulta el clima. Revisa el estado de caché, las fechas, unidades, resolución y cobertura.
2. Abre **Comparar localidad**, añade Urubamba y Chivay y conserva el periodo. Revisa los tres pares y abre la diferencia Ilave − Urubamba.
3. Vuelve a la exploración, conserva los filtros y vuelve a consultar. Pulsa **Descargar CSV** y verifica las 366 filas de datos y la procedencia.
4. Abre **Abrir ficha agrícola** desde la exploración. Confirma Ilave y el periodo. Selecciona papa como cultivo anterior y quinua como candidata. Pulsa **Evaluar alternativas** en la ficha básica. La evaluación general muestra **Evidencia insuficiente** porque el catálogo aún carece de una versión aprobada.
5. Abre **Consultar referencias del INIA** y pulsa **Contrastar con las referencias**. Revisa la evaluación preliminar. Si dispones de datos del lote, puedes declarar el cultivo inmediato, su fecha de cosecha y el cultivar antes de contrastar. Sin historial del mismo lote, el antecedente queda con información insuficiente.
6. En **Clima histórico de campaña en Ilave**, consulta del 1 de octubre de 2023 al 30 de abril de 2024. Esta ventana de demostración cruza dos años. Revisa media, precipitación, días con mínima ≤ 0 °C, cobertura por variable y procedencia. Es un intervalo meteorológico de ejemplo independiente de los resultados de la ficha.

En **Inicio**, **Explorar datos climáticos** abre el mapa. En móvil, el botón **Abrir menú** permite navegar entre módulos y Escape cierra el menú. En la ficha agrícola puedes revisar los datos antes de evaluar y volver a editarlos desde **Evaluación y resultados**.

## Simulación del motor de rotaciones

1. En **Rotaciones agrícolas**, abre **Probar simulación con reglas de ejemplo**.
2. Selecciona **Comparar dos alternativas** y pulsa **Simular evaluación**. El motor ordena quinua después de papa y papa después de papa con fichas ficticias de pH 6,5 y textura franca.
3. Abre el detalle de cada criterio para ver el dato, la condición sintética y su peso. El pH pesa dos y puede activar una restricción. La textura pesa uno.
4. Selecciona **Ver una restricción crítica** y repite la simulación. Al usar el pH ficticio de 5,5, la alternativa de quinua incumple el rango TEST y se muestra sin puntuación ni posición.

Las cifras de esta pantalla son ejemplos didácticos. El navegador carga dos resultados precalculados, generados por el motor con fixtures sintéticos. La simulación funciona sin una consulta a NASA ni una importación de reglas. Para regenerar sus resultados desde `backend`, ejecuta `python -m tests.fixtures.rotation_demo` en el entorno del proyecto.

## Reproducir las verificaciones

Con la API y el frontend activos, desde `frontend` en PowerShell:

```powershell
$env:AGRONEXA_DEMO_MANIFEST = '../data/cache/phase5/manifest_2024-01-01_2024-12-31.json'
$env:AGRONEXA_CAMPAIGN_MANIFEST = '../data/cache/ilave-diagnosis-campaign/manifest_2023-10-01_2024-04-30.json'
npm.cmd run test:demo
```

En Linux/macOS, define las variables con `export` y usa `npm run test:demo` tras instalar Chromium con `npx playwright install chromium`. En Windows se usa Edge instalado. Define `AGRONEXA_WEB_BASE` para otro puerto y `AGRONEXA_EVIDENCE_DIR` para guardar capturas y el informe. El script exige la caché vigente de las precargas y verifica sus hashes. Si omites `AGRONEXA_CAMPAIGN_MANIFEST`, la consulta de campaña reutiliza el intervalo histórico de la demo.

Desde `backend` puedes contrastar por separado el cálculo de la API con aritmética decimal sobre los CSV:

```powershell
python ../scripts/verify_phase2.py --evidence ../data/cache/phase5 --report ../data/cache/phase5/verification.json
```

## Matriz de pruebas de la especificación

| Casos | Verificación |
| --- | --- |
| T01–T04 | Pytest valida fechas y coordenadas, calendario bisiesto, normalización y persistencia idempotente. |
| T05–T07 | Pytest verifica indicadores y comparaciones con fixtures y el contraste independiente usa los CSV reales. |
| T08–T09 | Pytest cubre fallos del proveedor, reintentos y caché vencida, con y sin observaciones guardadas. |
| T10–T11 | Pytest cubre abstención, restricciones críticas, ponderación, empates y alcance con reglas TEST aisladas. |
| T12 | Pytest verifica unidades, procedencia, valores faltantes y seguridad del CSV. Playwright compara el hash descargado con la precarga. |
| T13 | Vitest cubre estados y validaciones de la interfaz. Playwright comprueba teclado, mapa y diseño a 360, 768 y 1440 px. |
| T14 | `AGRONEXA_LIVE=1` habilita la prueba separada en vivo. La precarga registra HTTP, fecha, metadatos, cobertura y muestra. |
| T15 | `npm run test:demo` ensaya el recorrido completo en un navegador y comprueba las referencias preliminares y la abstención. |

Consulta las [evidencias del diagnóstico y la campaña](EVIDENCE.md#diagnóstico-de-ilave-y-consulta-de-campaña) y el [registro de pruebas](PROGRESS.md#incorporación-del-diagnóstico-de-ilave).
