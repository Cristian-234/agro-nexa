# Diagnóstico Agronómico y Sistema de Reglas AgroNexa
## Evaluaciones Técnicas para la Rotación Papa → Quinua (*Illpa INIA*) en Ilave, Puno

---

## PARTE I. Diagnóstico agronómico general de la rotación papa → quinua en Ilave

### Pertinencia agronómica en el Altiplano puneño
La secuencia **papa (*Solanum tuberosum* L.) → quinua (*Chenopodium quinoa* Willd.)** es una práctica tradicional y técnicamente fundamentada en la zona agroecológica circunlacustre y suni del Altiplano de Puno, donde se ubica el distrito de Ilave (provincia de El Collao).

* **Información confirmada por documentación oficial:** El Instituto Nacional de Innovación Agraria (INIA) documenta explícitamente la siembra del cultivar **Illpa INIA** después del cultivo de papa. Asimismo, el *Manual técnico de manejo integrado del cultivo de papa* elaborado en la EEA Illpa–Puno propone el esquema de rotación andina **papa → quinua → cereal (avena o cebada) → leguminosa (haba o tarwi)**, fundamentando que la quinua no se ve afectada por las plagas y enfermedades específicas de la papa y que la alternancia conserva la fertilidad del suelo. En Ilave, el INIA registra validaciones históricas de rendimiento de Illpa INIA en las localidades de **Yuncuta** (campaña 1995–96, $3\,400\text{ kg/ha}$) y **Churo** (campaña 1996–97, $2\,400\text{ kg/ha}$).
* **Inferencias agronómicas razonables:** La papa recibe usualmente la mayor inversión en labranza profunda, aporques y fertilización orgánica o mineral dentro del sistema andino. Sembrar quinua inmediatamente después permite aprovechar el suelo mullido, el efecto residual de los nutrientes (especialmente fósforo y materia orgánica mineralizada) y la reducción de malezas, disminuyendo además la presión de plagas específicas de solanáceas como el gorgojo de los Andes (*Premnotrypes* spp.) o patógenos de suelo como verruga (*Synchytrium endobioticum*) y roña (*Spongospora subterranea*).
* **Información pendiente de verificar:** Las validaciones de Yuncuta y Churo reportan rendimientos absolutos del cultivar, pero no corresponden a ensayos comparativos entre secuencias de rotación. Además, datan de hace casi tres décadas, por lo que no reflejan los cambios recientes en la variabilidad climática ni la degradación actual de suelos en parcelas específicas de Ilave.
* **Datos que requieren mediciones específicas de la parcela:** Confirmación del cultivar a sembrar (Illpa INIA u otro), análisis físico-químico de suelo (pH, textura, materia orgánica), posición fisiográfica (ladera vs. pampa), drenaje superficial/interno, historial fitosanitario y uso previo de agroquímicos en la papa.

---

### Análisis crítico de la integración con datos NASA POWER (Ilave, 2024)
Los datos procesados por AgroNexa para el punto de referencia de Ilave en 2024 muestran una **temperatura media anual de $10{,}2\,^\circ\text{C}$** y una **precipitación acumulada anual de $541{,}2\text{ mm}$** (cobertura del 100 %, 366 días). Aunque ambos valores caen numéricamente dentro de los intervalos publicados para Illpa INIA ($4\text{--}15\,^\circ\text{C}$ y $450\text{--}600\text{ mm}$), **no es científicamente válido concluir que las condiciones climáticas son adecuadas** a partir de esta comparación.

Las razones técnicas de esta invalidez son cuatro:

1. **Incompatibilidad de periodos de referencia:** Los datos de NASA POWER corresponden al año calendario completo (enero–diciembre, 366 días). En cambio, Illpa INIA tiene un periodo vegetativo de **140 días**, con siembra referencial en octubre y cosecha en abril. Un acumulado anual de $541{,}2\text{ mm}$ incluye lluvias fuera de campaña y oculta déficits hídricos críticos durante el establecimiento (octubre–noviembre) o la floración y llenado de grano (enero–febrero).
2. **Incompatibilidad de estadísticos climáticos:** La temperatura media anual ($10{,}2\,^\circ\text{C}$) es un promedio aritmético de todo el año. Las fuentes del INIA para Illpa INIA indican «$4\,^\circ\text{C}$ a $15\,^\circ\text{C}$» sin especificar si se trata de un rango de temperaturas medias anuales, medias mensuales, o del intervalo entre temperatura mínima y máxima promedio. En el Altiplano, una media anual de $10{,}2\,^\circ\text{C}$ enmascara heladas radiativas nocturnas (temperaturas mínimas $< 0\,^\circ\text{C}$) capaces de destruir el cultivo en emergencia o floración.
3. **Diferencia de escala espacial (grilla vs. parcela):** NASA POWER entrega estimaciones de reanálisis satelital en celdas de baja resolución espacial ($\approx 0{,}5^\circ \times 0{,}5^\circ$). En Ilave, la cercanía al Lago Titicaca genera gradientes térmicos marcados: una parcela en ladera circunlacustre tiene menor riesgo de helada que una parcela en pampa abierta dentro de la misma celda.
4. **Comparaciones que deben evitarse:** AgroNexa debe evitar contrastar agregados anuales de NASA POWER contra rangos de adaptación de cultivares que carecen de metadatos temporales y estadísticos. Para habilitar reglas climáticas válidas, el sistema necesita:
   * Desagregar NASA POWER a la ventana de la campaña agrícola (ej. octubre–abril) y por etapas fenológicas.
   * Extraer temperaturas mínimas absolutas/diarias para evaluar el riesgo de heladas.
   * Contrastar contra umbrales fisiológicos documentados con periodo y estadístico explícitos (idealmente validados con estaciones locales del SENAMHI).

---

## PARTE II. Ficha completa con las seis decisiones, justificaciones y datos pendientes

### Criterio 1
* **Nombre del criterio:** Antecedente de papa
* **Decisión técnica:** Proponer para aprobación.
* **Justificación agronómica:** Sembrar quinua después de papa es agronómicamente pertinente en el Altiplano porque interrumpe el ciclo biológico de plagas y patógenos específicos de la papa, aprovecha la remoción profunda del suelo realizada durante la cosecha del tubérculo y utiliza la fertilidad residual del abonamiento previo. Sin embargo, este criterio solo **delimita la secuencia evaluada**; no garantiza por sí solo que la parcela sea apta, ya que un cultivo previo de papa con alto uso de herbicidas residuales o pesticidas sintéticos puede comprometer la inocuidad o la emergencia de la quinua.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 2 del PDF, sección «Rotación» («Sembrar después del cultivo de papa»).
  * *Confirmada:* INIA, *Manual técnico: Manejo integrado del cultivo de papa* (2020), §6.1.2 y Figura 11, p. 18 impresa (p. 11 del PDF), donde se establece la secuencia papa → quinua → avena → haba.
  * *Confirmada (contexto Cusco):* INIA, *Manejo integrado del cultivo de quinua en el Cusco* (2018), §7, p. 14 impresa (p. 16 del PDF), que recomienda rotar con tuberosas y advierte sobre el historial libre de residuos tóxicos.
* **Condiciones de aplicación:** Válido para Ilave y para el cultivar Illpa INIA únicamente cuando la papa haya sido el cultivo inmediatamente anterior **en la misma parcela (lote)** y se haya completado su cosecha y limpieza de tubérculos remanentes.
* **Información pendiente:** Registro verificable del historial de cultivos del lote (al menos 1–2 campañas previas) y declaración de uso de herbicidas residuales o agroquímicos en la papa anterior. **Indispensable** para activar la evaluación de la secuencia papa → quinua.
* **Aplicación en AgroNexa:** Puede convertirse en una **regla computacional de precondición (filtro de secuencia)** que habilita el flujo de evaluación papa → quinua, sin otorgar por sí misma un dictamen de aptitud.
* **Nivel de confianza:** **Alto** (para delimitar la secuencia agronómica), respaldado directamente por dos publicaciones oficiales del INIA elaboradas en la EEA Illpa–Puno.

---

### Criterio 2
* **Nombre del criterio:** pH del suelo
* **Decisión técnica:** Proponer para aprobación.
* **Justificación agronómica:** El pH regula la disponibilidad de nutrientes esenciales y la actividad microbiana. El rango de $5{,}5$ a $8{,}0$ publicado para Illpa INIA refleja la amplia tolerancia de la quinua desde suelos moderadamente ácidos hasta ligeramente alcalinos, lo cual es coherente con la diversidad edáfica del Altiplano. No obstante, el rango es descriptivo de la adaptación del cultivar; valores extremos fuera de ese intervalo ($\text{pH} < 5{,}5$ o $> 8{,}0$) incrementan el riesgo de deficiencias nutricionales o toxicidad.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 1 del PDF, sección «Adaptación agroecológica» («pH de suelo: de 5,5 a 8,0»).
  * *Pendiente de verificar directamente:* Catálogo INIA y FAO, p. 38.
* **Condiciones de aplicación:** Válido exclusivamente si el usuario confirma que sembrará **Illpa INIA** en Ilave y cuenta con un valor de pH medido en laboratorio (o equipo calibrado) sobre una muestra compuesta representativa de la capa arable ($0\text{--}20/30\text{ cm}$) de la parcela.
* **Información pendiente:** Confirmación del cultivar, fecha del análisis de suelo, método de medición (ej. relación suelo:agua 1:1 o 1:2,5) y representatividad del muestreo. **Indispensable** para evaluar el criterio; sin análisis medido, el sistema debe abstenerse.
* **Aplicación en AgroNexa:** **Regla candidata** (evaluación booleana de pertenencia al intervalo inclusivo $[5{,}5; 8{,}0]$ condicionada a cultivar = Illpa INIA y dato medido con fecha).
* **Nivel de confianza:** **Medio-Alto**. El rango proviene de la ficha oficial de la EEA Illpa–Puno, pero no especifica el método analítico de pH ni distingue rangos óptimos de rangos de tolerancia marginal.

---

### Criterio 3
* **Nombre del criterio:** Textura de la parcela
* **Decisión técnica:** Proponer para aprobación.
* **Justificación agronómica:** La quinua requiere suelos con equilibrio entre aireación y retención de humedad. Las texturas **franca** y **franco-arenosa** favorecen la emergencia rápida de una semilla pequeña y evitan la asfixia radicular. Por el contrario, los suelos arcillosos pesados presentan problemas de aireación y anegamiento, mientras que los suelos puramente arenosos tienen escasa retención hídrica que perjudica la emergencia y las primeras hojas verdaderas. En Ilave, donde existen tanto laderas como pampas propensas a inundación, la textura por sí sola es insuficiente: **el drenaje debe registrarse y evaluarse por separado**, ya que un suelo franco en pampa baja puede sufrir encharcamiento por napa freática alta o falta de pendiente.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 1 del PDF, sección «Adaptación agroecológica» («Textura del suelo: Franco, franco-arenoso»).
  * *Confirmada (contexto Cusco):* INIA, *Manejo integrado del cultivo de quinua en el Cusco* (2018), §8, p. 14 impresa (p. 16 del PDF), donde se destaca la textura franca con buen drenaje y se desaconsejan suelos muy pesados (arcillosos) o arenosos.
  * *Confirmada (contexto Puno):* INIA, *Manual técnico: Manejo integrado del cultivo de papa* (2020), §5, p. 13 impresa, advierte sobre inundaciones frecuentes en zonas planas o pampas.
  * *Pendiente de verificar directamente:* Catálogo INIA y FAO, p. 38.
* **Condiciones de aplicación:** Válido para Illpa INIA en Ilave cuando se conoce la clase textural de la parcela (mediante análisis granulométrico o prueba al tacto estandarizada) y se acompaña del registro independiente de drenaje.
* **Información pendiente:** Incorporación explícita de la categoría «franco-arenoso» en el formulario de la parcela y validación local de los criterios de interpretación del campo de drenaje en Ilave. **Indispensable** separar textura y drenaje antes de aprobar la regla.
* **Aplicación en AgroNexa:** **Regla candidata** para textura (coincidencia con `franca` o `franco-arenosa` para Illpa INIA), acoplada a una alerta informativa o condición crítica pendiente de validación sobre el drenaje.
* **Nivel de confianza:** **Medio-Alto** para textura (fuente oficial de EEA Illpa–Puno); **Medio** para la interacción textura–drenaje en Ilave (respaldada por literatura de Cusco y manual de papa de Puno, pero sin umbrales cuantitativos locales para quinua).

---

### Criterio 4
* **Nombre del criterio:** Humedad al establecimiento
* **Decisión técnica:** Pedir evidencia.
* **Justificación agronómica:** La germinación y emergencia son fases críticas de la quinua altamente sensibles al estrés hídrico. El plegable de Illpa INIA indica que el sistema es en secano y que la siembra se realiza en octubre «con humedad en el suelo para el establecimiento del cultivo». Sin embargo, **la disponibilidad de riego registrada actualmente en la ficha no es un indicador suficiente** de la humedad real al momento de la siembra: una parcela en secano puede tener humedad adecuada tras las primeras lluvias de octubre, mientras que una parcela con infraestructura de riego podría no tener agua disponible en esa fecha o no haber sido regada antes de sembrar.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 2 del PDF, secciones «Sistema de producción» («En secano») y «Época de siembra» («Octubre, con humedad en el suelo para el establecimiento del cultivo»).
  * *Confirmada (contexto Cusco):* INIA, *Manejo integrado del cultivo de quinua en el Cusco* (2018), §11.1 (p. 19), §12.2 (p. 24) y §12.7 (p. 28), confirman que la germinación y el primer mes son críticos frente a la falta de humedad y que el riego suplementario reduce el riesgo en sequías prolongadas.
* **Condiciones de aplicación:** Solo sería aplicable si se define un protocolo estandarizado para observar o medir la humedad de la cama de siembra ($0\text{--}10\text{ cm}$) en la fecha exacta previa a la siembra en Ilave.
* **Información pendiente:** Protocolo de evaluación en campo (ej. prueba cualitativa al tacto estandarizada o medición volumétrica/gravimétrica), umbrales de humedad mínima y máxima (evitando encharcamiento) y ventana temporal de registro vinculada a la fecha real de siembra. **Indispensable** para cualquier evaluación automatizada.
* **Aplicación en AgroNexa:** Debe permanecer **pendiente de validación (no evaluable)** por el motor de reglas. La disponibilidad de riego debe mostrarse únicamente como atributo contextual separado.
* **Nivel de confianza:** **Bajo** (para formular una regla computacional), ya que las fuentes solo mencionan el requisito de forma cualitativa y sin protocolo de medición.

---

### Criterio 5
* **Nombre del criterio:** Precipitación de referencia
* **Decisión técnica:** Usar como referencia.
* **Justificación agronómica:** El rango de $450$ a $600\text{ mm}$ describe el régimen pluviométrico de adaptación de Illpa INIA en la zona circunlacustre y suni de Puno. No obstante, las fuentes oficiales citadas omiten especificar si este acumulado corresponde al año calendario, al año hidrológico o estrictamente al ciclo vegetativo de 140 días. En el Altiplano, además del volumen total, la distribución temporal de las lluvias (inicio de campaña, veranillos en floración y lluvias extemporáneas en cosecha) determina el éxito o fracaso del cultivo.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 1 del PDF, sección «Adaptación agroecológica» («Precipitación: 450-600 mm»).
  * *Pendiente de verificar directamente:* Catálogo INIA y FAO, p. 38.
* **Condiciones de aplicación:** Válido únicamente como **referencia descriptiva** del cultivar Illpa INIA. No es válido para evaluar la aptitud de una parcela ni para contrastarlo contra acumulados anuales de NASA POWER.
* **Información pendiente:** Fuente científica o técnica (INIA/SENAMHI/FAO) que precise el periodo exacto de acumulación (anual vs. campaña agrícola) y los requerimientos hídricos por etapa fenológica de la quinua en Puno. **Indispensable** antes de diseñar una regla climática.
* **Aplicación en AgroNexa:** **Comparación informativa / referencia documental** (mostrar el rango publicado junto con su limitación explícita, sin ejecutar evaluación automática contra NASA POWER anual).
* **Nivel de confianza:** **Bajo** para evaluación computacional; **Alto** únicamente como transcripción fiel del rango descriptivo publicado por el INIA.

---

### Criterio 6
* **Nombre del criterio:** Temperatura de referencia
* **Decisión técnica:** Usar como referencia.
* **Justificación agronómica:** El intervalo de $4\,^\circ\text{C}$ a $15\,^\circ\text{C}$ publicado para Illpa INIA carece de definición del estadístico climático (no indica si es temperatura media anual, media de campaña, rango entre mínima y máxima media, o temperaturas base/óptima) y del periodo de referencia. Agronómicamente, el principal factor térmico limitante en Ilave no es la temperatura media, sino la ocurrencia e intensidad de **heladas** (temperaturas mínimas absolutas) durante etapas sensibles como emergencia, floración y llenado de grano.
* **Evidencia científica:**
  * *Confirmada:* INIA, Plegable *Quinua ILLPA INIA*, p. 1 del PDF, sección «Adaptación agroecológica» («Temperatura: 4 °C a 15 °C»).
  * *Pendiente de verificar directamente:* Catálogo INIA y FAO, p. 38.
* **Condiciones de aplicación:** Válido exclusivamente como **referencia descriptiva** del cultivar Illpa INIA. No debe utilizarse para contrastar contra la temperatura media anual de NASA POWER.
* **Información pendiente:** Definición del estadístico térmico, ventana temporal (campaña/etapa fenológica) y umbrales de tolerancia a heladas de Illpa INIA validados para Puno. **Indispensable** para formular una regla climática.
* **Aplicación en AgroNexa:** **Comparación informativa / referencia documental**, evitando cualquier veredicto basado en la media anual de NASA POWER.
* **Nivel de confianza:** **Bajo** para evaluación computacional; **Alto** únicamente como transcripción fiel del rango descriptivo publicado por el INIA.

---

## PARTE III. Tabla de reglas agronómicas propuestas para AgroNexa

| ID | Criterio | Variable requerida | Condición propuesta | Fuente | Tipo de evaluación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Antecedente de papa | `cultivo_anterior_lote` (campaña inmediata previa en el mismo lote) | `cultivo_anterior_lote == "papa"` | INIA, Plegable *Illpa INIA*, p. 2; INIA, *Manual de papa*, §6.1.2, p. 18 | Precondición / delimitador de secuencia | **Regla candidata** |
| **R-02** | pH del suelo | `ph_suelo_medido`, `fecha_analisis_ph`, `cultivar_confirmado` | `cultivar == "Illpa INIA"` AND `5.5 <= ph_suelo_medido <= 8.0` | INIA, Plegable *Illpa INIA*, p. 1 | Evaluación de rango edáfico (condicionada a protocolo) | **Regla candidata** |
| **R-03** | Textura de la parcela | `textura_suelo`, `drenaje_observado`, `cultivar_confirmado` | `cultivar == "Illpa INIA"` AND `textura_suelo IN ("franca", "franco-arenosa")` (requiere registro paralelo de drenaje) | INIA, Plegable *Illpa INIA*, p. 1; INIA, *Manual de quinua Cusco*, §8, p. 14 | Evaluación categórica edáfica | **Regla candidata** |
| **R-04** | Humedad al establecimiento | `humedad_suelo_siembra` (observación/medición fechada), `fecha_siembra` | Sin condición formulable hasta definir protocolo de campo y umbrales | INIA, Plegable *Illpa INIA*, p. 2 | Pendiente de definición metodológica | **No evaluable** |
| **R-05** | Precipitación de referencia | `precipitacion_referencia_doc` (no cruzar con NASA POWER anual) | Mostrar rango documental `450–600 mm` indicando periodo indeterminado | INIA, Plegable *Illpa INIA*, p. 1 | Contraste documental informativo | **Referencia documental** |
| **R-06** | Temperatura de referencia | `temperatura_referencia_doc` (no cruzar con NASA POWER media anual) | Mostrar rango documental `4–15 °C` indicando estadístico y periodo indeterminados | INIA, Plegable *Illpa INIA*, p. 1 | Contraste documental informativo | **Referencia documental** |

### Condiciones críticas (potencialmente invalidantes)
En un sistema de apoyo a decisiones agrícolas, ciertas condiciones no deben promediarse ni compensarse con otros criterios favorables:
* **Drenaje deficiente / riesgo de inundación:** En las pampas de Ilave, el anegamiento prolongado causa asfixia radicular y senescencia foliar. Si el drenaje de la parcela se registra como «malo» o «con historial de inundación», el sistema debe emitir una **alerta crítica de restricción severa**, incluso si el antecedente es papa y el pH es óptimo.
* **Residuos tóxicos o herbicidas persistentes:** El *Manual de quinua en el Cusco* (§7, p. 14) advierte que el historial del terreno debe estar libre de residuos tóxicos por agroquímicos. En papa de Puno se emplean herbicidas como metribuzina o combinaciones con linurón/diurón, cuya persistencia puede dañar la germinación de la quinua si se aplicaron fuera de dosis o ventana.

---

## PARTE IV. Mejoras recomendadas para la ficha agrícola y el motor de evaluación

### 1. Campos recomendados para la ficha agrícola de AgroNexa

| Campo / Variable | Clasificación | Justificación técnica |
| :--- | :--- | :--- |
| **Cultivar de quinua** (ej. Illpa INIA, Salcedo INIA, Pasankalla, etc.) | **Obligatorio** | Los rangos de adaptación (pH, textura, ciclo vegetativo, altitud) dependen del cultivar. |
| **Historial de cultivos del lote** (cultivo inmediato anterior y fecha de cosecha) | **Obligatorio** | Indispensable para validar la secuencia `papa → quinua` en el mismo lote. |
| **pH medido + fecha + método** | **Obligatorio** (para evaluar R-02) | Sin medición real y fechada, el motor debe abstenerse de evaluar el criterio químico. |
| **Textura del suelo** (incluir `franco-arenosa` y método: laboratorio vs. tacto) | **Obligatorio** (para evaluar R-03) | Corrige la carencia actual de la ficha y permite contrastar con los requerimientos de Illpa INIA. |
| **Drenaje del lote** (bueno, moderado, deficiente/inundable) | **Obligatorio** | Variable independiente de la textura; crítica en pampas del Altiplano para prevenir asfixia radicular. |
| **Altitud (m s. n. m.) y posición fisiográfica** (ladera vs. pampa) | **Obligatorio** | Illpa INIA se adapta a $3\,815\text{--}3\,900\text{ m s. n. m.}$; la posición fisiográfica determina el riesgo real de heladas e inundación. |
| **Disponibilidad de riego** (secano, riego suplementario, riego permanente) | **Obligatorio** | Contextualiza el riesgo hídrico, pero separado de la humedad a la siembra. |
| **Fecha estimada o real de siembra** | **Obligatorio** (para futuras reglas climáticas) | Permite alinear la ventana de evaluación climática (140 días) con el ciclo real del cultivo. |
| **Humedad al establecimiento** (cualitativa al tacto o volumétrica + fecha) | **Opcional** (hasta definir protocolo) | Necesaria para evaluar R-04 en el futuro; debe registrarse cerca de la siembra. |
| **Historial de agroquímicos en papa** (herbicidas/pesticidas aplicados) | **Opcional** (recomendado) | Permite detectar riesgos de fitotoxicidad residual o incumplimiento de BPA/mercado. |
| **Materia orgánica y NPK (análisis de suelo)** | **Opcional** | Respaldado por el INIA para ajustar la fertilización (ej. dosis referencial 60-40-00 en Illpa INIA). |
| **Condiciones climáticas locales observadas** (incidencia histórica de heladas/granizadas) | **Opcional** | Complementa la baja resolución espacial de NASA POWER con conocimiento local del microclima. |

### 2. Mejoras al motor de evaluación de AgroNexa
* **Alcance explícito en el contrato de reglas:** El esquema `CatalogVersion` debe exigir y filtrar explícitamente por `cultivar` y `distrito/región` (no solo por región y secuencia) para evitar aplicar rangos de Illpa INIA a otros cultivares o zonas.
* **Desacople de agregados anuales de NASA POWER:** Modificar el módulo climático para que, en lugar de entregar promedios/acumulados anuales, consulte series diarias de NASA POWER filtradas por la ventana fenológica de la campaña (ej. octubre–abril) y calcule métricas agronómicas reales (días con $T_{\min} \le 0\,^\circ\text{C}$, precipitación acumulada en establecimiento y floración).
* **Separación estricta entre abstención, referencia y evaluación:** Mantener la arquitectura de fase 6 donde la ausencia de datos de parcela o la falta de definición científica produce un estado de «no evaluable» o «referencia documental», nunca un veredicto de aptitud.

---

## PARTE V. Conclusiones técnicas y bibliografía verificable

### Conclusiones técnicas
1. La rotación **papa → quinua** en Ilave cuenta con sólido respaldo documental del INIA para el Altiplano puneño, pero ninguno de los seis criterios de la ficha puede utilizarse de forma aislada para declarar la aptitud integral de una parcela.
2. Solo tres criterios (**antecedente de papa**, **pH medido** y **textura de la parcela**) tienen base suficiente para formularse como **reglas candidatas**, siempre que se restrinja su alcance a Illpa INIA en Ilave, se incorporen metadatos de medición y se registre el drenaje por separado.
3. Los criterios climáticos (**precipitación** y **temperatura**) deben mantenerse strictly como **referencias documentales**. Comparar los valores anuales de NASA POWER 2024 ($10{,}2\,^\circ\text{C}$ y $541{,}2\text{ mm}$) con los rangos publicados para Illpa INIA ($4\text{--}15\,^\circ\text{C}$ y $450\text{--}600\text{ mm}$) constituye un error metodológico por incompatibilidad de periodo, estadístico y escala espacial.
4. La **humedad al establecimiento** requiere definir un protocolo de observación o medición en campo antes de ser evaluada por el sistema.

### Bibliografía verificable
* **INIA (2013).** *Quinua ILLPA INIA* [Plegable N.° 3]. Estación Experimental Agraria Illpa–Puno, Instituto Nacional de Innovación Agraria. Verificado en el documento adjunto (`Trip-Quinua_Illpa_INIA.pdf`, pp. 1–2). URL institucional: https://repositorio.inia.gob.pe/handle/20.500.12955/79
* **INIA (2020).** *Manual técnico: Manejo integrado del cultivo de papa*. Arcos Pineda, J. H., Mamani Huayta, H., Barreda Quispe, W. L., & Holguin Chuquimamani, V. Estación Experimental Agraria Illpa–Puno, Instituto Nacional de Innovación Agraria. Verificado en el documento adjunto (`MANUAL TÉCNICO - MANEJO INTEGRADO DEL CULTIVO DE PAPA.pdf`, §5 pp. 13–14, §6.1.1–6.1.2 pp. 17–18, Fig. 11). URL institucional: https://repositorio.inia.gob.pe/handle/20.500.12955/1146
* **INIA (2018).** *Manejo integrado del cultivo de quinua en el Cusco*. Estrada Zúñiga, R., Gonza Cusipuma, V. A., Anccasi Casquina, H., & Gallegos Lecca, A. M. Estación Experimental Agraria Andenes–Cusco, Instituto Nacional de Innovación Agraria. Verificado en el documento adjunto (`MANEJO INTEGRADO DEL CULTIVO DE QUINUA EN EL CUSCO_1.pdf`, §5–8 pp. 13–14, §11.1 p. 19, §12.2 p. 24, §12.7 p. 28). URL institucional: https://repositorio.inia.gob.pe/handle/20.500.12955/926
* **INIA y FAO.** *Catálogo comercial de variedades de quinua* («Illpa INIA», p. 38). Referenciado en fuentes documentales institucionales del INIA (URL: https://repositorio.inia.gob.pe/server/api/core/bitstreams/06b66d94-b8d6-432c-b29c-42b5db9de9fb/content).

---

## Resumen de implementación inmediata para AgroNexa

* **Comparaciones documentales informativas (sin veredicto de aptitud):**
  * **Criterio 5 (Precipitación de referencia):** Rango $450\text{--}600\text{ mm}$ para Illpa INIA con advertencia de periodo no determinado; sin cruce directo con acumulado anual de NASA POWER.
  * **Criterio 6 (Temperatura de referencia):** Rango $4\text{--}15\,^\circ\text{C}$ para Illpa INIA con advertencia de estadístico indeterminado; sin cruce directo con temperatura media anual de NASA POWER.
* **Reglas candidatas para validación y aprobación en catálogo:**
  * **Criterio 1 (Antecedente de papa):** Regla precondición (`cultivo_anterior_lote == "papa"`).
  * **Criterio 2 (pH del suelo):** Regla inclusiva ($5{,}5 \le \text{pH} \le 8{,}0$), condicionada a `cultivar == "Illpa INIA"` y análisis fechado.
  * **Criterio 3 (Textura de la parcela):** Regla categórica (`textura IN ["franca", "franco-arenosa"]`), condicionada a `cultivar == "Illpa INIA"` y registro obligatorio de drenaje.
* **Criterios sin evaluación (abstención del motor):**
  * **Criterio 4 (Humedad al establecimiento):** No evaluable hasta definir protocolo de campo. Disponibilidad de riego reservada únicamente como dato contextual.