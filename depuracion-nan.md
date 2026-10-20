# Depuración: `NaN%` en un equipo sin tareas

## Paso 1 — Reproducir y aislar

**Caso mínimo reproducible** (datos inventados, ningún equipo real):

```ts
const tareas: Tarea[] = []; // equipo recién creado, sin tareas todavía
porcentajeCompletado(tareas);
```

**Qué devuelve:** `NaN`.

**Por qué:** dentro de la función, `hechas` es `0` (no hay tareas, así que el `filter` da un
array vacío) y `tareas.length` también es `0`. La línea `Math.round((hechas / tareas.length) * 100)`
nos da un `0 / 0`. En JavaScript, `0 / 0` no lanza una excepción ni da `Infinity`: 
da `NaN` (no-es-un-número), y cualquier operación aritmética que involucre
un `NaN` se propaga como `NaN`. Por eso no hay ninguna excepción roja en consola: 
`NaN` es un valor numérico válido para el tipo `number`, así que TypeScript no se queja, 
y el valor simplemente llega hasta la pantalla como texto `"NaN%"`.

Verificado ejecutando el código real:

```
> 0 / 0
NaN
> Math.round(NaN)
NaN
```

## Paso 2 — Reporte para la IA

> **Comportamiento observado:** al abrir el tablero de un equipo recién creado (sin
> ninguna tarea todavía), la interfaz muestra `NaN%` en vez de `0%`. No hay ninguna
> excepción en consola, solo el valor `NaN` llegando hasta la pantalla.
>
> **Código relevante:** src/service/estadisticas.ts
>
> **Esperado frente a real:** con un equipo sin tareas (`tareas = []`) se espera
> `porcentajeCompletado([])` `=== 0`. En la práctica devuelve `NaN`.
>
> **Qué he probado:** he reproducido el fallo con un caso mínimo, `porcentajeCompletado([])`,
> y confirmado que devuelve `NaN`. Con equipos que sí tienen tareas la función funciona
> bien (por ejemplo, 2 de 4 tareas hechas da `50`), así que el problema aparece
> específicamente cuando `tareas.length` es `0`.
>
> **Pregunta:** ¿cuál es la causa de que esta función devuelva `NaN` en vez de un número
> válido cuando no hay tareas, y cómo debería tratarse ese caso para que no vuelva a pasar
> en otras funciones parecidas del proyecto?

## Paso 3 — Evaluar la causa propuesta

**Causa propuesta por la IA:** *"Divides entre `tareas.length`, que es 0 cuando no hay tareas, y
dividir entre 0 da `NaN`. Solución: envuelve el resultado con `|| 0`."*

**¿Encaja la causa con lo observado?** Sí, encaja exactamente. Es la misma causa que
aislé a mano en el paso 1. No hay ninguna excepción porque `NaN` es un `number` válido para TypeScript.

**¿El arreglo `|| 0` corrige la causa raíz o solo tapa el síntoma?** Solo tapa el síntoma.
El parche funciona en este caso concreto por una coincidencia útil: 
el único resultado inválido que puede salir de esta fórmula es `NaN`, y `NaN || 0` da `0`, 
que es justo el valor deseado. Pero el arreglo no dice en ningún
sitio *"si no hay tareas, el avance es 0%"*; sigue calculando `0 / 0` (una operación sin
sentido matemático) y luego limpia el resultado basura. 
Es frágil como patrón general: si mañana `porcentajeCompletado` (o cualquier función parecida) 
devolviera legítimamente algo distinto de `0`/`NaN` que también fuera
falso en otro contexto, `|| 0` lo sustituiría igual, silenciando un bug real en vez de un
caso límite. La corrección de la causa raíz es tratar "sin tareas" como una regla de negocio
explícita **antes** de dividir, no interceptar el resultado después.

## Paso 4 — Verificar y corregir

Se aplicó la corrección de causa raíz (guarda explícita para "sin tareas") en
[`src/services/estadisticas.ts`](src/services/estadisticas.ts). 
Verificado contra el caso mínimo del paso 1 y contra un caso con tareas en
[`src/services/estadisticas.test.ts`](src/services/estadisticas.test.ts) (ejecutado con
`npx vitest run`, ambos tests en verde):

```
✓ porcentajeCompletado > da 0 (no NaN) con un equipo sin tareas
✓ porcentajeCompletado > calcula el porcentaje correcto con un equipo que sí tiene tareas
```

## Paso 5 — Política de datos

Si este error se hubiera reportado a una IA externa, **no** debería haber incluido: 
- Los títulos o descripciones reales de las tareas de un equipo (pueden contener información de clientes o de trabajo interno) 
- El nombre o identificador real del equipo o de la organización, ni los ids o nombres de los usuarios asociados a esas tareas. 
Nada de eso es necesario para diagnosticar un bug puramente aritmético.
