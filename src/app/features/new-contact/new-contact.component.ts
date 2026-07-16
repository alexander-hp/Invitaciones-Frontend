import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-new-contact',
  templateUrl: './new-contact.component.html'
})
export class NewContactComponent implements OnInit {
  form = { name: '', email: '', message: '' };
  loading = false;
  success = '';
  error = '';

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.form.name = currentUser.name || '';
      this.form.email = currentUser.email || '';
    } else {
      this.auth.user$.subscribe(user => {
        if (user) {
          this.form.name = user.name || '';
          this.form.email = user.email || '';
        }
      });
    }
  }

  submit(): void {
    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.sendContact(this.form).subscribe({
      next: (response) => {
        this.success = response.message || 'Mensaje enviado correctamente.';
        this.form.message = ''; // Clear only the message, keep name and email
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo enviar el mensaje.';
        this.loading = false;
      }
    });
  }
}
