import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<any[]>([]);

  const toast = ({ title, description, variant }: any) => {
    alert(`${title}\n${description}`);
  };

  return { toast, toasts };
}
