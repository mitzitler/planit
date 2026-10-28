export interface SizeBucket {
  label: string;
  min: number;
  max: number | null; // null = no upper bound
  display: string;
}

export const SIZE_BUCKETS: SizeBucket[] = [
  { label: 'intimate', min: 0,  max: 8,    display: '8 or less' },
  { label: 'cozy',     min: 9,  max: 20,   display: '9–20'      },
  { label: 'mixer',    min: 21, max: 32,   display: '21–32'     },
  { label: 'rager',    min: 33, max: 50,   display: '33–50'     },
  { label: 'large',    min: 51, max: 90,   display: '51–90'     },
  { label: 'massive',  min: 91, max: null, display: '91+'       },
];

export function getSizeBucket(count: number): SizeBucket | undefined {
  return SIZE_BUCKETS.find(
    b => count >= b.min && (b.max === null || count <= b.max)
  );
}

// ── Formality ────────────────────────────────────────────────

export interface FormalityLevel {
  id: string;
  label: string;
  feelsLike: string; // example events
  suggests: string;  // what this level changes in the plan
}

// Ordered from least to most formal; neighbours are what the agent offers when it guesses
export const FORMALITY_LEVELS: FormalityLevel[] = [
  { id: 'laidback', label: 'Laid-back', feelsLike: 'game night, pizza on the couch, come as you are',
    suggests: 'paper plates, takeout, no schedule beyond a start time, invites a few days ahead' },
  { id: 'casual',   label: 'Casual',    feelsLike: 'birthday at home, backyard BBQ, potluck',
    suggests: 'simple decorations, a loose schedule, a cake moment, invites 1-2 weeks ahead' },
  { id: 'polished', label: 'Polished',  feelsLike: 'dinner party, housewarming, baby shower',
    suggests: 'real plates, a planned menu, a drinks station, an open house works, invites 2-3 weeks ahead' },
  { id: 'dressy',   label: 'Dressy',    feelsLike: 'engagement party, milestone birthday, cocktail party',
    suggests: 'cocktail attire, catering or passed food, a venue or private room, invites about a month ahead' },
  { id: 'formal',   label: 'Formal',    feelsLike: 'wedding reception, gala, black tie',
    suggests: 'seated dinner, vendors, RSVPs with meal choices, invites 6+ weeks ahead' },
];

// ── Place ────────────────────────────────────────────────────

export interface PlaceOption {
  id: string;
  label: string;
  children?: PlaceOption[];
}

export const PLACE_OPTIONS: PlaceOption[] = [
  {
    id: 'home',
    label: 'Home',
    children: [
      { id: 'home-my',      label: 'My home'          },
      { id: 'home-cohost',  label: "A cohost's home"  },
      { id: 'home-rented',  label: 'A rented home'    },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    children: [
      { id: 'restaurant-reservation',   label: 'Restaurant reservation'  },
      { id: 'restaurant-private-room',  label: 'Restaurant private room' },
      { id: 'bar',                      label: 'Bar'                     },
      { id: 'bar-hopping',              label: 'Bar hopping'             },
    ],
  },
  {
    id: 'public-space',
    label: 'Public space',
    children: [
      {
        id: 'park',
        label: 'Park',
        children: [
          { id: 'park-city',  label: 'City park'  },
          { id: 'park-state', label: 'State park' },
        ],
      },
      { id: 'museum',               label: 'Museum'               },
      { id: 'campus-event-space',   label: 'Campus event space'   },
    ],
  },
];

// ── Activities ───────────────────────────────────────────────

export interface ActivityOption {
  id: string;
  label: string;
  children?: ActivityOption[];
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'eating',
    label: 'Eating',
    children: [
      { id: 'eating-home-cooked',   label: 'Home-cooked'    },
      { id: 'eating-out',           label: 'Out on the town' },
      { id: 'eating-takeout',       label: 'Takeout / delivery' },
      { id: 'eating-potluck',       label: 'Potluck style'  },
      { id: 'eating-buffet',        label: 'Buffet'         },
      { id: 'eating-catering',      label: 'Catering'       },
      { id: 'eating-picnicking',    label: 'Picnicking'     },
    ],
  },
  {
    id: 'drinking',
    label: 'Drinking',
    children: [
      { id: 'drinking-cocktails',       label: 'Cocktails'       },
      { id: 'drinking-beers',           label: 'Beers'           },
      { id: 'drinking-mocktails',       label: 'Mocktails'       },
      { id: 'drinking-champagne',       label: 'Champagne'       },
      { id: 'drinking-clubbing',        label: 'Clubbing'        },
      { id: 'drinking-bar-hopping',     label: 'Bar hopping'     },
      { id: 'drinking-drinking-games',  label: 'Drinking games'  },
    ],
  },
  {
    id: 'playing',
    label: 'Playing',
    children: [
      { id: 'playing-sports',       label: 'Sports'       },
      { id: 'playing-board-games',  label: 'Board games'  },
      { id: 'playing-parlor-games', label: 'Parlor games' },
      { id: 'playing-video-games',  label: 'Video games'  },
    ],
  },
  {
    id: 'celebrating',
    label: 'Celebrating',
    children: [
      { id: 'celebrating-engagement',   label: 'An engagement'  },
      { id: 'celebrating-wedding',      label: 'A wedding'      },
      { id: 'celebrating-housewarming', label: 'A housewarming' },
      { id: 'celebrating-graduation',   label: 'A graduation'   },
      { id: 'celebrating-birthday',     label: 'A birthday'     },
      { id: 'celebrating-semester-end', label: 'A semester end' },
      { id: 'celebrating-promotion',    label: 'A promotion'    },
    ],
  },
  {
    id: 'relaxing',
    label: 'Relaxing',
    children: [
      { id: 'relaxing-hiking',      label: 'Hiking'      },
      { id: 'relaxing-spa',         label: 'Spa day'     },
      { id: 'relaxing-sunbathing',  label: 'Sunbathing'  },
      { id: 'relaxing-swimming',    label: 'Swimming'    },
      { id: 'relaxing-camping',     label: 'Camping'     },
    ],
  },
];
