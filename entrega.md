# Entrega — documentar, commitear y describir una PR con IA

**Herramienta usada:** Claude Code (agente de terminal), a partir del diff de
`etiquetasDeTarea` y el contexto del ticket #305.

Contexto que yo conocía y la IA no: el cambio viene de una incidencia de soporte
(ticket #305) — en el tablero aparecían etiquetas vacías y en orden aleatorio, lo que
confundía a los equipos.

## Paso 1 — TSDoc

**Borrador de la IA** (a partir de solo la firma, sin el contexto del ticket):

```ts
/**
 * Devuelve las etiquetas de una tarea.
 *
 * @param tarea La tarea de la que se obtienen las etiquetas.
 * @returns Un array de etiquetas.
 */
```

Revisión: describe la función antigua (la que devolvía `tarea.etiquetas` sin más). 
No menciona ninguna de las dos operaciones reales (descartar vacías, ordenar
alfabéticamente) — se quedó las dos, no solo una.

**Versión final** (aplicada en [`src/domain/etiquetas.ts`](src/domain/etiquetas.ts)):

```ts
/**
 * Devuelve las etiquetas no vacías de una tarea, ordenadas alfabéticamente.
 *
 * @param tarea Tarea de la que se extraen las etiquetas.
 * @returns Las etiquetas de `tarea` sin las vacías, en orden alfabético.
 */
```

## Paso 2 — Comentario del porqué

```ts
// Se descartan las etiquetas vacías y se ordenan alfabéticamente porque en el tablero
// aparecían en blanco y en orden aleatorio, confundiendo a los equipos (ticket #305).
```

Este comentario no lo podía escribir la IA por su cuenta: el diff por sí solo no dice *por
qué* se filtra y se ordena, solo *qué* se hace. 
El "por qué" viene del ticket de soporte.

## Paso 3 — Mensaje de commit (Conventional Commits)

**Borrador de la IA** (a partir solo del diff, sin el ticket):

```
feat: mejorar etiquetasDeTarea añadiendo filtrado y orden
```

Revisión del tipo: la IA eligió `feat`, pero esto **no es una funcionalidad nueva**, es la
corrección de un comportamiento roto (el tablero mostraba etiquetas vacías y en orden
aleatorio). 
Conventional Commits reserva `feat` para capacidades nuevas y `fix` para corregir un fallo existente; 
este cambio encaja en `fix`. Además el borrador es solo el título: no explica el porqué ni referencia el ticket.

**Versión final:**

```
fix(domain): descartar etiquetas vacías y ordenarlas alfabéticamente

En el tablero aparecían etiquetas en blanco y en un orden aleatorio, lo que
confundía a los equipos. etiquetasDeTarea ahora filtra las etiquetas vacías
y devuelve el resto ordenadas alfabéticamente.

Refs #305
```

## Paso 4 — Descripción de Pull Request

**Borrador de la IA** (a partir del mensaje de commit del paso 3 y el contexto del ticket):

```md
## Qué cambia
Se actualiza la función etiquetasDeTarea para que sea más robusta y eficiente,
mejorando el rendimiento del filtrado de etiquetas.

## Por qué
Para mejorar la calidad del código y la experiencia de usuario.

## Cómo probarlo
Ejecutar los tests.
```

Revisión (¿Qué sobra?): "más robusta y eficiente" y "mejorando el rendimiento" son relleno;
el cambio no toca el rendimiento, solo el contenido y el orden del resultado. "Para mejorar
la calidad del código y la experiencia de usuario" es tan genérico que no dice nada —
tenía el ticket #305 delante y no lo usó. Qué falta: no avisa de que el **orden y el
contenido del array cambian** (afecta a tests/capturas existentes que asuman el orden
original), y "ejecutar los tests" no es un paso reproducible (¿qué tests?, ¿con qué datos?).

**Versión final:**

```md
## ¿Qué cambia?
`etiquetasDeTarea` ahora descarta las etiquetas vacías (o solo espacios) y devuelve el
resto ordenadas alfabéticamente, en vez de devolver `tarea.etiquetas` tal cual.

## ¿Por qué?
El tablero mostraba etiquetas en blanco y en un orden aleatorio, lo que confundía a los
equipos (ticket #305).

## ¿Cómo probarlo?
1. Crear o editar una tarea con etiquetas `["", "urgente", "  ", "backend", "Api"]`.
2. Llamar a `etiquetasDeTarea(tarea)`.
3. Comprobar que el resultado es `["Api", "backend", "urgente"]`: sin las cadenas vacías
   o solo-espacios, en orden alfabético.

## Aviso
El array devuelto ahora puede tener menos elementos y un orden distinto al de
`tarea.etiquetas`. Cualquier test o captura de pantalla que dependiera del orden original
puede necesitar actualizarse.
```

## Paso 5 — Reflexión

En los tres textos la IA acertó el **qué**: a partir del diff describió correctamente que se
filtran etiquetas vacías y se ordenan alfabéticamente, y propuso una estructura razonable. 
Lo que tuve que aportar yo fue siempre el **porqué** y el contexto que no está en el código: 
que el cambio viene de una incidencia real con etiquetas visibles en blanco y desordenadas,
que por eso es un `fix` y no un `feat`, y que el nuevo orden/contenido del array es un
cambio observable que puede romper tests o capturas existentes. 
La IA, sin ese contexto, tiende a rellenar los huecos con generalidades 
("mejora la calidad", "mejora el rendimiento") en vez de reconocer que no lo sabe.
