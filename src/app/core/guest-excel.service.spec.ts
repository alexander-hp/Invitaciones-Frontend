import { TestBed } from '@angular/core/testing';
import { GuestExcelService } from './guest-excel.service';

describe('GuestExcelService', () => {
  let service: GuestExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestExcelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate an Excel template Blob with proper type', async () => {
    const blob = await service.generateTemplate({
      groups: ['Familia', 'Amigos VIP'],
      tables: ['Mesa 1', 'Mesa 2']
    });

    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('should export guests to Excel Blob', async () => {
    const mockGuests = [
      {
        name: 'Carlos Slim',
        phone: '+525512345678',
        email: 'carlos@test.com',
        group: 'VIP',
        allowedCompanions: 2,
        tableName: 'Mesa 1',
        rsvpStatus: 'confirmed',
        checkedIn: true
      }
    ];

    const blob = await service.exportGuestsToExcel(mockGuests);
    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
