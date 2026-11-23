# Evidencia de ejecución

## Consulta real de Ilave, 2024

La herramienta de precarga de AgroNexa obtuvo HTTP 200 de NASA POWER Daily API v2.10.5 el 21 de noviembre de 2026 a las 22:29 en Perú (2026-11-22 03:29:25 UTC). Consultó el punto de referencia de Ilave (-16,09°, -69,64°) del 1 de enero al 31 de diciembre de 2024, en LST. La respuesta declaró MERRA2 y POWER, relleno -999, temperaturas en °C y precipitación en mm/día.

| Variable | Días válidos | Días calendario | Cobertura |
| --- | ---: | ---: | ---: |
| Temperatura media diaria | 366 | 366 | 100 % |
| Temperatura mínima diaria | 366 | 366 | 100 % |
| Temperatura máxima diaria | 366 | 366 | 100 % |
| Precipitación diaria corregida | 366 | 366 | 100 % |

El 1 de enero de 2024 se registraron 11,94 °C de media, 7,66 °C de mínima, 16,76 °C de máxima y 5,97 mm/día. El CSV tiene 366 fechas únicas y ninguna fila marcada por el normalizador. Un contraste independiente leyó el CSV y el JSON de una descarga directa mediante `curl.exe`, y encontró coincidencia en los 1464 pares fecha-variable. También comprobó que el SHA-256 del CSV coincide con el manifiesto. La cobertura es una medida de disponibilidad de la celda, y la validación se limita a la integridad de la ingestión.

- [CSV normalizado de Ilave](evidence/puno-ilave_2024-01-01_2024-12-31.csv)
- [Manifiesto de la consulta con URL, unidades, metadatos y hashes](evidence/manifest_2024-01-01_2024-12-31.json)
- [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)

Comando de generación desde `backend` con el entorno activo:

```powershell
python -m app.seed.preload --location puno-ilave --start 2024-01-01 --end 2024-12-31 --output ../docs/evidence
```

El primer intento directo dentro del aislamiento de red falló por DNS antes de recibir HTTP. Las consultas con acceso de red autorizado obtuvieron HTTP 200. La respuesta cruda de la sonda local y la base SQLite están excluidas del repositorio.

## Indicadores y comparación de fase 2

El 21 de noviembre de 2026 a las 22:54 de Perú (2026-11-22 a las 03:54 UTC), NASA POWER respondió HTTP 200 para Chivay, Urubamba e Ilave. Se solicitaron los 366 días de 2024 en LST y se obtuvo cobertura del 100 % para las cuatro variables de cada localidad. Cada respuesta y cada CSV tienen su SHA-256 en el manifiesto.

| Localidad | Media (°C) | Mínima (°C) | Máxima (°C) | Lluvia acumulada (mm) | Días de helada potencial | Días de lluvia ≥ 1 mm/día |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chivay | 7,5 | −5,3 | 21,3 | 186,8 | 123 | 53 |
| Urubamba | 9,5 | −3,1 | 21,1 | 706,2 | 5 | 116 |
| Ilave | 10,2 | 0,4 | 19,4 | 541,2 | 0 | 109 |

El contraste independiente leyó los CSV con la biblioteca estándar de Python, calculó con aritmética decimal y verificó por HTTP **252 indicadores en 42 grupos y 18 diferencias**. Comprobó los hashes, fechas, cobertura y coincidencia al nivel de precisión de la API. La comparación Chivay − Ilave dio −2,8 °C de diferencia media en 366 fechas comunes y −354,4 mm de diferencia de precipitación. Las diferencias se calculan antes de redondear los resultados de cada localidad. La validación comprueba la ingestión y el cálculo sobre celdas de NASA POWER.

En Windows, con Python 3.11.18, un proceso Uvicorn y SQLite con caché caliente, el p95 fue de 172,9 ms para el resumen mensual de Ilave y 153,5 ms para la comparación de tres localidades. Se midieron 20 solicitudes secuenciales por ruta tras una de calentamiento, mediante HTTP en loopback con conexión reutilizada. Todas las respuestas se sirvieron desde caché. La medición describe esta ejecución local.

- [Manifiesto de las tres descargas](evidence/phase2/manifest_2024-01-01_2024-12-31.json)
- CSV de [Chivay](evidence/phase2/arequipa-chivay_2024-01-01_2024-12-31.csv), [Urubamba](evidence/phase2/cusco-urubamba_2024-01-01_2024-12-31.csv) e [Ilave](evidence/phase2/puno-ilave_2024-01-01_2024-12-31.csv)
- [Resultados del contraste](evidence/phase2/verification.json) y [script de verificación](../scripts/verify_phase2.py)

Para repetir el procedimiento con una descarga nueva, ejecuta desde `backend`, con el entorno activo, la migración y la carga del catálogo descritas en el README. Deja Uvicorn corriendo en el puerto 8000 con la misma base de datos y usa otra terminal para la precarga y el contraste.

```powershell
python -m app.seed.preload --start 2024-01-01 --end 2024-12-31
python ../scripts/verify_phase2.py --evidence ../data/cache --report ../data/cache/verification_phase2.json
```

El script enlaza el CSV y la consulta de la API mediante los hashes de una misma descarga. El comando de precarga guarda la serie en SQLite y escribe el manifiesto compatible en `data/cache/`.

## Flujo web de fase 3

El 21 de noviembre de 2026 a las 23:13 de Perú (2026-11-22 a las 04:13 UTC) se descargaron de nuevo las series de 2024 de Ilave, Urubamba y Chivay en una base SQLite de verificación. NASA POWER Daily API v2.10.5 devolvió HTTP 200, con 366 días válidos por variable en cada localidad. Los hashes de las corridas y la cobertura están en el [informe de Playwright](evidence/phase3/browser-verification.json).

En Microsoft Edge sobre Windows se verificó el flujo a 360, 768 y 1440 px con la compilación de producción y los datos reales identificados como caché vigente. Se seleccionaron marcadores, se consultó Ilave con el teclado y se comprobó la validación de fechas invertidas. Las gráficas diarias, las líneas y barras mensuales y las tablas se renderizaron en el navegador. Cada comparación incluyó tres pares y doce grupos mensuales por localidad. El documento se mantuvo dentro del ancho de las tres ventanas y las tablas anchas tuvieron desplazamiento propio.

En cada ancho, el CSV descargado desde la pantalla coincidió byte a byte con el CSV de la precarga de Ilave. El SHA-256 comprobado fue `d37f314692b4a478e852080b63cb2fb3aa53487d997ee53ce24d8fbd194fa450`. Una ejecución adicional bloqueó las teselas de OpenStreetMap y verificó que el selector por nombre y coordenadas seguía disponible.

- [Exploración a 1440 px](evidence/phase3/explorar-1440.jpg) y [exploración a 360 px](evidence/phase3/explorar-360.jpg)
- [Comparación a 1440 px](evidence/phase3/comparar-1440.jpg)
- [CSV descargado en Edge](evidence/phase3/agronexa_puno-ilave_2024-01-01_2024-12-31.csv)
- [Instrucciones de reproducción](../README.md#pruebas) y [script del navegador](../frontend/scripts/verify-phase3.mjs)

## Ficha y abstención de fase 4

Se comprobó la ficha en Edge a 360, 768 y 1440 px con la compilación de producción. El recorrido de escritorio partió de Ilave en 2024, cargó 366 fechas de la caché vigente de NASA POWER y abrió la ficha conservando localidad y periodo. Para papa como cultivo anterior y quinua como candidata, la API devolvió HTTP 200, `insufficient_evidence`, sin versión aprobada y con puntuación y posición nulas. La respuesta indicó `Cache-Control: no-store`.

Las pruebas offline cubrieron criterios críticos ausentes e incumplidos, ámbitos de aplicación, ponderación, empates y fuentes climáticas incompletas o vencidas. Estos casos usaron reglas y datos sintéticos TEST aislados. La ejecución con el catálogo inicial verifica la abstención del sistema.

- [Ficha a 360 px](evidence/phase4/rotaciones-360.jpg) y [ficha a 1440 px](evidence/phase4/rotaciones-1440.jpg)
- [Informe de Edge](evidence/phase4/browser-verification.json) y [script de verificación](../frontend/scripts/verify-rotations.mjs)

## Ensayo integral de fase 5

El 22 de noviembre de 2026 a las 00:05 de Perú se precargó una base SQLite nueva con NASA POWER Daily API v2.10.5. Ilave, Urubamba y Chivay obtuvieron HTTP 200 y 366 días válidos para cada variable del año 2024, en LST. Se confirmaron tres corridas y 4392 observaciones. El manifiesto conserva la hora UTC, URLs, parámetros, metadatos, hashes, unidades, cobertura y una muestra de cada corrida. [Manifiesto de la precarga](evidence/phase5/dataset/manifest_2024-01-01_2024-12-31.json).

| Localidad | Temperatura media | Mínima | Máxima | Lluvia acumulada |
| --- | ---: | ---: | ---: | ---: |
| Ilave | 10,2 °C | 0,4 °C | 19,4 °C | 541,2 mm |
| Urubamba | 9,5 °C | −3,1 °C | 21,1 °C | 706,2 mm |
| Chivay | 7,5 °C | −5,3 °C | 21,3 °C | 186,8 mm |

Se contrastaron **252 indicadores de 42 grupos y 18 diferencias** por HTTP con aritmética decimal sobre los CSV de la precarga. La comprobación mide la correspondencia entre las observaciones de la celda y los cálculos de AgroNexa. [Resultados del contraste independiente](evidence/phase5/indicator-verification.json).

El recorrido en Edge 158.0.4370.33 seleccionó Ilave en el mapa, comparó las tres localidades, volvió a la consulta guardada, descargó el CSV, abrió la ficha y revisó la metodología. Pasó a 360, 768 y 1440 px. La salida de la API hacia NASA estaba bloqueada por un proxy de prueba y una sonda HTTPS confirmó el fallo de conexión. La aplicación identificó las consultas como caché vigente y cada exportación coincidió con el SHA-256 de la precarga de Ilave. Una ejecución adicional comprobó el selector con las teselas bloqueadas. [Informe del navegador](evidence/phase5/browser-verification.json).

Para papa como cultivo anterior y quinua como candidata, la API y la pantalla mostraron evidencia insuficiente. La respuesta registró versión de reglas, puntuación y posición nulas. Los casos que sí producen una evaluación o restricción se verificaron únicamente con reglas sintéticas TEST aisladas.

- [CSV de Ilave](evidence/phase5/dataset/puno-ilave_2024-01-01_2024-12-31.csv), [CSV de Urubamba](evidence/phase5/dataset/cusco-urubamba_2024-01-01_2024-12-31.csv) y [CSV de Chivay](evidence/phase5/dataset/arequipa-chivay_2024-01-01_2024-12-31.csv)
- [Captura de exploración de escritorio](evidence/phase5/explorar-1440.jpg) y [captura móvil](evidence/phase5/explorar-360.jpg)
- [Captura de comparación](evidence/phase5/comparar-1440.jpg) y [captura de abstención](evidence/phase5/rotaciones-1440.jpg)
- [CSV de Ilave descargado desde la interfaz](evidence/phase5/agronexa_puno-ilave_2024-01-01_2024-12-31.csv)

## Evaluación preliminar de fase 6

El 22 de noviembre de 2026 se ensayó el flujo en Edge 158.0.4370.33 a 360, 768 y 1440 px con la compilación de producción y una copia migrada de la caché de fase 5. El ensayo configuró la salida de Uvicorn hacia NASA mediante un proxy local sin servicio. La interfaz leyó 366 fechas de Ilave, comparó las tres localidades, conservó las huellas de las corridas y descargó el CSV de Ilave con el mismo SHA-256 que figura en el manifiesto. Se verificó el selector con teselas bloqueadas y el ancho de página sin desbordamiento horizontal. [Informe del navegador](evidence/phase6/browser-verification.json) y [manifiesto de datos](evidence/phase5/dataset/manifest_2024-01-01_2024-12-31.json).

La ficha se ensayó sin mediciones de parcela ni cultivar confirmado. Las API respondieron HTTP 200 con `Cache-Control: no-store`. El contraste mostró siete tarjetas de la versión `illpa-inia-ilave-v1`. La secuencia coincidió como antecedente documental y los otros seis criterios mostraron información insuficiente. El motor devolvió `insufficient_evidence` con versión de reglas, puntuación y posición nulas. [Captura en Edge](evidence/phase6/rotaciones-1440.jpg).

Las pruebas offline usaron entradas sintéticas TEST para los límites de pH 5,5 y 8,0, valores exteriores, fechas, cultivares, textura y tipos de evidencia de humedad. La integración comprobó las referencias persistidas a través de otra instancia de la API y la ausencia de reglas aprobadas. La consulta separada en vivo para Ilave 2024 pasó con HTTP 200, en una base de pruebas temporal. [Pruebas del backend](../backend/tests/test_preliminary.py) y [pruebas de interfaz](../frontend/tests/Rotation.test.tsx).

## Diagnóstico de Ilave y consulta de campaña

El 23 de noviembre de 2026 se comprobó la versión `illpa-inia-ilave-v2` con Edge 158.0.4370.33 y la compilación de producción. El recorrido pasó a 360, 768 y 1440 px sin desbordamiento horizontal. Conservó las huellas de la precarga anual de las tres localidades y del CSV descargado. El formulario de demo se completó sin declarar mediciones ni historial de parcela. El antecedente quedó con información insuficiente y el motor mantuvo `insufficient_evidence` con puntuación y posición nulas. [Informe del navegador](evidence/phase6-diagnostico/browser-verification.json) y [captura](evidence/phase6-diagnostico/rotaciones-1440.jpg).

Se precargó en una copia de la base una ventana inclusiva de Ilave del **1 de octubre de 2023 al 30 de abril de 2024**. NASA POWER respondió HTTP 200. El CSV contiene 213 fechas consecutivas y 213 observaciones válidas para cada variable. Se verificó el SHA-256 y se recalcularon con aritmética decimal la media (**11,0 °C**), el acumulado (**559,1 mm**) y el conteo de mínimas ≤ 0 °C (**0 días**). Los resultados coincidieron con el resumen de los tres recorridos, servidos desde la caché vigente. Las cifras describen la celda durante el intervalo elegido para la demo. [Manifiesto](evidence/phase6-diagnostico/manifest_2023-10-01_2024-04-30.json) y [CSV](evidence/phase6-diagnostico/puno-ilave_2023-10-01_2024-04-30.csv).

Las dos bases SQLite locales conservaron las siete referencias de la primera versión y añadieron las siete de la segunda. Las huellas calculadas sobre filas de las tablas climáticas y de reglas coincidieron antes y después de migrar. Las pruebas de ficha con mediciones y antecedentes usaron entradas sintéticas aisladas únicamente en las suites. [Pruebas API](../backend/tests/test_preliminary.py) y [pruebas de interfaz](../frontend/tests/Rotation.test.tsx).

## Rediseño del frontend

El 23 de noviembre de 2026, la línea base pasó las 12 pruebas de interfaz y la demo de Edge 158.0.4370.33 a 360, 768 y 1440 px. Las capturas de Inicio y Explorar corresponden a la compilación previa. [Informe anterior](evidence/frontend-redesign/antes/browser-verification.json) · [Inicio anterior](evidence/frontend-redesign/antes/inicio-1440.jpg) · [Explorar anterior](evidence/frontend-redesign/antes/explorar-1440.jpg).

La comprobación del rediseño cubre las cinco resoluciones pedidas, la navegación, el foco y Escape en el menú móvil, la selección en Leaflet, la tabla paginada y la comparación histórica. El CSV de Ilave conserva el mismo SHA-256 de la precarga de 2024. El asistente conserva la abstención en reglas aprobadas, consulta las referencias opcionales y recupera la ventana histórica de campaña desde la caché de NASA POWER. [Script de verificación](../frontend/scripts/verify-phase3.mjs).

El control de contraste de los colores principales obtuvo 14,89:1 para el texto principal sobre blanco, 5,23:1 para el texto secundario sobre el fondo y 6,36:1 para el botón principal. La revisión de accesibilidad abarcó teclado, foco, contraste de estas combinaciones y desplazamiento de las tablas.

- Inicio a 1440 px. [Antes](evidence/frontend-redesign/antes/inicio-1440.jpg) · [Después](evidence/frontend-redesign/despues/inicio-1440.jpg).
- Inicio a 360 px. [Antes](evidence/frontend-redesign/antes/inicio-360.jpg) · [Después](evidence/frontend-redesign/despues/inicio-360.jpg).
- [Explorar](evidence/frontend-redesign/despues/explorar-1440.jpg) · [Comparar](evidence/frontend-redesign/despues/comparar-1440.jpg) · [Rotaciones](evidence/frontend-redesign/despues/rotaciones-1440.jpg) · [Metodología](evidence/frontend-redesign/despues/metodologia-1440.jpg).
- [Informe de Edge posterior](evidence/frontend-redesign/despues/browser-verification.json).
