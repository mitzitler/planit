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

// ── Budget ───────────────────────────────────────────────────

// The whole event's spend in dollars, same shape as the size buckets
export const BUDGET_BUCKETS: SizeBucket[] = [
  { label: 'thrifty', min: 0,    max: 75,   display: '$75 or less' },
  { label: 'modest',  min: 76,   max: 250,  display: '$75–250'     },
  { label: 'comfy',   min: 251,  max: 1000, display: '$250–1k'     },
  { label: 'splurge', min: 1001, max: null, display: '$1k+'        },
];

// Totals with cents fall between buckets' whole-dollar edges, so round up first
export function getBudgetBucket(total: number): SizeBucket | undefined {
  const dollars = Math.ceil(total);
  return BUDGET_BUCKETS.find(b => dollars >= b.min && (b.max === null || dollars <= b.max));
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
      { id: 'bowling-alley',        label: 'Bowling alley'        },
      { id: 'arcade',               label: 'Arcade'               },
      { id: 'mini-golf',            label: 'Mini golf'            },
      { id: 'movie-theater',        label: 'Movie theater'        },
      { id: 'skating-rink',         label: 'Skating rink'         },
      { id: 'karaoke-bar',          label: 'Karaoke bar'          },
      { id: 'beach',                label: 'Beach'                },
      { id: 'community-center',     label: 'Community center'     },
    ],
  },
];

// ── Activities ───────────────────────────────────────────────

// A short question under an activity once it's picked, only where the answer changes the plan.
// Answers are saved in plan.activityDetails as "<activity id>/<follow-up id>" → choice id.
export interface FollowUp {
  id: string;
  question: string;
  choices: { id: string; label: string }[];
}

export interface ActivityOption {
  id: string;
  label: string;
  children?: ActivityOption[];
  followUps?: FollowUp[];
}

const WHO_BRINGS = (question: string): FollowUp => ({
  id: 'brings',
  question,
  choices: [
    { id: 'host',   label: 'Me'           },
    { id: 'guests', label: 'Guests bring' },
    { id: 'buy',    label: 'Buy new'      },
  ],
});

const GEAR: FollowUp = {
  id: 'gear',
  question: 'Gear?',
  choices: [
    { id: 'have', label: 'We have it'   },
    { id: 'rent', label: 'Need to rent' },
  ],
};

// Lots of choices on purpose: the card should remind hosts how much is open to them
export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'eating',
    label: 'Eating',
    children: [
      { id: 'eating-home-cooked',   label: 'Home-cooked'    },
      {
        id: 'eating-out', label: 'Out on the town',
        followUps: [{ id: 'price', question: 'How fancy?', choices: [
          { id: 'cheap', label: '$' }, { id: 'mid', label: '$$' }, { id: 'splurge', label: '$$$' },
        ] }],
      },
      { id: 'eating-takeout',       label: 'Takeout / delivery' },
      {
        id: 'eating-potluck', label: 'Potluck style',
        followUps: [{ id: 'dishes', question: 'Who plans the dishes?', choices: [
          { id: 'host', label: 'I assign them' }, { id: 'signup', label: 'A sign-up sheet' }, { id: 'surprise', label: 'Surprise me' },
        ] }],
      },
      { id: 'eating-buffet',        label: 'Buffet'         },
      {
        id: 'eating-catering', label: 'Catering',
        followUps: [{ id: 'style', question: 'What kind?', choices: [
          { id: 'drop-off', label: 'Drop-off' }, { id: 'served', label: 'Served' }, { id: 'food-truck', label: 'Food truck' },
        ] }],
      },
      { id: 'eating-picnicking',    label: 'Picnicking'     },
    ],
  },
  {
    id: 'drinking',
    label: 'Drinking',
    children: [
      {
        id: 'drinking-cocktails', label: 'Cocktails',
        followUps: [{ id: 'maker', question: 'Who makes them?', choices: [
          { id: 'host', label: 'Me' }, { id: 'bartender', label: 'A bartender' }, { id: 'byo', label: 'Guests BYO' },
        ] }],
      },
      {
        id: 'drinking-beers', label: 'Beers',
        followUps: [{ id: 'brings', question: 'Who brings them?', choices: [
          { id: 'host', label: 'Me' }, { id: 'byo', label: 'Guests BYO' },
        ] }],
      },
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
      { id: 'playing-sports',       label: 'Sports', followUps: [GEAR] },
      { id: 'playing-board-games',  label: 'Board games', followUps: [WHO_BRINGS('Who brings them?')] },
      { id: 'playing-parlor-games', label: 'Parlor games' },
      { id: 'playing-video-games',  label: 'Video games'  },
      { id: 'playing-trivia',       label: 'Trivia'       },
      { id: 'playing-escape-room',  label: 'Escape room'  },
      {
        id: 'playing-karaoke', label: 'Karaoke',
        followUps: [{ id: 'where', question: 'Where?', choices: [
          { id: 'home', label: 'At home' }, { id: 'bar', label: 'A karaoke bar' },
        ] }],
      },
    ],
  },
  {
    id: 'making',
    label: 'Making',
    children: [
      {
        id: 'making-cooking', label: 'Cooking together',
        followUps: [{ id: 'led', question: 'Led by?', choices: [
          { id: 'host', label: 'Me' }, { id: 'class', label: 'A chef or class' },
        ] }],
      },
      { id: 'making-crafts',          label: 'Crafts'           },
      {
        id: 'making-pottery', label: 'Pottery or painting',
        followUps: [{ id: 'where', question: 'Where?', choices: [
          { id: 'studio', label: 'At a studio' }, { id: 'kit', label: 'A kit at home' },
        ] }],
      },
      { id: 'making-cake-decorating', label: 'Cake decorating'  },
      { id: 'making-diy-pizza',       label: 'DIY pizza'        },
    ],
  },
  {
    id: 'watching',
    label: 'Watching',
    children: [
      {
        id: 'watching-movie-night', label: 'Movie night',
        followUps: [{ id: 'screen', question: 'Screen?', choices: [
          { id: 'tv', label: 'Indoor TV' }, { id: 'projector', label: 'Outdoor projector' },
        ] }],
      },
      {
        id: 'watching-live-music', label: 'Live music',
        followUps: [{ id: 'where', question: 'Where?', choices: [
          { id: 'out', label: 'Going out' }, { id: 'booked', label: 'A band or DJ at ours' },
        ] }],
      },
      { id: 'watching-watch-party', label: 'Watch party'  },
      { id: 'watching-comedy',      label: 'Comedy show'  },
      { id: 'watching-theater',     label: 'Theater'      },
    ],
  },
  {
    id: 'exploring',
    label: 'Exploring',
    children: [
      {
        id: 'exploring-scavenger-hunt', label: 'Scavenger hunt',
        followUps: [{ id: 'clues', question: 'Who makes the clues?', choices: [
          { id: 'host', label: 'Me' }, { id: 'kit', label: 'A ready-made kit' },
        ] }],
      },
      { id: 'exploring-museum',       label: 'Museum or gallery' },
      { id: 'exploring-walking-tour', label: 'Walking tour'      },
      { id: 'exploring-stargazing',   label: 'Stargazing'        },
      { id: 'exploring-day-trip',     label: 'Day trip'          },
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
      { id: 'relaxing-camping',     label: 'Camping', followUps: [GEAR] },
    ],
  },
];

// ── Occasion ─────────────────────────────────────────────────

// Why the event is happening, apart from what people do at it. Each has a few activity ids to
// suggest, so hosts think past the usual dinner.
export interface Occasion {
  id: string;
  label: string;
  ideas: string[];
}

export const OCCASIONS: Occasion[] = [
  { id: 'birthday',     label: 'Birthday',     ideas: ['playing-karaoke', 'playing-escape-room', 'making-cake-decorating', 'eating-out'] },
  { id: 'engagement',   label: 'Engagement',   ideas: ['drinking-champagne', 'eating-catering', 'watching-live-music', 'drinking-cocktails'] },
  { id: 'wedding',      label: 'Wedding',      ideas: ['eating-catering', 'drinking-champagne', 'watching-live-music', 'drinking-cocktails'] },
  { id: 'housewarming', label: 'Housewarming', ideas: ['eating-potluck', 'playing-board-games', 'making-diy-pizza', 'drinking-cocktails'] },
  { id: 'graduation',   label: 'Graduation',   ideas: ['eating-buffet', 'playing-trivia', 'exploring-scavenger-hunt', 'drinking-champagne'] },
  { id: 'semester-end', label: 'Semester end', ideas: ['eating-takeout', 'playing-video-games', 'watching-movie-night', 'drinking-drinking-games'] },
  { id: 'promotion',    label: 'Promotion',    ideas: ['eating-out', 'drinking-cocktails', 'watching-comedy', 'playing-escape-room'] },
  { id: 'holiday',      label: 'Holiday',      ideas: ['eating-home-cooked', 'making-crafts', 'watching-movie-night', 'playing-parlor-games'] },
  { id: 'reunion',      label: 'Reunion',      ideas: ['eating-picnicking', 'playing-trivia', 'exploring-walking-tour', 'playing-sports'] },
  { id: 'just-because', label: 'Just because', ideas: ['making-pottery', 'exploring-stargazing', 'playing-escape-room', 'watching-live-music'] },
];
