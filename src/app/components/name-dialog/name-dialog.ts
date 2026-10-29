import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { EVENT_NAME_MAX } from '../../shared/plan';

// Asks for an event's name before it's created. Built on the native <dialog>, like ConfirmDialog.
@Component({
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.html',
  styleUrl: './name-dialog.css',
})
export class NameDialogComponent {
  open = input.required<boolean>();
  busy = input(false);
  error = input('');

  save = output<string>();
  cancel = output<void>();

  readonly maxLength = EVENT_NAME_MAX;
  name = signal('');
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        this.name.set('');
        dialog.showModal();
      }
      if (!this.open() && dialog.open) dialog.close();
    });
  }

  submit(event: Event) {
    event.preventDefault();
    const name = this.name().trim();
    if (name && !this.busy()) this.save.emit(name);
  }

  onEscape(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.cancel.emit();
  }

  onClick(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement && !this.busy()) this.cancel.emit();
  }
}
