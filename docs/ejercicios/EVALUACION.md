# Evaluación del asistente de código

## Paso 1 — Herramienta

- **Herramienta:** Claude Code.
- **Forma de integración:** agente de terminal (se ejecuta como un asistente conversacional
  en la terminal/editor, con acceso al proyecto, capaz de leer y escribir ficheros directamente,
  a diferencia de una autocompleción en línea tipo Copilot o de un editor con IA integrada tipo Cursor).

## Paso 2 — Primera propuesta: `contarPorEstado`

Contexto dado al asistente: el tipo `Tarea` del dominio (`id`, `titulo`, `estado`, `prioridad`,
`fechaLimite`, `etiquetas`, `subtareas`) y la firma con el comentario de intención.

Primera propuesta generada, **tal cual, sin retocar**:

```ts
// Devuelve un objeto con cuántas tareas hay en cada estado
export function contarPorEstado(tareas: Tarea[]) {
  const resultado = {};
  for (const tarea of tareas) {
    if (resultado[tarea.estado]) {
      resultado[tarea.estado]++;
    } else {
      resultado[tarea.estado] = 1;
    }
  }
  return resultado;
}
```

## Paso 3 y 4 — Las tres sugerencias evaluadas

### 1. `contarPorEstado(tareas)`

**Sugerencia original** (la del Paso 2, copiada de nuevo):

```ts
export function contarPorEstado(tareas: Tarea[]) {
  const resultado = {};
  for (const tarea of tareas) {
    if (resultado[tarea.estado]) {
      resultado[tarea.estado]++;
    } else {
      resultado[tarea.estado] = 1;
    }
  }
  return resultado;
}
```

**Decisión:** editar.

**Justificación:** `resultado` se declara sin tipo (`{}`). Además, si no hay ninguna tarea en un estado concreto, esa clave no aparece en el objeto devuelto en vez de salir a 0, lo que obliga a comprobar `?? 0` en cada acceso.

**Versión corregida:**

```ts
export function contarPorEstado(tareas: Tarea[]): Record<Tarea['estado'], number> {
  const conteo: Record<Tarea['estado'], number> = {
    pendiente: 0,
    'en-curso': 0,
    hecha: 0,
  };
  for (const tarea of tareas) {
    conteo[tarea.estado]++;
  }
  return conteo;
}
```

### 2. `buscarTarea(tareas, id)`

**Sugerencia original:**

```ts
export function buscarTarea(tareas: Tarea[], id: number): Tarea | undefined {
  return tareas.find((tarea) => tarea.id === id);
}
```

**Decisión:** aceptar.

**Justificación:** Tipa el retorno como `Tarea | undefined`, contemplando la posibilidad de no encontrar la tarea. Es una búsqueda simple y llana sobre un array.

### 3. `puedeCerrar(usuario, tarea)`

**Sugerencia original:**

```ts
export function puedeCerrar(usuario: Usuario, tarea: Tarea): boolean {
  if (usuario.rol === 'admin') return true;
  if (tarea.asignadoA === usuario.id && tarea.estado === 'en-curso') return true;
  return false;
}
```

**Decisión:** rechazar.

**Justificación:** El asistente se ha inventado un tipo `Usuario` que **no existe en ningún sitio del código** (ni en `src/domain/tarea.ts` ni en el `Tarea` de este fichero). Además ha inventado de la nada una regla de negocio que nadie le pidió (sólo usuarios con el rol 'admin' pueden cerrar una tarea).

## Regla del ejercicio (comprobación)

- Al menos una decisión es "editar": `contarPorEstado`. ✅
- Al menos una decisión se apoya en una señal de alerta concreta: `puedeCerrar`
  (propiedades inexistentes `usuario.rol` y `tarea.asignadoA`, regla de negocio inventada). ✅
