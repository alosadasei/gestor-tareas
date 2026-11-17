# INFORME.md

- **Issue:** #1
- **Pull Request:** #2
- **Cierre automático:** Captura 01.png

## Orden de las reglas del CODEOWNERS

En `.github/CODEOWNERS` la regla general (`*`) va **arriba** y la específica
(`src/domain/ @alosadasei`) va **debajo**, no al revés. La razón es cómo GitHub resuelve
CODEOWNERS: para cada fichero recorre el listado de arriba abajo y se queda con la
**última** regla que coincide con su ruta, no con la primera. Como el patrón `*` coincide
con *cualquier* ruta —incluida `src/domain/tarea.ts`— si la regla específica se colocara
por encima, la regla general la sobrescribiría al ser la última en coincidir, y el modelo de
dominio acabaría asignado solo a los revisores genéricos. Poniendo la específica al final,
es ella la que "gana" para los ficheros de `src/domain/`, mientras que el resto del
repositorio sigue cubierto por la regla general.
