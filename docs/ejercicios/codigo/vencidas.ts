type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
  fechaLimite: string; // formato ISO "AAAA-MM-DD"
};

// Datos de prueba: hoy imaginamos que es 2026-07-12
const tareas: Tarea[] = [
  { id: 1, titulo: 'Diseñar el tablero', estado: 'pendiente', prioridad: 2, fechaLimite: '2026-07-01' },
  { id: 2, titulo: 'Modelo de usuario', estado: 'en-curso', prioridad: 1, fechaLimite: '2026-08-01' },
  { id: 3, titulo: 'Configurar linter', estado: 'hecha', prioridad: 3, fechaLimite: '2026-07-05' },
  { id: 4, titulo: 'Pantalla de login', estado: 'pendiente', prioridad: 1, fechaLimite: '2026-07-10' },
];

const hoy = new Date('2026-07-12');

// versión del chat: fallo aquí
function tareasVencidasChat(tareas: Tarea[], hoy: Date): Tarea[] {
  return tareas.filter((tarea) => new Date(tarea.fechaLimite).getTime() < hoy.getTime());
}

console.log(tareasVencidasChat(tareas, hoy).map((t) => t.id));
// Output real: [ 1, 3, 4 ]
// Incorrecto: se esperaban solo [1, 4]. Incluye la tarea 3, que está vencida por fecha
// pero ya está "hecha", porque la función nunca comprueba el estado.

// versión corregida
function tareasVencidas(tareas: Tarea[], hoy: Date): Tarea[] {
  return tareas.filter(
    (tarea) => tarea.estado !== 'hecha' && new Date(tarea.fechaLimite).getTime() < hoy.getTime()
  );
}

console.log(tareasVencidas(tareas, hoy).map((t) => t.id));
// Output real: [ 1, 4 ]
// Correcto: coincide con el resultado esperado.
