import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<{ toast: (message: string) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, message }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-goldline bg-surface-2 px-4 py-3 shadow-2xl"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sport-pickleball/15 text-sport-pickleball">
              <Icon name="check" size={13} strokeWidth={2.4} />
            </span>
            <p className="text-[13px] font-medium text-foreground">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
