import { Component } from '@angular/core';

// Every recoloured ORBIT icon beside its original at several sizes, to judge the colours on the real background.
// Dev only (see app.routes.ts): it reads the gitignored pack in public/Buyer-Download, which
// only exists on this machine, so the page has nothing to show anywhere else.
const PACK = '/Buyer-Download/svg/night';

const NAMES = [
  'arrow', 'battery', 'beacon', 'cargo', 'check', 'clock', 'close', 'compass',
  'crystal', 'flag', 'fuel', 'link', 'map', 'moon', 'oxygen', 'planet',
  'radar', 'rocket', 'satellite', 'shield', 'signal', 'sun', 'warning', 'wrench',
];

// Where each icon shows up in the app today
const USES: Record<string, string> = {
  planet: 'nav logo, home hero, login and signup logo, avatar',
  rocket: '"Plan Your Event" button, avatar',
  radar: 'dashboard title',
  beacon: 'wizard Size card, dashboard guests',
  map: 'wizard Place card',
  compass: 'wizard Activities card',
  crystal: 'wizard Cost card, Budget tab, dashboard budget',
  cargo: 'wizard Extras card',
  clock: 'Calendar tab, dashboard date',
  satellite: 'avatar', moon: 'avatar', sun: 'avatar', shield: 'avatar', oxygen: 'avatar',
  battery: 'avatar', fuel: 'avatar', wrench: 'avatar', signal: 'avatar', flag: 'avatar',
};

@Component({
  selector: 'app-icon-lab',
  templateUrl: './icon-lab.html',
  styleUrl: './icon-lab.css',
})
export class IconLabComponent {
  sizes = [16, 24, 32, 48, 64, 96];
  icons = NAMES.map(name => ({
    file: `icon-${name}-color.svg`,
    src: `${PACK}/icon-${name}-color.svg`,
    original: `${PACK}/icon-${name}.svg`, // the white line art before recolouring
    use: USES[name] ?? null,
  }));
}
