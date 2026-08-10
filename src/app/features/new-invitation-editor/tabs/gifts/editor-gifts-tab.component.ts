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
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Logo_Liverpool.svg/512px-Logo_Liverpool.svg.png',
      url: 'https://mesaderegalos.liverpool.com.mx/',
      advantages: 'Bonificación del 10% en Monedero Electrónico sobre todas las compras, opción de transferir regalos a saldo o recibirlos físicamente, envíos gratis a domicilio y app para escanear en tienda.',
      badge: 'Popular #1 en México'
    },
    {
      name: 'Amazon México',
      title: 'Lista de Regalos Amazon',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      url: 'https://www.amazon.com.mx/wedding/',
      advantages: 'Catálogo con millones de productos internacionales, 10% al 15% de descuento en artículos restantes en tu lista después del evento, devoluciones extendidas a 180 días y envíos rápidos Prime.',
      badge: 'Envíos Rápidos Prime'
    },
    {
      name: 'El Palacio de Hierro',
      title: 'Mesa de Regalos Palacio',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_El_Palacio_de_Hierro.svg/2560px-Logo_El_Palacio_de_Hierro.svg.png',
      url: 'https://www.elpalaciodehierro.com/mesa-de-regalos',
      advantages: 'Exclusividad y marcas de lujo, 10% acumulativo en Tarjeta Palacio, regalos de bienvenida por apertura y asesoría personalizada de interiorismo.',
      badge: 'Exclusivo & Lujo'
    },
    {
      name: 'Sears México',
      title: 'Mesa de Regalos Sears',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sears_logo.svg/1024px-Sears_logo.svg.png',
      url: 'https://www.sears.com.mx/mesaderegalos/',
      advantages: 'Bonificación en saldo Sears sobre el total comprado, facilidades a Meses Sin Intereses para invitados y amplia variedad en muebles y electrodomésticos.',
      badge: 'Meses Sin Intereses'
    },
    {
      name: 'Mercado Libre',
      title: 'Lista de Regalos Mercado Libre',
      imageUrl: 'https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png',
      url: 'https://www.mercadolibre.com.mx/',
      advantages: 'Entregas en 24 horas a todo el país, gran variedad de marcas y vendedores con Compra Protegida.',
      badge: 'Entrega 24h'
    },
    {
      name: 'Mesa en Efectivo (Zankyou / Uniko)',
      title: 'Regalos Convertibles a Efectivo',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bank_envelope_icon.svg/512px-Bank_envelope_icon.svg.png',
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
      gift.imageUrl = gift.imageUrl || preset.imageUrl;
      gift.note = gift.note || preset.advantages;
    }
  }

  getAdvantagesForStore(storeName?: string): string {
    if (!storeName) return '';
    const preset = this.presetStores.find(s => s.name.toLowerCase() === storeName.toLowerCase() || s.name.toLowerCase().includes(storeName.toLowerCase()));
    return preset ? preset.advantages : '';
  }
}
