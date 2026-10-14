import React from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Listas que se reordenan arrastrando un asa: con ratón, dedo o teclado
// (Espacio para tomar, flechas para mover, Espacio para soltar, Esc cancela).

const soloVertical = ({ transform }) => ({ ...transform, x: 0 });

const INSTRUCCIONES = {
  draggable: 'Para reordenar, presiona Espacio o Enter, muévelo con las flechas arriba y abajo y presiona Espacio para soltarlo. Escape cancela.',
};

export function ListaOrdenable({ ids, onMover, onEmpezar, onTerminar, nombreDe = (id) => String(id), children }) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const posicion = (id) => ids.indexOf(id) + 1;
  const anuncios = {
    onDragStart: ({ active }) => `Tomaste "${nombreDe(active.id)}", en la posición ${posicion(active.id)} de ${ids.length}.`,
    onDragOver: ({ active, over }) => (over ? `"${nombreDe(active.id)}" va a la posición ${posicion(over.id)} de ${ids.length}.` : `"${nombreDe(active.id)}" está fuera de la lista.`),
    onDragEnd: ({ active, over }) => (over ? `Soltaste "${nombreDe(active.id)}" en la posición ${posicion(over.id)} de ${ids.length}.` : `Soltaste "${nombreDe(active.id)}" sin moverlo.`),
    onDragCancel: ({ active }) => `Se canceló. "${nombreDe(active.id)}" quedó donde estaba.`,
  };
  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      modifiers={[soloVertical]}
      accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCCIONES }}
      onDragStart={({ active }) => onEmpezar?.(active.id)}
      onDragCancel={() => onTerminar?.()}
      onDragEnd={({ active, over }) => { onTerminar?.(); if (over && active.id !== over.id) onMover(active.id, over.id); }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Un elemento de la lista. `children` recibe las props del asa y si se está arrastrando. */
export function ElementoOrdenable({ id, deshabilitado = false, as = 'li', className = '', children, ...resto }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: deshabilitado,
    attributes: { roleDescription: 'elemento que se puede reordenar' },
  });
  const Etiqueta = as;
  const estilo = { transform: CSS.Translate.toString(transform), transition };
  const asa = { ref: setActivatorNodeRef, ...attributes, ...listeners };
  return (
    <Etiqueta ref={setNodeRef} style={estilo} className={`${className}${isDragging ? ' ord-arrastrando' : ''}`} {...resto}>
      {children(asa, isDragging)}
    </Etiqueta>
  );
}

export function AsaArrastre({ asa, etiqueta, deshabilitado = false }) {
  return (
    <button
      type="button"
      className="ord-asa"
      {...asa}
      aria-label={`Arrastrar para reordenar: ${etiqueta}`}
      title="Arrastra para cambiar el orden (o enfócalo y usa Espacio y las flechas)"
      disabled={deshabilitado}
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );
}
