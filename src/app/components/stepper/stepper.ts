import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface Step {
  label: string;
  route: string;
}

@Component({
  selector: 'app-stepper',
  imports: [NgClass],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css',
})
export class StepperComponent {
  @Input() steps: Step[] = [];
  @Input() currentIndex: number = 0;
}
