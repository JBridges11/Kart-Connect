export type SetupDirection = {
  label: string
  effect: string
}

export type SetupItem = {
  id: string
  name: string
  section: 'rear' | 'front' | 'wheel' | 'engine' | 'chassis'
  directions: [SetupDirection, SetupDirection]
  notes?: string
}

export const SETUP_CHANGES: SetupItem[] = [
  // REAR
  {
    id: 'wheelbase',
    name: 'Wheelbase',
    section: 'rear',
    directions: [
      { label: 'Shorter', effect: 'More rotation — kart pivots more easily through corners' },
      { label: 'Longer', effect: 'Less rotation — more stable, harder to rotate' },
    ],
  },
  {
    id: 'rear-bumper',
    name: 'Rear Bumper',
    section: 'rear',
    directions: [
      { label: 'Tight', effect: 'Very little added rear grip — stiffens the chassis' },
      { label: 'Loose (standard)', effect: 'Standard rear grip — allows more flex through corners' },
    ],
  },
  {
    id: 'rear-width',
    name: 'Rear Width',
    section: 'rear',
    directions: [
      { label: 'Narrower (dry)', effect: 'Reduces rear grip AND adds front end bite — can create or worsen understeer. Wet: adds rear grip.' },
      { label: 'Wider (dry)', effect: 'Adds rear grip AND takes front end grip away — reduces front bite and snap oversteer. Wet: reduces rear grip.' },
    ],
    notes: 'Affects both ends — not just a rear change. Behaves opposite wet vs dry. Max limits: 1400mm adult, 1100mm 950 chassis.',
  },
  {
    id: 'third-bearing',
    name: 'Third Bearing',
    section: 'rear',
    directions: [
      { label: 'Tight / On', effect: 'More stability under braking but less revs and power on corner exit' },
      { label: 'Loose / Off', effect: 'More chassis flex, better corner exit power and rotation' },
    ],
  },
  {
    id: 'axle-height',
    name: 'Rear Axle Height',
    section: 'rear',
    directions: [
      { label: 'Low', effect: 'Takes front grip off, adds stability under braking' },
      { label: 'High', effect: 'Adds rear grip mid-corner, less stable under braking' },
    ],
  },
  {
    id: 'axle-stiffness',
    name: 'Rear Axle Stiffness',
    section: 'rear',
    directions: [
      { label: 'Softer', effect: 'Takes rear grip away mid-corner to exit — more rotation, helps turn-in' },
      { label: 'Harder', effect: 'Adds rear grip mid-corner to exit — more stability, reduces rotation' },
    ],
  },
  {
    id: 'axle-length',
    name: 'Rear Axle Length',
    section: 'rear',
    directions: [
      { label: 'Shorter', effect: 'More rotation, looser feel, more release on exit' },
      { label: 'Longer', effect: 'More rear grip and stability throughout the corner' },
    ],
  },
  {
    id: 'brake-pads',
    name: 'Brake Pads',
    section: 'rear',
    directions: [
      { label: 'Softer', effect: 'Locks up quicker, more responsive braking' },
      { label: 'Harder', effect: 'Less response — driver must apply more pressure' },
    ],
  },
  {
    id: 'brake-bias',
    name: 'Brake Bias',
    section: 'rear',
    directions: [
      { label: 'More front bias', effect: 'Front tends to lock up first under braking' },
      { label: 'More rear bias', effect: 'Rear tends to lock up first under braking' },
    ],
  },

  // FRONT
  {
    id: 'front-width',
    name: 'Front Width',
    section: 'front',
    directions: [
      { label: 'Wider', effect: 'Less steering response — more stable and planted on entry' },
      { label: 'Narrower', effect: 'More steering response — more reactive and responsive' },
    ],
  },
  {
    id: 'front-hub-length',
    name: 'Front Hub Length',
    section: 'front',
    directions: [
      { label: 'Longer', effect: 'More mid-corner grip — stiffens the stub axle' },
      { label: 'Shorter', effect: 'Less mid-corner grip — softer, more compliant feel' },
    ],
  },
  {
    id: 'front-ride-height',
    name: 'Front Ride Height',
    section: 'front',
    directions: [
      { label: 'Higher', effect: 'More mid-corner front grip' },
      { label: 'Lower', effect: 'Less mid-corner front grip' },
    ],
  },
  {
    id: 'camber',
    name: 'Camber',
    section: 'front',
    directions: [
      { label: 'More negative', effect: 'Less front initial grip on corner entry' },
      { label: 'Less negative', effect: 'More front initial grip on corner entry' },
    ],
  },
  {
    id: 'caster',
    name: 'Caster',
    section: 'front',
    directions: [
      { label: 'More', effect: 'Quicker rotation, more inside rear lift on turn-in — first fix for understeer/poor turn-in' },
      { label: 'Less', effect: 'Kart sits flatter, less rotation — more stable but harder to turn in' },
    ],
    notes: 'Always the first adjustment to make for turn-in or rotation issues.',
  },
  {
    id: 'toe',
    name: 'Toe',
    section: 'front',
    directions: [
      { label: 'Toe in', effect: 'More direct, stable steering feel' },
      { label: 'Toe out', effect: 'Less direct steering feel, more turn-in sensitivity' },
    ],
  },
  {
    id: 'stub-axle',
    name: 'Stub Axle Stiffness',
    section: 'front',
    directions: [
      { label: 'Softer', effect: 'Less mid-corner grip — more compliant and forgiving' },
      { label: 'Harder', effect: 'More mid-corner grip — stiffer, more precise response' },
    ],
  },

  // WHEEL
  {
    id: 'rim-type',
    name: 'Rim Type',
    section: 'wheel',
    directions: [
      { label: 'Summer / Hard', effect: 'Controls tyre pressures, keeps tyre cooler — better in warm conditions' },
      { label: 'Winter / Soft', effect: 'Warms tyre quicker but drops off sooner — better in cold conditions' },
    ],
    notes: 'Wet rims for wet conditions only — causes bad handling in the dry.',
  },

  // ENGINE
  {
    id: 'rear-sprocket',
    name: 'Rear Sprocket Size',
    section: 'engine',
    directions: [
      { label: 'Fewer teeth (shorter)', effect: 'Lower revs, more top speed, less acceleration out of corners' },
      { label: 'More teeth (taller)', effect: 'Higher revs, more acceleration, less top speed' },
    ],
    notes: 'Wet: drop 1 tooth on rear (e.g. 12→11 on Rotax) or go up 5 teeth on rear — both valid wet setups. Change only one sprocket at a time to isolate the effect.',
  },

  // CHASSIS
  {
    id: 'seat-stiffness',
    name: 'Seat Stiffness',
    section: 'chassis',
    directions: [
      { label: 'Harder', effect: 'Stiffer kart, more grip — but harder to handle under braking and mid-corner' },
      { label: 'Softer', effect: 'Less grip overall — more forgiving and compliant' },
    ],
  },
  {
    id: 'torsion-bar',
    name: 'Torsion Bar',
    section: 'chassis',
    directions: [
      { label: 'Softer', effect: 'Less front feedback, less front grip' },
      { label: 'Harder', effect: 'More front feedback, more front grip' },
    ],
  },
  {
    id: 'seat-position',
    name: 'Seat Position',
    section: 'chassis',
    directions: [
      { label: 'Further forward', effect: 'More rotation — shifts weight forward' },
      { label: 'Further back', effect: 'Less rotation — more rear stability' },
    ],
  },
  {
    id: 'seat-stays',
    name: 'Seat Stays',
    section: 'chassis',
    directions: [
      { label: 'More stays', effect: 'Adds rear grip — stiffens the chassis' },
      { label: 'Fewer stays', effect: 'Less rear grip — allows more chassis flex' },
    ],
  },
  {
    id: 'seat-bolts-front',
    name: 'Front Seat Bolts',
    section: 'chassis',
    directions: [
      { label: 'Loose on front', effect: 'Adds front rotation — more responsive turn-in' },
      { label: 'Tight on front', effect: 'Less front rotation — more stable and planted' },
    ],
  },
]

export const SECTION_LABELS: Record<SetupItem['section'], string> = {
  rear:    'Rear',
  front:   'Front End',
  wheel:   'Wheels & Tyres',
  engine:  'Engine & Gearing',
  chassis: 'Chassis & Seat',
}

export const SECTION_ORDER: SetupItem['section'][] = ['rear', 'front', 'wheel', 'engine', 'chassis']
