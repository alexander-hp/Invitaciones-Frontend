import { GuestPassData } from '../features/new-public-invitation/guest-pass-template';

/**
 * Renderiza el Pase VIP de un invitado en un HTML5 Canvas de alta resolución y retorna un Blob PNG.
 */
export async function generateGuestPassImageBlob(data: GuestPassData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 640;
  const height = 900;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // --- Fondo General ---
  ctx.fillStyle = '#f8f6f2';
  ctx.fillRect(0, 0, width, height);

  // --- Tarjeta Principal con Esquinas Redondeadas ---
  const margin = 20;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardR = 24;

  drawRoundedRect(ctx, margin, margin, cardW, cardH, [cardR, cardR, cardR, cardR]);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#e2d7c7';
  ctx.stroke();

  // --- Cabecera Oscura de Lujo ---
  const headerH = 220;
  ctx.save();
  drawRoundedRect(ctx, margin, margin, cardW, headerH, [cardR, cardR, 0, 0]);
  ctx.clip();

  const grad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + headerH);
  grad.addColorStop(0, '#1c1917');
  grad.addColorStop(0.5, '#292524');
  grad.addColorStop(1, '#18181b');
  ctx.fillStyle = grad;
  ctx.fillRect(margin, margin, cardW, headerH);

  // Patrón decorativo suave
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 12, margin + 12, cardW - 24, headerH - 24);

  // Badge "PASE VIP CONFIRMADO"
  ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
  drawRoundedRect(ctx, width / 2 - 90, margin + 24, 180, 26, 13);
  ctx.fill();
  ctx.strokeStyle = '#c09c78';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#e8d2b5';
  ctx.font = 'bold 10.5px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PASE VIP DE ACCESO', width / 2, margin + 41);

  // Título del Evento
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  const eventTitle = data.headline || 'Evento Especial';
  wrapText(ctx, eventTitle, width / 2, margin + 95, cardW - 60, 30);

  // Subheadline
  if (data.subheadline) {
    ctx.fillStyle = '#c09c78';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(data.subheadline.toUpperCase(), width / 2, margin + 175);
  }

  ctx.restore();

  // --- Línea Dorada Divisoria ---
  const lineGrad = ctx.createLinearGradient(margin, margin + headerH, margin + cardW, margin + headerH);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.5, '#c09c78');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(margin, margin + headerH);
  ctx.lineTo(margin + cardW, margin + headerH);
  ctx.stroke();

  // --- Barra de Fecha ---
  if (data.eventDateFormatted) {
    const dateY = margin + headerH + 20;
    ctx.fillStyle = '#fdfaf5';
    drawRoundedRect(ctx, margin + 28, dateY, cardW - 56, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#ebdccb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#8c653d';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.eventDateFormatted, width / 2, dateY + 23);
  }

  // --- QR Code ---
  const qrY = margin + headerH + 74;
  const qrSize = 140;
  const qrX = margin + 36;

  // Fondo y Marco del QR
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 14);
  ctx.fill();
  ctx.strokeStyle = '#e2d7c7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (data.qrCodeUrl) {
    try {
      const qrImg = await loadImage(data.qrCodeUrl);
      ctx.drawImage(qrImg, qrX + 10, qrY + 10, qrSize - 20, qrSize - 20);
    } catch {
      // Fallback si falla la carga externa
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(qrX + 15, qrY + 15, qrSize - 30, qrSize - 30);
    }
  }

  ctx.fillStyle = '#a89d91';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ESCANEAR AL ENTRAR', qrX + qrSize / 2, qrY + qrSize + 16);

  // --- Datos del Invitado (Columna Derecha) ---
  const infoX = qrX + qrSize + 28;
  const infoW = cardW - (qrSize + 90);

  // Nombre del Invitado
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 20px "Playfair Display", Georgia, serif';
  wrapText(ctx, data.guestName, infoX, qrY + 28, infoW, 26);

  // Fila Mesa y Asiento
  let currentY = qrY + 68;
  ctx.fillStyle = '#786e64';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Mesa:', infoX, currentY);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 13px Inter, sans-serif';
  const tableText = data.tableName || 'General';
  ctx.fillText(tableText, infoX + 42, currentY);

  if (data.seatLabel) {
    ctx.fillStyle = '#786e64';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('· Asiento:', infoX + 120, currentY);
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(data.seatLabel, infoX + 180, currentY);
  }

  // Fila Acompañantes
  currentY += 26;
  ctx.fillStyle = '#786e64';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Lugares:', infoX, currentY);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText(`${data.allowedCompanions || 1} persona(s)`, infoX + 58, currentY);

  // Fila Ubicación
  if (data.locationAddress) {
    currentY += 26;
    ctx.fillStyle = '#786e64';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Lugar:', infoX, currentY);
    ctx.fillStyle = '#1c1917';
    ctx.font = '600 12px Inter, sans-serif';
    wrapText(ctx, data.locationAddress, infoX + 44, currentY, infoW - 44, 18);
  }

  // --- Línea Punteada Estilo Ticket Perforado ---
  const dividerY = height - margin - 85;
  ctx.strokeStyle = '#d5c7b5';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(margin + 20, dividerY);
  ctx.lineTo(margin + cardW - 20, dividerY);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Círculos laterales de perforación
  ctx.fillStyle = '#f8f6f2';
  ctx.beginPath();
  ctx.arc(margin, dividerY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e2d7c7';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(margin + cardW, dividerY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e2d7c7';
  ctx.stroke();

  // --- Footer ---
  ctx.fillStyle = '#9c8e80';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Pase personal intransferible · Presenta tu código QR en la entrada', width / 2, dividerY + 45);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create Blob from canvas'));
      }
    }, 'image/png', 0.95);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | [number, number, number, number]
): void {
  let tl = 0, tr = 0, br = 0, bl = 0;
  if (typeof r === 'number') {
    tl = tr = br = bl = r;
  } else {
    [tl, tr, br, bl] = r;
  }

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = (text || '').split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}
