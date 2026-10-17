import { Destination, MapNode, Edge, Floor } from '../types/navigation';

export const DESTINATIONS: Destination[] = [
  {
    id: 'emergency',
    name: 'Emergency',
    floor: 'ground',
    floorLabel: 'Ground Floor',
    room: 'Emergency Dept (Zone Red • Fast Triage)',
    category: 'emergency',
    description: 'Urgent Care • Fast Triage & Acute Admissions',
    subtext: 'Urgent Care • Triage',
    nodeId: 'g-emergency',
    iconName: 'emergency',
    themeColor: '#ba1a1a',
    tag: 'RED ZONE • ER'
  },
  {
    id: 'opd',
    name: 'OPD',
    floor: 'ground',
    floorLabel: 'Ground Floor',
    room: 'OPD Clinic (Rooms G01-G08)',
    category: 'clinic',
    description: 'Outpatient Consultation & Doctor Appointment Suites',
    subtext: 'Outpatient Clinics',
    nodeId: 'g-opd',
    iconName: 'stethoscope',
    themeColor: '#00685f',
    tag: 'ROOMS G01-08'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    floor: 'first',
    floorLabel: 'First Floor',
    room: 'Hospital Pharmacy (Room 102)',
    category: 'pharmacy',
    description: 'Prescription Pickup & Medication Dispensary',
    subtext: 'Room 102 • Dispensary',
    nodeId: 'f1-pharmacy',
    iconName: 'medication',
    themeColor: '#006398',
    tag: 'ROOM 102'
  },
  {
    id: 'lab',
    name: 'Laboratory',
    floor: 'second',
    floorLabel: 'Second Floor',
    room: 'Clinical Laboratory (Room 205)',
    category: 'laboratory',
    description: 'Blood Tests, Specimen Collection & Diagnostics',
    subtext: 'Room 205 • Blood & Tests',
    nodeId: 'f2-lab',
    iconName: 'biotech',
    themeColor: '#4338ca',
    tag: 'ROOM 205'
  },
  // Additional searchable hospital locations
  {
    id: 'cafe',
    name: 'Cafeteria',
    floor: 'ground',
    floorLabel: 'Ground Floor',
    room: 'Visitor Dining & Cafe',
    category: 'amenity',
    description: 'Fresh Meals, Hot Beverages & Snacks (7am - 9pm)',
    subtext: 'Dining & Refreshments',
    nodeId: 'g-cafe',
    iconName: 'coffee',
    themeColor: '#ea580c',
    tag: 'FOOD & BEV'
  },
  {
    id: 'info',
    name: 'Information Desk',
    floor: 'ground',
    floorLabel: 'Ground Floor',
    room: 'Main Concourse Info Hub',
    category: 'amenity',
    description: 'Volunteer Guidance & Wheelchair Loan Service',
    subtext: 'Volunteer Assistance',
    nodeId: 'g-info',
    iconName: 'info',
    themeColor: '#00685f',
    tag: 'HELP DESK'
  },
  {
    id: 'cardio',
    name: 'Cardiology Wing',
    floor: 'first',
    floorLabel: 'First Floor',
    room: 'Cardiology Suites (Suite 101)',
    category: 'clinic',
    description: 'Cardiac Testing, ECG & Specialist Consultation',
    subtext: 'Suite 101 • Heart Care',
    nodeId: 'f1-cardio',
    iconName: 'heart',
    themeColor: '#dc2626',
    tag: 'SUITE 101'
  },
  {
    id: 'wards',
    name: 'Inpatient Wards',
    floor: 'first',
    floorLabel: 'First Floor',
    room: 'Patient Recovery Rooms (110-140)',
    category: 'clinic',
    description: 'General Inpatient Care (Visiting: 10am - 8pm)',
    subtext: 'Rooms 110-140',
    nodeId: 'f1-wards',
    iconName: 'bed',
    themeColor: '#475569',
    tag: 'ROOMS 110-140'
  },
  {
    id: 'imaging',
    name: 'Radiology & MRI',
    floor: 'second',
    floorLabel: 'Second Floor',
    room: 'Diagnostic Imaging (Suite 201)',
    category: 'diagnostics',
    description: 'X-Ray, CT Scan, MRI & Ultrasound Services',
    subtext: 'Suite 201 • Imaging',
    nodeId: 'f2-imaging',
    iconName: 'scan',
    themeColor: '#4338ca',
    tag: 'SUITE 201'
  },
  {
    id: 'pathology',
    name: 'Pathology Dept',
    floor: 'second',
    floorLabel: 'Second Floor',
    room: 'Pathology & Histology (Suite 210)',
    category: 'laboratory',
    description: 'Biopsy Examination & Tissue Analysis',
    subtext: 'Suite 210 • Pathology',
    nodeId: 'f2-pathology',
    iconName: 'microscope',
    themeColor: '#475569',
    tag: 'SUITE 210'
  }
];

export const MAP_NODES: Record<string, MapNode> = {
  // === GROUND FLOOR NODES ===
  'g-reception': {
    id: 'g-reception',
    floor: 'ground',
    x: 460,
    y: 360,
    label: 'Main Reception & Lobby',
    type: 'reception',
    isStartOption: true
  },
  'g-reception-ramp': {
    id: 'g-reception-ramp',
    floor: 'ground',
    x: 420,
    y: 310,
    label: 'Accessible Concourse Ramp (Lobby)',
    type: 'ramp'
  },
  'g-concourse-center': {
    id: 'g-concourse-center',
    floor: 'ground',
    x: 460,
    y: 260,
    label: 'Ground Central Concourse',
    type: 'corridor'
  },
  'g-concourse-west': {
    id: 'g-concourse-west',
    floor: 'ground',
    x: 230,
    y: 260,
    label: 'Ground West Hallway',
    type: 'corridor'
  },
  'g-concourse-east': {
    id: 'g-concourse-east',
    floor: 'ground',
    x: 660,
    y: 260,
    label: 'Ground East Hallway',
    type: 'corridor'
  },
  'g-emergency': {
    id: 'g-emergency',
    floor: 'ground',
    x: 730,
    y: 290,
    label: 'Emergency Dept',
    type: 'room',
    destinationKey: 'emergency',
    isStartOption: true
  },
  'g-opd': {
    id: 'g-opd',
    floor: 'ground',
    x: 170,
    y: 360,
    label: 'OPD Clinic',
    type: 'room',
    destinationKey: 'opd',
    isStartOption: true
  },
  'g-cafe': {
    id: 'g-cafe',
    floor: 'ground',
    x: 140,
    y: 130,
    label: 'Cafeteria',
    type: 'room',
    destinationKey: 'cafe',
    isStartOption: true
  },
  'g-info': {
    id: 'g-info',
    floor: 'ground',
    x: 310,
    y: 130,
    label: 'Info Desk',
    type: 'room',
    destinationKey: 'info',
    isStartOption: true
  },
  'g-elevator': {
    id: 'g-elevator',
    floor: 'ground',
    x: 460,
    y: 140,
    label: 'Central Elevators (Ground)',
    type: 'elevator',
    isStartOption: true
  },
  'g-stairs': {
    id: 'g-stairs',
    floor: 'ground',
    x: 565,
    y: 140,
    label: 'Central Stairs (Ground)',
    type: 'stairs',
    isStartOption: false
  },
  'g-restrooms': {
    id: 'g-restrooms',
    floor: 'ground',
    x: 665,
    y: 130,
    label: 'Restrooms (Ground)',
    type: 'room'
  },

  // === FIRST FLOOR NODES ===
  'f1-elevator': {
    id: 'f1-elevator',
    floor: 'first',
    x: 460,
    y: 140,
    label: 'Central Elevators (Floor 1)',
    type: 'elevator',
    isStartOption: true
  },
  'f1-stairs': {
    id: 'f1-stairs',
    floor: 'first',
    x: 565,
    y: 140,
    label: 'Central Stairs (Floor 1)',
    type: 'stairs',
    isStartOption: false
  },
  'f1-hall-center': {
    id: 'f1-hall-center',
    floor: 'first',
    x: 460,
    y: 260,
    label: 'Floor 1 Central Concourse',
    type: 'corridor'
  },
  'f1-hall-west': {
    id: 'f1-hall-west',
    floor: 'first',
    x: 230,
    y: 260,
    label: 'Floor 1 West Corridor',
    type: 'corridor'
  },
  'f1-hall-east': {
    id: 'f1-hall-east',
    floor: 'first',
    x: 660,
    y: 260,
    label: 'Floor 1 East Corridor',
    type: 'corridor'
  },
  'f1-pharmacy': {
    id: 'f1-pharmacy',
    floor: 'first',
    x: 730,
    y: 290,
    label: 'Hospital Pharmacy',
    type: 'room',
    destinationKey: 'pharmacy',
    isStartOption: true
  },
  'f1-cardio': {
    id: 'f1-cardio',
    floor: 'first',
    x: 170,
    y: 130,
    label: 'Cardiology Wing',
    type: 'room',
    destinationKey: 'cardio',
    isStartOption: true
  },
  'f1-wards': {
    id: 'f1-wards',
    floor: 'first',
    x: 170,
    y: 360,
    label: 'Inpatient Wards',
    type: 'room',
    destinationKey: 'wards',
    isStartOption: true
  },
  'f1-nurse': {
    id: 'f1-nurse',
    floor: 'first',
    x: 460,
    y: 360,
    label: 'Nurses Station 1',
    type: 'room',
    isStartOption: true
  },
  'f1-restrooms': {
    id: 'f1-restrooms',
    floor: 'first',
    x: 665,
    y: 130,
    label: 'Restrooms (Floor 1)',
    type: 'room'
  },

  // === SECOND FLOOR NODES ===
  'f2-elevator': {
    id: 'f2-elevator',
    floor: 'second',
    x: 460,
    y: 140,
    label: 'Central Elevators (Floor 2)',
    type: 'elevator',
    isStartOption: true
  },
  'f2-stairs': {
    id: 'f2-stairs',
    floor: 'second',
    x: 565,
    y: 140,
    label: 'Central Stairs (Floor 2)',
    type: 'stairs',
    isStartOption: false
  },
  'f2-hall-center': {
    id: 'f2-hall-center',
    floor: 'second',
    x: 460,
    y: 260,
    label: 'Floor 2 Central Concourse',
    type: 'corridor'
  },
  'f2-hall-west': {
    id: 'f2-hall-west',
    floor: 'second',
    x: 230,
    y: 260,
    label: 'Floor 2 West Corridor',
    type: 'corridor'
  },
  'f2-hall-east': {
    id: 'f2-hall-east',
    floor: 'second',
    x: 660,
    y: 260,
    label: 'Floor 2 East Corridor',
    type: 'corridor'
  },
  'f2-lab': {
    id: 'f2-lab',
    floor: 'second',
    x: 730,
    y: 290,
    label: 'Clinical Laboratory',
    type: 'room',
    destinationKey: 'lab',
    isStartOption: true
  },
  'f2-imaging': {
    id: 'f2-imaging',
    floor: 'second',
    x: 170,
    y: 130,
    label: 'Radiology & MRI',
    type: 'room',
    destinationKey: 'imaging',
    isStartOption: true
  },
  'f2-pathology': {
    id: 'f2-pathology',
    floor: 'second',
    x: 170,
    y: 360,
    label: 'Pathology Dept',
    type: 'room',
    destinationKey: 'pathology',
    isStartOption: true
  },
  'f2-specialist': {
    id: 'f2-specialist',
    floor: 'second',
    x: 460,
    y: 360,
    label: 'Specialist Consultation Suites',
    type: 'room',
    isStartOption: true
  },
  'f2-restrooms': {
    id: 'f2-restrooms',
    floor: 'second',
    x: 665,
    y: 130,
    label: 'Restrooms (Floor 2)',
    type: 'room'
  }
};

export const EDGES: Edge[] = [
  // --- Ground Floor Connections ---
  // Direct corridor connection
  { from: 'g-reception', to: 'g-concourse-center', distance: 20, type: 'corridor', description: 'Walk north from Reception into the main concourse' },
  // Step-free accessible ramp from reception to concourse
  { from: 'g-reception', to: 'g-reception-ramp', distance: 10, type: 'ramp', description: 'Take the gentle step-free ADA ramp from Reception' },
  { from: 'g-reception-ramp', to: 'g-concourse-center', distance: 10, type: 'ramp', description: 'Merge onto the main concourse via ramp' },

  // Concourse to elevators vs stairs
  { from: 'g-concourse-center', to: 'g-elevator', distance: 25, type: 'corridor', description: 'Head north to Central Elevators (ADA Accessible)' },
  { from: 'g-concourse-center', to: 'g-stairs', distance: 18, type: 'stairs', description: 'Head north-east to Central Stairs' },

  { from: 'g-concourse-center', to: 'g-concourse-east', distance: 35, type: 'corridor', description: 'Walk east along the main concourse' },
  { from: 'g-concourse-east', to: 'g-emergency', distance: 15, type: 'corridor', description: 'Turn right into Emergency Dept Check-in' },
  { from: 'g-concourse-east', to: 'g-restrooms', distance: 25, type: 'corridor', description: 'Walk north to ground restrooms' },
  { from: 'g-concourse-center', to: 'g-concourse-west', distance: 35, type: 'corridor', description: 'Walk west toward OPD and Cafeteria' },
  { from: 'g-concourse-west', to: 'g-opd', distance: 15, type: 'corridor', description: 'Turn south into OPD Clinic Wing' },
  { from: 'g-concourse-west', to: 'g-cafe', distance: 25, type: 'corridor', description: 'Walk north-west into Cafeteria' },
  { from: 'g-concourse-west', to: 'g-info', distance: 20, type: 'corridor', description: 'Step into Volunteer Info Desk' },

  // --- Floor 1 Connections ---
  { from: 'f1-elevator', to: 'f1-hall-center', distance: 25, type: 'corridor', description: 'Exit Elevator south onto Floor 1 concourse' },
  { from: 'f1-stairs', to: 'f1-hall-center', distance: 18, type: 'stairs', description: 'Exit Stairs south-west onto Floor 1 concourse' },
  { from: 'f1-hall-center', to: 'f1-nurse', distance: 20, type: 'corridor', description: 'Walk south to Nurses Station 1' },
  { from: 'f1-hall-center', to: 'f1-hall-east', distance: 35, type: 'corridor', description: 'Walk east along Floor 1 corridor' },
  { from: 'f1-hall-east', to: 'f1-pharmacy', distance: 15, type: 'corridor', description: 'Turn right into Hospital Pharmacy' },
  { from: 'f1-hall-east', to: 'f1-restrooms', distance: 25, type: 'corridor', description: 'Walk north to Floor 1 restrooms' },
  { from: 'f1-hall-center', to: 'f1-hall-west', distance: 35, type: 'corridor', description: 'Walk west along Floor 1 corridor' },
  { from: 'f1-hall-west', to: 'f1-cardio', distance: 25, type: 'corridor', description: 'Turn north into Cardiology Wing' },
  { from: 'f1-hall-west', to: 'f1-wards', distance: 20, type: 'corridor', description: 'Turn south into Inpatient Wards' },

  // --- Floor 2 Connections ---
  { from: 'f2-elevator', to: 'f2-hall-center', distance: 25, type: 'corridor', description: 'Exit Elevator south onto Floor 2 concourse' },
  { from: 'f2-stairs', to: 'f2-hall-center', distance: 18, type: 'stairs', description: 'Exit Stairs south-west onto Floor 2 concourse' },
  { from: 'f2-hall-center', to: 'f2-specialist', distance: 20, type: 'corridor', description: 'Walk south to Specialist Consultation Suites' },
  { from: 'f2-hall-center', to: 'f2-hall-east', distance: 35, type: 'corridor', description: 'Walk east along Floor 2 corridor' },
  { from: 'f2-hall-east', to: 'f2-lab', distance: 15, type: 'corridor', description: 'Turn right into Clinical Laboratory' },
  { from: 'f2-hall-east', to: 'f2-restrooms', distance: 25, type: 'corridor', description: 'Walk north to Floor 2 restrooms' },
  { from: 'f2-hall-center', to: 'f2-hall-west', distance: 35, type: 'corridor', description: 'Walk west along Floor 2 corridor' },
  { from: 'f2-hall-west', to: 'f2-imaging', distance: 25, type: 'corridor', description: 'Turn north into Radiology & MRI Suites' },
  { from: 'f2-hall-west', to: 'f2-pathology', distance: 20, type: 'corridor', description: 'Turn south into Pathology Dept' },

  // --- Vertical Multi-Floor Transitions (Elevator: 100% step-free wheelchair accessible) ---
  { from: 'g-elevator', to: 'f1-elevator', distance: 20, type: 'elevator', description: 'Take Central Elevator between Ground and Floor 1' },
  { from: 'f1-elevator', to: 'f2-elevator', distance: 20, type: 'elevator', description: 'Take Central Elevator between Floor 1 and Floor 2' },
  { from: 'g-elevator', to: 'f2-elevator', distance: 35, type: 'elevator', description: 'Take Central Elevator directly between Ground and Floor 2' },

  // --- Vertical Multi-Floor Transitions (Stairs: non-step-free) ---
  { from: 'g-stairs', to: 'f1-stairs', distance: 15, type: 'stairs', description: 'Take Central Stairs between Ground and Floor 1' },
  { from: 'f1-stairs', to: 'f2-stairs', distance: 15, type: 'stairs', description: 'Take Central Stairs between Floor 1 and Floor 2' },
  { from: 'g-stairs', to: 'f2-stairs', distance: 30, type: 'stairs', description: 'Take Central Stairs between Ground and Floor 2' }
];

export const START_OPTIONS = Object.values(MAP_NODES).filter((node) => node.isStartOption);

export const FLOOR_LABELS: Record<Floor, { name: string; subtitle: string; description: string }> = {
  ground: {
    name: 'Ground Floor',
    subtitle: 'Lobby & Emergency',
    description: 'Ground Floor • Main Concourse & Admissions'
  },
  first: {
    name: 'First Floor',
    subtitle: 'Wards & Pharmacy',
    description: 'First Floor • Inpatient Wards & Pharmacy'
  },
  second: {
    name: 'Second Floor',
    subtitle: 'Diagnostics & Lab',
    description: 'Second Floor • Diagnostic Imaging & Laboratories'
  }
};
