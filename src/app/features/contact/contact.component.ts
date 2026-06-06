import { Component } from '@angular/core';
import { ApiService } from '../../core/api.service';

@Component({ selector: 'app-contact', templateUrl: './contact.component.html' })
export class ContactComponent {
  form = { name: '', email: '', message: '' };
  loading = false;
  success = '';
  error = '';

  constructor(private api: ApiService) {}

  submit(): void {
    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.sendContact(this.form).subscribe({
      next: (response) => {
        this.success = response.message || 'Mensaje enviado.';
        this.form = { name: '', email: '', message: '' };
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar el mensaje.';
        this.loading = false;
      }
    });
  }
}
