import { useState, useEffect } from "react";

/** Returns true when viewport width is ≤ breakpoint (default 640). */
export const useIsMobile = (bp = 640) => {
  const [mobile, setMobile] = useState(() => window.innerWidth <= bp);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= bp);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, [bp]);
  return mobile;
};
