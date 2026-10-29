// Profile pictures users can pick from public/icons. New users get a random one.
export const AVATARS = [
  'icon_astronaut_helmet',
  'icon_satellite',
  'icon_ufo',
  'icon_reactor',
  'icon_chip',
  'icon_energy_shield',
  'icon_battery',
  'icon_wrench_tech',
  'planet',
  'radar',
  'wormhole',
  'jetpack',
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
