import { TestBed } from '@angular/core/testing';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose credential$ observable', () => {
    expect(service.credential$).toBeDefined();
  });

  it('should return false for isConfigured when client id is placeholder', () => {
    expect(service.isConfigured()).toBeFalse();
  });
});
