import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker - deferred for faster initial load
if ('serviceWorker' in navigator) {
  const register = () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ 
        immediate: false,
        onOfflineReady() {
          console.log('App ready to work offline');
        }
      });
    }).catch(() => {
      // ignore SW registration errors in non-supporting environments
    });
  };

  // Defer in both dev and prod to avoid blocking initial render
  const w = globalThis as any;
  if ('requestIdleCallback' in w) {
    w.requestIdleCallback(register);
  } else {
    setTimeout(register, 2000);
  }
}
