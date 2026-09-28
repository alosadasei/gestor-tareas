# Sesión de vibecoding controlada — `tareasAtrasadasPorUsuario`

## Paso 1 — Prompt y primera respuesta de la IA

**Prompt usado:**

> En TypeScript, escríbeme una función `tareasAtrasadasPorUsuario(tareas)` que, dado el
> array de `Tarea` de un equipo, devuelva un objeto con el número de tareas atrasadas por
> cada responsable. Una tarea está atrasada si su `fechaLimite` ya pasó y su `estado` no es
> `"hecha"`. El tipo `Tarea` tiene `id`, `titulo`, `estado`
> (`"pendiente" | "en-curso" | "hecha"`), `prioridad`, `fechaLimite` (opcional) y
> `responsable` (el nombre de la persona asignada).

**Primera respuesta de la IA, tal cual:**

```ts
type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
  fechaLimite?: Date;
  responsable: string;
};

export function tareasAtrasadasPorUsuario(tareas: Tarea[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const hoy = new Date();
  for (const tarea of tareas) {
    if (tarea.fechaLimite! < hoy) {
      resultado[tarea.responsable] = (resultado[tarea.responsable] || 0) + 1;
    }
  }
  return resultado;
}
```

## Paso 2 — Leer y entender

**1. ¿Qué hace, línea a línea?** Declara un objeto `resultado` vacío que irá acumulando el
recuento por responsable, y captura `hoy` una sola vez fuera del bucle. Recorre cada
`tarea`; si su `fechaLimite` (forzada con `!` a no ser `undefined`) es anterior a `hoy`, suma
uno a la entrada de `resultado` correspondiente a `tarea.responsable` (inicializándola a `0`
con `|| 0` si es la primera vez que aparece ese responsable). Al final devuelve `resultado`.

**2. ¿Por qué está escrita así?** Usa un `for...of` con acumulador porque el resultado no es
un array del mismo tamaño que la entrada, sino un objeto agrupado por una clave dinámica
(`responsable`), que no sale directamente de un `map`/`filter`. 
El `!` sobre `fechaLimite` nos dice que la IA asumió que siempre habría una fecha límite presente.

**3. ¿Qué pasa en los casos raros?**

- **Array vacío:** `tareasAtrasadasPorUsuario([])` devuelve `{}`. Correcto, no hace falta
  tocar nada.
- **Tarea sin `fechaLimite`:** en JavaScript, `undefined < hoy` no lanza ninguna excepción
  (se convierte a `NaN` y cualquier comparación con `NaN` da `false`), así que en la
  práctica esa tarea nunca se cuenta como atrasada. Funciona por una coincidencia del
  lenguaje, no porque la función lo decida.
- **Tarea `"hecha"` con fecha pasada:** **aquí hay un hueco real.** La función nunca
  comprueba `tarea.estado`, así que cuenta como atrasada una tarea que ya está terminada.

**Qué corregí y por qué** (ver comentario en [`src/tareasAtrasadasPorUsuario.ts`](src/tareasAtrasadasPorUsuario.ts)):

1. Añadí `if (!tarea.fechaLimite) continue;` El comportamiento es el mismo (no cuenta), 
   pero ahora es una decisión legible en el código, no un efecto colateral de JavaScript.
2. Añadí `if (tarea.estado === 'hecha') continue;`, que es el hueco real: sin esto, una
   tarea terminada y vencida se contaba como atrasada.

## Paso 3 — Cubrir con un test

Tests en [`tests/tareasAtrasadasPorUsuario.test.ts`](tests/tareasAtrasadasPorUsuario.test.ts)
(4 casos: normal con dos responsables, array vacío, tarea "hecha" con fecha pasada, tarea
sin `fechaLimite`). Ejecutados con `npx vitest run`: los 4 pasan.

**Prueba de la prueba:** quité a propósito la comprobación `if (tarea.estado === 'hecha') continue;`
del código y volví a ejecutar la suite. El test
`"no cuenta una tarea 'hecha' aunque su fecha límite haya pasado"` se puso en rojo:

```
AssertionError: expected { Ana: 1 } to deeply equal {}
```

Confirma que ese test prueba algo real, no un tautológico. Deshice el cambio y volví a
ejecutar: los 4 tests en verde de nuevo (`npx tsc --noEmit` también limpio en todo el
proyecto).

## Paso 4 — Commit

Mensaje propuesto: `feat: contar tareas atrasadas por usuario (con tests)`.
