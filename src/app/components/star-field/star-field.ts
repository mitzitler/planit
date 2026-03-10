import { Component, OnInit } from '@angular/core';
import { NgStyle } from '@angular/common';

interface Star {
  x: number;
  y: number;
  type: 'dot' | 'sparkle' | 'glow';
  size: number;
  opacity: number;
  color: string;
}

@Component({
  selector: 'app-star-field',
  imports: [NgStyle],
  templateUrl: './star-field.html',
  styleUrl: './star-field.css',
})
export class StarFieldComponent implements OnInit {
  stars: Star[] = [];

  ngOnInit() {
    const total = 90;
    for (let i = 0; i < total; i++) {
      const r = Math.random();
      this.stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        type: r < 0.55 ? 'dot' : r < 0.85 ? 'sparkle' : 'glow',
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.5 + 0.35,
        color: Math.random() > 0.35 ? '#ffffff' : '#fde68a',
      });
    }
  }
}
