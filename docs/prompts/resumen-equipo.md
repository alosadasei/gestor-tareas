# Prompt — tests de `resumenEquipo`

> Genera tests con **Vitest** para la siguiente función. Cubre camino feliz y casos límite,
> no solo el camino feliz.
>
> Contexto: `lib/utils/equipo.ts`
>
> Regla de negocio: **un equipo sin tareas debe dar `porcentajeHechas: 0`** (nunca `NaN`).
>
> Casos a cubrir, uno por test:
> 1. Camino feliz: varias tareas con estados mixtos, comprobando `total`, `hechas` y
>    `porcentajeHechas`.
> 2. Todas las tareas hechas → `porcentajeHechas: 100`.
> 3. Ninguna tarea hecha → `porcentajeHechas: 0`.
> 4. Lista vacía (sin tareas) → `total: 0`, `hechas: 0`, `porcentajeHechas: 0`.
> 5. Un caso de redondeo no exacto (por ejemplo 1 de 3 hechas → `33`, no `33.33...`).
>
> Cada `expect` debe comparar contra un **valor esperado escrito a mano** (un número
> literal), no recalculado llamando a la misma lógica que hay dentro de `resumenEquipo`.
