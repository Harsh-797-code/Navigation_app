export type Floor = 'ground' | 'first' | 'second';

export interface Destination {
  id: string;
  name: string;
  floor: Floor;
  floorLabel: string;
  room: string;
  category: 'emergency' | 'clinic' | 'pharmacy' | 'laboratory' | 'amenity' | 'diagnostics';
  description: string;
  subtext: string;
  nodeId: string;
  iconName: string;
  themeColor: string;
  tag?: string;
}

export type NodeType = 'entrance' | 'room' | 'corridor' | 'elevator' | 'stairs' | 'ramp' | 'reception';

export interface MapNode {
  id: string;
  floor: Floor;
  x: number;
  y: number;
  label: string;
  type: NodeType;
  destinationKey?: string;
  isStartOption?: boolean;
}

export interface Edge {
  from: string;
  to: string;
  distance: number; // in meters
  type: 'corridor' | 'elevator' | 'stairs' | 'ramp';
  description?: string;
}

export interface NavigationStep {
  stepIndex: number;
  totalSteps: number;
  floor: Floor;
  floorLabel: string;
  title: string;
  instruction: string;
  icon: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  isFloorTransition?: boolean;
  transitionType?: 'elevator' | 'stairs' | 'ramp';
  pathPoints: Array<[number, number]>;
}

export interface RouteResult {
  pathNodeIds: string[];
  nodes: MapNode[];
  steps: NavigationStep[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  floorsTraversed: Floor[];
  isStepFree: boolean;
  hasStairs: boolean;
  hasElevator: boolean;
  hasRamp: boolean;
}
