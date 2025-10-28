import { useEffect } from 'react';
import { toast } from 'sonner';

export const usePWAUpdate = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW Registered:', registration);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast.info('Update available!', {
                  description: 'A new version is ready.',
                  action: {
                    label: 'Update',
                    onClick: () => window.location.reload(),
                  },
                  duration: Infinity,
                });
              }
            });
          }
        });
      }).catch((error) => {
        console.log('SW registration error', error);
      });
    }
  }, []);
};
