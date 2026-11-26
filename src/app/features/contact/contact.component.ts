import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  form = { name: '', email: '', message: '' };
  selectedTopic = '';
  readonly topics = [
    'Duda general',
    'Plantillas y Editor',
    'Planes y Pagos',
    'Soporte técnico'
  ];

  loading = false;
  success = '';
  error = '';

  constructor(
    private api: ApiService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.form.name = currentUser.name || '';
      this.form.email = currentUser.email || '';
    } else {
      this.auth.user$.subscribe((user) => {
        if (user) {
          if (!this.form.name) this.form.name = user.name || '';
          if (!this.form.email) this.form.email = user.email || '';
        }
      });
    }
  }

  selectTopic(topic: string): void {
    this.selectedTopic = this.selectedTopic === topic ? '' : topic;
  }

  submit(): void {
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.message.trim()) {
      return;
    }

    this.loading = true;
    this.success = '';
    this.error = '';

    const payload = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      message: this.selectedTopic
        ? `[${this.selectedTopic}] ${this.form.message.trim()}`
        : this.form.message.trim()
    };

    this.api.sendContact(payload).subscribe({
      next: (response) => {
        this.success = response.message || 'Mensaje enviado correctamente. Te responderemos muy pronto.';
        this.form.message = '';
        this.selectedTopic = '';
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar el mensaje. Intenta de nuevo en un momento.';
        this.loading = false;
      }
    });
  }
}
