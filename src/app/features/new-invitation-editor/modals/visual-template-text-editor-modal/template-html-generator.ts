/**
 * Generator that creates standalone, responsive HTML/CSS for the builtin invitation templates
 * with the user's edited texts and event palette.
 */

export interface TemplateData {
  templateKey: string;
  palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  eventDate?: string;
  coverImageUrl?: string;
  brandLogoUrl?: string;

  // Text fields
  headline: string;
  subheadline: string;
  message: string;
  storyTitle: string;
  storyBody: string;
  dressCode: string;
  giftIntroText: string;
  envelopeBank: string;
  envelopeHolder: string;
  envelopeAccount: string;
  envelopeClabe: string;
  envelopeNote: string;
  dedicationIntroText: string;
  lodgingText: string;
  rsvpTitle?: string;
  rsvpDeadlineText?: string;
  albumTitle?: string;
  albumNote?: string;
  djTitle?: string;
  djNote?: string;

  // Dynamic lists
  itinerary: Array<{ time: string; title: string; description: string }>;
  locations: Array<{ name: string; address: string; notes: string; mapUrl?: string }>;
  giftRegistry: Array<{ store: string; title: string; note: string; url?: string }>;
  lodgingList: Array<{ name: string; description: string; url?: string }>;
}

export function generateTemplateHtml(data: TemplateData): { html: string; css: string } {
  const p = data.palette || { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
  const primary = p.primary || '#1f2a44';
  const secondary = p.secondary || '#f7f2ea';
  const accent = p.accent || '#b67b4b';

  switch (data.templateKey) {
    case 'envelope-cards':
      return generateEnvelopeCardsTemplate(data, primary, secondary, accent);
    case 'modern-minimal':
    case 'template-3':
      return generateModernMinimalTemplate(data, primary, secondary, accent);
    case 'classic-vertical':
    default:
      return generateClassicVerticalTemplate(data, primary, secondary, accent);
  }
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================================
   1. CLÁSICA VERTICAL EDITORIAL
   ========================================================================= */
function generateClassicVerticalTemplate(data: TemplateData, primary: string, secondary: string, accent: string) {
  const css = `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cinzel', 'Playfair Display', Georgia, serif;
      background: var(--secondary);
      color: var(--primary);
      line-height: 1.6;
      overflow-x: hidden;
    }
    .wrapper { max-width: 720px; margin: 0 auto; padding: 0 16px 60px; }
    .hero {
      position: relative;
      min-height: 480px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 24px;
      border-bottom: 2px solid var(--accent);
      background: ${data.coverImageUrl ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${data.coverImageUrl}') center/cover no-repeat` : 'var(--secondary)'};
      color: ${data.coverImageUrl ? '#ffffff' : 'var(--primary)'};
    }
    .hero-sub {
      text-transform: uppercase;
      letter-spacing: 4px;
      font-size: 13px;
      margin-bottom: 12px;
      color: var(--accent);
      font-weight: 700;
    }
    .hero-title {
      font-size: 38px;
      font-weight: 800;
      margin-bottom: 14px;
      line-height: 1.2;
    }
    .hero-date {
      display: inline-block;
      border-top: 1px solid var(--accent);
      border-bottom: 1px solid var(--accent);
      padding: 6px 20px;
      font-size: 15px;
      letter-spacing: 2px;
      margin-top: 10px;
    }
    .section-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 32px 28px;
      margin-top: 28px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.06);
      text-align: center;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
      position: relative;
      display: inline-block;
    }
    .section-title::after {
      content: '';
      display: block;
      width: 40px;
      height: 2px;
      background: var(--accent);
      margin: 8px auto 0;
    }
    .section-desc {
      font-size: 15px;
      color: var(--primary);
      opacity: 0.9;
      white-space: pre-line;
      max-width: 580px;
      margin: 0 auto;
    }
    .timeline-item {
      padding: 16px 0;
      border-bottom: 1px dashed rgba(0,0,0,0.12);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      text-align: left;
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-time {
      font-weight: 800;
      color: var(--accent);
      min-width: 70px;
      font-size: 14px;
    }
    .timeline-content h4 { font-size: 16px; margin-bottom: 4px; }
    .timeline-content p { font-size: 13.5px; opacity: 0.8; }
    .bank-card {
      background: var(--secondary);
      border-radius: 8px;
      padding: 20px;
      margin-top: 14px;
      font-size: 14px;
      line-height: 1.8;
      border: 1px dashed var(--accent);
    }
    .btn-rsvp {
      display: inline-block;
      background: var(--accent);
      color: #ffffff;
      padding: 14px 36px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }
  `;

  const html = `
    <div class="wrapper">
      <header class="hero">
        ${data.subheadline ? `<p class="hero-sub">${escapeHtml(data.subheadline)}</p>` : ''}
        <h1 class="hero-title">${escapeHtml(data.headline || 'Nuestra Boda')}</h1>
        ${data.eventDate ? `<p class="hero-date">${escapeHtml(data.eventDate)}</p>` : ''}
      </header>

      ${data.message ? `
      <section class="section-card">
        <h2 class="section-title">Bienvenidos</h2>
        <p class="section-desc">${escapeHtml(data.message)}</p>
      </section>
      ` : ''}

      ${(data.storyTitle || data.storyBody) ? `
      <section class="section-card">
        <h2 class="section-title">${escapeHtml(data.storyTitle || 'Nuestra Historia')}</h2>
        <p class="section-desc">${escapeHtml(data.storyBody)}</p>
      </section>
      ` : ''}

      ${data.itinerary?.length ? `
      <section class="section-card">
        <h2 class="section-title">Itinerario</h2>
        <div>
          ${data.itinerary.map(item => `
            <div class="timeline-item">
              <div class="timeline-time">${escapeHtml(item.time)}</div>
              <div class="timeline-content">
                <h4>${escapeHtml(item.title)}</h4>
                ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}

      ${data.locations?.length ? `
      <section class="section-card">
        <h2 class="section-title">Ubicaciones</h2>
        ${data.locations.map(loc => `
          <div style="margin-bottom: 20px; text-align: left; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--accent);">${escapeHtml(loc.name)}</h3>
            <p style="font-size: 14px; margin: 4px 0;">${escapeHtml(loc.address)}</p>
            ${loc.notes ? `<p style="font-size: 13px; opacity: 0.75; font-style: italic;">${escapeHtml(loc.notes)}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      ${data.dressCode ? `
      <section class="section-card">
        <h2 class="section-title">Código de Vestimenta</h2>
        <p class="section-desc">${escapeHtml(data.dressCode)}</p>
      </section>
      ` : ''}

      ${(data.giftIntroText || data.giftRegistry?.length || data.envelopeBank || data.envelopeClabe) ? `
      <section class="section-card">
        <h2 class="section-title">Mesa de Regalos & Obsequios</h2>
        ${data.giftIntroText ? `<p class="section-desc" style="margin-bottom: 16px;">${escapeHtml(data.giftIntroText)}</p>` : ''}
        ${data.giftRegistry?.length ? `
          <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 14px 0;">
            ${data.giftRegistry.map(g => `
              <div style="padding: 10px 18px; background: var(--secondary); border-radius: 8px; font-size: 13px;">
                <strong>${escapeHtml(g.store || g.title)}</strong>
                ${g.note ? `<br><small>${escapeHtml(g.note)}</small>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${(data.envelopeBank || data.envelopeClabe) ? `
          <div class="bank-card">
            <strong>Sobre Digital (Transferencia Bancaria):</strong><br>
            ${data.envelopeBank ? `Banco: <strong>${escapeHtml(data.envelopeBank)}</strong><br>` : ''}
            ${data.envelopeHolder ? `Titular: <strong>${escapeHtml(data.envelopeHolder)}</strong><br>` : ''}
            ${data.envelopeAccount ? `Cuenta: <strong>${escapeHtml(data.envelopeAccount)}</strong><br>` : ''}
            ${data.envelopeClabe ? `CLABE: <strong>${escapeHtml(data.envelopeClabe)}</strong><br>` : ''}
            ${data.envelopeNote ? `<em>${escapeHtml(data.envelopeNote)}</em>` : ''}
          </div>
        ` : ''}
      </section>
      ` : ''}

      ${data.lodgingText ? `
      <section class="section-card">
        <h2 class="section-title">Hospedaje Recomendado</h2>
        <p class="section-desc">${escapeHtml(data.lodgingText)}</p>
      </section>
      ` : ''}

      ${data.dedicationIntroText ? `
      <section class="section-card">
        <h2 class="section-title">Dedicatorias & Buenos Deseos</h2>
        <p class="section-desc">${escapeHtml(data.dedicationIntroText)}</p>
      </section>
      ` : ''}

      <section class="section-card" style="background: var(--primary); color: #ffffff;">
        <h2 class="section-title" style="color: var(--accent);">Confirmación de Asistencia</h2>
        <p style="font-size: 15px; opacity: 0.9; margin-bottom: 20px;">Nos encantaría contar con tu presencia en este gran día.</p>
        <span class="btn-rsvp">Confirmar Asistencia (RSVP)</span>
      </section>
    </div>
  `;

  return { html, css };
}

/* =========================================================================
   2. SOBRE INTERACTIVO & CARDS
   ========================================================================= */
function generateEnvelopeCardsTemplate(data: TemplateData, primary: string, secondary: string, accent: string) {
  const css = `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(ellipse at center, ${secondary} 0%, #1a1e29 100%);
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .envelope-box {
      width: 100%;
      max-width: 580px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      color: var(--primary);
    }
    .env-header {
      background: linear-gradient(135deg, var(--primary), #2c3e50);
      color: #ffffff;
      text-align: center;
      padding: 40px 24px;
      position: relative;
    }
    .env-badge {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .env-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .env-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.8);
      letter-spacing: 1px;
    }
    .card-list {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .card-item {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid var(--accent);
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-body {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.6;
      white-space: pre-line;
    }
  `;

  const html = `
    <div class="envelope-box">
      <div class="env-header">
        <span class="env-badge">Invitación Especial</span>
        <h1 class="env-title">${escapeHtml(data.headline || 'Boda')}</h1>
        <p class="env-sub">${escapeHtml(data.subheadline || 'Estás cordialmente invitado')}</p>
        ${data.eventDate ? `<div style="margin-top:12px; font-size:14px; color:var(--accent); font-weight:700;">📅 ${escapeHtml(data.eventDate)}</div>` : ''}
      </div>

      <div class="card-list">
        ${data.message ? `
          <div class="card-item">
            <h3 class="card-title">💌 Mensaje</h3>
            <p class="card-body">${escapeHtml(data.message)}</p>
          </div>
        ` : ''}

        ${(data.storyTitle || data.storyBody) ? `
          <div class="card-item">
            <h3 class="card-title">📖 ${escapeHtml(data.storyTitle || 'Nuestra Historia')}</h3>
            <p class="card-body">${escapeHtml(data.storyBody)}</p>
          </div>
        ` : ''}

        ${data.itinerary?.length ? `
          <div class="card-item">
            <h3 class="card-title">⏰ Itinerario</h3>
            <div class="card-body">
              ${data.itinerary.map(i => `<strong>${escapeHtml(i.time)}</strong> - ${escapeHtml(i.title)} ${i.description ? `(${escapeHtml(i.description)})` : ''}<br>`).join('')}
            </div>
          </div>
        ` : ''}

        ${data.locations?.length ? `
          <div class="card-item">
            <h3 class="card-title">📍 Ubicaciones</h3>
            <div class="card-body">
              ${data.locations.map(l => `<strong>${escapeHtml(l.name)}</strong>: ${escapeHtml(l.address)} ${l.notes ? `<em>(${escapeHtml(l.notes)})</em>` : ''}<br>`).join('')}
            </div>
          </div>
        ` : ''}

        ${data.dressCode ? `
          <div class="card-item">
            <h3 class="card-title">👔 Código de Vestimenta</h3>
            <p class="card-body">${escapeHtml(data.dressCode)}</p>
          </div>
        ` : ''}

        ${(data.giftIntroText || data.giftRegistry?.length || data.envelopeBank) ? `
          <div class="card-item">
            <h3 class="card-title">🎁 Regalos</h3>
            <p class="card-body">${escapeHtml(data.giftIntroText || '')}</p>
            ${data.envelopeBank ? `<p class="card-body" style="margin-top:6px;"><strong>Transferencia:</strong> ${escapeHtml(data.envelopeBank)} · CLABE: ${escapeHtml(data.envelopeClabe || '')} · ${escapeHtml(data.envelopeHolder || '')}</p>` : ''}
          </div>
        ` : ''}

        ${data.lodgingText ? `
          <div class="card-item">
            <h3 class="card-title">🏨 Hospedaje</h3>
            <p class="card-body">${escapeHtml(data.lodgingText)}</p>
          </div>
        ` : ''}

        ${data.dedicationIntroText ? `
          <div class="card-item">
            <h3 class="card-title">✍️ Dedicatorias</h3>
            <p class="card-body">${escapeHtml(data.dedicationIntroText)}</p>
          </div>
        ` : ''}

        <div class="card-item" style="background: var(--primary); color: #fff; text-align: center; border-left: none;">
          <h3 style="color: var(--accent); margin-bottom: 6px;">Confirma tu Asistencia</h3>
          <p style="font-size: 13px; opacity: 0.9;">¡Esperamos celebrar juntos!</p>
        </div>
      </div>
    </div>
  `;

  return { html, css };
}

/* =========================================================================
   3. MODERN MINIMAL (GLASSMORPHISM)
   ========================================================================= */
function generateModernMinimalTemplate(data: TemplateData, primary: string, secondary: string, accent: string) {
  const css = `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0b0f19;
      color: #f1f5f9;
      line-height: 1.6;
      min-height: 100vh;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .glass-wrapper { width: 100%; max-width: 680px; }
    .glass-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 36px 28px;
      margin-bottom: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    .hero-glow {
      background: linear-gradient(135deg, rgba(182, 123, 75, 0.2), rgba(30, 41, 59, 0.8));
    }
    .badge-modern {
      display: inline-block;
      background: linear-gradient(135deg, var(--accent), #e2b17b);
      color: #111;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 2px;
      padding: 6px 16px;
      border-radius: 30px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .headline-modern {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .title-modern {
      font-size: 18px;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }
    .text-muted { color: #94a3b8; font-size: 14.5px; white-space: pre-line; }
    .item-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 10px;
      text-align: left;
    }
    .btn-glow {
      display: inline-block;
      background: linear-gradient(135deg, var(--accent), #d4a06a);
      color: #111;
      font-weight: 800;
      padding: 14px 36px;
      border-radius: 30px;
      text-decoration: none;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 0 25px rgba(182, 123, 75, 0.4);
      margin-top: 14px;
    }
  `;

  const html = `
    <div class="glass-wrapper">
      <div class="glass-card hero-glow">
        <span class="badge-modern">${escapeHtml(data.subheadline || 'Gran Celebración')}</span>
        <h1 class="headline-modern">${escapeHtml(data.headline || 'Nuestra Fiesta')}</h1>
        ${data.eventDate ? `<p style="font-size: 15px; color: var(--accent); font-weight: 700; margin-top: 8px;">✨ ${escapeHtml(data.eventDate)}</p>` : ''}
      </div>

      ${data.message ? `
        <div class="glass-card">
          <h2 class="title-modern">Mensaje de Bienvenida</h2>
          <p class="text-muted">${escapeHtml(data.message)}</p>
        </div>
      ` : ''}

      ${(data.storyTitle || data.storyBody) ? `
        <div class="glass-card">
          <h2 class="title-modern">${escapeHtml(data.storyTitle || 'Nuestra Historia')}</h2>
          <p class="text-muted">${escapeHtml(data.storyBody)}</p>
        </div>
      ` : ''}

      ${data.itinerary?.length ? `
        <div class="glass-card">
          <h2 class="title-modern">Timeline del Evento</h2>
          ${data.itinerary.map(i => `
            <div class="item-pill">
              <strong style="color: var(--accent);">${escapeHtml(i.time)}</strong> — <strong>${escapeHtml(i.title)}</strong>
              ${i.description ? `<br><small class="text-muted">${escapeHtml(i.description)}</small>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.locations?.length ? `
        <div class="glass-card">
          <h2 class="title-modern">Ubicaciones</h2>
          ${data.locations.map(l => `
            <div class="item-pill">
              <strong style="color: #fff;">${escapeHtml(l.name)}</strong>
              <p class="text-muted" style="margin: 4px 0;">${escapeHtml(l.address)}</p>
              ${l.notes ? `<small style="color: var(--accent); font-style: italic;">${escapeHtml(l.notes)}</small>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.dressCode ? `
        <div class="glass-card">
          <h2 class="title-modern">Código de Vestimenta</h2>
          <p class="text-muted">${escapeHtml(data.dressCode)}</p>
        </div>
      ` : ''}

      ${(data.giftIntroText || data.giftRegistry?.length || data.envelopeBank) ? `
        <div class="glass-card">
          <h2 class="title-modern">Mesa de Regalos</h2>
          ${data.giftIntroText ? `<p class="text-muted" style="margin-bottom: 12px;">${escapeHtml(data.giftIntroText)}</p>` : ''}
          ${data.envelopeBank ? `
            <div class="item-pill" style="background: rgba(182, 123, 75, 0.1); border-color: var(--accent);">
              <strong>${escapeHtml(data.envelopeBank)}</strong><br>
              ${data.envelopeHolder ? `Titular: ${escapeHtml(data.envelopeHolder)}<br>` : ''}
              ${data.envelopeClabe ? `CLABE: <code>${escapeHtml(data.envelopeClabe)}</code><br>` : ''}
              ${data.envelopeNote ? `<em>${escapeHtml(data.envelopeNote)}</em>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${data.lodgingText ? `
        <div class="glass-card">
          <h2 class="title-modern">Hospedaje</h2>
          <p class="text-muted">${escapeHtml(data.lodgingText)}</p>
        </div>
      ` : ''}

      ${data.dedicationIntroText ? `
        <div class="glass-card">
          <h2 class="title-modern">Dedicatorias</h2>
          <p class="text-muted">${escapeHtml(data.dedicationIntroText)}</p>
        </div>
      ` : ''}

      <div class="glass-card" style="border-color: var(--accent);">
        <h2 class="title-modern" style="color: #fff;">¿Nos Acompañas?</h2>
        <p class="text-muted">Por favor confirma tu asistencia con antelación.</p>
        <span class="btn-glow">Confirmar Asistencia</span>
      </div>
    </div>
  `;

  return { html, css };
}
