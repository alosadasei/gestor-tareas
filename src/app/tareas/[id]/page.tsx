import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { esquemaId } from '../../../api/esquemas';
import { DetalleTarea } from '../../../componentes/detalle/DetalleTarea';
import { cargarDetalle } from '../../../services/detalleTarea';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function datos({ params }: Props) {
  const id = esquemaId.safeParse((await params).id);
  return id.success ? cargarDetalle(id.data) : undefined;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await datos(props))?.tarea.titulo ?? 'Tarea no encontrada' };
}

export default async function PaginaTarea(props: Props) {
  const detalle = await datos(props);
  // Id no válido, tarea inexistente o borrada: la página 404 de esta ruta.
  if (!detalle) notFound();
  return <DetalleTarea {...detalle} />;
}
