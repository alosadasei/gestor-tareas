-- CreateEnum
CREATE TYPE "estado_tarea" AS ENUM ('pendiente', 'en-curso', 'hecha');

-- CreateEnum
CREATE TYPE "prioridad" AS ENUM ('baja', 'media', 'alta');

-- CreateEnum
CREATE TYPE "accion_auditoria" AS ENUM ('crear', 'actualizar', 'cambiar_estado', 'borrar');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "estado" "estado_tarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "prioridad" NOT NULL DEFAULT 'media',
    "fecha_limite" TIMESTAMPTZ(3),
    "responsable_id" INTEGER NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,
    "borrada_en" TIMESTAMPTZ(3),

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "autor_id" INTEGER NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_etiquetas" (
    "tarea_id" INTEGER NOT NULL,
    "etiqueta_id" INTEGER NOT NULL,

    CONSTRAINT "tareas_etiquetas_pkey" PRIMARY KEY ("tarea_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "adjuntos" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "clave" VARCHAR(500) NOT NULL,
    "subido_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "accion" "accion_auditoria" NOT NULL,
    "cambios" JSONB NOT NULL DEFAULT '{}',
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_nombre_key" ON "etiquetas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "adjuntos_clave_key" ON "adjuntos"("clave");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_etiquetas" ADD CONSTRAINT "tareas_etiquetas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_etiquetas" ADD CONSTRAINT "tareas_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
