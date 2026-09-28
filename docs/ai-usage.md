# Uso de IA en este proyecto

## Herramienta adoptada

**Claude Code**, como agente de terminal integrado en el editor. Se usa para:

- Generar primeras propuestas de funciones del gestor de tareas (`src/utils/`, `src/domain/`)
  a partir de una firma tipada y un comentario de intención.
- Explicar y explorar código existente en el repositorio.
- Ayudar en tareas de git (mensajes de commit, resolución de conflictos, flujo de PRs).

## Regla de trabajo

**El asistente propone, nosotros decidimos.** Ninguna sugerencia del asistente se incorpora
al código sin revisión: para cada propuesta se decide explícitamente si se **acepta**, se
**edita** o se **rechaza**, y esa decisión (con su justificación) queda registrada — ver
[`EVALUACION.md`](../EVALUACION.md) para un ejemplo concreto. Se presta especial atención a:

- Tipos de retorno incorrectos o implícitos (`any`).
- Reglas de negocio inventadas que no están en el dominio ni se han pedido.
- Casos límite no cubiertos (división entre cero, colecciones vacías, valores `undefined`).
- Métodos o propiedades que no existen en el proyecto.
- Nombres o convenciones fuera del dominio en español que usa este proyecto.

## Datos que nunca se envían a un modelo externo

- Claves, tokens y credenciales (API keys, tokens de GitHub, contraseñas).
- El contenido de `.env` o cualquier fichero de variables de entorno.
- Datos personales de usuarios reales (nombres, emails, direcciones, cualquier dato identificable).
- Secretos de configuración de infraestructura (cadenas de conexión a bases de datos, certificados).

## Nota — pair programming en `tareasVencidas`

Usé el chat para arrancar `tareasVencidas`, que filtra tareas por fecha límite vencida. El chat propuso comparar fechas con `getTime()` (correcto), pero olvidó excluir las tareas con estado `"hecha"`, así que devolvía `[1, 3, 4]` en vez de `[1, 4]` con los datos de prueba. Lo detecté ejecutando la función y comparando el resultado con el
esperado antes de aceptar el código; corregí añadiendo la comprobación de estado. Ver [`verificacion.md`](../verificacion.md) para el detalle completo.

## Plantillas de prompt

Plantillas reutilizables extraídas de los prompts efectivos que mejor funcionaron — ver
[`prompts.md`](../prompts.md) para el diagnóstico y la comparación completos.

### Función pura sobre `Tarea[]`

`````
Objetivo: escribe una función `{nombreFuncion}({parametros}): {tipoRetorno}` que
{qué hace, con el criterio exacto — p. ej. "solo las tareas con estado === 'X'"}.

Contexto del código:
```ts
interface Tarea { ... } // pega solo el tipo relevante, no el repo entero
```

Ejemplo:
Entrada: `{ejemplo de entrada concreto}`
Salida: `{ejemplo de salida esperada}`

Restricciones: TypeScript, sin librerías externas, no mutar {qué no debe mutar},
nombres en español.

Formato de salida: solo el código de la función `{nombreFuncion}`, tipada, sin
explicación adicional.
`````

### Corregir un bug reproducible

`````
Objetivo: corrige el bug de `{nombreFuncion}` en `{ruta del fichero}`.

Contexto del código (función actual):
```ts
{pega aquí solo la función afectada, no el fichero entero}
```

Caso reproducible:
- Entrada: `{entrada concreta}`
- Resultado esperado: `{qué debería pasar}`
- Resultado real: `{qué pasa de verdad, con el valor o error incorrecto}`

Restricciones: mantener la firma pública `{firma actual}`, TypeScript, nombres en
español.

Formato de salida: la función corregida con un comentario de una línea explicando
el cambio.
`````

## Generación y verificación de tests con IA

**Herramienta y para qué:** Claude Code, para generar un primer lote de tests con Vitest de
`resumenEquipo` a partir de un prompt con la firma, los tipos, la regla de negocio ("equipo sin tareas → `porcentajeHechas: 0`") y la lista de casos a cubrir — prompt completo en [`docs/prompts/resumen-equipo.md`](prompts/resumen-equipo.md).

**Protocolo de verificación aplicado al lote generado** (no se acepta ningún test a ciegas):

1. **Test tautológico detectado.** `"calcula el porcentaje de hechas"` recalculaba el valor
   esperado con `Math.round((hechas / tareas.length) * 100)`. Ese test pasa siempre que 
   el código sea internamente consistente consigo mismo porque compara el resultado
   contra una copia de sí misma en vez de contra un valor independiente. Se reescribió con
   el valor esperado a mano para 1 de 2 tareas hechas.
2. **Caso límite ausente.** El lote no incluía equipo sin tareas, pese a ser
   la regla de negocio explícita del prompt. Se añadió
   `resumenEquipo([]) → { total: 0, hechas: 0, porcentajeHechas: 0 }`.
3. **El caso límite destapó un fallo real.** Al ejecutarlo contra el código original, el test
   salió en rojo: `porcentajeHechas` devolvía `NaN` en vez de `0`, porque `hechas / total` es
   `0 / 0` cuando la lista está vacía.
4. **Decisión: el código estaba mal.** El test expresa literalmente la
   regla de negocio dada ("un equipo sin tareas debe dar `porcentajeHechas: 0`"), así que
   se corrigió `resumenEquipo` añadiendo una guarda (`total === 0 ? 0 : ...`) en vez de
   relajar el test. Tras el arreglo, los 3 tests (incluido el tautológico ya reescrito)
   pasan en verde.

**La prueba de la prueba:** se rompió la fórmula a propósito (`hechas / (total + 1)` en vez
de `hechas / total`) y se ejecutó la suite. El test que lo detectó fue
`"calcula el porcentaje de hechas"`, que pasó a dar `33`. 
Se deshizo el cambio y se verificó que los 3 tests volvían a estar en verde.

## Cierre — sesión de vibecoding controlada

Entrada final del proyecto, tras usar vibecoding para `tareasAtrasadasPorUsuario`
(ver [`sesion.md`](../sesion.md) para el prompt, la respuesta de la IA y la corrección).

### 1. Herramientas y para qué las usamos

- **Claude Code** (agente de terminal): generar el primer borrador de una función a partir
  de una petición en lenguaje natural, escribir los tests que comprueban lo que la función
  *debería* hacer, y redactar el mensaje de commit.
- **Vitest**: ejecutar esos tests y confirmar en rojo/verde tanto el bug detectado como la
  corrección, además de que el commit final se guarda con la suite en verde.

### 2. Reglas de uso

- **Regla del aprendiz:** no se da por bueno ningún código generado por la IA que no
  podamos explicar línea a línea, como si lo hubiéramos escrito nosotros. Si no se puede
  justificar por qué está escrito así, no se acepta tal cual.
- **El asistente propone, nosotros decidimos** (ver arriba): toda función generada se lee
  buscando huecos concretos — casos raros (array vacío, campos opcionales ausentes) y
  tipos poco estrictos (asserts `!` que ocultan un caso en vez de tratarlo) — y se cubre con
  un test que compruebe el comportamiento esperado, no el que ya tiene el código.
- Un test que nunca se ha visto fallar no demuestra nada: antes de dar el trabajo por
  cerrado, se rompe la función a propósito y se confirma que al menos un test se pone en
  rojo.
- El trabajo se guarda en commits pequeños, con la suite de tests en verde, nunca a medias.

### 3. Datos que NUNCA se envían a modelos externos

- Secretos, claves de API, tokens y contraseñas.
- El contenido de `.env` o cualquier fichero de variables de entorno.
- Datos personales reales de las personas usuarias del Gestor de Tareas (nombres, emails,
  tareas o equipos reales de producción).
- **Cómo pedir ayuda sin exponerlos:** se describe el problema con datos de ejemplo
  inventados — como los responsables `"Ana"` y `"Bruno"` y las fechas relativas (`ayer()`,
  `mañana()`) usados en este mismo ejercicio — nunca con un volcado real del gestor.
