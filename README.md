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

## Paso 3 — Provocar el conflicto

Desde `main`, cambiar valor por defecto de `estado` a `'pendiente-de-revision'` (simulando
el cambio de un compañero):
```
git add .
git commit -m "Cambiar el estado por defecto a pendiente-de-revision"
```
**Salida:**
```
[main be89dfc] Cambiar el estado por defecto a pendiente-de-revision
 2 files changed, 10 insertions(+), 150 deletions(-)
```

Crear `feature/estado-inicial` a partir del commit **anterior** a ese cambio (`fd6795f`,
antes de "pendiente-de-revision"):
```
git switch -c feature/estado-inicial fd6795f
```
En esa rama se cambió la misma línea a `'por-hacer'`:
```
git add src/domain/tarea.js
git commit -m "Fijar el estado inicial en por-hacer"
```
**Salida:**
```
[feature/estado-inicial 5103461] Fijar el estado inicial en por-hacer
 2 files changed, 2 insertions(+), 141 deletions(-)
```

Vuelta a `main` y fusión:
```
git switch main
git merge feature/estado-inicial
```
**Salida:**
```
Cambiado a rama 'main'
Auto-fusionando src/domain/tarea.ts
CONFLICTO (contenido): Conflicto de fusión en src/domain/tarea.ts
Fusión automática falló; arregle los conflictos y luego realice un commit con el resultado.
```

## Paso 4 — Resolver el conflicto paso a paso

```
git status
```
**Salida (fragmento relevante):**
```
En la rama main
Tu rama está adelantada a 'origin/main' por 3 commits.
  (usa "git push" para publicar tus commits locales)

Tienes rutas no fusionadas.
  (arregla los conflictos y ejecuta "git commit")
  (usa "git merge --abort" para abortar la fusion)

Rutas no fusionadas:
  (usa "git add <archivo>..." para marcar una resolución)
	modificados por ambos:  README.md
	modificados por ambos:  src/domain/tarea.ts
```
`src/domain/tarea.js` es el fichero `both modified`.

Contenido del fichero con los marcadores de conflicto:
```js
    estado: <<<<<<< HEAD
    estado: 'pendiente-de-revision',
=======
    estado: 'por-hacer',
>>>>>>> feature/estado-inicial
```
- La versión entre `<<<<<<< HEAD` y `=======` (`'pendiente-de-revision'`) es la de **main**.
- La versión entre `=======` y `>>>>>>> feature/estado-inicial` (`'por-hacer'`) es la de la
  **rama entrante** (`feature/estado-inicial`).

Resolución de equipo elegida: `'pendiente'`. Se editó el fichero dejando solo esa línea,
sin ningún marcador:
```
git add .
git commit -m "Resolver conflicto: fijar el estado inicial en pendiente"
git log --oneline --graph
```
**Salida:**
```
[main fd10999] Resolver conflicto: fijar el estado inicial en pendiente
*   fd10999 (HEAD -> main) Resolver conflicto: fijar el estado inicial en pendiente
|\  
| * 5103461 (feature/estado-inicial) Fijar el estado inicial en por-hacer
* | be89dfc Cambiar el estado por defecto a pendiente-de-revision
|/  
* fd6795f Crear tarea con estado pendiente
* ac39385 Crear crearTarea con estado pendiente por defecto
* 38ab764 (origin/main) Añadir el campo prioridad a Tarea
* 6459f80 Añadir el campo estado al modelo de Tarea
* 0f02eb1 Crear el modelo de Tarea del dominio
* ef44634 Arrancar el proyecto del Gestor de Tareas
```
El commit `fd10999` es el commit de fusión (dos padres), confirmando que la fusión se
cerró correctamente.

## ¿Por qué el Paso 2 fue un fast-forward y el Paso 3-4 generó un conflicto?

En el Paso 2, `main` no se había movido desde que se creó `feature/estado-por-defecto`: la
rama de la funcionalidad era, literalmente, `main` más un commit encima, así que Git pudo
resolver la fusión con un simple avance de puntero (fast-forward), sin necesidad de mezclar
nada. En el Paso 3-4, en cambio, `main` sí avanzó con un commit propio **después** del punto en el que arrancó
`feature/estado-inicial`, y ambas ramas terminaron modificando **la misma línea**
del mismo fichero de formas distintas. Al no haber un historial lineal entre ambas, Git no
puede decidir automáticamente cuál de las dos versiones es la buena y genera un conflicto que exige una resolución manual.

# Tarea 07
## Paso 1 - Abre el issue

Sin comandos ni salida en terminal.

## Paso 2 - Crea la rama y trabaja el cambio

```
git switch -c feature/fecha-limite
git add .
git commit -m "Criterios de aceptación de issue #1 cumplidos"
```

**Salida:**
```
[feature/fecha-limite 21bb694] Criterios de aceptación de issue #1 cumplidos
 2 files changed, 78 insertions(+)
 ```
 