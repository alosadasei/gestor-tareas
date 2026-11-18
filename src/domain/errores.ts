// Errores de dominio: situaciones esperadas que el usuario puede corregir (datos inválidos,
// algo que no existe, un conflicto con el estado actual). Se distinguen de los errores
// técnicos (BD caída, un bug), que no son culpa de quien llama y no se le detallan.
// El dominio no sabe nada de HTTP: la traducción a códigos de estado se hace en la API.

export type CodigoErrorDominio = 'VALIDACION' | 'NO_ENCONTRADO' | 'CONFLICTO';

export type DetalleValidacion = { campo: string; mensaje: string };

export class ErrorDominio extends Error {
  constructor(
    readonly codigo: CodigoErrorDominio,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ErrorValidacion extends ErrorDominio {
  constructor(
    mensaje: string,
    readonly detalles: DetalleValidacion[] = [],
  ) {
    super('VALIDACION', mensaje);
  }
}

export class ErrorNoEncontrado extends ErrorDominio {
  constructor(recurso: string, id: number | string) {
    super('NO_ENCONTRADO', `${recurso} ${id} no existe`);
  }
}

export class ErrorConflicto extends ErrorDominio {
  constructor(mensaje: string) {
    super('CONFLICTO', mensaje);
  }
}
