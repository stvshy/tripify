// components/DragContext.tsx
import React, { createContext, useState, ReactNode } from 'react';
import type { Country } from  '../.expo/types/country.d.ts';

interface DragContextProps {
  draggedItem: Country | null;
  setDraggedItem: (item: Country | null) => void;
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
}

export const DragContext = createContext<DragContextProps>({
  draggedItem: null,
  setDraggedItem: () => {},
  position: { x: 0, y: 0 },
  setPosition: () => {},
});

export const DragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<Country | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <DragContext.Provider value={{ draggedItem, setDraggedItem, position, setPosition }}>
      {children}
    </DragContext.Provider>
  );
};
