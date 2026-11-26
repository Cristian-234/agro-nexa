# Fuentes agronómicas y aprobación

El catálogo instalado incluye fichas de papa, quinua, cebada y haba y parte con **cero reglas aprobadas**. Las fuentes siguientes orientan la revisión bibliográfica. Para activar un criterio, el equipo o asesor debe documentar su aplicabilidad, condición y revisión en una nueva versión del catálogo.

| Fuente institucional | Contexto que aporta | Estado en AgroNexa |
| --- | --- | --- |
| [INIA, Manual técnico de manejo integrado del cultivo de papa](https://repositorio.inia.gob.pe/handle/20.500.12955/1146) | Manejo integrado en el contexto de la EEA Illpa–Puno. La figura 11 muestra un esquema de rotación para la zona andina. | Referencia bibliográfica pendiente de revisión para reglas del sistema. |
| [INIA, Manejo integrado del cultivo de quinua en el Cusco](https://repositorio.inia.gob.pe/handle/20.500.12955/926) | Manual de 2018 elaborado en el ámbito de la EEA Andenes para el manejo de quinua en Cusco. | Referencia bibliográfica pendiente de revisión para reglas del sistema. |
| [INIA, Quinua Illpa INIA](https://repositorio.inia.gob.pe/handle/20.500.12955/79) | Plegable de la EEA Illpa para adaptación y manejo del cultivar en el Altiplano puneño. | Referencia versionada de la evaluación preliminar de Ilave. |

## Incorporación de una versión

Cada regla identifica cultivo candidato, secuencia, criterio, variable, operador, umbral o rango, unidad, periodo, peso, criticidad, regiones, fuente con URL y página o sección, estado, fecha de revisión y limitación. La aprobación del equipo documenta la revisión del criterio para el contexto indicado. La validación de campo requiere evidencia adicional.

El esquema de importación es `CatalogVersion` en `backend/app/schemas/rotation.py`. Para obtener su JSON Schema, ejecuta desde `backend` con el entorno activo:

```powershell
python -c "import json; from app.schemas.rotation import CatalogVersion; print(json.dumps(CatalogVersion.model_json_schema(), indent=2))"
```

Con la migración aplicada y un archivo JSON revisado que respete ese esquema, incorpora la versión desde `backend`:

```powershell
python -m app.seed.agronomy ruta/al/catalogo.json
```

La importación valida fechas, fuente, unidades, operadores, pesos y estados. Es transaccional y reserva cada identificador de versión. Para corregir un catálogo se usa una nueva versión. El motor selecciona la versión aprobada con fecha de revisión más reciente, y solo aplica sus reglas aprobadas. La ordenación por identificador resuelve coincidencias en la fecha de revisión. Los datos sintéticos TEST viven exclusivamente en las pruebas.

## Evidencia admitida

- Ficha registrada para pH medido, textura y disponibilidad de riego. La respuesta distingue dato declarado, ausencia y evidencia climática.
- NASA POWER para temperatura media, mínima, máxima y precipitación acumulada sobre la totalidad del periodo de referencia. Las reglas climáticas requieren una coordenada verificada y cobertura suficiente. La lluvia requiere cobertura completa y la caché vencida se conserva solo como procedencia.
- Las prioridades contextualizan la ficha. Los pesos aplicados provienen de la versión aprobada. El motor trabaja con el periodo de referencia completo. Criterios de campaña o de etapas fenológicas requieren ampliar y revisar el contrato antes de incorporarlos.

## Borrador para revisión de papa → quinua en Ilave

El [catálogo preliminar](../data/catalog/papa-quinua-ilave.borrador.json) reúne seis criterios para revisar con el asesor. Su alcance es **Ilave, El Collao, Puno**, con **Illpa INIA como cultivar de referencia por confirmar**. El INIA describe la siembra de este cultivar después de papa y registra validaciones históricas del cultivar en Yuncuta (1995–96) y Churo (1996–97), ambos en el distrito de Ilave. La tabla de validación informa rendimientos del cultivar en esos sitios. Para atribuir un efecto a la rotación haría falta evidencia de comparación entre secuencias. [INIA, *Quinua ILLPA INIA*, «Rotación» y «Rendimiento de validación»](https://repositorio.inia.gob.pe/server/api/core/bitstreams/f54987cb-69c8-49dc-8cd0-d61677366c8d/content).

| Criterio preliminar | Evidencia publicada | Decisión pendiente |
| --- | --- | --- |
| Antecedente de papa | El manual de papa incluye la secuencia ilustrativa papa → quinua → avena → haba. La sección y la figura 11 están en la misma página impresa, la 18 (página 11 del PDF adjunto). [INIA, §6.1.2 y fig. 11](https://repositorio.inia.gob.pe/bitstream/20.500.12955/1146/1/MANUAL%20T%C3%89CNICO%20-%20MANEJO%20INTEGRADO%20DEL%20CULTIVO%20DE%20PAPA.pdf) | Confirmar el cultivo anterior del mismo lote y usarlo para delimitar la secuencia. |
| pH y textura | Para Illpa INIA se describe pH de 5,5 a 8,0 y textura franca o franco arenosa. [INIA y FAO, «Illpa INIA», p. 38](https://repositorio.inia.gob.pe/server/api/core/bitstreams/06b66d94-b8d6-432c-b29c-42b5db9de9fb/content) | Confirmar cultivar, medición fechada y clase textural de la parcela. El pH publicado se documenta como descripción de adaptación. |
| Humedad al establecimiento | El plegable describe secano y señala humedad del suelo en la siembra. [INIA, «Sistema de producción» y «Época de siembra»](https://repositorio.inia.gob.pe/server/api/core/bitstreams/f54987cb-69c8-49dc-8cd0-d61677366c8d/content) | Definir el protocolo de observación o medición de campo y el momento de registro. |
| Precipitación y temperatura | El catálogo describe 450–600 mm y 4–15 °C para la adaptación de Illpa INIA. [INIA y FAO, «Illpa INIA», p. 38](https://repositorio.inia.gob.pe/server/api/core/bitstreams/06b66d94-b8d6-432c-b29c-42b5db9de9fb/content) | Confirmar la ventana del acumulado y el estadístico de temperatura. La referencia citada carece de esas definiciones para hacer una comparación directa con NASA POWER. |

### Cotejo de los documentos adjuntos

- El plegable **Quinua ILLPA INIA** presenta los rangos de adaptación y la tabla con Yuncuta y Churo en la página 1 del PDF. La rotación después de papa, el sistema de secano y la humedad del suelo a la siembra están en la página 2. La mención de octubre describe el manejo del cultivar indicado en el folleto. La fecha para una parcela y una campaña de Ilave requiere revisión local. [Plegable de la EEA Illpa](https://repositorio.inia.gob.pe/handle/20.500.12955/79).
- El manual de **quinua en el Cusco** señala que la adaptación depende del cultivar y de su ambiente (p. 13 impresa, p. 15 del PDF). En la p. 14 impresa (p. 16 del PDF), la sección 7 describe la preferencia por rotar con tuberosas y la sección 8 la conveniencia de suelos francos con buen drenaje. Es un antecedente de la EEA Andenes para el contexto de Cusco. Desde fase 6 la ficha recoge el drenaje como observación independiente de la parcela. Su interpretación en Ilave queda pendiente de revisión. [Manual de quinua en el Cusco](https://repositorio.inia.gob.pe/handle/20.500.12955/926).

En la revisión, documentar para cada criterio el cultivar, la parcela o ámbito de aplicación, la evidencia requerida y la decisión del asesor. Si procede formular una condición, registrar también su operador, alcance, peso, criticidad y fecha de revisión. El motor actual filtra por región y secuencia. Una condición que se apruebe solo para Ilave o para Illpa INIA requiere conservar explícitamente ese alcance en el contrato evaluable antes de publicar una versión. Los campos de condición, peso y criticidad del borrador quedan pendientes. El archivo de revisión usa un formato separado del catálogo de importación.

## Referencias versionadas de fase 6

La migración `0004` incorpora `illpa-inia-ilave-v2` a `bibliographic_references` y conserva la versión anterior. La API devuelve cada parámetro, valor, unidad, ámbito documental, localidad y cultivar de aplicación, organismo, año, página o sección, estado de cotejo y tipo. La versión activa está en `GET /api/v1/rotations/references`. `POST /api/v1/rotations/preliminary` conserva la ficha anterior y admite campos opcionales adicionales para el contexto de Ilave.

### Contraste del diagnóstico incorporado

El [diagnóstico agronómico](diagnostico_agronomico_ilave.md) orienta el alcance y la captura de datos. El cotejo documental se apoya en los PDF primarios y en el registro institucional. Los niveles de confianza del diagnóstico son juicios de su autor. AgroNexa prescinde de ellos al calcular estados.

| Criterio | Tipo en la versión activa | Fuente y alcance del contraste |
| --- | --- | --- |
| R-01 · Antecedente de papa | Regla candidata, borrador | El plegable de Illpa INIA, p. 2, documenta la secuencia. El manual de papa, §6.1.2 y fig. 11, aporta contexto. Se pide el cultivo inmediatamente anterior y su fecha de cosecha en el mismo lote y se limita la coincidencia a Illpa INIA confirmado. El historial es declarado y la secuencia carece de un veredicto de aptitud. |
| R-02 · pH | Regla candidata, borrador | El plegable, p. 1, aporta 5,5–8,0, inclusive. Se requiere valor, fecha, método declarado y cultivar confirmado. El folleto carece de un protocolo analítico y el muestreo representativo sigue pendiente de revisión. |
| R-03 · Textura | Regla candidata, borrador | El plegable, p. 1, aporta franca y franco-arenosa. El contraste requiere cultivar confirmado y un registro independiente de drenaje. El manual de Cusco, §8, aporta contexto complementario para drenaje. El drenaje deficiente o la inundación declarada se señalan para revisión, sin activar una restricción aprobada. |
| R-04 · Humedad | No evaluable | El plegable, p. 2, menciona secano y humedad al sembrar, sin un protocolo o umbral local. Se registra observación o medición, fecha y método por separado del riego. |
| R-05 · Precipitación | Referencia documental | El plegable, p. 1, publica 450–600 mm. Se requiere determinar la ventana de acumulación antes de cualquier contraste climático. |
| R-06 · Temperatura | Referencia documental | El plegable, p. 1, publica 4–15 °C. Se requiere verificar el estadístico y la ventana antes de cualquier contraste climático. |

El catálogo INIA/FAO queda como corroboración bibliográfica. El plegable cotejado basta para los valores implementados. Las ventanas de 140 días y los ejemplos de octubre a abril del diagnóstico carecen de confirmación para una parcela concreta. La consulta climática usa fechas elegidas por el usuario y la resolución meteorológica documentada del producto NASA POWER es aproximadamente 0,5° × 0,625°, en LST. El conteo de mínimas ≤ 0 °C describe días de frío potencial a escala de celda. Los datos de campo, la altitud, la posición y el historial de agroquímicos se registran como contexto. Las afirmaciones del diagnóstico sobre profundidad de muestreo, residuos, heladas por etapa y severidad requieren revisión local.

El archivo del asesor conserva su estado de borrador. El cotejo de una fuente primaria acredita la transcripción y su contexto. La aprobación profesional requiere una revisión separada y un contrato que respete el alcance del criterio. El motor de rotaciones sigue absteniéndose con el catálogo inicial.

## Matriz regional v0.3 para el asistente

El documento aportado por el usuario, *AGRONEXA | Ampliación regional v0.3*, se consultó como **catálogo candidato en borrador**. SHA-256 `37d720092ca2e8c1e49f35671b625a8ae5a9c37066046ae5d09376f8b57aa038`. Las pp. 1–2 contienen las 48 combinaciones regionales. Se conservan la combinación, la página, la versión y la referencia en cada observación de la interfaz.

| Código del documento | Presentación en el asistente |
| --- | --- |
| D | Antecedente documental en el ámbito de la fuente. |
| O | Observación de campo que requiere confirmar zona y variedad. |
| R | Atención por repetir el cultivo. |
| I | Faltan datos para respaldar localmente la combinación. |

Las fuentes de Yunguyo y las observaciones de Puno requieren revisión antes de aplicarse a Ilave. La ficha Luzmalta conserva su ámbito varietal. La referencia de quinua de Andaray, Condesuyos, se identifica como tal al consultar Chivay. Las celdas con dos clases muestran ambas por separado. El bloque de Illpa INIA conserva su propio ámbito y evaluación.

En Cusco, el enlace original de Haba INIA 401 del PDF devolvió HTTP 404. Se enlaza la ficha institucional del repositorio del INIA. La ampliación conserva las variedades publicadas como información documental y deja pendientes los umbrales, la transferencia entre localidades y la revisión agronómica. [Ficha Luzmalta](https://repositorio.inia.gob.pe/items/54783374-187d-4cbd-9d2e-f6a10d1ca4f0) · [Haba INIA 401-Cusco](https://repositorio.inia.gob.pe/items/e4eef787-0290-4124-bb51-9230c3c72ea1) · [Manual DRA Puno](https://agropuno.gob.pe/Archivos/Biblioteca/manual_mip_haba.pdf#page=18).
