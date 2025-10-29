import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker with production optimization
if ('serviceWorker' in navigator) {
  const register = () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ 
        immediate: import.meta.env.PROD,
        onOfflineReady() {
          console.log('App ready to work offline');
        }
      });
    }).catch(() => {
      // ignore SW registration errors in non-supporting environments
    });
  };

  // In production: register immediately for faster offline capability
  // In development: defer to avoid conflicts
  if (import.meta.env.PROD) {
    register();
  } else {
    const w = globalThis as any;
    if ('requestIdleCallback' in w) {
      w.requestIdleCallback(register);
    } else {
      setTimeout(register, 1500);
    }
  }
}
