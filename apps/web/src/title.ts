// Título de la pestaña del navegador según la pantalla (#23), como hacen las apps de vídeo.
import { useEffect } from 'react';
export function useTitle(t?: string | null) {
  useEffect(() => { document.title = t ? `${t} - TodoTube` : 'TodoTube'; }, [t]);
}
