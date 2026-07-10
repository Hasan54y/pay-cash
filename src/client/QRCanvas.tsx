import { useEffect, useRef } from "react";
import { drawQROnCanvas } from "./qrRenderer";

interface QRCanvasProps {
  data: string;
  size?: number;
  logoSrc?: string;
}

export default function QRCanvas({ data, size = 196, logoSrc = "/cashapp-logo.png" }: QRCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    drawQROnCanvas(ref.current, data, size, logoSrc).catch(console.error);
  }, [data, size, logoSrc]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", width: size, height: size }}
    />
  );
}
