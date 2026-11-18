-- CreateIndex
CREATE INDEX "adjuntos_tarea_id_idx" ON "adjuntos"("tarea_id");

-- CreateIndex
CREATE INDEX "auditoria_tarea_id_idx" ON "auditoria"("tarea_id");

-- CreateIndex
CREATE INDEX "comentarios_tarea_id_creado_en_idx" ON "comentarios"("tarea_id", "creado_en");

-- CreateIndex
CREATE INDEX "tareas_responsable_id_idx" ON "tareas"("responsable_id");

-- CreateIndex
CREATE INDEX "tareas_estado_fecha_limite_idx" ON "tareas"("estado", "fecha_limite");
