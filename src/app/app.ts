import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav';
import { StarFieldComponent } from './components/star-field/star-field';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent, StarFieldComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
