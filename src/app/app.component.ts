import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Invitaciones';
  user$ = this.auth.user$;

  constructor(public auth: AuthService, public router: Router) {}

  ngOnInit(): void {
    this.auth.loadCurrentUser();
  }

  logout(): void {
    this.auth.logout();
  }

  get isNewLayout(): boolean {
    const url = this.router.url;
    return url.startsWith('/new') ||
           url.startsWith('/i/') ||
           url.startsWith('/e/') ||
           url.startsWith('/embed/') ||
           url.startsWith('/check-in/') ||
           url.startsWith('/external-access/');
  }
}
