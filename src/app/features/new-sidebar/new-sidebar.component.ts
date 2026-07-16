import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: '[app-new-sidebar]',
  templateUrl: './new-sidebar.component.html'
})
export class NewSidebarComponent {
  constructor(public auth: AuthService) {}
}
