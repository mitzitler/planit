// Profile pictures users can pick from public/icons. New users get a random one.
export const AVATARS = [
  'orbit-satellite',
  'orbit-moon',
  'orbit-sun',
  'orbit-shield',
  'orbit-oxygen',
  'orbit-battery',
  'orbit-fuel',
  'orbit-wrench',
  'orbit-signal',
  'orbit-flag',
  'orbit-planet',
  'orbit-rocket',
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

// An event's icon, picked from its id: random-looking, but the same every time, with nothing to store
export function eventIcon(eventId: string): string {
  let hash = 0;
  for (const char of eventId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}
