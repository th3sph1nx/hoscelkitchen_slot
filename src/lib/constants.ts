import { Facility, HostelSettings } from './types';

export const FACILITIES: Facility[] = [
  {
    id: 'kitchen',
    name: 'Common Kitchen',
    shortName: 'Kitchen',
    description: 'Fully equipped hostel kitchen for meal preparation, late-night snacks, or group dinners.',
    location: 'Ground Floor, Block A (Opposite Dining Hall)',
    icon: 'utensils',
    maxDurationHours: 3,
    openTime: '06:00',
    closeTime: '23:30',
    capacity: 'Up to 6 students at a time',
    equipment: [
      '2x Induction Cooktops',
      'Microwave Oven',
      'Double-door Refrigerator',
      'Electric Kettle & Toaster',
      'Prep counters & Wash basin',
      'Basic cooking utensils & pans'
    ],
    rules: [
      'Collect the key from Representative before entering; lock the door when leaving.',
      'Wipe down all counters and wash all utensils immediately after cooking.',
      'Dispose of food waste in the designated organic bin.',
      'Switch off all induction burners and microwave switches from the main socket.',
      'Return key directly to Representative (Room B-204) right after slot ends.'
    ]
  },
  {
    id: 'tv-room',
    name: 'Common TV & Recreation Lounge',
    shortName: 'TV Lounge',
    description: 'Entertainment lounge with high-definition display, surround sound, and couch seating for matches and movies.',
    location: 'First Floor, Common Amenities Wing (Room 102)',
    icon: 'tv',
    maxDurationHours: 3,
    openTime: '08:00',
    closeTime: '24:00',
    capacity: 'Up to 25 students',
    equipment: [
      '65" 4K HDR Smart TV',
      'HDMI 2.1 Cable for Laptops / Consoles',
      'Surround Soundbar with Bluetooth',
      'Cushioned sofa and beanbags seating',
      'Air Conditioning & Ceiling Fans',
      'Cable TV / OTT app streaming'
    ],
    rules: [
      'Collect key and remote controls from Representative (Room B-204).',
      'Keep sound levels reasonable after 10:00 PM (Hostel quiet hours).',
      'No footwear on sofas or couches; dispose of all snack wrappers and bottles in the bin.',
      'Do not tamper with display mountings, cable connections, or soundbar settings.',
      'Turn off TV, Soundbar, and Air Conditioning before locking up and returning the key.'
    ]
  }
];

export const DEFAULT_HOSTEL_SETTINGS: HostelSettings = {
  id: 'current',
  hostel_name: 'Cauvery Hostel - Block B',
  rep_name: 'Vaanjinathan (Rep)',
  rep_room: 'Room B-204',
  rep_phone: '+91 98765 43210',
  rep_email: 'rep.amenities@hostel.edu',
  admin_pin: '1234',
  auto_approval: true
};
