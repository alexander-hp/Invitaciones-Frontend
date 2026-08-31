import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.auth.token) {
      return this.router.createUrlTree(['/new/login']);
    }

    if (this.auth.currentUser) {
      if (this.auth.currentUser.role === 'admin') {
        return true;
      }
      return this.router.createUrlTree(['/new/unauthorized']);
    }

    return this.api.me().pipe(
      map(({ user }) => {
        if (user && user.role === 'admin') {
          return true;
        }
        return this.router.createUrlTree(['/new/unauthorized']);
      }),
      catchError(() => {
        this.auth.logout(false);
        return of(this.router.createUrlTree(['/new/login']));
      })
    );
  }
}
