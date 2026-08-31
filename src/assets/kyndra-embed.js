(function () {
  function initKyndraEmbeds() {
    var scripts = document.getElementsByTagName('script');
    var baseUrl = 'http://localhost:4200';
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('kyndra-embed.js') !== -1) {
        try {
          var urlObj = new URL(scripts[i].src);
          baseUrl = urlObj.origin;
        } catch (e) {}
        break;
      }
    }

    var elements = document.querySelectorAll('[data-kyndra-widget]');
    elements.forEach(function (el) {
      if (el.getAttribute('data-kyndra-loaded')) return;
      var widget = el.getAttribute('data-kyndra-widget');
      var portal = el.getAttribute('data-portal') || el.getAttribute('data-kyndra-portal');
      if (widget && portal) {
        el.setAttribute('data-kyndra-loaded', 'true');
        var iframe = document.createElement('iframe');
        iframe.src = baseUrl + '/new/embed/' + encodeURIComponent(portal) + '/' + encodeURIComponent(widget);
        iframe.style.width = '100%';
        iframe.style.height = el.getAttribute('data-height') || '720px';
        iframe.style.border = '0';
        iframe.style.overflow = 'hidden';
        iframe.style.borderRadius = '12px';
        iframe.setAttribute('allow', 'autoplay; camera; clipboard-write; encrypted-media');
        iframe.setAttribute('allowfullscreen', 'true');
        el.appendChild(iframe);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKyndraEmbeds);
  } else {
    initKyndraEmbeds();
  }
})();
