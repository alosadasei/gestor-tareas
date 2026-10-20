# Verificación: `tareasVencidas`

## Paso 1 — Prompt y respuesta literal del chat

**Prompt usado:**

> Dame una función `tareasVencidas(tareas)` que devuelva las tareas cuya `fechaLimite` ya
> haya pasado. Utiliza el tipo `Tarea` definido en `src/domain/tarea.ts`
> La función recibe también `hoy: Date` para poder probarla con una fecha fija.

**Respuesta literal del chat:**

> Para comparar `fechaLimite` con la fecha de hoy sin arrastrar problemas de comparar
> cadenas de texto, lo mejor es convertir ambos lados a milisegundos con `getTime()` y
> comparar esos dos números:
>
> ```ts
> function tareasVencidas(tareas: Tarea[], hoy: Date): Tarea[] {
>   return tareas.filter((tarea) => new Date(tarea.fechaLimite).getTime() < hoy.getTime());
> }
> ```
>
> Esto te devuelve todas las tareas cuya fecha límite ya quedó atrás respecto a `hoy`.

## Paso 2 — Las tres preguntas

1. **¿Entiendo la función línea a línea?** Sí. Recorre `tareas` con `filter`, convierte `tarea.fechaLimite` en un `Date` y compara su timestamp con el de `hoy` (`getTime()`). Si el de la tarea es menor, la tarea entra en el resultado.

2. **¿Existe de verdad todo lo que usa?** Sí. `new Date(string)`, `.getTime()` y `Array.prototype.filter` son APIs nativas de TypeScript. No se inventa ningún método ni propiedad.

3. **¿Da el resultado correcto con los datos de prueba?** No. Con `hoy = 2026-07-12`
   devuelve `[1, 3, 4]` en vez de `[1, 4]` (ver Paso 3).

## Paso 3 — Ejecución y error cazado

Ejecutando `tareasVencidasChat(tareas, hoy)` con `hoy = new Date('2026-07-12')`:

```
Esperado: [1, 4]
Obtenido: [1, 3, 4]
```

**Explicación del error:** la comparación de fechas en sí es correcta. El problema es que la función **nunca comprueba `tarea.estado`**. La tarea 3 tiene `fechaLimite: "2026-07-05"`, lo que la calificaría como vencida de no ser porque su `estado` tiene valor `"hecha"`, y una tarea ya terminada no debería contar como "vencida". Claude asumió  que "vencida" depende solo de la fecha, ignorando elestado. Es un error plausible: el código compila, no lanza excepciones y usa una API real, pero da un resultado incorrecto para cualquier tarea vencida y ya cerrada.

## Paso 4 — Corrección
**Corrección:** Vamos a añadir una comprobación de que la tarea no está hecha antes de comparar los timestamps.

```ts
function tareasVencidas(tareas: Tarea[], hoy: Date): Tarea[] {
  return tareas.filter(
    (tarea) => tarea.estado !== 'hecha' && new Date(tarea.fechaLimite).getTime() < hoy.getTime()
  );
}
```

```
Esperado: [1, 4]
Obtenido: [1, 4]
```
