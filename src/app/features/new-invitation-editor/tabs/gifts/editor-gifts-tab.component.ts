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
      imageUrl: '/assets/giftTable/liverpool-logo.jpg',
      url: 'https://mesaderegalos.liverpool.com.mx/',
      advantages: 'Bonificación del 10% en Monedero Electrónico sobre todas las compras, opción de transferir regalos a saldo o recibirlos físicamente, envíos gratis a domicilio y app para escanear en tienda.',
      badge: 'Popular #1 en México'
    },
    {
      name: 'Amazon México',
      title: 'Lista de Regalos Amazon',
      imageUrl: '/assets/giftTable/logo-amazon.png',
      url: 'https://www.amazon.com.mx/wedding/',
      advantages: 'Catálogo con millones de productos internacionales, 10% al 15% de descuento en artículos restantes en tu lista después del evento, devoluciones extendidas a 180 días y envíos rápidos Prime.',
      badge: 'Envíos Rápidos Prime'
    },
    {
      name: 'El Palacio de Hierro',
      title: 'Mesa de Regalos Palacio',
      imageUrl: '/assets/giftTable/palacio-logo.png',
      url: 'https://www.elpalaciodehierro.com/listaregalos',
      advantages: 'Exclusividad y marcas de lujo, 10% acumulativo en Tarjeta Palacio, regalos de bienvenida por apertura y asesoría personalizada de interiorismo.',
      badge: 'Exclusivo & Lujo'
    },
    {
      name: 'Sears México',
      title: 'Mesa de Regalos Sears',
      imageUrl: '/assets/giftTable/sears_logo.jpg',
      url: 'https://www.sears.com.mx/Mesa-de-Regalos/',
      advantages: 'Bonificación en saldo Sears sobre el total comprado, facilidades a Meses Sin Intereses para invitados y amplia variedad en muebles y electrodomésticos.',
      badge: 'Meses Sin Intereses'
    },
    {
      name: 'Mercado Libre',
      title: 'Lista de Regalos Mercado Libre',
      imageUrl: '/assets/giftTable/mercado-libre-logo.png',
      url: 'https://centrodepartners.mercadolibre.com.mx/apps/mesa-de-regalos-mercado-libre',
      advantages: 'Entregas en 24 horas a todo el país, gran variedad de marcas y vendedores con Compra Protegida.',
      badge: 'Entrega 24h'
    },
    {
      name: 'Uniko / Mesa en Efectivo',
      title: 'Regalos Convertibles a Efectivo (Uniko)',
      imageUrl: '/assets/giftTable/logo_uniko.webp',
      url: 'https://uniko.co/',
      advantages: 'Los invitados eligen regalos virtuales del catálogo pero tú recibes el 100% del dinero transferido directamente a tu cuenta bancaria.',
      badge: '100% Efectivo'
    }
  ];

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gifts' || key === 'giftRegistry') return Boolean(this.invitation.content.giftSettings?.enabled !== false && settings.giftRegistry !== false);
    if (key === 'digitalEnvelope') return Boolean(settings.digitalEnvelope !== false && this.invitation.content.giftSettings?.showEnvelope !== false);
    return settings[key] !== false;
  }

  isPresetStore(storeName?: string): boolean {
    if (!storeName) return false;
    const name = storeName.toLowerCase().trim();
    return this.presetStores.some(s => {
      const pName = s.name.toLowerCase().trim();
      return pName === name || name.includes(pName) || pName.includes(name);
    });
  }

  addPresetStore(store: typeof this.presetStores[0]): void {
    if (!this.invitation.content.giftRegistry) {
      this.invitation.content.giftRegistry = [];
    }
    this.invitation.content.giftRegistry.push({
      store: store.name,
      title: store.title,
      url: store.url,
      imageUrl: '',
      note: store.advantages,
      priority: this.invitation.content.giftRegistry.length + 1
    });
  }

  onSelectPresetForGift(gift: any, storeName: string): void {
    if (storeName === 'OTRO') {
      gift.store = '';
      gift.imageUrl = '';
      gift.title = '';
      gift.url = '';
      gift.note = '';
      return;
    }
    const preset = this.presetStores.find(s => s.name === storeName);
    if (preset) {
      gift.store = preset.name;
      gift.title = preset.title;
      gift.url = preset.url;
      gift.imageUrl = '';
      gift.note = preset.advantages;
    }
  }

  getAdvantagesForStore(storeName?: string): string {
    if (!storeName) return '';
    const preset = this.presetStores.find(s => s.name.toLowerCase() === storeName.toLowerCase() || s.name.toLowerCase().includes(storeName.toLowerCase()));
    return preset ? preset.advantages : '';
  }

  getStoreLogo(gift: any): string {
    if (!gift) return '';
    const img = (gift.imageUrl || '').trim();
    if (img && !img.startsWith('data:image/svg') && !img.includes('assets/giftTable/')) {
      return img;
    }
    const storeLower = (gift.store || gift.title || '').toLowerCase().trim();
    if (storeLower.includes('liverpool')) {
      return '/assets/giftTable/liverpool-logo.jpg';
    }
    if (storeLower.includes('palacio')) {
      return '/assets/giftTable/palacio-logo.png';
    }
    if (storeLower.includes('sears')) {
      return '/assets/giftTable/sears_logo.jpg';
    }
    if (storeLower.includes('uniko') || storeLower.includes('efectivo')) {
      return '/assets/giftTable/logo_uniko.webp';
    }
    if (storeLower.includes('amazon')) {
      return '/assets/giftTable/logo-amazon.png';
    }
    if (storeLower.includes('mercado')) {
      return '/assets/giftTable/mercado-libre-logo.png';
    }
    return img;
  }
}
