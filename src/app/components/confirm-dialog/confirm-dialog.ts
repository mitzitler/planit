import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

// A yes/no popup for destructive actions. The question is projected content, e.g.
// <app-confirm-dialog ...>Are you sure you want to delete <strong>{{ name }}</strong>?</app-confirm-dialog>
// Built on the native <dialog>, which handles Esc, focus trapping and the backdrop.
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialogComponent {
  open = input.required<boolean>();
  heading = input.required<string>();
  confirmLabel = input('Delete');
  busy = input(false); // disables the buttons while the action runs
  error = input('');

  confirm = output<void>();
  cancel = output<void>();

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) dialog.showModal();
      if (!this.open() && dialog.open) dialog.close();
    });
  }

  // Esc fires the dialog's own cancel event; the parent decides whether to close
  onEscape(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.cancel.emit();
  }

  // A click on the dialog element itself (not its contents) is a click on the backdrop
  onClick(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement && !this.busy()) this.cancel.emit();
  }
}
