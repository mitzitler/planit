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
