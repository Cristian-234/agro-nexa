# Decisiones técnicas

## Fases 0 y 1

- **Catálogo**. Las coordenadas de la especificación se conservan con dos decimales. Se cotejaron con la tabla 21.3 del INEI para Ilave (16°05′13″ S, 69°38′17″ O), la memoria anual municipal para Urubamba (13°18′15″ S, 72°07′00″ O) y la p. 115 del directorio del INEI para Chivay (15°38′25″ S, 71°36′13″ O). Los valores representan puntos públicos de referencia. [INEI, Directorio Nacional de Municipalidades 2022](https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1856/libro.pdf) · [Municipalidad Provincial de Urubamba, Memoria Anual 2024](https://cdn.www.gob.pe/uploads/document/file/8096510/6787662-memoria-anual-2024-_1.pdf?v=1747833983).
- **Persistencia**. Cada corrida exitosa conserva la instantánea normalizada del intervalo exacto y el SHA-256 del JSON recibido. Las observaciones canónicas por variable y día se insertan o actualizan en la misma transacción. Una actualización con nulos conserva las observaciones válidas previas en la tabla canónica. La respuesta de una corrida se construye íntegramente desde su instantánea y permite identificar esos nulos.
- **Calidad**. Los flags de incoherencia térmica mantienen el valor observado. Se transforma el relleno, los valores inválidos y la lluvia negativa en nulos. El umbral de cobertura del 90 % produce una advertencia técnica. Los faltantes recientes admiten una advertencia por posible latencia de publicación.
- **Versionado y resolución**. La identidad del dataset utiliza la versión que declara la API y su conjunto de fuentes. La etiqueta de resolución usa la malla meteorológica nominal cuando la respuesta identifica MERRA-2. Se conserva la geometría original para trazabilidad. [NASA POWER, Data Services](https://power.larc.nasa.gov/docs/services/).
- **Alcance del frontend y de la evidencia**. React, TypeScript, Vite y Tailwind cubren el catálogo web. React Leaflet y Recharts se incorporarán con las pantallas de la fase 3. La descarga CSV de fase 1 se genera con la herramienta de precarga para respaldar la consulta real.
- **Base de datos**. SQLite es el entorno validado. Se dejó la selección de PostgreSQL por `DATABASE_URL` con un controlador opcional y operaciones SQLAlchemy para ambos dialectos. La validación de PostgreSQL queda pendiente de una instancia disponible.

## Fase 2

- **Cálculo**. Los indicadores se derivan de las instantáneas diarias de fase 1. El API redondea a una décima al serializar cada resumen o diferencia. Las operaciones y el umbral de cobertura usan la precisión original. La cobertura por mes o año usa únicamente los días solicitados de cada grupo.
- **Lluvia incompleta**. El acumulado observado conserva estado `partial` cuando hay días faltantes y al menos un valor. Si además queda bajo el umbral, el grupo incluye la advertencia de cobertura. Las diferencias de acumulados se omiten para todos los pares si cualquiera de las localidades seleccionadas tiene cobertura incompleta de lluvia.
- **Comparación**. Se emiten todos los pares en orden de solicitud. Las medias y los conteos usan la intersección de fechas válidas por variable. Los extremos usan los días disponibles por localidad y se advierte cuando las fechas difieren. La comparación verifica la coincidencia de proveedor, producto, estándar, resolución y unidades. Las diferencias de versión de API se señalan con una advertencia.

## Fase 3

- **Datos para gráficos**. `include_series=true` agrega la serie diaria al resumen. `include_monthly=true` agrega los grupos mensuales por localidad a la comparación. Ambos usan las mismas instantáneas que sus indicadores de periodo. El gráfico de lluvia mensual reserva las barras para totales completos y la tabla conserva los parciales con su cobertura.
- **Descarga reproducible**. El CSV y la precarga comparten el serializador. La web fija la corrida por hash de respuesta y fecha UTC de descarga. La fecha evita sustituir la procedencia si el proveedor devuelve contenido idéntico en dos corridas. Los valores ausentes se escriben como campos vacíos y se neutralizan las fórmulas en campos de texto.
- **Cartografía**. React Leaflet dibuja los puntos del catálogo y utiliza teselas estándar de OpenStreetMap para la vista activa. Los marcadores, el selector y las coordenadas permanecen accesibles ante errores del mapa base. [Política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Fase 4

- **Catálogo**. La migración 0002 carga los cultivos papa y quinua y crea el catálogo versionado vacío. Las referencias institucionales se documentan como bibliografía. La publicación local solo inserta versiones nuevas. [Fuentes y proceso de incorporación](AGRONOMIC_SOURCES.md).
- **Abstención**. El motor usa exclusivamente reglas aprobadas de una versión aprobada. Un criterio crítico desconocido, un catálogo inválido o una cobertura insuficiente dejan la puntuación nula. Una falla crítica se informa como restricción, con puntuación y posición nulas. Se excluyen del denominador los criterios fuera de la región o de una secuencia conocida. Si falta el cultivo anterior para comprobar una secuencia, el criterio queda desconocido.
- **Comparabilidad**. Se ordenan las alternativas cuando sus criterios, variables, operadores, unidades, pesos, criticidad y disponibilidad de evidencia son equivalentes. Los umbrales aprobados pueden variar por cultivo. A igual puntuación visible, se comparte posición. Para esquemas distintos se conserva la evaluación individual y se advierte la diferencia.
- **Evidencia climática**. Se reutilizan los indicadores del periodo sin redondear sus valores antes de aplicar una regla. Quedan fuera los datos con banderas de calidad en la variable, los totales parciales de lluvia y las series con caché desactualizada. Si el proveedor falla, el criterio queda desconocido. Solo se consulta clima cuando una regla aprobada y aplicable lo necesita.
- **Privacidad**. La ficha se procesa durante la solicitud y se devuelve con `Cache-Control: no-store`. Las notas libres quedan en la ficha y se excluyen de la respuesta y de la base de datos. Los enlaces mantienen únicamente la localidad pública y el periodo.

## Fase 5

- **Demo reproducible**. Se usa una base SQLite dedicada, migrada desde cero, con el catálogo agronómico inicial. El dataset publicado como evidencia contiene los CSV y el manifiesto de la precarga. La base SQLite y el entorno de compilación permanecen como archivos locales ignorados.
- **Regresión integral**. `npm run test:demo` reutiliza las verificaciones de clima y abstención en un navegador con los mismos filtros y la misma precarga. El contraste independiente desde CSV verifica el cálculo de indicadores y diferencias por separado.
- **Disponibilidad**. El ensayo de caché usa una API local con salida externa bloqueada mediante un proxy de prueba. La cartografía tiene un recorrido adicional con teselas bloqueadas para comprobar su modo de selección alternativo.

## Fase 6

- **Procedencia**. La revisión 0003 conserva en SQLite el catálogo bibliográfico `illpa-inia-ilave-v1` con página o sección y ámbito. Las observaciones anónimas de la ficha se procesan durante la solicitud, con `Cache-Control: no-store`. Los filtros compartibles siguen limitados a localidad y periodo.
- **Compatibilidad**. El contraste preliminar tiene endpoints y estados propios. La evaluación general usa la textura de la ficha básica. El contraste bibliográfico puede reutilizarla o usar una textura elegida expresamente, incluida `sandy_loam` para franco-arenosa.
- **Abstención**. Las coincidencias describen las referencias usadas en Ilave. Los rangos climáticos carecen de definición temporal y se devuelven con información insuficiente. Drenaje y humedad requieren un criterio local antes de contrastarse. El catálogo aprobado y la puntuación de rotaciones conservan su flujo.
- **Diagnóstico de Ilave**. La revisión 0004 publica una versión bibliográfica nueva con metadatos de procedencia y clasificación. El cotejo de las citas no aprueba reglas. El historial del mismo lote se ordena desde el antecedente inmediato. El pH requiere método declarado y la textura requiere un registro de drenaje independiente. Los campos nuevos son opcionales en la API y la ausencia de datos produce abstención por criterio.
- **Ventana climática configurable**. La interfaz reutiliza el resumen de NASA POWER por periodo. Las fechas de consulta son históricas y el usuario las elige por separado. La ficha prescinde de esos agregados para evaluar criterios agronómicos o inferir fenología y daños.

## Rediseño de interfaz

- **Navegación y estado**. La barra colapsable y el menú modal usan enlaces y controles nativos. El encabezado indica disponibilidad de la API tras una respuesta válida del catálogo de localidades. Las consultas climáticas completadas guardan solo sus fechas en `sessionStorage` para mostrarlas en Inicio.
- **Visualización**. La tabla diaria pagina en el navegador. La exportación conserva el periodo completo y su procedencia. Las tarjetas y los gráficos usan la respuesta original de la API de clima. La ficha de rotaciones añade una vista de resultados y reutiliza los endpoints existentes.
- **Recursos visuales**. Inter se sirve desde `frontend/public/assets/InterVariable.woff2` con licencia OFL. Los iconos son componentes SVG locales. El recurso generado `frontend/public/assets/paisaje-andino.webp` se identifica en pantalla como ilustrativo. [Proyecto Inter](https://rsms.me/inter/).

Prompt de la portada en la herramienta integrada de generación de imágenes.

> Editorial aerial landscape photograph for a Peruvian agricultural data platform. Panoramic wide 3:2 crop of the Andean highlands, Peru-inspired, quilt of small irregular emerald and sage agricultural parcels below layered distant mountains, rural dirt footpaths, subtle warm amber late-afternoon light, documentary realism and fine natural texture, no identifiable exact landmark. Image is the right-hand side of a split editorial hero so fill the whole image with scenery, foreground fields clearly defined, mountain ridge high enough to remain visible when cropped. Restrained colors, no people, text, graphics, overlays, logos, watermarks.

## Simulación de rotaciones

La demostración interactiva usa fixtures TEST generados con las funciones del motor. Las reglas solo se activan en memoria durante la generación. El navegador carga los resultados precalculados en una vista separada del formulario agrícola. El catálogo de la evaluación real exige aprobación y evidencia.

## Mapa de capas y contexto de parcela

- El mapa abre con el encuadre de los tres puntos. Los botones de vista controlan el acercamiento y el regreso al encuadre general. El selector de capas usa un control nativo para manejarlo con teclado y con la interfaz táctil del navegador. Leaflet muestra los créditos de las capas activas y usa los metadatos publicados por cada proveedor. [OpenStreetMap](https://www.openstreetmap.org/copyright) · [Esri satelital](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson) · [Esri referencia híbrida](https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer?f=pjson) · [Esri topográfico](https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=pjson).
- La ficha muestra el contexto declarado desde el estado local de React. La respuesta de evaluación conserva su esquema y la API valida el orden de siembra y cosecha cuando se suministran ambas fechas.

## Matriz documental y cuestionario de siembra

Los campos nuevos del asistente se envían como `planting_answers` opcional en la API existente. El perfil de cada cultivo se añade a la tabla actual. El historial declarado, las fechas aproximadas, los resultados de laboratorio que declara el usuario y el clima de NASA POWER tienen procedencias diferenciadas. La evaluación de campo sigue usando las reglas aprobadas. La matriz regional v0.3 se consulta como referencia versionada en borrador y no interviene en la puntuación.

Se conservan las respuestas del asistente en memoria de la página. La URL conserva la localidad y el periodo climático. El backend devuelve versión y trazabilidad de la evaluación. El usuario puede descargar un JSON con entradas estructuradas, resultado y resumen climático, si está disponible. La descarga excluye nombres libres de otros cultivos, notas del suelo y notas históricas y sanitarias. El formulario no requiere una cuenta.
