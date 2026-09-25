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
git add src/domain/tarea.js
git commit -m "Hacer que crearTarea nazca con estado pendiente por defecto"
```
**Salida:**
```
[feature/estado-por-defecto 2d9b683] Hacer que crearTarea nazca con estado pendiente por defecto
 1 file changed, 1 insertion(+), 1 deletion(-)
```

```
git switch main
git merge feature/estado-por-defecto
```
**Salida:**
```
Cambiado a rama 'main'
Actualizando 200e1ac..2d9b683
Fast-forward
 src/domain/tarea.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```
**Observación:** el mensaje dice `Fast-forward` porque `main` no había avanzado desde que
se creó la rama: no hubo ningún commit nuevo en `main` mientras se trabajaba en
`feature/estado-por-defecto`, así que Git no necesitó crear un commit de fusión — simplemente
movió el puntero de `main` hacia adelante hasta el último commit de la rama.

```
git branch -d feature/estado-por-defecto
```
**Salida:**
```
Eliminada la rama feature/estado-por-defecto (era 2d9b683).
```

## Paso 3 — Provocar el conflicto

Desde `main`, se cambió la misma línea del `estado` a `'pendiente-de-revision'` (simulando
el cambio de un compañero):
```
git add src/domain/tarea.js
git commit -m "Cambiar el estado por defecto a pendiente-de-revision"
```
**Salida:**
```
[main edfe235] Cambiar el estado por defecto a pendiente-de-revision
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Se creó `feature/estado-inicial` a partir del commit **anterior** a ese cambio (`2d9b683`,
antes de "pendiente-de-revision"):
```
git switch -c feature/estado-inicial 2d9b683
```
En esa rama se cambió la misma línea a `'por-hacer'`:
```
git add src/domain/tarea.js
git commit -m "Fijar el estado inicial en por-hacer"
```
**Salida:**
```
[feature/estado-inicial dc7d23f] Fijar el estado inicial en por-hacer
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Vuelta a `main` y fusión:
```
git switch main
git merge feature/estado-inicial
```
**Salida:**
```
Cambiado a rama 'main'
Auto-fusionando src/domain/tarea.js
CONFLICTO (contenido): Conflicto de fusión en src/domain/tarea.js
Fusión automática falló; arregle los conflictos y luego realice un commit con el resultado.
```

## Paso 4 — Resolver el conflicto paso a paso

```
git status
```
**Salida (fragmento relevante):**
```
Rutas no fusionadas:
  (usa "git add <archivo>..." para marcar una resolución)
	modificados por ambos:  src/domain/tarea.js
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
git add src/domain/tarea.js
git commit -m "Resolver conflicto: fijar el estado inicial en pendiente"
git log --oneline --graph
```
**Salida:**
```
*   c7892b9 Resolver conflicto: fijar el estado inicial en pendiente
|\
| * dc7d23f Fijar el estado inicial en por-hacer
* | edfe235 Cambiar el estado por defecto a pendiente-de-revision
|/
* 2d9b683 Hacer que crearTarea nazca con estado pendiente por defecto
* 200e1ac Crear crearTarea con id, titulo, estado y prioridad
```
El commit `c7892b9` es el commit de fusión (dos padres), confirmando que la fusión se
cerró correctamente.

> Nota de la sesión: al escribir este commit de fusión se ejecutó por error un comando
> (`git commit --amend`) que sobrescribió momentáneamente su mensaje a "placeholder". Se
> detectó y corrigió en el acto con otro `git commit --amend -m "Resolver conflicto: fijar
> el estado inicial en pendiente"` antes de continuar; el hash final del commit de fusión
> es `c7892b9` (no `036de28`, su valor inmediatamente después de cerrar la fusión, ya
> reemplazado por el amend correctivo).

## Paso 5 (opcional) — Practicar el aborto

Se creó una rama descartable `feature/prueba-aborto` con un commit que cambia la misma
línea a `'en-revision'`, y se intentó fusionar de nuevo sobre `main`:
```
git switch -c feature/prueba-aborto
# (edición + commit "Probar otro valor de estado (rama descartable)")
git switch main
git merge feature/prueba-aborto
```
**Salida:**
```
Auto-fusionando src/domain/tarea.js
CONFLICTO (contenido): Conflicto de fusión en src/domain/tarea.js
Fusión automática falló; arregle los conflictos y luego realice un commit con el resultado.
```

En vez de resolverlo, se abortó:
```
git merge --abort
git status
```
**Salida:**
```
En la rama main
nada para hacer commit, el árbol de trabajo está limpio
```
**Observación:** `git merge --abort` deshizo por completo el intento de fusión y devolvió el
árbol de trabajo exactamente al estado que tenía antes de lanzar `git merge`, sin dejar
marcadores de conflicto ni cambios a medias. Se borró después la rama descartable con
`git branch -D feature/prueba-aborto`.

## ¿Por qué el Paso 2 fue un fast-forward y el Paso 3-4 generó un conflicto?

En el Paso 2, `main` no se había movido desde que se creó `feature/estado-por-defecto`: la
rama de la funcionalidad era, literalmente, `main` más un commit encima, así que Git pudo
resolver la fusión con un simple avance de puntero (fast-forward), sin necesidad de mezclar
nada. En el Paso 3-4, en cambio, `main` sí avanzó con un commit propio
(`edfe235`, "pendiente-de-revision") **después** del punto en el que arrancó
`feature/estado-inicial` (`2d9b683`), y ambas ramas terminaron modificando **la misma línea**
del mismo fichero de formas distintas. Al no haber un historial lineal entre ambas, Git no
puede decidir automáticamente cuál de las dos versiones es la buena y genera un `CONFLICT
(content)` que exige una resolución manual.
