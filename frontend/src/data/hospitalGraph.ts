/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Harshitha's Sample Hospital Graph & Routing Service
 * Source of truth:
 * - 9 Nodes (Floor 1: Nodes 1-5; Floor 2: Nodes 6-9)
 * - 9 Undirected Edges (Edges 101-109)
 * - Java Graph implementation with Map<Long, Node> & adjacency list
 */

import {
  Node,
  Edge,
  GraphInterface,
  RouteResult,
  FrontendRouteResult,
  RoutePreference,
  DestinationPreset,
  RouteStep,
  FloorKey,
  DestinationKey,
} from '../types/navigation';

export const HOSPITAL_NODES: Node[] = [
  // Floor 1 — floorId = 1
  {
    id: 1,
    floorId: 1,
    x: 100.0,
    y: 200.0,
    type: 'ENTRANCE',
    name: 'Main Entrance',
  },
  {
    id: 2,
    floorId: 1,
    x: 150.0,
    y: 200.0,
    type: 'JUNCTION',
    name: 'Floor 1 Main Corridor Junction',
  },
  {
    id: 3,
    floorId: 1,
    x: 150.0,
    y: 250.0,
    type: 'ROOM',
    name: 'Room 101',
  },
  {
    id: 4,
    floorId: 1,
    x: 150.0,
    y: 150.0,
    type: 'STAIRS',
    name: 'Floor 1 Stairs',
  },
  {
    id: 5,
    floorId: 1,
    x: 200.0,
    y: 200.0,
    type: 'LIFT',
    name: 'Floor 1 Elevator',
  },

  // Floor 2 — floorId = 2
  {
    id: 6,
    floorId: 2,
    x: 150.0,
    y: 150.0,
    type: 'STAIRS',
    name: 'Floor 2 Stairs',
  },
  {
    id: 7,
    floorId: 2,
    x: 200.0,
    y: 200.0,
    type: 'LIFT',
    name: 'Floor 2 Elevator',
  },
  {
    id: 8,
    floorId: 2,
    x: 250.0,
    y: 200.0,
    type: 'JUNCTION',
    name: 'Floor 2 Corridor Junction',
  },
  {
    id: 9,
    floorId: 2,
    x: 300.0,
    y: 200.0,
    type: 'ROOM',
    name: 'Computer Lab 204',
  },
];

export const HOSPITAL_EDGES: Edge[] = [
  { id: 101, fromNodeId: 1, toNodeId: 2, distance: 10.0, stairs: false, lift: false, accessible: true },
  { id: 102, fromNodeId: 2, toNodeId: 3, distance: 5.0, stairs: false, lift: false, accessible: true },
  { id: 103, fromNodeId: 2, toNodeId: 4, distance: 8.0, stairs: false, lift: false, accessible: true },
  { id: 104, fromNodeId: 2, toNodeId: 5, distance: 12.0, stairs: false, lift: false, accessible: true },
  { id: 105, fromNodeId: 4, toNodeId: 6, distance: 15.0, stairs: true, lift: false, accessible: false },
  { id: 106, fromNodeId: 5, toNodeId: 7, distance: 15.0, stairs: false, lift: true, accessible: true },
  { id: 107, fromNodeId: 6, toNodeId: 8, distance: 8.0, stairs: false, lift: false, accessible: true },
  { id: 108, fromNodeId: 7, toNodeId: 8, distance: 5.0, stairs: false, lift: false, accessible: true },
  { id: 109, fromNodeId: 8, toNodeId: 9, distance: 15.0, stairs: false, lift: false, accessible: true },
];

/**
 * Graph implementation matching Harshitha's Graph.java
 * - Stores nodes in a map using node IDs.
 * - Stores connections in an adjacency list.
 * - addUndirectedEdge() creates bidirectional connection without duplicates.
 * - Validates endpoints against existing nodes (does not silently ignore invalid edge endpoints).
 */
export class HospitalGraph implements GraphInterface {
  private nodesMap = new Map<number, Node>();
  private adjacencyList = new Map<number, { neighborId: number; edge: Edge }[]>();
  private edgesList: Edge[] = [];

  constructor(nodes: Node[], edges: Edge[]) {
    nodes.forEach((n) => this.addNode(n));
    edges.forEach((e) => this.addUndirectedEdge(e));
  }

  addNode(node: Node): void {
    this.nodesMap.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  addUndirectedEdge(edge: Edge): void {
    // 1. Verify both endpoints exist in the graph (do not silently ignore invalid edge endpoints)
    if (!this.nodesMap.has(edge.fromNodeId)) {
      throw new Error(
        `Cannot add edge #${edge.id}: fromNodeId ${edge.fromNodeId} does not exist in graph.`
      );
    }
    if (!this.nodesMap.has(edge.toNodeId)) {
      throw new Error(
        `Cannot add edge #${edge.id}: toNodeId ${edge.toNodeId} does not exist in graph.`
      );
    }

    // 2. Prevent accidental duplicate storage in edgesList
    const alreadyStored = this.edgesList.some((e) => e.id === edge.id);
    if (!alreadyStored) {
      this.edgesList.push(edge);
    }

    // 3. Add to fromNodeId adjacency list if not already present
    const fromList = this.adjacencyList.get(edge.fromNodeId) ?? [];
    if (!fromList.some((entry) => entry.edge.id === edge.id && entry.neighborId === edge.toNodeId)) {
      fromList.push({ neighborId: edge.toNodeId, edge });
      this.adjacencyList.set(edge.fromNodeId, fromList);
    }

    // 4. Add to toNodeId adjacency list if not already present
    const toList = this.adjacencyList.get(edge.toNodeId) ?? [];
    if (!toList.some((entry) => entry.edge.id === edge.id && entry.neighborId === edge.fromNodeId)) {
      toList.push({ neighborId: edge.fromNodeId, edge });
      this.adjacencyList.set(edge.toNodeId, toList);
    }
  }

  getNode(id: number): Node | undefined {
    return this.nodesMap.get(id);
  }

  containsNode(id: number): boolean {
    return this.nodesMap.has(id);
  }

  getNeighbors(id: number): { neighborId: number; edge: Edge }[] {
    return this.adjacencyList.get(id) || [];
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodesMap.values());
  }

  getAllEdges(): Edge[] {
    return this.edgesList;
  }
}

export const HOSPITAL_GRAPH = new HospitalGraph(HOSPITAL_NODES, HOSPITAL_EDGES);

export const POPULAR_DESTINATIONS: Record<DestinationKey, DestinationPreset> = {
  room101: {
    key: 'room101',
    name: 'Room 101',
    nodeId: 3,
    floorKey: 'floor1',
    floorId: 1,
    floorLabel: 'Floor 1',
    roomName: 'Room 101 (Sample Room)',
    subtitle: 'Sample Room (Node #3)',
    badge: 'ROOM 101',
    icon: 'meeting_room',
    colorTheme: {
      bg: 'bg-primary text-white',
      border: 'border-primary',
      text: 'text-white',
      badgeBg: 'bg-white/20',
      badgeText: 'text-white',
      activeRing: 'ring-2 ring-primary/20',
    },
  },
  lab204: {
    key: 'lab204',
    name: 'Computer Lab 204',
    nodeId: 9,
    floorKey: 'floor2',
    floorId: 2,
    floorLabel: 'Floor 2',
    roomName: 'Computer Lab 204 (Sample Room)',
    subtitle: 'Sample Room (Node #9)',
    badge: 'ROOM 204',
    icon: 'computer',
    colorTheme: {
      bg: 'bg-white text-slate-900',
      border: 'border-slate-200',
      text: 'text-slate-900',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-teal-700',
      activeRing: 'ring-2 ring-[#00685f]/20',
    },
  },
  lift1: {
    key: 'lift1',
    name: 'Floor 1 Elevator',
    nodeId: 5,
    floorKey: 'floor1',
    floorId: 1,
    floorLabel: 'Floor 1',
    roomName: 'Floor 1 Elevator (Node #5)',
    subtitle: 'Step-free Elevator Access',
    badge: 'LIFT • F1',
    icon: 'elevator',
    colorTheme: {
      bg: 'bg-white text-slate-900',
      border: 'border-slate-200',
      text: 'text-slate-900',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-700',
      activeRing: 'ring-2 ring-[#006398]/20',
    },
  },
  lift2: {
    key: 'lift2',
    name: 'Floor 2 Elevator',
    nodeId: 7,
    floorKey: 'floor2',
    floorId: 2,
    floorLabel: 'Floor 2',
    roomName: 'Floor 2 Elevator (Node #7)',
    subtitle: 'Step-free Elevator Access',
    badge: 'LIFT • F2',
    icon: 'elevator',
    colorTheme: {
      bg: 'bg-white text-slate-900',
      border: 'border-slate-200',
      text: 'text-slate-900',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-700',
      activeRing: 'ring-2 ring-[#4338ca]/20',
    },
  },
};

export interface HospitalDestinationItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'Clinic / OPD' | 'Emergency' | 'Pharmacy' | 'Laboratory' | 'Room' | 'Elevator' | 'Stairs' | 'Entrance';
  nodeId: number;
  floorId: number;
  floorLabel: string;
  icon: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  tags: string[];
}

export const HOSPITAL_SEARCHABLE_DESTINATIONS: HospitalDestinationItem[] = [
  {
    id: 'pharmacy',
    name: 'Pharmacy & Dispensary',
    subtitle: 'Prescription & Medication Pickup • Room 101',
    category: 'Pharmacy',
    nodeId: 3,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'medication',
    colorTheme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
    },
    tags: ['pharmacy', 'medicine', 'dispensary', 'drugs', 'chemist', 'prescription', 'pills', '101', 'room 101'],
  },
  {
    id: 'emergency',
    name: 'Emergency & Triage',
    subtitle: 'Urgent Care & Reception • Main Entrance',
    category: 'Emergency',
    nodeId: 1,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'e911_emergency',
    colorTheme: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
    },
    tags: ['emergency', 'er', 'triage', 'urgent', 'casualty', 'trauma', 'ambulance', 'entrance', 'rescue', 'emergency rescue', 'node 1'],
  },
  {
    id: 'rescue',
    name: 'Emergency Rescue & Trauma',
    subtitle: 'Immediate Life-Support & Patient Rescue • Main Entrance',
    category: 'Emergency',
    nodeId: 1,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'e911_emergency',
    colorTheme: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
    },
    tags: ['rescue', 'emergency rescue', 'trauma', 'emergency', 'urgent', 'er', 'first aid', 'life support', 'ambulance', 'entrance', 'node 1'],
  },
  {
    id: 'opd',
    name: 'OPD Consultation',
    subtitle: 'Outpatient Clinic & Doctor Consultation • Room 101',
    category: 'Clinic / OPD',
    nodeId: 3,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'stethoscope',
    colorTheme: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-900',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
    },
    tags: ['opd', 'outpatient', 'doctor', 'clinic', 'consultation', 'physician', 'checkup', '101', 'room 101'],
  },
  {
    id: 'laboratory',
    name: 'Diagnostic Laboratory',
    subtitle: 'Blood Tests, Pathology & Diagnostics • Lab 204',
    category: 'Laboratory',
    nodeId: 9,
    floorId: 2,
    floorLabel: 'Floor 2',
    icon: 'biotech',
    colorTheme: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
    },
    tags: ['laboratory', 'lab', 'pathology', 'blood', 'tests', 'diagnostics', 'specimen', 'lab 204', '204', 'computer lab 204'],
  },
  {
    id: 'room101',
    name: 'Room 101',
    subtitle: 'Sample Room (Node #3) • Floor 1',
    category: 'Room',
    nodeId: 3,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'meeting_room',
    colorTheme: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      text: 'text-cyan-900',
      badgeBg: 'bg-cyan-100',
      badgeText: 'text-cyan-800',
    },
    tags: ['room 101', '101', 'room', 'suite 101', 'sample room'],
  },
  {
    id: 'lab204',
    name: 'Computer Lab 204',
    subtitle: 'Sample Room (Node #9) • Floor 2',
    category: 'Room',
    nodeId: 9,
    floorId: 2,
    floorLabel: 'Floor 2',
    icon: 'computer',
    colorTheme: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
    },
    tags: ['computer lab 204', 'lab 204', 'computer lab', '204', 'sample room'],
  },
  {
    id: 'lift1',
    name: 'Floor 1 Elevator',
    subtitle: 'Accessible Lift to Floor 2 • Node #5',
    category: 'Elevator',
    nodeId: 5,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'elevator',
    colorTheme: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-900',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
    },
    tags: ['elevator', 'lift', 'floor 1 elevator', 'wheelchair', 'lift 1', 'node 5'],
  },
  {
    id: 'lift2',
    name: 'Floor 2 Elevator',
    subtitle: 'Accessible Lift Landing • Node #7',
    category: 'Elevator',
    nodeId: 7,
    floorId: 2,
    floorLabel: 'Floor 2',
    icon: 'elevator',
    colorTheme: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-900',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
    },
    tags: ['elevator', 'lift', 'floor 2 elevator', 'lift 2', 'node 7'],
  },
  {
    id: 'entrance',
    name: 'Main Entrance & Lobby',
    subtitle: 'Ground Level Ingress / Reception • Node #1',
    category: 'Entrance',
    nodeId: 1,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'door_front',
    colorTheme: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
    },
    tags: ['main entrance', 'entrance', 'lobby', 'reception', 'front desk', 'exit', 'node 1'],
  },
  {
    id: 'stairs1',
    name: 'Floor 1 Stairs',
    subtitle: 'Staircase connecting to Floor 2 • Node #4',
    category: 'Stairs',
    nodeId: 4,
    floorId: 1,
    floorLabel: 'Floor 1',
    icon: 'stairs',
    colorTheme: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    },
    tags: ['stairs', 'staircase', 'floor 1 stairs', 'steps', 'node 4'],
  },
  {
    id: 'stairs2',
    name: 'Floor 2 Stairs',
    subtitle: 'Staircase landing on Upper Floor • Node #6',
    category: 'Stairs',
    nodeId: 6,
    floorId: 2,
    floorLabel: 'Floor 2',
    icon: 'stairs',
    colorTheme: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    },
    tags: ['stairs', 'staircase', 'floor 2 stairs', 'steps', 'node 6'],
  },
];

export interface QRCheckpoint {
  code: string;
  nodeId: number;
  label: string;
  floorLabel: string;
  locationDetails: string;
  icon: string;
}

export const QR_CHECKPOINTS: QRCheckpoint[] = [
  {
    code: 'QR-MEDIPATH-001',
    nodeId: 1,
    label: 'Main Entrance Lobby QR Checkpoint',
    floorLabel: 'Floor 1',
    locationDetails: 'Pillar B near Reception Desk & Wheelchair Bay',
    icon: 'door_front',
  },
  {
    code: 'QR-MEDIPATH-002',
    nodeId: 2,
    label: 'Floor 1 Corridor Junction Checkpoint',
    floorLabel: 'Floor 1',
    locationDetails: 'Wall station at Main Corridor intersection',
    icon: 'alt_route',
  },
  {
    code: 'QR-MEDIPATH-005',
    nodeId: 5,
    label: 'Floor 1 Elevator Bank Checkpoint',
    floorLabel: 'Floor 1',
    locationDetails: 'Mounted beside elevator call button',
    icon: 'elevator',
  },
  {
    code: 'QR-MEDIPATH-004',
    nodeId: 4,
    label: 'Floor 1 Stairwell Checkpoint',
    floorLabel: 'Floor 1',
    locationDetails: 'Fire door landing entry',
    icon: 'stairs',
  },
  {
    code: 'QR-MEDIPATH-007',
    nodeId: 7,
    label: 'Floor 2 Elevator Landing Checkpoint',
    floorLabel: 'Floor 2',
    locationDetails: 'Mounted outside elevator cabin doors',
    icon: 'elevator',
  },
  {
    code: 'QR-MEDIPATH-008',
    nodeId: 8,
    label: 'Floor 2 Corridor Junction Checkpoint',
    floorLabel: 'Floor 2',
    locationDetails: 'Hallway intersection station',
    icon: 'alt_route',
  },
];

export function floorIdToKey(floorId: number): FloorKey {
  return floorId === 2 ? 'floor2' : 'floor1';
}

export function floorKeyToId(floorKey: FloorKey): number {
  return floorKey === 'floor2' ? 2 : 1;
}

export function floorKeyToLabel(floorKey: FloorKey): string {
  return floorKey === 'floor2' ? 'Floor 2' : 'Floor 1';
}

/**
 * Finds the edge connecting two adjacent nodes in the graph.
 */
export function findEdgeBetween(
  graph: GraphInterface,
  fromNodeId: number,
  toNodeId: number
): Edge | undefined {
  const neighbors = graph.getNeighbors(fromNodeId);
  const match = neighbors.find((n) => n.neighborId === toNodeId);
  return match?.edge;
}

/**
 * Calculates shortest path in Harshitha's Graph using Dijkstra's algorithm.
 * Strictly adheres to the Java RouteResult.java backend contract:
 * - found: boolean
 * - totalDistanceMeters: double
 * - path: List<Node>
 * - errorMessage: String (null when found)
 *
 * Route preferences:
 * - 'none': Shortest path using edge distance.
 * - 'avoid-stairs': Excludes edges where edge.stairs === true.
 * - 'accessible': Excludes edges where edge.accessible === false or edge.stairs === true.
 */
export function calculateBackendRoute(
  graph: GraphInterface,
  startNodeId: number,
  destNodeId: number,
  preference: RoutePreference = 'none'
): RouteResult {
  const startNode = graph.getNode(startNodeId);
  const destNode = graph.getNode(destNodeId);

  // Validate existence of start and destination nodes
  if (!startNode || !destNode) {
    const invalidId = !startNode ? startNodeId : destNodeId;
    return {
      found: false,
      totalDistanceMeters: 0,
      path: [],
      errorMessage: `Selected node (#${invalidId}) does not exist in the Hospital Graph.`,
    };
  }

  // Handle case where start and destination are identical
  if (startNodeId === destNodeId) {
    return {
      found: true,
      totalDistanceMeters: 0,
      path: [startNode],
      errorMessage: null,
    };
  }

  // Dijkstra Shortest Path
  const distances = new Map<number, number>();
  const previous = new Map<number, { prevNodeId: number; edgeUsed: Edge }>();
  const visited = new Set<number>();

  graph.getAllNodes().forEach((n) => distances.set(n.id, Infinity));
  distances.set(startNodeId, 0);

  const pq: { nodeId: number; dist: number }[] = [{ nodeId: startNodeId, dist: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { nodeId, dist } = pq.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (nodeId === destNodeId) break;

    const neighbors = graph.getNeighbors(nodeId);
    for (const { neighborId, edge } of neighbors) {
      if (visited.has(neighborId)) continue;

      // Apply route preferences strictly to edge properties
      if (preference === 'accessible') {
        if (!edge.accessible || edge.stairs) continue;
      } else if (preference === 'avoid-stairs') {
        if (edge.stairs) continue;
      }

      const newDist = dist + edge.distance;
      if (newDist < (distances.get(neighborId) ?? Infinity)) {
        distances.set(neighborId, newDist);
        previous.set(neighborId, { prevNodeId: nodeId, edgeUsed: edge });
        pq.push({ nodeId: neighborId, dist: newDist });
      }
    }
  }

  // Check if destination was reached
  if (!visited.has(destNodeId) || distances.get(destNodeId) === Infinity) {
    const prefDescription =
      preference === 'accessible'
        ? 'under the "Accessible route only" constraint (step-free, elevator only)'
        : preference === 'avoid-stairs'
        ? 'under the "Avoid stairs" preference'
        : 'in the hospital graph';

    return {
      found: false,
      totalDistanceMeters: 0,
      path: [],
      errorMessage: `No connected Edge path exists between Node #${startNodeId} (${startNode.name}) and Node #${destNodeId} (${destNode.name}) ${prefDescription}.`,
    };
  }

  // Reconstruct path: List<Node> from start to destination
  const path: Node[] = [];
  let curr: number | undefined = destNodeId;

  while (curr !== undefined) {
    const n = graph.getNode(curr);
    if (n) path.unshift(n);
    const prevInfo = previous.get(curr);
    curr = prevInfo ? prevInfo.prevNodeId : undefined;
  }

  // Path integrity verification:
  // 1. Must start at startNodeId and end at destNodeId
  if (path.length === 0 || path[0].id !== startNodeId || path[path.length - 1].id !== destNodeId) {
    return {
      found: false,
      totalDistanceMeters: 0,
      path: [],
      errorMessage: `Failed to reconstruct valid path from Node #${startNodeId} to Node #${destNodeId}.`,
    };
  }

  // 2. Every consecutive pair must have a valid edge in the graph
  let computedDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = findEdgeBetween(graph, path[i].id, path[i + 1].id);
    if (!edge) {
      return {
        found: false,
        totalDistanceMeters: 0,
        path: [],
        errorMessage: `Path reconstruction error: no valid edge connects Node #${path[i].id} and Node #${path[i + 1].id}.`,
      };
    }
    computedDistance += edge.distance;
  }

  const totalDistance = Math.round(computedDistance * 10) / 10;

  return {
    found: true,
    totalDistanceMeters: totalDistance,
    path,
    errorMessage: null,
  };
}

/**
 * Generates accurate, contextual turn-by-turn directions based on the actual path and edges used.
 * - Receives a strictly validated path and edge sequence.
 * - Does not describe every edge as a corridor.
 * - Explicitly identifies floor transitions from nodes' floorId.
 * - Only instructs taking an elevator when edge.lift === true.
 * - Only instructs taking stairs when edge.stairs === true.
 * - Ensures the final step always represents arrival at the destination.
 * - Matches route distance with edge distance sum.
 */
export function generateTurnByTurnSteps(
  path: Node[],
  edgesInPath: Edge[],
  destNodeId: number
): RouteStep[] {
  if (path.length === 0) return [];

  // Guard: path and edges must have exact length alignment
  if (path.length > 1 && edgesInPath.length !== path.length - 1) {
    throw new Error(
      `generateTurnByTurnSteps: path length (${path.length}) does not match edge count (${edgesInPath.length}). Expected ${path.length - 1} edges.`
    );
  }

  const startNode = path[0];
  const steps: RouteStep[] = [];

  // 1. Initial Step
  steps.push({
    num: 1,
    title: `Start at ${startNode.name}`,
    desc: `Begin at ${startNode.name} on Floor ${startNode.floorId}.`,
    icon: startNode.type === 'ENTRANCE' ? 'door_front' : 'location_on',
    floor: `Floor ${startNode.floorId}`,
    floorId: startNode.floorId,
  });

  // Start is already destination
  if (path.length === 1 && path[0].id === destNodeId) {
    return [
      {
        num: 1,
        title: 'You are at your destination',
        desc: `You are already at ${path[0].name} on Floor ${path[0].floorId}.`,
        icon: 'check_circle',
        floor: `Floor ${path[0].floorId}`,
        floorId: path[0].floorId,
      },
    ];
  }

  // 2. Traversal Steps
  for (let i = 0; i < edgesInPath.length; i++) {
    const edge = edgesInPath[i];
    const from = path[i];
    const to = path[i + 1];
    const isFinalEdge = i === edgesInPath.length - 1;
    const isFloorTransition = from.floorId !== to.floorId;

    if (edge.lift) {
      steps.push({
        num: steps.length + 1,
        title: `Take Elevator to Floor ${to.floorId}`,
        desc: `Enter ${from.name} on Floor ${from.floorId} and ride ${edge.distance}m to ${to.name} on Floor ${to.floorId}.`,
        icon: 'elevator',
        floor: isFloorTransition
          ? `Floor ${from.floorId} → Floor ${to.floorId}`
          : `Floor ${to.floorId}`,
        floorId: to.floorId,
      });

      // If elevator landing is the final destination, append arrival step
      if (isFinalEdge && to.id === destNodeId) {
        steps.push({
          num: steps.length + 1,
          title: `Arrive at ${to.name}`,
          desc: `Exit elevator on Floor ${to.floorId}. You have arrived at your destination ${to.name}.`,
          icon: 'check_circle',
          floor: `Floor ${to.floorId}`,
          floorId: to.floorId,
        });
      }
    } else if (edge.stairs) {
      steps.push({
        num: steps.length + 1,
        title: `Take Stairs to Floor ${to.floorId}`,
        desc: `Climb stairs from ${from.name} on Floor ${from.floorId} to ${to.name} on Floor ${to.floorId} (${edge.distance}m vertical transit).`,
        icon: 'stairs',
        floor: isFloorTransition
          ? `Floor ${from.floorId} → Floor ${to.floorId}`
          : `Floor ${to.floorId}`,
        floorId: to.floorId,
      });

      // If stairs landing is the final destination, append arrival step
      if (isFinalEdge && to.id === destNodeId) {
        steps.push({
          num: steps.length + 1,
          title: `Arrive at ${to.name}`,
          desc: `You have reached ${to.name} on Floor ${to.floorId}.`,
          icon: 'check_circle',
          floor: `Floor ${to.floorId}`,
          floorId: to.floorId,
        });
      }
    } else if (isFinalEdge) {
      // Final step: arrival at destination
      let desc = `Proceed ${edge.distance}m from ${from.name} to reach ${to.name}.`;
      if (to.type === 'ROOM') {
        desc = `Walk ${edge.distance}m from ${from.name} and enter ${to.name}.`;
      } else if (to.type === 'ENTRANCE') {
        desc = `Walk ${edge.distance}m from ${from.name} to reach ${to.name}.`;
      }

      steps.push({
        num: steps.length + 1,
        title: `Arrive at ${to.name}`,
        desc,
        icon: 'check_circle',
        floor: `Floor ${to.floorId}`,
        floorId: to.floorId,
      });
    } else {
      // Intermediate navigation step
      let title = `Walk to ${to.name}`;
      let desc = `Proceed ${edge.distance}m from ${from.name} to ${to.name}.`;

      if (to.type === 'JUNCTION') {
        title = `Proceed to ${to.name}`;
        desc = `Walk ${edge.distance}m from ${from.name} to the corridor intersection at ${to.name}.`;
      } else if (to.type === 'LIFT') {
        title = `Proceed to ${to.name}`;
        desc = `Walk ${edge.distance}m from ${from.name} to the elevator lobby at ${to.name}.`;
      } else if (to.type === 'STAIRS') {
        title = `Proceed to ${to.name}`;
        desc = `Walk ${edge.distance}m from ${from.name} to the stairs landing at ${to.name}.`;
      } else if (to.type === 'ROOM') {
        title = `Walk to ${to.name}`;
        desc = `Walk ${edge.distance}m from ${from.name} towards ${to.name}.`;
      }

      steps.push({
        num: steps.length + 1,
        title,
        desc,
        icon: 'straight',
        floor: `Floor ${to.floorId}`,
        floorId: to.floorId,
      });
    }
  }

  return steps;
}

/**
 * Adapter that converts a pure Java RouteResult into a FrontendRouteResult
 * with UI presentation fields, steps, and accessibility notes.
 * - Verifies that every consecutive pair of nodes in the path has a corresponding edge.
 * - Handles missing edges safely instead of silently skipping them.
 * - Derives accessibility notes strictly from the actual edges used and their flags.
 */
export function adaptToFrontendRoute(
  backendResult: RouteResult,
  graph: GraphInterface,
  preference: RoutePreference = 'none',
  startNodeId?: number,
  destNodeId?: number
): FrontendRouteResult {
  if (!backendResult.found || backendResult.path.length === 0) {
    return {
      ...backendResult,
      steps: [],
      estimatedMinutes: 0,
      timeFormatted: '0 min',
      accessibilityNote: 'No viable route found for the given criteria.',
      activePreference: preference,
      startNodeId,
      destNodeId,
    };
  }

  // Start is same as dest
  if (backendResult.path.length === 1) {
    const singleNode = backendResult.path[0];
    return {
      ...backendResult,
      steps: [
        {
          num: 1,
          title: 'You are at your destination',
          desc: `You are already at ${singleNode.name} on Floor ${singleNode.floorId}.`,
          icon: 'check_circle',
          floor: `Floor ${singleNode.floorId}`,
          floorId: singleNode.floorId,
        },
      ],
      estimatedMinutes: 0,
      timeFormatted: '< 1 min walk',
      accessibilityNote: 'You have arrived at the selected location.',
      activePreference: preference,
      startNodeId,
      destNodeId,
    };
  }

  // Verify that every consecutive pair of nodes in the path has a corresponding edge
  const edgesInPath: Edge[] = [];
  for (let i = 0; i < backendResult.path.length - 1; i++) {
    const fromNode = backendResult.path[i];
    const toNode = backendResult.path[i + 1];
    const edge = findEdgeBetween(graph, fromNode.id, toNode.id);
    if (!edge) {
      // Handle the inconsistency safely instead of silently skipping it
      return {
        ...backendResult,
        found: false,
        errorMessage: `Graph inconsistency: no connecting edge exists between Node #${fromNode.id} (${fromNode.name}) and Node #${toNode.id} (${toNode.name}).`,
        steps: [],
        estimatedMinutes: 0,
        timeFormatted: '0 min',
        accessibilityNote: 'Unable to compute route directions due to missing edge in path.',
        activePreference: preference,
        startNodeId,
        destNodeId,
      };
    }
    edgesInPath.push(edge);
  }

  const effectiveDestId = destNodeId ?? backendResult.path[backendResult.path.length - 1].id;
  const steps = generateTurnByTurnSteps(backendResult.path, edgesInPath, effectiveDestId);

  const estimatedMin = Math.max(1, Math.round((backendResult.totalDistanceMeters / 60) * 10) / 10);
  const timeFormatted = estimatedMin <= 1 ? '1 min walk' : `${Math.ceil(estimatedMin)} min walk`;

  // Determine accessibility strictly from actual edges used
  const usesStairs = edgesInPath.some((e) => e.stairs);
  const usesLift = edgesInPath.some((e) => e.lift);
  const allEdgesAccessible = edgesInPath.length > 0 && edgesInPath.every((e) => e.accessible);
  const hasInaccessibleEdge = edgesInPath.some((e) => !e.accessible);

  let accessibilityNote = '';
  if (usesStairs) {
    accessibilityNote = 'Route includes stairs (Node #4 ↔ Node #6). Not wheelchair accessible.';
  } else if (hasInaccessibleEdge) {
    accessibilityNote = 'Route contains segments not marked as accessible.';
  } else if (allEdgesAccessible && usesLift) {
    accessibilityNote = 'Step-free elevator accessible route';
  } else if (allEdgesAccessible) {
    accessibilityNote = 'Step-free corridor route (all segments marked accessible)';
  } else {
    accessibilityNote = 'Standard route';
  }

  return {
    ...backendResult,
    steps,
    estimatedMinutes: estimatedMin,
    timeFormatted,
    accessibilityNote,
    activePreference: preference,
    startNodeId,
    destNodeId,
  };
}

/**
 * High-level routing function combining calculateBackendRoute and adaptToFrontendRoute.
 */
export function calculateRoute(
  graph: GraphInterface,
  startNodeId: number,
  destNodeId: number,
  preference: RoutePreference = 'none'
): FrontendRouteResult {
  const backendResult = calculateBackendRoute(graph, startNodeId, destNodeId, preference);
  return adaptToFrontendRoute(backendResult, graph, preference, startNodeId, destNodeId);
}
