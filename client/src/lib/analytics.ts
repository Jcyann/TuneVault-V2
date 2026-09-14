declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    replit?: {
      analytics?: {
        track: (eventName: string, properties?: Record<string, string | number>) => void;
      };
    };
  }
}

export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) {
    console.warn("Missing VITE_GA_MEASUREMENT_ID — Google Analytics disabled");
    return;
  }

  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', { send_page_view: false });
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (url: string, title?: string) => {
  if (typeof window === "undefined" || !window.gtag) return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  window.gtag("config", measurementId, {
    page_path: url,
    page_title: title ?? document.title,
  });
};

export const trackEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number
) => {
  if (typeof window === "undefined") return;
  window.replit?.analytics?.track(action, {
    ...(category ? { category } : {}),
    ...(label ? { label } : {}),
    ...(typeof value === "number" ? { value } : {}),
  });
  window.gtag?.("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
};
