import { Component, HostListener, OnInit } from '@angular/core';
import { ConfirmDialogService, ConfirmDialogState } from '../confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent implements OnInit {
  state: ConfirmDialogState = { isOpen: false, options: { message: '' } };

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.confirmDialogService.state$.subscribe((state) => {
      this.state = state;
    });
  }

  onConfirm(): void {
    this.confirmDialogService.handleResult(true);
  }

  onCancel(): void {
    this.confirmDialogService.handleResult(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state.isOpen) {
      this.onCancel();
    }
  }
}
