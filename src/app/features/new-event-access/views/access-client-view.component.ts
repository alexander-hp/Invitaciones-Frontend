import { Component, Input } from '@angular/core';
import { EventAccessSession } from '../../../core/models';

@Component({
  selector: 'app-access-client-view',
  templateUrl: './access-client-view.component.html'
})
export class AccessClientViewComponent {
  @Input() session!: EventAccessSession;
}
