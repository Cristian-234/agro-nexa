# Diccionario de datos

## Serie diaria

| Código NASA | Campo API | Unidad | Significado |
| --- | --- | --- | --- |
| T2M | `t2m` | °C (`degC`) | Temperatura media diaria del aire a 2 m |
| T2M_MIN | `t2m_min` | °C (`degC`) | Temperatura mínima diaria del aire a 2 m |
| T2M_MAX | `t2m_max` | °C (`degC`) | Temperatura máxima diaria del aire a 2 m |
| PRECTOTCORR | `prectotcorr` | `mm/day` | Precipitación diaria corregida |

Cada fila recoge una fecha ISO del calendario inclusivo con el estándar de tiempo solar local `LST`. La cobertura de cada variable es 100 × días con valor / días calendario solicitados. Los flags de temperatura se conservan para interpretación.

| Flag | Tratamiento |
| --- | --- |
| `variable_missing` | La variable no está en el JSON. Valor nulo. |
| `day_missing` | La variable no tiene una clave para la fecha. Valor nulo. |
| `fill_value` | El número coincide con el relleno declarado en el encabezado. Valor nulo. |
| `invalid_value` | El dato es nulo, no numérico o no finito en la respuesta. Valor nulo. |
| `negative_precipitation` | Lluvia negativa. Valor nulo. Cero se conserva. |
| `inverted_temperature_bounds` | Mínima superior a máxima. Se señalan ambos valores. |
| `mean_outside_temperature_bounds` | La media cruza un límite diario disponible. Se señala la media. |

## Persistencia y trazabilidad

- `locations` guarda puntos públicos, fuente de coordenadas y estado de verificación.
- `datasets` guarda el producto, versión de API y fuentes declaradas, estándar temporal, resolución y referencia. `variables` guarda códigos, unidades y descripción por dataset.
- `fetch_runs` registra consulta, intervalo, hora UTC, metadatos del proveedor, hash de la respuesta y serie normalizada. Una consulta reciente se conserva fresca durante 24 h y una histórica durante 720 h de forma predeterminada. Se considera reciente si su fecha final cae en los últimos 30 días de Perú.
- `observations` guarda el valor nullable, flag y corrida de procedencia por localidad, variable y fecha. Actualiza de forma idempotente. La instantánea en `fetch_runs` reproduce la serie de la consulta exacta. La caché vencida se identifica como `stale` cuando falla la actualización. `fresh` identifica una descarga nueva y `cached` una consulta reutilizada dentro de su vigencia.
- El CSV de evidencia contiene fechas, localidad, unidades en el encabezado, fuente, fecha UTC de descarga y flags. Las celdas vacías representan faltantes. El manifiesto contiene la URL consultada y los hashes SHA-256 de la respuesta original y del CSV.

## Indicadores y comparación

El resumen agrupa por mes calendario, año calendario o periodo completo. Los grupos de los extremos se recortan a las fechas solicitadas. Cada indicador devuelve valor, unidad, días válidos, días esperados, cobertura en porcentaje y estado. La cobertura usa los días calendario inclusivos de cada grupo. El API muestra los resultados y coberturas a una décima.

| Indicador | Operación sobre los valores diarios disponibles | Unidad |
| --- | --- | --- |
| `mean_temperature` | Media de T2M | °C |
| `min_temperature` | Mínimo de T2M_MIN | °C |
| `max_temperature` | Máximo de T2M_MAX | °C |
| `accumulated_precipitation` | Suma de PRECTOTCORR | mm |
| `potential_frost_days` | Días con T2M_MIN ≤ 0 °C, un indicador de helada meteorológica potencial a escala de celda | días |
| `rainy_days` | Días con PRECTOTCORR ≥ `RAIN_DAY_THRESHOLD_MM` (1 mm/día por defecto) | días |

El estado `complete` indica cobertura del 100 %. `partial` indica faltantes con cobertura suficiente, o cualquier acumulado observado de lluvia con algunos días válidos y algunos faltantes. `insufficient` señala cobertura inferior a `MIN_DATA_COVERAGE` (90 % por defecto) para el resto de indicadores. `no_data` indica cero días válidos y valor nulo. Los grupos advierten si algún indicador queda bajo el umbral, incluida la lluvia parcial.

`/climate/compare` devuelve las localidades en el orden solicitado y cada par A−B. El resumen de cada localidad usa el periodo completo y conserva la procedencia de la serie. La media y los conteos se comparan sobre fechas válidas comunes, con el umbral aplicado a esa intersección. Los extremos comparan el mínimo o máximo observado de cada localidad, con el umbral aplicado a ambas coberturas. El acumulado de lluvia exige cobertura completa en todas las localidades seleccionadas. La respuesta informa las diferencias de fechas válidas, la intersección y su cobertura por indicador. Una diferencia queda nula si la cobertura pertinente es insuficiente, falta lluvia para comparar totales definitivos o difieren fuente, resolución, unidades o estándar temporal.

[NASA POWER, API diaria](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) · [NASA POWER, resolución y servicios](https://power.larc.nasa.gov/docs/services/)

## Contratos de visualización y descarga

- El resumen con `include_series=true` añade `series` con las observaciones diarias y sus banderas de calidad, correspondientes a la misma procedencia del resumen.
- La comparación con `include_monthly=true` añade `monthly_groups`, indexado por ID de localidad. Sus grupos usan las mismas fechas y unidades que los indicadores de periodo.
- `/api/v1/climate/export` admite los mismos filtros que la serie y devuelve `text/csv; charset=utf-8` con `Content-Disposition: attachment`. Las columnas son `date`, `location_id`, `t2m_deg_c`, `t2m_min_deg_c`, `t2m_max_deg_c`, `prectotcorr_mm_day`, `source`, `fetched_at` y `quality_flags`. Las banderas se exportan como JSON en una celda.
- Agrega `response_sha256` y `fetched_at` de la fuente para descargar una corrida concreta. La ruta responde 404 si esa instantánea no está disponible. El CSV usa UTC para la fecha de descarga y LST para las fechas diarias.

## Rotaciones

- La ficha usa `location_id`, `start`, `end`, `previous_crop`, `candidate_crops`, `irrigation`, `soil_texture`, `soil_ph`, `soil_notes` y `priorities`. El pH ausente se envía como `null`. Riego, textura y cultivo anterior admiten `unknown`. Los cultivos candidatos son `potato` y `quinoa`.
- La respuesta indica el periodo y la hora UTC de evaluación, la versión del catálogo o `null`, la fuente climática cuando se consultó y el estado por alternativa. La cobertura de evidencia se expresa como una fracción entre 0 y 1. Sin criterios aplicables se devuelve 0 con una explicación. La puntuación exploratoria usa una escala de 0 a 100 y se emite cuando la evidencia lo permite.
- Cada criterio indica condición, dato, fuente, unidad, origen, peso, criticidad, contexto y fecha de revisión. `unknown` representa evidencia ausente o inutilizable. `not_applicable` identifica criterios fuera de alcance.
- Las tablas `crops`, `rule_sets` y `rules` conservan el catálogo y la versión. La ficha y los resultados se procesan en memoria durante la solicitud.
