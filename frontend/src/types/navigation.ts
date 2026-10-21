/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backend Schema Alignment: Harshitha's Java Models
 * - Node.java (id: Long, floorId: Long, x: double, y: double, type: NodeType, name: String)
 * - NodeType.java (ENTRANCE, CORRIDOR, JUNCTION, ROOM, STAIRS, LIFT, EMERGENCY_EXIT, WASHROOM)
 * - Edge.java (id: Long, fromNodeId: Long, toNodeId: Long, distance: double, stairs: boolean, lift: boolean, accessible: boolean)
 * - Graph.java (Stores nodes in map using node IDs, adjacency list, addUndirectedEdge, getNode, getNeighbors, containsNode)
 * - RouteResult.java (found: boolean, totalDistanceMeters: double, path: List<Node>, errorMessage: String)
 */

export type NodeType =
  | 'ENTRANCE'
  | 'CORRIDOR'
  | 'JUNCTION'
  | 'ROOM'
  | 'STAIRS'
  | 'LIFT'
  | 'EMERGENCY_EXIT'
  | 'WASHROOM';

/**
 * Compatible with Harshitha's Node.java
 */
export interface Node {
  id: number; // Long in Java
  floorId: number; // Long in Java (1 = Floor 1, 2 = Floor 2)
  x: number; // double
  y: number; // double
  type: NodeType;
  name: string; // String
}

export type HospitalNode = Node;

/**
 * Compatible with Harshitha's Edge.java
 */
export interface Edge {
  id: number; // Long in Java
  fromNodeId: number; // Long in Java
  toNodeId: number; // Long in Java
  distance: number; // double in metres
  stairs: boolean; // boolean
  lift: boolean; // boolean
  accessible: boolean; // boolean
}

/**
 * Compatible with Harshitha's Graph.java
 */
export interface GraphInterface {
  getNode(id: number): Node | undefined;
  getNeighbors(id: number): { neighborId: number; edge: Edge }[];
  containsNode(id: number): boolean;
  addNode(node: Node): void;
  addUndirectedEdge(edge: Edge): void;
  getAllNodes(): Node[];
  getAllEdges(): Edge[];
}

export type RoutePreference = 'none' | 'avoid-stairs' | 'accessible';

export type FloorKey = 'floor1' | 'floor2';

export type DestinationKey = 'room101' | 'lab204' | 'lift1' | 'lift2';

export interface RouteStep {
  num: number;
  title: string;
  desc: string;
  icon: string;
  floor: string;
  floorId: number;
}

/**
 * Exact representation of Harshitha's RouteResult.java backend response.
 */
export interface RouteResult {
  found: boolean;
  totalDistanceMeters: number;
  path: Node[];
  errorMessage?: string | null;
}

/**
 * Frontend presentation adapter extending RouteResult with UI-only helpers.
 * Keeps the pure Java backend response model clean while fulfilling UI requirements.
 */
export interface FrontendRouteResult extends RouteResult {
  steps: RouteStep[];
  estimatedMinutes?: number;
  timeFormatted?: string;
  accessibilityNote?: string;
  activePreference?: RoutePreference;
  startNodeId?: number;
  destNodeId?: number;
}

export interface DestinationPreset {
  key: DestinationKey;
  name: string;
  nodeId: number;
  floorKey: FloorKey;
  floorId: number;
  floorLabel: string;
  roomName: string;
  subtitle: string;
  badge: string;
  icon: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    activeRing: string;
  };
}
