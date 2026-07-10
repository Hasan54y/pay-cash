// QR Code renderer using exact Cash App style:
// - Circular dot modules
// - Rounded finder patterns
// - Logo in center (32% of QR area)
// - 4x DPR for crispness

// @ts-ignore
import { qrcode } from "./qrcode.js";

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawFinder(ctx: CanvasRenderingContext2D, rowStart: number, colStart: number, cell: number) {
  const outerSize = 7 * cell;
  const x = colStart * cell;
  const y = rowStart * cell;
  roundRectFill(ctx, x, y, outerSize, outerSize, outerSize * 0.28, "#0B0B0B");
  const gap = cell;
  roundRectFill(ctx, x + gap, y + gap, outerSize - 2 * gap, outerSize - 2 * gap, (outerSize - 2 * gap) * 0.3, "#ffffff");
  const centerSize = 3 * cell;
  const centerOffset = 2 * cell;
  roundRectFill(ctx, x + centerOffset, y + centerOffset, centerSize, centerSize, centerSize * 0.3, "#0B0B0B");
}

function buildQrObject(data: string) {
  for (let type = 1; type <= 40; type++) {
    try {
      const qr = qrcode(type, "H");
      qr.addData(data);
      qr.make();
      return qr;
    } catch { continue; }
  }
  throw new Error("Data too long");
}

export function drawQROnCanvas(
  canvas: HTMLCanvasElement,
  data: string,
  displaySize: number,
  logoSrc: string = "/cashapp-logo.png"
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const qr = buildQrObject(data);
      const moduleCount = qr.getModuleCount();
      const dpr = 4;
      const px = displaySize * dpr;
      canvas.width = px;
      canvas.height = px;
      canvas.style.width = displaySize + "px";
      canvas.style.height = displaySize + "px";

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2d context")); return; }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, px, px);

      const cell = px / moduleCount;

      function isFinderArea(r: number, c: number) {
        return (r < 7 && c < 7) || (r < 7 && c >= moduleCount - 7) || (r >= moduleCount - 7 && c < 7);
      }

      const logoFraction = 0.32;
      const logoModules = Math.floor(moduleCount * logoFraction);
      const logoStart = Math.floor((moduleCount - logoModules) / 2);
      const logoEnd = logoStart + logoModules;

      function isLogoArea(r: number, c: number) {
        return r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd;
      }

      // Draw dot modules
      ctx.fillStyle = "#0B0B0B";
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinderArea(r, c) || isLogoArea(r, c)) continue;
          if (qr.isDark(r, c)) {
            const cx = c * cell + cell / 2;
            const cy = r * cell + cell / 2;
            const radius = cell * 0.42;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw rounded finder patterns
      drawFinder(ctx, 0, 0, cell);
      drawFinder(ctx, 0, moduleCount - 7, cell);
      drawFinder(ctx, moduleCount - 7, 0, cell);

      // Draw logo
      const logoSizePx = (logoEnd - logoStart) * cell;
      const logoX = logoStart * cell;
      const logoY = logoStart * cell;
      const pad = cell * 0.4;
      roundRectFill(ctx, logoX - pad, logoY - pad, logoSizePx + 2 * pad, logoSizePx + 2 * pad, (logoSizePx + 2 * pad) * 0.22, "#ffffff");

      const logo = new Image();
      logo.onload = () => {
        ctx.save();
        roundRectPath(ctx, logoX, logoY, logoSizePx, logoSizePx, logoSizePx * 0.22);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSizePx, logoSizePx);
        ctx.restore();
        resolve();
      };
      logo.onerror = () => { resolve(); }; // resolve even without logo
      logo.src = logoSrc;
    } catch (e) { reject(e); }
  });
}

export function downloadQRCard(
  data: string,
  displayName: string,
  logoSrc: string = "/cashapp-logo.png"
): void {
  const scale = 3;
  const cardW = 300 * scale;
  const qrDisplaySize = 196;
  const qrSize = qrDisplaySize * scale;
  const frameW = qrSize + 28 * scale;
  const height = (24 + 18 + 14 + 24 + 30 + 6) * scale + frameW;

  const out = document.createElement("canvas");
  out.width = cardW;
  out.height = height;
  const ctx = out.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, 0, 0, cardW, height, 24 * scale);
  ctx.fill();

  // "Scan to pay with cash app"
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 ${11 * scale}px -apple-system, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Scan to pay with cash app", cardW / 2, 40 * scale);

  // QR frame border
  const frameX = (cardW - frameW) / 2;
  const frameY = 60 * scale;
  ctx.strokeStyle = "#ECEDEC";
  ctx.lineWidth = 1 * scale;
  roundRectPath(ctx, frameX, frameY, frameW, frameW, 20 * scale);
  ctx.stroke();

  // Draw QR into temp canvas then composite
  const tempCanvas = document.createElement("canvas");
  const qr = buildQrObject(data);
  const moduleCount = qr.getModuleCount();
  const dpr = 4;
  const px = qrDisplaySize * dpr * scale;
  tempCanvas.width = px;
  tempCanvas.height = px;
  const tc = tempCanvas.getContext("2d")!;
  tc.fillStyle = "#ffffff";
  tc.fillRect(0, 0, px, px);

  const cell = px / moduleCount;
  const logoFraction = 0.32;
  const logoModules = Math.floor(moduleCount * logoFraction);
  const logoStart = Math.floor((moduleCount - logoModules) / 2);
  const logoEnd = logoStart + logoModules;

  tc.fillStyle = "#0B0B0B";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      const isFinder = (r < 7 && c < 7) || (r < 7 && c >= moduleCount - 7) || (r >= moduleCount - 7 && c < 7);
      const isLogo = r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd;
      if (isFinder || isLogo) continue;
      if (qr.isDark(r, c)) {
        tc.beginPath();
        tc.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.42, 0, Math.PI * 2);
        tc.fill();
      }
    }
  }
  drawFinder(tc, 0, 0, cell);
  drawFinder(tc, 0, moduleCount - 7, cell);
  drawFinder(tc, moduleCount - 7, 0, cell);

  const logo = new Image();
  logo.onload = () => {
    // Draw logo on QR
    const logoSizePx = (logoEnd - logoStart) * cell;
    const logoX = logoStart * cell;
    const logoY = logoStart * cell;
    const pad = cell * 0.4;
    roundRectFill(tc, logoX - pad, logoY - pad, logoSizePx + 2 * pad, logoSizePx + 2 * pad, (logoSizePx + 2 * pad) * 0.22, "#ffffff");
    tc.save();
    roundRectPath(tc, logoX, logoY, logoSizePx, logoSizePx, logoSizePx * 0.22);
    tc.clip();
    tc.drawImage(logo, logoX, logoY, logoSizePx, logoSizePx);
    tc.restore();

    // Composite QR onto card
    ctx.drawImage(tempCanvas, frameX + 14 * scale, frameY + 14 * scale, qrSize, qrSize);

    // Display name
    let textY = frameY + frameW + 30 * scale;
    ctx.font = `800 ${19 * scale}px -apple-system, Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#0B0B0B";
    ctx.textAlign = "center";
    ctx.fillText(displayName, cardW / 2, textY);

    // Download
    const a = document.createElement("a");
    a.download = `pay-${displayName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  };
  logo.src = logoSrc;
}
