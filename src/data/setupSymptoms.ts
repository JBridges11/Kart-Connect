export type SymptomSection = {
  id: string
  label: string
  scenarios: string[]
  tags?: Record<string, string>
}

export const SYMPTOM_SECTIONS: SymptomSection[] = [
  {
    id: 'handling',
    label: 'Handling',
    scenarios: [
      'Front won\'t turn in',
      'Rear slides on entry',
      'Kart feels nervous on turn-in',
      'Inside rear won\'t lift',
      'Too much rotation on entry',
      'I have a lot of steering input at the apex and then rear steps out',
      'Front pushes on then I go wide mid corner',
      'Kart feels flat and unresponsive',
      'Rear slides continuously through corner',
      'Front and rear both sliding',
      'Inside rear dragging through corner',
      'Kart bouncing mid-corner',
      'Too much rotation at apex',
      'Can\'t get heat into tyres',
    ],
  },
  {
    id: 'straight',
    label: 'Straight',
    scenarios: [
      'No top-end speed',
      'Engine hitting limiter too early',
      'Good exit but losing ground mid-straight',
      'Kart feels slow despite flat throttle',
      'Wheelspin out of slow corners',
      'No initial drive off the apex',
      'Good top end but poor initial acceleration',
    ],
  },
  {
    id: 'braking',
    label: 'Braking',
    scenarios: [
      'Locking front under braking',
      'Locking rear under braking',
      'Rear stepping out under braking dry',
      'Brakes feel unresponsive',
      'When I lock up the rear slides',
    ],
    tags: {
      'Locking front under braking': 'KZ only',
      'Locking rear under braking': 'KZ only',
    },
  },
  {
    id: 'wet',
    label: 'Wet Conditions',
    scenarios: [
      'No front grip in wet',
      'Rear stepping out on every corner in wet',
      'Can\'t get heat into tyres in wet',
      'Inside rear not lifting in wet',
      'Not enough rotation in the wet',
    ],
  },
]
