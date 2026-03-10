import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Card {
  id: 'size' | 'place' | 'activities' | 'cost' | 'extras';
  label: string;
  icon: string;
}

interface Bucket {
  id: string;
  label: string;
  sublabel?: string;
}

interface ActivityCategory {
  id: string;
  label: string;
  options: string[];
}

@Component({
  selector: 'app-event-flow-one',
  imports: [FormsModule],
  templateUrl: './event-flow-one.html',
  styleUrl: './event-flow-one.css',
})
export class EventFlowOneComponent {
  activeCardIndex = -1;

  cards: Card[] = [
    { id: 'size',       label: 'SIZE',       icon: '👥' },
    { id: 'place',      label: 'PLACE',      icon: '🏠' },
    { id: 'activities', label: 'ACTIVITIES', icon: '🎲' },
    { id: 'cost',       label: 'COST',       icon: '💰' },
    { id: 'extras',     label: 'EXTRAS',     icon: '💬' },
  ];

  // SIZE
  sizeBuckets: Bucket[] = [
    { id: 'intimate', label: 'intimate',  sublabel: '8 or less' },
    { id: 'mixer',    label: 'mixer',     sublabel: '9 - 20' },
    { id: 'large',    label: 'large',     sublabel: '21 - 50' },
    { id: 'rager',    label: 'rager',     sublabel: '51 - 90' },
    { id: 'massive',  label: 'massive',   sublabel: '91+' },
  ];
  selectedSize: string | null = null;
  exactGuestCount = '';

  // PLACE
  placeBuckets: Bucket[] = [
    { id: 'my-house',      label: 'my house!' },
    { id: 'restaurant',    label: 'a restaurant?' },
    { id: 'public-park',   label: 'a public park?' },
    { id: 'friends-house', label: "or a friend's house?" },
    { id: 'bar',           label: 'a bar?' },
    { id: 'event-venue',   label: 'an event venue?' },
  ];
  selectedPlace: string | null = null;
  specificVenue = '';

  // ACTIVITIES
  activityCategories: ActivityCategory[] = [
    { id: 'eating',      label: 'eating...',   options: ['brunch', 'dinner', 'potluck', 'cooking', 'etc'] },
    { id: 'drinking',    label: 'drinking',    options: ['tea time', 'cocktails', 'wine bar', 'kegger', 'etc'] },
    { id: 'playing',     label: 'playing',     options: ['board games', 'sports', 'charades', 'video games', 'etc'] },
    { id: 'relaxing',    label: 'relaxing',    options: ['hiking', 'picnic', 'spa day', 'study date', 'etc'] },
    { id: 'celebrating', label: 'celebrating', options: ['graduation', 'birthday', 'housewarming', 'engagement', 'wedding', 'finals', 'etc'] },
  ];
  selectedActivities: Set<string> = new Set();

  setActiveCard(index: number) {
    this.activeCardIndex = this.activeCardIndex === index ? -1 : index;
  }

  // Returns 0-4 for CSS class binding
  getOverlayDistance(index: number): number {
    if (this.activeCardIndex === -1) return 0;
    return Math.abs(index - this.activeCardIndex);
  }

  toggleActivity(option: string) {
    if (this.selectedActivities.has(option)) {
      this.selectedActivities.delete(option);
    } else {
      this.selectedActivities.add(option);
    }
  }
}
