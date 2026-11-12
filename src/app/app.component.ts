import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from './core/auth.service';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Invitaciones';
  user$ = this.auth.user$;

  constructor(
    public auth: AuthService,
    public router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.auth.loadCurrentUser();
    this.setupNativeBackButton();
  }

  private setupNativeBackButton(): void {
    if (!Capacitor.isNativePlatform()) return;

    CapApp.addListener('backButton', () => {
      // 1. If an open modal or guide is visible, close it first
      const openModalCloseBtn = document.querySelector(
        '.nw-modal-backdrop .events-icon-button, .events-guide-backdrop .events-icon-button, .nw-modal-backdrop button.nw-btn-ghost, .nw-modal-backdrop [aria-label="Cerrar"]'
      ) as HTMLElement;
      if (openModalCloseBtn) {
        openModalCloseBtn.click();
        return;
      }

      // 2. Check if current URL is a root destination
      const currentUrl = (this.router.url || '').split('?')[0];
      const isRoot = currentUrl === '/' ||
                     currentUrl === '/login' ||
                     currentUrl === '/new/login' ||
                     currentUrl === '/new/events' ||
                     currentUrl === '/events' ||
                     currentUrl === '/new/dashboard' ||
                     currentUrl === '/dashboard';

      if (isRoot) {
        CapApp.exitApp();
      } else {
        this.location.back();
      }
    });
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
