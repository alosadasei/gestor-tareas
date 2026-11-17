# Reescritura de prompts: de vago a efectivo

Contexto de dominio usado en los tres prompts efectivos:

```ts
interface Tarea {
  id: number;
  titulo: string;
  estado: "pendiente" | "en-curso" | "hecha";
  prioridad: 1 | 2 | 3;
  fechaLimite: string; // fecha ISO, p. ej. "2026-08-15"
  etiquetas: string[];
  subtareas: string[];
}
```

---

## Prompt 1 — "Hazme una función para las tareas urgentes."

### Paso 1 — Diagnóstico

Le faltan casi todos los ingredientes:

- **Objetivo:** no dice qué significa "urgente" — ¿prioridad alta?, ¿fecha cercana?, ¿ambas?
- **Contexto del código:** no da el tipo `Tarea` ni el nombre/firma que debería tener la función.
- **Ejemplos:** ningún caso de entrada/salida.
- **Restricciones:** no dice lenguaje, si puede mutar el array, ni convención de nombres.
- **Formato de salida:** no dice si quiere un array de tareas, de ids, o un booleano por tarea.

### Paso 2 — Prompt efectivo

> **Objetivo:** escribe una función `tareasUrgentes(tareas: Tarea[]): Tarea[]` que devuelva
> solo las tareas **urgentes**, entendiendo por urgente: `prioridad === 1` y
> `estado !== "hecha"`.
>
> **Contexto del código:**
>
> ```ts
> interface Tarea {
>   id: number;
>   titulo: string;
>   estado: "pendiente" | "en-curso" | "hecha";
>   prioridad: 1 | 2 | 3;
>   fechaLimite: string; // fecha ISO, p. ej. "2026-08-15"
>   etiquetas: string[];
>   subtareas: string[];
> }
> ```
>
> **Ejemplo:**
> Entrada: tareas con `{id:1, prioridad:1, estado:"pendiente"}`,
> `{id:2, prioridad:1, estado:"hecha"}`, `{id:3, prioridad:2, estado:"pendiente"}`.
> Salida: `[tarea con id 1]` (la 2 está hecha; la 3 no es prioridad 1).
>
> **Restricciones:** TypeScript, sin librerías externas, no mutar el array `tareas`
> recibido, nombres en español.
>
> **Formato de salida:** solo el código de la función `tareasUrgentes`, tipada, sin
> explicación adicional.

### Paso 3 — Comparación

**Respuesta al prompt vago:**

```ts
function getTareasUrgentes(tasks) {
  return tasks.filter(task => task.priority === 'high');
}
```

**Respuesta al prompt efectivo:**

```ts
function tareasUrgentes(tareas: Tarea[]): Tarea[] {
  return tareas.filter((tarea) => tarea.prioridad === 1 && tarea.estado !== 'hecha');
}
```

| Criterio | Prompt vago | Prompt efectivo |
| --- | --- | --- |
| Nombres reales del dominio | No. Inventa `getTareasUrgentes`, `tasks`, `task.priority === 'high'` (ni `priority` ni `'high'` existen; el campo real es `prioridad: 1\|2\|3`). | Sí. Usa `tareas`, `prioridad`, `estado`, tal cual el `interface Tarea`. |
| Respeta restricciones | No hay restricciones que respetar porque no se dieron; el resultado no está tipado y asume una API de prioridades que no es la del proyecto. | Sí: TypeScript tipado, no muta `tareas`, nombres en español. |
| Cuánto hay que retocar | Reescribirla entera: cambiar nombre, parámetros, tipos y la condición de "urgente" (que además hay que decidir, porque el prompt no la fija). | Nada; se puede copiar tal cual a `src/prompts/tareas.ts`. |

---

## Prompt 2 — "Ordena las tareas."

### Paso 1 — Diagnóstico

- **Objetivo:** no dice el criterio de orden (¿por prioridad?, ¿por fecha?, ¿ascendente o
  descendente?) ni qué hacer con los empates.
- **Contexto del código:** no da el tipo `Tarea` ni el nombre de la función esperada.
- **Ejemplos:** ninguno.
- **Restricciones:** no dice si puede mutar el array original (`Array.prototype.sort` muta
  in-place por defecto, así que es una restricción importante que falta).
- **Formato de salida:** no está claro si se espera el array de tareas ordenado o solo los ids.

### Paso 2 — Prompt efectivo

> **Objetivo:** escribe una función `ordenarPorPrioridad(tareas: Tarea[]): Tarea[]` que
> devuelva un **array nuevo** (sin mutar el original) ordenado por `prioridad` ascendente
> (1 primero) y, a igualdad de prioridad, por `fechaLimite` más cercana primero.
>
> **Contexto del código:** el mismo `interface Tarea` de arriba.
>
> **Ejemplo:**
> Entrada: `{id:1, prioridad:2, fechaLimite:"2026-08-01"}`,
> `{id:2, prioridad:1, fechaLimite:"2026-09-01"}`,
> `{id:3, prioridad:1, fechaLimite:"2026-07-01"}`.
> Salida (por id, en orden): `[3, 2, 1]`.
>
> **Restricciones:** TypeScript, sin librerías externas, no mutar `tareas` (copiar antes de
> ordenar), nombres en español.
>
> **Formato de salida:** solo el código de la función `ordenarPorPrioridad`, tipada.

### Paso 3 — Comparación

**Respuesta al prompt vago:**

```ts
function sortTasks(tasks) {
  return tasks.sort((a, b) => a.priority - b.priority);
}
```

**Respuesta al prompt efectivo:**

```ts
function ordenarPorPrioridad(tareas: Tarea[]): Tarea[] {
  return [...tareas].sort((a, b) => {
    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
    return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
  });
}
```

| Criterio | Prompt vago | Prompt efectivo |
| --- | --- | --- |
| Nombres reales del dominio | No: `sortTasks`, `tasks`, `a.priority` (debería ser `prioridad`). | Sí: `ordenarPorPrioridad`, `tareas`, `prioridad`, `fechaLimite`. |
| Respeta restricciones | No: usa `tasks.sort(...)` directamente, que **muta el array original** — justo el problema que se quería evitar. Tampoco resuelve empates por fecha. | Sí: `[...tareas].sort(...)` no muta el original, y desempata por `fechaLimite`. |
| Cuánto hay que retocar | Reescribirla entera: nombre, tipos, evitar la mutación y añadir el criterio de desempate. | Nada; verificado a mano con el ejemplo del prompt (da `[3, 2, 1]`). |

---

## Prompt 3 — "Arregla el buscador de tareas, que va raro."

### Paso 1 — Diagnóstico

- **Objetivo:** "va raro" no es un objetivo verificable; no dice qué falla ni cómo debería
  comportarse.
- **Contexto del código:** no incluye la función actual del buscador, así que la IA no puede
  saber qué está mal, solo puede adivinar o inventar una función nueva desde cero.
- **Ejemplos:** no hay caso reproducible (entrada, esperado, real).
- **Restricciones:** no dice si hay que mantener la firma pública actual de la función.
- **Formato de salida:** no está claro si se quiere solo el fix o una reescritura completa.

### Paso 2 — Prompt efectivo

> **Objetivo:** corrige un bug reproducible en `buscarTarea` (`src/utils/tareas.ts`).
>
> **Contexto del código (función actual):**
>
> ```ts
> export function buscarTarea(tareas: Tarea[], id: number): Tarea | undefined {
>   return tareas.find((tarea) => tarea.id === id);
> }
> ```
>
> **Caso reproducible:**
> - Entrada: `tareas = [{id: 3, titulo: "X", ...}]`, `id = "3"` (llega como string desde un
>   formulario o un query param, aunque la firma diga `number`).
> - Resultado esperado: encontrar la tarea con `id` `3`.
> - Resultado real: `undefined`, porque `tarea.id === id` compara `3 === "3"` con `===`,
>   que da `false`.
>
> **Restricciones:** mantener la firma pública
> `buscarTarea(tareas: Tarea[], id: number): Tarea | undefined`, TypeScript, sin librerías
> externas, nombres en español.
>
> **Formato de salida:** la función corregida con un comentario de una línea explicando
> el cambio.

### Paso 3 — Comparación

**Respuesta al prompt vago:**

```ts
function search(tasks, query) {
  return tasks.filter(t => t.title.includes(query));
}
```

(La IA, sin el código real ni un caso reproducible, asume que "el buscador" es una búsqueda
de texto por título y reescribe una función distinta a la que realmente falla.)

**Respuesta al prompt efectivo:**

```ts
export function buscarTarea(tareas: Tarea[], id: number): Tarea | undefined {
  // Se normaliza `id` a número por si llega como string desde fuera (formularios, query params)
  const idNumerico = Number(id);
  return tareas.find((tarea) => tarea.id === idNumerico);
}
```

| Criterio | Prompt vago | Prompt efectivo |
| --- | --- | --- |
| Nombres reales del dominio | No: `search`, `tasks`, `t.title` (debería ser `titulo`), y ni siquiera es la función que había que arreglar (`buscarTarea`). | Sí: mantiene `buscarTarea`, `tareas`, `id`. |
| Respeta restricciones | No: cambia la firma pública por completo (otro nombre, otro propósito) y no toca el bug real porque no lo conocía. | Sí: mantiene la firma pedida y soluciona exactamente el caso reproducible dado. |
| Cuánto hay que retocar | Descartarla entera: no es un fix, es una función distinta para un problema que no es el que hay. | Nada; un cambio de una línea que resuelve el caso reproducible. |

---

## Conclusión

En los tres casos el patrón se repite: sin objetivo medible, contexto de código y un caso concreto de entrada/salida, la IA rellena los huecos con suposiciones — nombres en inglés que no existen en el dominio, comportamientos por defecto peligrosos (mutar un array) o, directamente, resolver un problema distinto al real. El prompt efectivo no solo da una respuesta correcta: reduce el retoque posterior a cero en los tres casos.
