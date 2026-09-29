import {
  Baby, Bell, Blocks, Cake, CalendarDays, CalendarHeart, Camera, Car, Church, CircleCheckBig,
  CircleHelp, CircleUserRound, Clock, Crown, Facebook, Flower2, Gem, Gift, GraduationCap, Heart,
  HeartHandshake, Hotel, House, Image, Images, Instagram, KeyRound, Link, LockKeyhole,
  Download, Ellipsis, Eye, FlaskConical, Mail, MapPin, MapPinned, MessageCircle, MicVocal, Music, Music2, Navigation, Palette, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, PartyPopper,
  Phone, Play, QrCode, Send, Share2, ShieldCheck, Sparkles, Star, TicketCheck, Upload,
  Shapes, UserRound, Users, Utensils, Wine, Youtube
} from 'lucide-angular';

export const VISUAL_LUCIDE_ICONS = {
  Baby, Bell, Blocks, Cake, CalendarDays, CalendarHeart, Camera, Car, Church, CircleCheckBig,
  CircleHelp, CircleUserRound, Clock, Crown, Facebook, Flower2, Gem, Gift, GraduationCap, Heart,
  HeartHandshake, Hotel, House, Image, Images, Instagram, KeyRound, Link, LockKeyhole,
  Download, Ellipsis, Eye, FlaskConical, Mail, MapPin, MapPinned, MessageCircle, MicVocal, Music, Music2, Navigation, Palette, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, PartyPopper,
  Phone, Play, QrCode, Send, Share2, ShieldCheck, Sparkles, Star, TicketCheck, Upload,
  Shapes, UserRound, Users, Utensils, Wine, Youtube
};

export interface VisualIconOption {
  name: string;
  label: string;
  category: 'celebracion' | 'evento' | 'comunicacion' | 'servicios';
  keywords: string;
}

export const VISUAL_ICON_CATALOG: VisualIconOption[] = [
  { name: 'heart', label: 'Corazón', category: 'celebracion', keywords: 'amor boda pareja' },
  { name: 'heart-handshake', label: 'Unión', category: 'celebracion', keywords: 'amor compromiso pareja' },
  { name: 'gem', label: 'Anillo', category: 'celebracion', keywords: 'boda compromiso joya' },
  { name: 'flower-2', label: 'Flor', category: 'celebracion', keywords: 'floral jardín decoración' },
  { name: 'sparkles', label: 'Destellos', category: 'celebracion', keywords: 'brillo magia decoración' },
  { name: 'star', label: 'Estrella', category: 'celebracion', keywords: 'estrella favorito brillo' },
  { name: 'crown', label: 'Corona', category: 'celebracion', keywords: 'xv reina princesa vip' },
  { name: 'party-popper', label: 'Fiesta', category: 'celebracion', keywords: 'celebración confeti cumpleaños' },
  { name: 'cake', label: 'Pastel', category: 'celebracion', keywords: 'cumpleaños postre boda' },
  { name: 'baby', label: 'Bebé', category: 'celebracion', keywords: 'bautizo baby shower bebé' },
  { name: 'graduation-cap', label: 'Graduación', category: 'celebracion', keywords: 'graduación escuela universidad' },
  { name: 'church', label: 'Ceremonia', category: 'evento', keywords: 'iglesia misa ceremonia' },
  { name: 'calendar-days', label: 'Calendario', category: 'evento', keywords: 'fecha agenda evento' },
  { name: 'calendar-heart', label: 'Fecha especial', category: 'evento', keywords: 'fecha boda calendario' },
  { name: 'clock', label: 'Hora', category: 'evento', keywords: 'hora reloj itinerario' },
  { name: 'map-pin', label: 'Ubicación', category: 'evento', keywords: 'mapa lugar dirección' },
  { name: 'map-pinned', label: 'Mapa', category: 'evento', keywords: 'ruta mapa dirección' },
  { name: 'navigation', label: 'Cómo llegar', category: 'evento', keywords: 'navegación ruta llegar' },
  { name: 'ticket-check', label: 'Pase', category: 'evento', keywords: 'entrada pase check-in' },
  { name: 'qr-code', label: 'Código QR', category: 'evento', keywords: 'qr pase check-in' },
  { name: 'circle-check-big', label: 'Confirmado', category: 'evento', keywords: 'rsvp aceptar confirmar' },
  { name: 'users', label: 'Invitados', category: 'evento', keywords: 'personas invitados grupo' },
  { name: 'user-round', label: 'Invitado', category: 'evento', keywords: 'persona usuario invitado' },
  { name: 'circle-user-round', label: 'Perfil', category: 'evento', keywords: 'persona usuario perfil' },
  { name: 'gift', label: 'Regalo', category: 'servicios', keywords: 'mesa regalos obsequio' },
  { name: 'camera', label: 'Cámara', category: 'servicios', keywords: 'foto álbum fotografía' },
  { name: 'image', label: 'Fotografía', category: 'servicios', keywords: 'foto imagen galería' },
  { name: 'images', label: 'Galería', category: 'servicios', keywords: 'fotos imágenes álbum' },
  { name: 'music', label: 'Música', category: 'servicios', keywords: 'audio canción dj' },
  { name: 'music-2', label: 'Canción', category: 'servicios', keywords: 'audio canción dj' },
  { name: 'mic-vocal', label: 'Micrófono', category: 'servicios', keywords: 'dj música brindis discurso' },
  { name: 'play', label: 'Reproducir', category: 'servicios', keywords: 'play audio video música' },
  { name: 'wine', label: 'Brindis', category: 'servicios', keywords: 'copa bebida brindis' },
  { name: 'utensils', label: 'Banquete', category: 'servicios', keywords: 'comida cena menú' },
  { name: 'hotel', label: 'Hospedaje', category: 'servicios', keywords: 'hotel alojamiento habitación' },
  { name: 'house', label: 'Casa', category: 'servicios', keywords: 'casa lugar salón' },
  { name: 'car', label: 'Transporte', category: 'servicios', keywords: 'auto transporte estacionamiento' },
  { name: 'mail', label: 'Correo', category: 'comunicacion', keywords: 'email mensaje contacto' },
  { name: 'phone', label: 'Teléfono', category: 'comunicacion', keywords: 'llamar teléfono contacto' },
  { name: 'message-circle', label: 'Mensaje', category: 'comunicacion', keywords: 'chat whatsapp dedicatoria' },
  { name: 'send', label: 'Enviar', category: 'comunicacion', keywords: 'enviar mensaje formulario' },
  { name: 'share-2', label: 'Compartir', category: 'comunicacion', keywords: 'compartir enlace redes' },
  { name: 'link', label: 'Enlace', category: 'comunicacion', keywords: 'url link sitio web' },
  { name: 'instagram', label: 'Instagram', category: 'comunicacion', keywords: 'instagram red social' },
  { name: 'facebook', label: 'Facebook', category: 'comunicacion', keywords: 'facebook red social' },
  { name: 'youtube', label: 'YouTube', category: 'comunicacion', keywords: 'youtube video música' },
  { name: 'bell', label: 'Recordatorio', category: 'comunicacion', keywords: 'aviso notificación recordatorio' },
  { name: 'upload', label: 'Subir archivo', category: 'servicios', keywords: 'subir cargar archivo foto' },
  { name: 'key-round', label: 'Acceso', category: 'servicios', keywords: 'llave acceso contraseña' },
  { name: 'lock-keyhole', label: 'Privado', category: 'servicios', keywords: 'seguridad privado acceso' },
  { name: 'shield-check', label: 'Verificado', category: 'servicios', keywords: 'seguridad verificado aprobado' }
];
