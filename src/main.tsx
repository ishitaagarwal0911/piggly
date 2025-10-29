import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Lazy-register Service Worker after initial render to avoid render-blocking
if ('serviceWorker' in navigator) {
  const lazyRegister = () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: false });
    }).catch(() => {
      // ignore SW registration errors in non-supporting environments
    });
  };

  const w = globalThis as any;
  if ('requestIdleCallback' in w) {
    w.requestIdleCallback(lazyRegister);
  } else {
    setTimeout(lazyRegister, 1500);
  }
}
