import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { InvitationModel, RsvpCustomQuestion } from '../../../../core/models';

export interface CompanionRow {
  name: string;
  note: string;
}

@Component({
  selector: 'app-universal-rsvp-form',
  templateUrl: './universal-rsvp-form.component.html',
  styleUrls: ['./universal-rsvp-form.component.css']
})
export class UniversalRsvpFormComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() invitation?: InvitationModel;
  @Input() verifiedGuest?: any;
  @Input() rsvp: any = {
    name: '',
    email: '',
    phoneCountryCode: '+52',
    phoneNationalNumber: '',
    response: 'confirmed',
    companions: 0,
    message: ''
  };
  @Input() customAnswers: Record<string, any> = {};
  @Input() companionNamesText = '';
  @Output() companionNamesTextChange = new EventEmitter<string>();

  @Input() declineConfirmed = false;
  @Output() declineConfirmedChange = new EventEmitter<boolean>();

  @Input() sending = false;
  @Input() success = '';
  @Input() error = '';
  @Input() submitLabel = 'Enviar Confirmación';
  @Input() darkTheme = false;

  @Output() submitRsvp = new EventEmitter<void>();

  companionRows: CompanionRow[] = [];
  localError = '';
  isCompact = false;
  private resizeObserver?: ResizeObserver;

  constructor(private elRef: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const updateWidth = () => {
      const width = this.elRef.nativeElement?.getBoundingClientRect?.().width || window.innerWidth;
      const compact = width > 0 && width <= 520;
      if (compact !== this.isCompact) {
        this.isCompact = compact;
        this.cdr.detectChanges();
      }
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => updateWidth());
      this.resizeObserver.observe(this.elRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  countryCodes = [
    { code: '+52', label: '🇲🇽 +52' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+57', label: '🇨🇴 +57' },
    { code: '+54', label: '🇦🇷 +54' },
    { code: '+56', label: '🇨🇱 +56' },
    { code: '+51', label: '🇵🇪 +51' }
  ];

  ngOnInit(): void {
    this.syncFromInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['verifiedGuest'] || changes['invitation'] || changes['rsvp'] || changes['companionNamesText']) {
      this.syncFromInputs();
    }
  }

  private syncFromInputs(): void {
    if (!this.rsvp) return;
    if (!this.rsvp.phoneCountryCode) {
      this.rsvp.phoneCountryCode = '+52';
    }
    if (!this.rsvp.response) {
      this.rsvp.response = 'confirmed';
    }
    // Pre-fill from verifiedGuest if fields are still empty
    if (this.verifiedGuest) {
      if (!this.rsvp.name && this.verifiedGuest.name) {
        this.rsvp.name = this.verifiedGuest.name;
      }
      if (!this.rsvp.email && this.verifiedGuest.email) {
        this.rsvp.email = this.verifiedGuest.email;
      }
      if (!this.rsvp.phoneNationalNumber && (this.verifiedGuest.phoneNationalNumber || this.verifiedGuest.phone)) {
        const parsed = this.parsePhone(
          this.verifiedGuest.phoneCountryCode,
          this.verifiedGuest.phoneNationalNumber || this.verifiedGuest.phone
        );
        if (parsed.countryCode) this.rsvp.phoneCountryCode = parsed.countryCode;
        if (parsed.nationalNumber) this.rsvp.phoneNationalNumber = parsed.nationalNumber;
      }
    }

    // Clamp companions to maxCompanions
    const max = this.maxCompanions;
    const current = Number(this.rsvp.companions || 0);
    if (current > max) {
      this.rsvp.companions = max;
    } else if (current < 0 || Number.isNaN(current)) {
      this.rsvp.companions = 0;
    }

    this.resizeCompanionRows(Number(this.rsvp.companions || 0));
  }

  private parsePhone(countryCode?: string, rawPhone?: string): { countryCode: string; nationalNumber: string } {
    const raw = String(rawPhone || '').trim();
    if (!raw) return { countryCode: countryCode || '+52', nationalNumber: '' };
    if (countryCode && /^\+\d{1,4}$/.test(countryCode)) {
      const digits = raw.replace(/\D/g, '');
      const ccDigits = countryCode.replace(/\D/g, '');
      const national = digits.startsWith(ccDigits) && digits.length > 10 ? digits.slice(ccDigits.length) : digits;
      return { countryCode, nationalNumber: national };
    }
    const match = raw.match(/^(\+\d{1,3})\s*(.+)$/);
    if (match) {
      return { countryCode: match[1], nationalNumber: match[2].replace(/\D/g, '') };
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('52')) {
      return { countryCode: '+52', nationalNumber: digits.slice(2) };
    }
    return { countryCode: '+52', nationalNumber: digits };
  }

  get maxCompanions(): number {
    if (this.verifiedGuest && this.verifiedGuest.allowedCompanions !== undefined && this.verifiedGuest.allowedCompanions !== null) {
      return Math.max(0, Number(this.verifiedGuest.allowedCompanions) || 0);
    }
    const settings = this.invitation?.rsvpSettings;
    if (settings?.allowCompanionsDefault === false) return 0;
    return Math.max(0, Number(settings?.defaultAllowedCompanions || 0));
  }

  get companionOptions(): number[] {
    const max = this.maxCompanions;
    const opts: number[] = [];
    for (let i = 0; i <= max; i++) {
      opts.push(i);
    }
    return opts;
  }

  get canUseMaybe(): boolean {
    return this.invitation?.rsvpSettings?.allowMaybe !== false;
  }

  get requiresDeclineConfirmation(): boolean {
    return this.invitation?.rsvpSettings?.declineRequiresConfirmation !== false;
  }

  get customQuestions(): RsvpCustomQuestion[] {
    return this.invitation?.rsvpSettings?.customQuestions || [];
  }

  get accentColor(): string {
    return this.invitation?.content?.palette?.accent
      || this.invitation?.content?.palette?.primary
      || '#c59b6c';
  }

  get hostStyle(): Record<string, string> {
    return {
      '--ursvp-accent': this.accentColor
    };
  }

  setResponse(response: 'confirmed' | 'declined' | 'maybe'): void {
    this.rsvp.response = response;
    this.localError = '';
    if (response !== 'confirmed') {
      this.rsvp.companions = 0;
      this.resizeCompanionRows(0);
    }
  }

  onCompanionsCountChange(count: number | string): void {
    const num = Math.max(0, Math.min(this.maxCompanions, Number(count) || 0));
    this.rsvp.companions = num;
    this.resizeCompanionRows(num);
  }

  private resizeCompanionRows(count: number): void {
    // Seed from existing rsvp.companionNames or companionNamesText if companionRows is empty
    if (this.companionRows.length === 0 && count > 0) {
      const existing: string[] = Array.isArray(this.rsvp?.companionNames) && this.rsvp.companionNames.length
        ? this.rsvp.companionNames
        : (this.companionNamesText || '').split('\n').map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < count; i++) {
        const raw = existing[i] || '';
        const noteMatch = raw.match(/^(.+?)\s*\((.+)\)$/);
        if (noteMatch) {
          this.companionRows.push({ name: noteMatch[1].trim(), note: noteMatch[2].trim() });
        } else {
          this.companionRows.push({ name: raw, note: '' });
        }
      }
    } else {
      while (this.companionRows.length < count) {
        this.companionRows.push({ name: '', note: '' });
      }
      if (this.companionRows.length > count) {
        this.companionRows = this.companionRows.slice(0, count);
      }
    }
    this.emitCompanionNames();
  }

  onCompanionRowChange(): void {
    this.emitCompanionNames();
  }

  private emitCompanionNames(): void {
    const formatted = this.companionRows
      .map(row => {
        const name = (row.name || '').trim();
        const note = (row.note || '').trim();
        if (!name) return '';
        return note ? `${name} (${note})` : name;
      })
      .filter(Boolean);

    if (this.rsvp) {
      this.rsvp.companionNames = formatted;
    }
    const joined = formatted.join('\n');
    this.companionNamesText = joined;
    this.companionNamesTextChange.emit(joined);
  }

  getQuestionKey(q: RsvpCustomQuestion): string {
    return q.key || q.label;
  }

  getCustomAnswer(q: RsvpCustomQuestion): any {
    const key = this.getQuestionKey(q);
    return this.customAnswers[key] ?? '';
  }

  setCustomAnswer(q: RsvpCustomQuestion, val: any): void {
    const key = this.getQuestionKey(q);
    this.customAnswers[key] = val;
    this.localError = '';
  }

  onDeclineConfirmChange(val: boolean): void {
    this.declineConfirmed = val;
    this.declineConfirmedChange.emit(val);
    this.localError = '';
  }

  onSubmit(): void {
    this.localError = '';
    if (!String(this.rsvp?.name || '').trim()) {
      this.localError = 'Por favor ingresa tu nombre completo.';
      return;
    }
    if (this.rsvp.response === 'declined' && this.requiresDeclineConfirmation && !this.declineConfirmed) {
      this.localError = 'Marca la casilla de confirmación para registrar que no podrás asistir.';
      return;
    }
    if (this.rsvp.response === 'confirmed') {
      for (const q of this.customQuestions) {
        if (!q.required) continue;
        const val = this.getCustomAnswer(q);
        if (val === undefined || val === null || val === '') {
          this.localError = `Por favor responde la pregunta obligatoria: "${q.label}".`;
          return;
        }
      }
    }
    this.emitCompanionNames();
    this.submitRsvp.emit();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
