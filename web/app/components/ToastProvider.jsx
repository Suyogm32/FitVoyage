"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext({
  toast: { success: () => {}, error: () => {}, info: () => {} },
});

export const useToast = () => useContext(ToastContext).toast;

const VARIANTS = {
  success: { Icon: CheckCircle2, token: "--success" },
  error: { Icon: AlertCircle, token: "--destructive" },
  info: { Icon: Info, token: "--info" },
};

const DURATION = 4000;

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, message) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, variant, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION),
      );
    },
    [dismiss],
  );

  // Timers outlive the component if a toast is showing during navigation.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Stable identity, so a component can depend on `toast` in an effect
  // without re-running on every render of the provider.
  const toast = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // Above MUI's modal layer (1300) so a toast fired from inside a side
        // panel or dialog isn't hidden behind it.
        style={{ zIndex: 1400 }}
        className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(({ id, variant, message }) => {
          const { Icon, token } = VARIANTS[variant] || VARIANTS.info;
          return (
            <div
              key={id}
              role="status"
              aria-live="polite"
              className="toast-enter pointer-events-auto flex items-start gap-3 w-[320px] max-w-[calc(100vw-2rem)] p-3.5 rounded-xl border border-border bg-card shadow-lg"
            >
              <Icon
                size={18}
                className="shrink-0 mt-0.5"
                style={{ color: `hsl(var(${token}))` }}
              />
              <p className="text-sm flex-1 leading-snug">{message}</p>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
