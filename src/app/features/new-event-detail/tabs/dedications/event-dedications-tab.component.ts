import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { DedicationModel, DedicationStatus } from '../../../../core/models';

@Component({
  selector: 'app-event-dedications-tab',
  templateUrl: './event-dedications-tab.component.html'
})
export class EventDedicationsTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

  dedications: DedicationModel[] = [];
  loadingDedications = false;
  dedicationError = '';
  dedicationMessage = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadDedications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadDedications();
    }
  }

  loadDedications(): void {
    this.loadingDedications = true;
    this.apiService.listDedications(this.eventId).subscribe({
      next: res => {
        this.dedications = res.dedications || [];
        this.loadingDedications = false;
      },
      error: err => {
        this.dedicationError = err?.error?.message || 'Error al cargar dedicatorias';
        this.loadingDedications = false;
      }
    });
  }

  updateDedication(d: DedicationModel, status: DedicationStatus): void {
    const dId = (d._id || d.id)!;
    this.apiService.updateDedication(this.eventId, dId, status).subscribe({
      next: res => {
        d.status = res.dedication.status;
        this.dedicationMessage = `Dedicatoria marcada como ${status}`;
      },
      error: err => {
        this.dedicationError = err?.error?.message || 'Error al actualizar dedicatoria';
      }
    });
  }
}
