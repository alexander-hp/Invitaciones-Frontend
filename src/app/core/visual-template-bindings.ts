import { EventModel, GuestAccessResponse, InvitationModel } from './models';

export interface VisualTemplateVariable {
  token: string;
  label: string;
  group: 'Invitado' | 'Evento' | 'Invitación';
  example: string;
}

export type VisualTemplateContext = Record<string, string | number>;

export const VISUAL_TEMPLATE_VARIABLES: VisualTemplateVariable[] = [
  { token: 'guest.name', label: 'Nombre del invitado', group: 'Invitado', example: 'María López' },
  { token: 'guest.group', label: 'Grupo', group: 'Invitado', example: 'Familia' },
  { token: 'guest.table', label: 'Mesa', group: 'Invitado', example: 'Mesa 5' },
  { token: 'guest.seat', label: 'Lugar', group: 'Invitado', example: 'A-12' },
  { token: 'guest.companions', label: 'Acompañantes permitidos', group: 'Invitado', example: '2' },
  { token: 'event.title', label: 'Nombre del evento', group: 'Evento', example: 'Nuestra celebración' },
  { token: 'event.date', label: 'Fecha', group: 'Evento', example: '18 de octubre de 2026' },
  { token: 'event.time', label: 'Hora', group: 'Evento', example: '17:00' },
  { token: 'event.venue', label: 'Lugar', group: 'Evento', example: 'Salón Jardín' },
  { token: 'event.address', label: 'Dirección', group: 'Evento', example: 'Av. Principal 123' },
  { token: 'invitation.headline', label: 'Título de invitación', group: 'Invitación', example: 'Celebremos juntos' },
  { token: 'invitation.message', label: 'Mensaje', group: 'Invitación', example: 'Acompáñanos en este día especial' }
];

export function visualTemplateContext(
  invitation?: InvitationModel,
  event?: EventModel,
  guest?: GuestAccessResponse['guest'],
  useExamples = false
): VisualTemplateContext {
  const examples = Object.fromEntries(VISUAL_TEMPLATE_VARIABLES.map((item) => [item.token, item.example]));
  const values: VisualTemplateContext = {
    'guest.name': guest?.name || 'Invitado',
    'guest.group': guest?.group || guest?.relationshipLabel || '',
    'guest.table': guest?.tableName || 'Mesa por asignar',
    'guest.seat': guest?.seatLabel || 'por asignar',
    'guest.companions': guest ? Number(guest.allowedCompanions || 0) : 0,
    'event.title': event?.title || '',
    'event.date': formatEventDate(event?.date),
    'event.time': event?.time || '',
    'event.venue': event?.venue?.name || '',
    'event.address': event?.venue?.address || '',
    'invitation.headline': invitation?.content?.headline || '',
    'invitation.message': invitation?.content?.message || invitation?.content?.subheadline || ''
  };
  if (!useExamples) return values;
  for (const [key, example] of Object.entries(examples)) if (values[key] === '' || values[key] === undefined) values[key] = example;
  return values;
}

export function resolveVisualTemplateText(value: string | undefined, context: VisualTemplateContext): string {
  return String(value || '').replace(/\{\{\s*([a-z][a-z0-9_.]*)\s*\}\}/gi, (_match, key: string) => {
    const resolved = context[key];
    return resolved === undefined || resolved === null ? '' : String(resolved);
  });
}

function formatEventDate(value?: string): string {
  if (!value) return '';
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}
