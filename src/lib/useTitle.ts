import { useEffect } from 'react';
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | MSB Events` : 'MSB Events | Matjhabeng, Welkom';
  }, [title]);
}
