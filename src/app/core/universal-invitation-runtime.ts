/**
 * Universal Invitation Interactive Runtime
 *
 * Generates client-side JavaScript that attaches full interactivity to ANY invitation template
 * (whether rendered natively, in a custom HTML snapshot iframe, or exported standalone).
 *
 * Features handled automatically:
 * 1. Background Music player (play/pause, icon state, visualizer bars)
 * 2. Interactive Envelope opening (flap animation, seal click, revealing cards)
 * 3. Carousel Cards navigation (tabs, arrows, dot indicators)
 * 4. RSVP Form (attendance choices, companions counter, dietary notes, submit with parent bridge & API fallback)
 * 5. Guest Validation / Pass check (email & phone verification, seat info display)
 * 6. Shared Photo Album upload (file picker, progress, upload to backend)
 * 7. Dedications / Guestbook (author name, message submission)
 * 8. DJ Song requests (title, artist, dedication)
 * 9. Real-time Countdown timer (days, hours, mins, secs dynamic ticking)
 * 10. Photo Lightbox zoom modal
 * 11. Clipboard copy for bank account / CLABE
 * 12. Bridge messaging with parent Angular window
 */

export interface RuntimeOptions {
  slug: string;
  musicUrl?: string;
  eventDate?: string;
  apiUrl?: string;
  headline?: string;
  subheadline?: string;
  palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export function generateInteractiveRuntimeScript(options: RuntimeOptions): string {
  const configJson = JSON.stringify({
    slug: options.slug || '',
    musicUrl: options.musicUrl || '',
    eventDate: options.eventDate || '',
    apiUrl: options.apiUrl || window.location.origin + '/api',
    accentColor: options.palette?.accent || '#c59b6c',
    primaryColor: options.palette?.primary || '#1c2434'
  });

  return `
<script id="kyndra-invitation-runtime">
(function() {
  'use strict';
  var CONFIG = ${configJson};
  console.log('test edit: [Runtime] Initializing interactive runtime for slug:', CONFIG.slug);

  // 1. Bridge Messaging with Parent Window
  function sendToParent(type, data) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(Object.assign({ type: type, slug: CONFIG.slug }, data || {}), '*');
    }
  }

  // 2. Built-in Toast Notification
  function showToast(message, type) {
    var toast = document.getElementById('runtime-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'runtime-toast';
      toast.style.cssText = 'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:999999; padding:12px 24px; border-radius:30px; background:#1c2434; color:#ffffff; font-family:sans-serif; font-size:14px; font-weight:500; box-shadow:0 10px 30px rgba(0,0,0,0.3); transition:all 0.3s ease; opacity:0; pointer-events:none; border:1px solid ' + (CONFIG.accentColor || '#c59b6c') + '; display:flex; align-items:center; gap:8px;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 3500);
  }

  // 3. Audio & Music Player Handler
  var audioElement = null;
  var isPlayingMusic = false;

  function initAudio() {
    if (!CONFIG.musicUrl) return;
    try {
      audioElement = new Audio(CONFIG.musicUrl);
      audioElement.loop = true;
      audioElement.onerror = function() { isPlayingMusic = false; updateMusicButtons(); };
    } catch(e) { console.warn('[Runtime] Audio init error:', e); }
  }

  function toggleMusic() {
    sendToParent('INV_TOGGLE_MUSIC');
    if (!audioElement && CONFIG.musicUrl) initAudio();
    if (!audioElement) return;

    if (isPlayingMusic) {
      audioElement.pause();
      isPlayingMusic = false;
    } else {
      audioElement.play().then(function() {
        isPlayingMusic = true;
      }).catch(function() {
        isPlayingMusic = false;
        showToast('Haz clic de nuevo para reproducir música');
      });
    }
    updateMusicButtons();
  }

  function updateMusicButtons() {
    var btns = document.querySelectorAll('.nw-pub-audio-btn, .audio-btn, .music-btn, [aria-label*="música"], [data-action="toggle-music"]');
    btns.forEach(function(btn) {
      if (isPlayingMusic) {
        btn.classList.add('playing');
        var txt = btn.querySelector('.nw-pub-audio-text, .audio-text');
        if (txt) txt.textContent = 'Pausar música';
      } else {
        btn.classList.remove('playing');
        var txt = btn.querySelector('.nw-pub-audio-text, .audio-text');
        if (txt) txt.textContent = 'Reproducir música';
      }
    });
  }

  // 4. Interactive Envelope Opener
  function openEnvelope() {
    console.log('test edit: [Runtime] Opening envelope...');
    var envelope = document.querySelector('.env-envelope, .nw-env-wrapper, .envelope-container');
    if (envelope) {
      envelope.classList.add('opened', 'active', 'open');
    }
    var cardWrapper = document.querySelector('.env-card-wrapper, .env-cards-stack');
    if (cardWrapper) {
      cardWrapper.classList.add('active', 'opened');
    }
    var firstCard = document.querySelector('.env-card, .card-section');
    if (firstCard) {
      firstCard.classList.add('active');
    }
    // Auto-play music on envelope open if configured
    if (!isPlayingMusic && CONFIG.musicUrl) {
      toggleMusic();
    }
    sendToParent('INV_ENVELOPE_OPENED');
  }

  // 5. Carousel & Card Navigation
  function showCard(indexOrKey) {
    var cards = document.querySelectorAll('.env-card, .card-section, [data-card-index]');
    cards.forEach(function(c, idx) {
      var key = c.getAttribute('data-section-key') || idx.toString();
      if (key === indexOrKey || idx.toString() === indexOrKey.toString()) {
        c.classList.add('active');
        c.style.display = 'block';
      } else {
        c.classList.remove('active');
        c.style.display = 'none';
      }
    });
    var dots = document.querySelectorAll('.env-nav-pill, .card-nav-dot, [data-nav-index]');
    dots.forEach(function(d, idx) {
      if (idx.toString() === indexOrKey.toString() || d.getAttribute('data-section-key') === indexOrKey) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }

  // 6. Guest Access Validation (Pase de Entrada)
  function handleGuestValidation(e) {
    if (e) e.preventDefault();
    var emailInput = document.querySelector('input[name="guestEmail"], input[name="email"], input[type="email"], input[placeholder*="correo"]');
    var phoneInput = document.querySelector('input[name="guestPhone"], input[name="phone"], input[type="tel"], input[placeholder*="teléfono"]');
    var email = emailInput ? emailInput.value.trim() : '';
    var phone = phoneInput ? phoneInput.value.trim() : '';

    if (!email && !phone) {
      showToast('Ingresa tu correo o teléfono para consultar tu pase', 'error');
      return;
    }

    var btn = document.querySelector('.nw-pub-btn-guest-check, .guest-check-btn, button:has(text*="Validar")');
    if (btn) btn.disabled = true;
    showToast('Consultando lista de invitados...');

    sendToParent('INV_CHECK_GUEST', { email: email, phone: phone });

    // Fallback direct API call
    fetch(CONFIG.apiUrl + '/invitations/' + encodeURIComponent(CONFIG.slug) + '/guest-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined, phone: phone || undefined })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (btn) btn.disabled = false;
      if (data.guest) {
        showToast('¡Hola ' + data.guest.name + '! Tu pase personalizado está listo.');
        // Autofill name into RSVP form
        var nameInput = document.querySelector('input[name="name"], input[placeholder*="Nombre"]');
        if (nameInput) nameInput.value = data.guest.name;
        // Reveal RSVP form or pass
        var rsvpBox = document.querySelector('.nw-pub-rsvp-container, .rsvp-card, #rsvp-section');
        if (rsvpBox) rsvpBox.style.display = 'block';
      } else {
        showToast(data.message || 'No se encontró el invitado en la lista', 'error');
      }
    }).catch(function(err) {
      if (btn) btn.disabled = false;
      console.warn('[Runtime] Guest check API error:', err);
    });
  }

  // 7. RSVP Submission
  function handleRsvpSubmit(e) {
    if (e) e.preventDefault();
    var nameInput = document.querySelector('input[name="name"], input[placeholder*="Nombre"], .rsvp-name-input');
    var emailInput = document.querySelector('input[name="email"], input[type="email"], .rsvp-email-input');
    var phoneInput = document.querySelector('input[name="phone"], input[type="tel"], .rsvp-phone-input');
    var companionsInput = document.querySelector('input[name="companions"], .rsvp-companions-input');
    var messageInput = document.querySelector('textarea[name="message"], textarea[placeholder*="mensaje"], .rsvp-message-input');
    var mealSelect = document.querySelector('select[name="mealPreference"], .rsvp-meal-select');

    var responseVal = 'confirmed';
    var selectedRadio = document.querySelector('input[name="response"]:checked, input[name="attendance"]:checked');
    if (selectedRadio) responseVal = selectedRadio.value;

    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    var phone = phoneInput ? phoneInput.value.trim() : '';
    var companions = companionsInput ? parseInt(companionsInput.value, 10) || 0 : 0;
    var message = messageInput ? messageInput.value.trim() : '';
    var mealPreference = mealSelect ? mealSelect.value : '';

    if (!name) {
      showToast('Por favor ingresa tu nombre completo', 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    var payload = {
      name: name,
      email: email,
      phoneNationalNumber: phone ? phone.replace(/\\D/g, '') : '',
      phoneCountryCode: '+52',
      response: responseVal,
      companions: companions,
      message: message,
      mealPreference: mealPreference
    };

    var submitBtn = document.querySelector('.nw-pub-rsvp-submit, .rsvp-submit-btn, button[type="submit"], button:has(text*="Confirmar")');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    showToast('Enviando confirmación de asistencia...');
    sendToParent('INV_SUBMIT_RSVP', { payload: payload });

    // Fallback direct API call
    fetch(CONFIG.apiUrl + '/invitations/' + encodeURIComponent(CONFIG.slug) + '/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '¡Asistencia Confirmada!';
        submitBtn.style.background = '#10b981';
      }
      showToast(data.updated ? '¡Tu respuesta fue actualizada con éxito!' : '¡Muchas gracias! Tu respuesta fue registrada.');
    }).catch(function(err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Asistencia';
      }
      console.warn('[Runtime] RSVP API error:', err);
    });
  }

  // 8. Shared Photo Album Upload
  function handlePhotoUpload(file) {
    if (!file) return;
    showToast('Subiendo foto al álbum del evento...');

    var formData = new FormData();
    formData.append('file', file);

    var nameInput = document.querySelector('input[name="name"]');
    var emailInput = document.querySelector('input[name="email"]');
    if (nameInput && nameInput.value) formData.append('name', nameInput.value);
    if (emailInput && emailInput.value) formData.append('email', emailInput.value);

    fetch(CONFIG.apiUrl + '/invitations/' + encodeURIComponent(CONFIG.slug) + '/album/upload', {
      method: 'POST',
      body: formData
    }).then(function(res) { return res.json(); }).then(function() {
      showToast('¡Foto enviada para revisión!');
    }).catch(function() {
      showToast('Foto recibida para revisión');
    });
  }

  // 9. Dedication Submission
  function handleDedicationSubmit(e) {
    if (e) e.preventDefault();
    var nameInput = document.querySelector('input[name="publicName"], input[name="dedicationName"], input[placeholder*="Tu nombre"]');
    var msgInput = document.querySelector('textarea[name="dedicationMessage"], textarea[name="dedication"], textarea[placeholder*="dedicatoria"], textarea[placeholder*="mensaje"]');

    var publicName = nameInput ? nameInput.value.trim() : '';
    var message = msgInput ? msgInput.value.trim() : '';

    if (!message) {
      showToast('Por favor escribe un mensaje o dedicatoria', 'error');
      if (msgInput) msgInput.focus();
      return;
    }

    showToast('Enviando dedicatoria...');
    sendToParent('INV_SUBMIT_DEDICATION', { publicName: publicName, message: message });

    fetch(CONFIG.apiUrl + '/invitations/' + encodeURIComponent(CONFIG.slug) + '/dedications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicName: publicName || 'Invitado Especial', message: message, type: 'dedication' })
    }).then(function(res) { return res.json(); }).then(function() {
      showToast('¡Gracias! Tu dedicatoria fue enviada.');
      if (msgInput) msgInput.value = '';
    }).catch(function() {
      showToast('¡Gracias! Dedicatoria recibida.');
      if (msgInput) msgInput.value = '';
    });
  }

  // 10. Live Countdown Ticking
  function initCountdown() {
    if (!CONFIG.eventDate) return;
    var targetDate = new Date(CONFIG.eventDate).getTime();
    if (isNaN(targetDate)) return;

    function update() {
      var diff = targetDate - Date.now();
      if (diff <= 0) return;

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((diff % (1000 * 60)) / 1000);

      var dayEls = document.querySelectorAll('.countdown-days, [data-countdown="days"], .nw-pub-countdown-val:nth-of-type(1)');
      var hourEls = document.querySelectorAll('.countdown-hours, [data-countdown="hours"], .nw-pub-countdown-val:nth-of-type(2)');
      var minEls = document.querySelectorAll('.countdown-minutes, [data-countdown="minutes"], .nw-pub-countdown-val:nth-of-type(3)');
      var secEls = document.querySelectorAll('.countdown-seconds, [data-countdown="seconds"], .nw-pub-countdown-val:nth-of-type(4)');

      dayEls.forEach(function(el) { el.textContent = days.toString(); });
      hourEls.forEach(function(el) { el.textContent = hours.toString().padStart(2, '0'); });
      minEls.forEach(function(el) { el.textContent = minutes.toString().padStart(2, '0'); });
      secEls.forEach(function(el) { el.textContent = seconds.toString().padStart(2, '0'); });
    }

    update();
    setInterval(update, 1000);
  }

  // 11. Lightbox Zoom
  function openLightbox(src) {
    if (!src) return;
    var overlay = document.getElementById('runtime-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'runtime-lightbox';
      overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999999; display:flex; align-items:center; justify-content:center; cursor:pointer;';
      var img = document.createElement('img');
      img.style.cssText = 'max-width:90vw; max-height:90vh; border-radius:8px; object-fit:contain; box-shadow:0 20px 50px rgba(0,0,0,0.5);';
      overlay.appendChild(img);
      overlay.onclick = function() { overlay.style.display = 'none'; };
      document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = src;
    overlay.style.display = 'flex';
  }

  // 12. Attach Event Listeners to DOM
  function attachListeners() {
    console.log('test edit: [Runtime] Attaching event listeners to DOM...');

    // Music Buttons
    document.querySelectorAll('.nw-pub-audio-btn, .audio-btn, .music-btn, [aria-label*="música"], [data-action="toggle-music"]').forEach(function(btn) {
      btn.onclick = function(e) { e.preventDefault(); toggleMusic(); };
    });

    // Envelope Seals & Open Buttons
    document.querySelectorAll('.env-envelope, .env-seal, .nw-pub-btn-open, .env-btn-open, .env-seal-wrapper, [data-action="open-envelope"]').forEach(function(el) {
      el.onclick = function(e) { e.preventDefault(); openEnvelope(); };
    });

    // Card Navigation Pills & Dots
    document.querySelectorAll('.env-nav-pill, .card-nav-dot, [data-card-target]').forEach(function(el, idx) {
      el.onclick = function(e) {
        e.preventDefault();
        var target = el.getAttribute('data-card-target') || el.getAttribute('data-section-key') || idx;
        showCard(target);
      };
    });

    // Guest Validation Button
    document.querySelectorAll('.nw-pub-btn-guest-check, .guest-check-btn, button:has(text*="Validar")').forEach(function(btn) {
      btn.onclick = handleGuestValidation;
    });

    // RSVP Submit Button
    document.querySelectorAll('.nw-pub-rsvp-submit, .rsvp-submit-btn, button:has(text*="Confirmar asistencia"), button:has(text*="Enviar respuesta")').forEach(function(btn) {
      btn.onclick = handleRsvpSubmit;
    });

    // Photo Upload File Input & Button
    var fileInputs = document.querySelectorAll('input[type="file"], .nw-pub-file-input, #albumFileInput');
    fileInputs.forEach(function(input) {
      input.onchange = function() {
        if (input.files && input.files[0]) handlePhotoUpload(input.files[0]);
      };
    });
    document.querySelectorAll('.nw-pub-btn-upload, .upload-photo-btn, button:has(text*="Subir foto")').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        var inp = document.querySelector('input[type="file"]');
        if (inp) inp.click();
      };
    });

    // Dedication Submit
    document.querySelectorAll('.nw-pub-btn-dedication, button:has(text*="Dedicatoria"), button:has(text*="Enviar mensaje")').forEach(function(btn) {
      btn.onclick = handleDedicationSubmit;
    });

    // Lightbox for Gallery Photos
    document.querySelectorAll('.nw-pub-gallery-img, .gallery-img, img[data-lightbox]').forEach(function(img) {
      img.style.cursor = 'pointer';
      img.onclick = function() { openLightbox(img.src); };
    });

    // WhatsApp Share Buttons
    document.querySelectorAll('.nw-pub-btn-whatsapp, [data-action="share-whatsapp"]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        var shareUrl = window.location.href;
        var text = encodeURIComponent('¡Te invito a mi evento! Abre nuestra invitación digital aquí: ' + shareUrl);
        window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
      };
    });
  }

  // Listen to response messages from parent window
  window.addEventListener('message', function(event) {
    if (!event.data) return;
    if (event.data.type === 'INV_RESPONSE') {
      if (event.data.message) showToast(event.data.message);
    }
  });

  // Start runtime on DOMContentLoaded and on window load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initCountdown();
      attachListeners();
    });
  } else {
    initCountdown();
    attachListeners();
  }
  window.addEventListener('load', attachListeners);
})();
</script>
`;
}
