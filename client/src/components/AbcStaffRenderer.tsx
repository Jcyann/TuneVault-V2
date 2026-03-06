import { useEffect, useRef } from "react";

interface AbcStaffRendererProps {
  notation: string;
}

export default function AbcStaffRenderer({ notation }: AbcStaffRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !notation) return;
    let cancelled = false;

    import("abcjs").then((abcjs) => {
      if (cancelled || !containerRef.current) return;
      try {
        abcjs.renderAbc(containerRef.current, notation, {
          responsive: "resize",
          add_classes: true,
          paddingright: 0,
          paddingleft: 0,
        });
      } catch {
      }
    });

    return () => { cancelled = true; };
  }, [notation]);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg p-4 overflow-x-auto border border-border"
      data-testid="abc-staff-renderer"
    />
  );
}
