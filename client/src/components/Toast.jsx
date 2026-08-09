import { createContext, useCallback, useContext, useState } from "react";
import { IconCheck, IconAlert } from "./Icons.jsx";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const showToast = useCallback(
    (message) => push(message, "success"),
    [push]
  );
  const showError = useCallback((message) => push(message, "error"), [push]);

  return (
    <ToastContext.Provider value={{ showToast, showError }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ display: "inline-flex", marginRight: 8, verticalAlign: "middle" }}>
              {t.type === "error" ? <IconAlert size={15} /> : <IconCheck size={15} />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
