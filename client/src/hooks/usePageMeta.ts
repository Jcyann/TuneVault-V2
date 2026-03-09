import { useEffect } from "react";

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | TuneVault` : "TuneVault — Old-Time Fiddle Treasury";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute("content", description);
    }
    return () => {
      document.title = "TuneVault — Old-Time Fiddle Treasury";
    };
  }, [title, description]);
}
