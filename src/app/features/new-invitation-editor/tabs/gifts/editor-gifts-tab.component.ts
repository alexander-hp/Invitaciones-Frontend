import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-gifts-tab',
  templateUrl: './editor-gifts-tab.component.html'
})
export class EditorGiftsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() activeTab = 'all';
  @Input() assetUploading = false;

  @Output() addGiftItem = new EventEmitter<void>();
  @Output() removeGiftItem = new EventEmitter<number>();
  @Output() uploadEnvelopeQr = new EventEmitter<Event>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  showStoreGuide = false;

  readonly presetStores = [
    {
      name: 'Liverpool',
      title: 'Mesa de Regalos Liverpool',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23E20074" rx="10"/><text x="50%" y="64%" font-family="Georgia, serif" font-weight="bold" font-style="italic" font-size="36" fill="%23FFFFFF" text-anchor="middle">Liverpool</text></svg>',
      url: 'https://mesaderegalos.liverpool.com.mx/',
      advantages: 'Bonificación del 10% en Monedero Electrónico sobre todas las compras, opción de transferir regalos a saldo o recibirlos físicamente, envíos gratis a domicilio y app para escanear en tienda.',
      badge: 'Popular #1 en México'
    },
    {
      name: 'Amazon México',
      title: 'Lista de Regalos Amazon',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23232F3E" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="%23FF9900" text-anchor="middle">amazon</text></svg>',
      url: 'https://www.amazon.com.mx/wedding/',
      advantages: 'Catálogo con millones de productos internacionales, 10% al 15% de descuento en artículos restantes en tu lista después del evento, devoluciones extendidas a 180 días y envíos rápidos Prime.',
      badge: 'Envíos Rápidos Prime'
    },
    {
      name: 'El Palacio de Hierro',
      title: 'Mesa de Regalos Palacio',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23000000" rx="10"/><text x="50%" y="60%" font-family="Georgia, serif" font-weight="bold" font-size="20" fill="%23D4AF37" text-anchor="middle" letter-spacing="2">EL PALACIO DE HIERRO</text></svg>',
      url: 'https://www.elpalaciodehierro.com/mesa-de-regalos',
      advantages: 'Exclusividad y marcas de lujo, 10% acumulativo en Tarjeta Palacio, regalos de bienvenida por apertura y asesoría personalizada de interiorismo.',
      badge: 'Exclusivo & Lujo'
    },
    {
      name: 'Sears México',
      title: 'Mesa de Regalos Sears',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23B80000" rx="10"/><text x="50%" y="65%" font-family="Arial, sans-serif" font-weight="900" font-size="38" fill="%23FFFFFF" text-anchor="middle" letter-spacing="3">SEARS</text></svg>',
      url: 'https://www.sears.com.mx/mesaderegalos/',
      advantages: 'Bonificación en saldo Sears sobre el total comprado, facilidades a Meses Sin Intereses para invitados y amplia variedad en muebles y electrodomésticos.',
      badge: 'Meses Sin Intereses'
    },
    {
      name: 'Mercado Libre',
      title: 'Lista de Regalos Mercado Libre',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23FFE600" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="%232D3277" text-anchor="middle">mercado libre</text></svg>',
      url: 'https://www.mercadolibre.com.mx/',
      advantages: 'Entregas en 24 horas a todo el país, gran variedad de marcas y vendedores con Compra Protegida.',
      badge: 'Entrega 24h'
    },
    {
      name: 'Uniko / Mesa en Efectivo',
      title: 'Regalos Convertibles a Efectivo (Uniko)',
      imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%231E293B" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="32" fill="%23F43F5E" text-anchor="middle" letter-spacing="4">UNIKO</text></svg>',
      url: 'https://uniko.co/',
      advantages: 'Los invitados eligen regalos virtuales del catálogo pero tú recibes el 100% del dinero transferido directamente a tu cuenta bancaria.',
      badge: '100% Efectivo'
    }
  ];

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gifts') return Boolean(this.invitation.content.giftSettings?.enabled && settings.giftRegistry !== false);
    return settings[key] !== false;
  }

  addPresetStore(store: typeof this.presetStores[0]): void {
    if (!this.invitation.content.giftRegistry) {
      this.invitation.content.giftRegistry = [];
    }
    this.invitation.content.giftRegistry.push({
      store: store.name,
      title: store.title,
      url: store.url,
      imageUrl: store.imageUrl,
      note: store.advantages,
      priority: this.invitation.content.giftRegistry.length + 1
    });
  }

  onSelectPresetForGift(gift: any, storeName: string): void {
    const preset = this.presetStores.find(s => s.name === storeName);
    if (preset) {
      gift.store = preset.name;
      gift.title = gift.title || preset.title;
      gift.url = gift.url || preset.url;
      gift.imageUrl = preset.imageUrl;
      gift.note = gift.note || preset.advantages;
    }
  }

  getAdvantagesForStore(storeName?: string): string {
    if (!storeName) return '';
    const preset = this.presetStores.find(s => s.name.toLowerCase() === storeName.toLowerCase() || s.name.toLowerCase().includes(storeName.toLowerCase()));
    return preset ? preset.advantages : '';
  }

  getStoreLogo(gift: any): string {
    if (!gift) return '';
    const img = gift.imageUrl || '';
    const storeLower = (gift.store || gift.title || '').toLowerCase();
    if (storeLower.includes('liverpool')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23E20074" rx="10"/><text x="50%" y="64%" font-family="Georgia, serif" font-weight="bold" font-style="italic" font-size="36" fill="%23FFFFFF" text-anchor="middle">Liverpool</text></svg>';
    }
    if (storeLower.includes('palacio')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23000000" rx="10"/><text x="50%" y="60%" font-family="Georgia, serif" font-weight="bold" font-size="20" fill="%23D4AF37" text-anchor="middle" letter-spacing="2">EL PALACIO DE HIERRO</text></svg>';
    }
    if (storeLower.includes('sears')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23B80000" rx="10"/><text x="50%" y="65%" font-family="Arial, sans-serif" font-weight="900" font-size="38" fill="%23FFFFFF" text-anchor="middle" letter-spacing="3">SEARS</text></svg>';
    }
    if (storeLower.includes('uniko') || storeLower.includes('efectivo')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%231E293B" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="32" fill="%23F43F5E" text-anchor="middle" letter-spacing="4">UNIKO</text></svg>';
    }
    if (storeLower.includes('amazon')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23232F3E" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="%23FF9900" text-anchor="middle">amazon</text></svg>';
    }
    if (storeLower.includes('mercado')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 70"><rect width="100%" height="100%" fill="%23FFE600" rx="10"/><text x="50%" y="64%" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="%232D3277" text-anchor="middle">mercado libre</text></svg>';
    }
    return img;
  }
}
