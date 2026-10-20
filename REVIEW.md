# Review y refactor de `resumenTareas`

## Paso 1-2 — Prompt de revisión y respuesta de la IA

**Prompt usado:**

> Actúa como **revisor de código**, no reescribas la función. Revisa
> `resumenTareas` buscando **bugs y casos límite** (no estilo). Para cada problema que
> encuentres, dame una línea con: `línea — problema — severidad (alta/media/baja)`.
>
> Regla del proyecto: las utilidades numéricas nunca pueden devolver `NaN`; un conjunto vacío
> de tareas debe dar un porcentaje de `0`.

**Respuesta de la IA:**

> - Línea `const porcentaje = Math.round((hechas / tareas.length) * 100);` — con
>   `tareas.length === 0` esto es `hechas / 0` = `NaN` (o `0/0` = `NaN`), y viola la regla
>   del proyecto de no devolver `NaN`. **Severidad: alta.**
> - Bloque `else { if (t.estado === "hecha") { hechas++; } }` — el `if` anidado dentro del
>   `else` es redundante: como `Estado` solo tiene tres valores y ya se han descartado
>   `"pendiente"` y `"en-curso"`, el único caso que llega a ese `else` es `"hecha"`. No es un
>   bug, pero complica la lectura sin necesidad. **Severidad: baja (estilo/mantenibilidad).**
> - El porcentaje se calcula con `Math.round`, que redondea "bancariamente" hacia el par más
>   cercano en `.5` exactos (p. ej. `Math.round(2.5) === 3` pero `Math.round(-2.5) === -2`).
>   Con valores de `hechas` y `tareas.length` siempre no negativos esto no se manifiesta,
>   pero conviene vigilarlo si en el futuro se admiten valores negativos. **Severidad: baja
>   (caso límite teórico, no aplicable con los tipos actuales).**
> - No hay validación de que `tareas` no sea `null`/`undefined`; si llega `undefined`, el
>   `for...of` lanza una excepción antes de llegar al cálculo del porcentaje.
>   **Severidad: media.**

## Paso 3 — Confirmar el bug con un test (rojo)

Test añadido en `src/resumenTareas.test.ts`:

```ts
it('da porcentaje 0 (no NaN) con un array vacío', () => {
  const resultado = resumenTareas([]);
  expect(resultado).toEqual({ pendientes: 0, enCurso: 0, hechas: 0, porcentaje: 0 });
});
```

Ejecución contra el código original (`npx vitest run`):

```
❯ src/resumenTareas.test.ts (1 test | 1 failed)
  × da porcentaje 0 (no NaN) con un array vacío
AssertionError: expected NaN to be +0
```

Confirmado: el test está en rojo con el bug señalado por la IA (severidad alta).

## Paso 4 — Corregir el bug (verde)

Corrección aplicada en `resumenTareas.ts`: antes de dividir, se comprueba si el total es 0.

```ts
export function porcentajeCompletado(hechas: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((hechas / total) * 100);
}
```

Con `total === 0` se devuelve `0` explícitamente sin llegar a dividir, así que nunca puede
salir `NaN`. Ejecución tras el arreglo: el test del paso 3 pasa (ver Paso 6, todos verdes).

## Paso 5 — Refactor asistido

Se pidió a la IA el refactor concreto: extraer `porcentajeCompletado(hechas, total)` y
simplificar el `if` anidado dentro del `else`. Diff aplicado:

```diff
+ export function porcentajeCompletado(hechas: number, total: number): number {
+   if (total === 0) return 0;
+   return Math.round((hechas / total) * 100);
+ }
+
  export function resumenTareas(tareas: Tarea[]) {
    let pendientes = 0;
    let enCurso = 0;
    let hechas = 0;
    for (const t of tareas) {
      if (t.estado === 'pendiente') {
        pendientes++;
      } else if (t.estado === 'en-curso') {
        enCurso++;
      } else {
-       if (t.estado === 'hecha') {
-         hechas++;
-       }
+       hechas++;
      }
    }
-   const porcentaje = Math.round((hechas / tareas.length) * 100);
+   const porcentaje = porcentajeCompletado(hechas, tareas.length);
    return { pendientes, enCurso, hechas, porcentaje };
  }
```

## Paso 6 — Verificar el refactor

Además del test del caso límite, se añadieron dos tests de casos normales y dos para
`porcentajeCompletado`. Ejecución final (`npx vitest run`):

```
✓ src/resumenTareas.test.ts (5 tests) 3ms
  ✓ resumenTareas > da porcentaje 0 (no NaN) con un array vacío
  ✓ resumenTareas > cuenta 2 de 4 tareas hechas como 50%
  ✓ resumenTareas > cuenta todas las tareas hechas como 100%
  ✓ porcentajeCompletado > da 0 cuando el total es 0
  ✓ porcentajeCompletado > redondea al entero más cercano

Test Files  1 passed (1)
     Tests  5 passed (5)
```

Todos los tests están en verde tras el refactor; ninguno cambió de comportamiento.

## Paso 7 — Triaje de las propuestas de la IA

| Propuesta de la IA | Decisión | Motivo |
| --- | --- | --- |
| `NaN` con array vacío (severidad alta) | **Aceptada** | Es el bug real que pedía el ejercicio. Confirmado con un test en rojo antes del arreglo y en verde después. |
| `if` anidado redundante dentro del `else` (severidad baja) | **Aceptada** | Cierto y verificable: `Estado` solo tiene 3 valores, así que tras descartar los dos primeros el `else` ya implica `"hecha"`. Se simplificó como parte del refactor del paso 5, sin cambiar el comportamiento (verificado con los tests). |
| `Math.round` y redondeo "bancario" en negativos (severidad baja) | **Rechazada (investigada y descartada)** | Es cierto que `Math.round` tiene ese comportamiento en general, pero es un **falso positivo** para este código: `hechas` y `tareas.length` nunca son negativos (son contadores), así que el caso que describe no puede darse con los tipos actuales. No se aplicó ningún cambio. |
| Falta de validación de `tareas` `null`/`undefined` (severidad media) | **Rechazada** | La firma tipada es `tareas: Tarea[]`, no `Tarea[] \| null \| undefined`; TypeScript ya impide pasar `null`/`undefined` en tiempo de compilación en las llamadas internas del proyecto. Añadir una comprobación en tiempo de ejecución sería código defensivo para un caso que el sistema de tipos ya descarta, así que no se incorporó. |
