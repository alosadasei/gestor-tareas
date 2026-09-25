# Tarea 05
Mini-Trello del curso: usuarios, equipos y tareas.

URL GitHub: https://github.com/alosadasei/gestor-tareas

Salida de `git log --oneline` tras los cuatro commits del ejercicio:

```
38ab764 Añadir el campo prioridad a Tarea
6459f80 Añadir el campo estado al modelo de Tarea
0f02eb1 Crear el modelo de Tarea del dominio
ef44634 Arrancar el proyecto del Gestor de Tareas
```

Historial solo del fichero `src/domain/tarea.ts` (`git log --oneline src/domain/tarea.ts`):

```
38ab764 Añadir el campo prioridad a Tarea
6459f80 Añadir el campo estado al modelo de Tarea
0f02eb1 Crear el modelo de Tarea del dominio
```

> Nota: en `git log` (sin `--oneline`) el commit más reciente aparece con la decoración
> `(HEAD -> main)`, confirmado con `git log --decorate`.

# Tarea 06

## Paso 1 — Comprobar el punto de partida
**Comandos:**
```
git branch
git log --oneline
```
**Salida:**
```
* main
38ab764 (HEAD -> main, origin/main) Añadir el campo prioridad a Tarea
6459f80 Añadir el campo estado al modelo de Tarea
0f02eb1 Crear el modelo de Tarea del dominio
ef44634 Arrancar el proyecto del Gestor de Tareas
```

## Paso 2 — Primera rama de funcionalidad (fusión limpia)

```
git switch -c feature/estado-por-defecto
```
Se editó `crearTarea` para que `estado` nazca como `'pendiente'` (antes era `''`).
```
git add .
git commit -m "Crear tarea con estado pendiente"
```
**Salida:**
```
[feature/estado-por-defecto fd6795f] Crear tarea con estado pendiente
 1 file changed, 220 insertions(+), 2 deletions(-)
```

```
git switch main
git merge feature/estado-por-defecto
```
**Salida:**
```
Cambiado a rama 'main'
Actualizando 38ab764..fd6795f
Fast-forward
 README.md           | 222 +++++++++++++++++++++++++++++++++++++++++++++++++++-
 src/domain/tarea.ts |   9 +++
 2 files changed, 229 insertions(+), 2 deletions(-)
```

```
git branch -d feature/estado-por-defecto
```
**Salida:**
```
Eliminada la rama feature/estado-por-defecto (era fd6795f)
```


