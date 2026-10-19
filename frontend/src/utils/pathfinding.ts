import { EDGES, MAP_NODES, FLOOR_LABELS } from '../data/hospitalGraph';
import { Edge, Floor, MapNode, NavigationStep, RouteResult } from '../types/navigation';

interface AdjacencyItem {
  targetId: string;
  edge: Edge;
}

// Build bidirectional graph representation
function buildAdjacencyList(accessibleOnly: boolean): Map<string, AdjacencyItem[]> {
  const adj = new Map<string, AdjacencyItem[]>();

  Object.keys(MAP_NODES).forEach((id) => adj.set(id, []));

  EDGES.forEach((edge) => {
    // If step-free is active: strictly avoid all stairs
    if (accessibleOnly && edge.type === 'stairs') {
      return;
    }

    // Bidirectional edges
    adj.get(edge.from)?.push({ targetId: edge.to, edge });
    adj.get(edge.to)?.push({ targetId: edge.from, edge });
  });

  return adj;
}

// Dijkstra / BFS shortest path algorithm
export function calculateRoute(
  startId: string,
  targetId: string,
  accessibleOnly: boolean = true
): RouteResult | null {
  const startNode = MAP_NODES[startId];
  const targetNode = MAP_NODES[targetId];

  if (!startNode || !targetNode) return null;

  if (startId === targetId) {
    const singleStep: NavigationStep = {
      stepIndex: 1,
      totalSteps: 1,
      floor: startNode.floor,
      floorLabel: FLOOR_LABELS[startNode.floor].name,
      title: `You are already at ${targetNode.label}`,
      instruction: `Current location matches chosen destination.`,
      icon: 'check_circle',
      fromNodeId: startId,
      toNodeId: targetId,
      distanceMeters: 0,
      pathPoints: [[startNode.x, startNode.y]]
    };

    return {
      pathNodeIds: [startId],
      nodes: [startNode],
      steps: [singleStep],
      totalDistanceMeters: 0,
      estimatedMinutes: 0,
      floorsTraversed: [startNode.floor],
      isStepFree: true,
      hasStairs: false,
      hasElevator: false,
      hasRamp: false
    };
  }

  const adj = buildAdjacencyList(accessibleOnly);

  // Dijkstra data structures
  const distances = new Map<string, number>();
  const previous = new Map<string, { prevId: string; edge: Edge } | null>();
  const unvisited = new Set<string>();

  Object.keys(MAP_NODES).forEach((id) => {
    distances.set(id, Infinity);
    previous.set(id, null);
    unvisited.add(id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with lowest distance
    let currentId: string | null = null;
    let lowestDist = Infinity;

    unvisited.forEach((id) => {
      const dist = distances.get(id)!;
      if (dist < lowestDist) {
        lowestDist = dist;
        currentId = id;
      }
    });

    if (currentId === null || lowestDist === Infinity) {
      break; // Unreachable
    }

    if (currentId === targetId) {
      break; // Found shortest path to target
    }

    unvisited.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const { targetId: neighborId, edge } of neighbors) {
      if (!unvisited.has(neighborId)) continue;

      let edgeWeight = edge.distance;
      // When step-free is active, give ramps and elevators an extra favorable weight
      if (accessibleOnly) {
        if (edge.type === 'ramp') {
          edgeWeight = Math.max(1, edgeWeight * 0.8);
        }
      }

      const alt = lowestDist + edgeWeight;
      if (alt < distances.get(neighborId)!) {
        distances.set(neighborId, alt);
        previous.set(neighborId, { prevId: currentId, edge });
      }
    }
  }

  // Reconstruct path
  const pathNodes: MapNode[] = [];
  const edgesUsed: Edge[] = [];
  let curr: string | null = targetId;

  if (distances.get(targetId) === Infinity) {
    // Fallback if reachable without step-free constraint
    if (accessibleOnly) {
      return calculateRoute(startId, targetId, false);
    }
    return null;
  }

  while (curr !== null) {
    const node = MAP_NODES[curr];
    if (node) pathNodes.unshift(node);
    const prevInfo = previous.get(curr);
    if (prevInfo) {
      edgesUsed.unshift(prevInfo.edge);
      curr = prevInfo.prevId;
    } else {
      curr = null;
    }
  }

  // Calculate total distance & floors
  const totalDistanceMeters = edgesUsed.reduce((acc, e) => acc + e.distance, 0);
  const floorsTraversedSet = new Set<Floor>();
  pathNodes.forEach((n) => floorsTraversedSet.add(n.floor));
  const floorsTraversed = Array.from(floorsTraversedSet);

  const hasStairs = edgesUsed.some((e) => e.type === 'stairs');
  const hasElevator = edgesUsed.some((e) => e.type === 'elevator');
  const hasRamp = edgesUsed.some((e) => e.type === 'ramp');
  const isStepFree = !hasStairs;

  // Time estimate: ~1.1 meters/sec walking (65m/min) + 1.2 min per elevator transfer
  const verticalTransfers = edgesUsed.filter((e) => e.type === 'elevator' || e.type === 'stairs').length;
  const walkMinutes = totalDistanceMeters / 50;
  const estimatedMinutes = Math.max(1, Math.round((walkMinutes + verticalTransfers * 1) * 2) / 2);

  // Generate turn-by-turn navigation steps
  const steps: NavigationStep[] = [];

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromNode = pathNodes[i];
    const toNode = pathNodes[i + 1];
    const edge = edgesUsed[i];

    const isTransition = fromNode.floor !== toNode.floor;
    let icon = 'straight';
    let title = '';
    let instruction = '';

    if (isTransition) {
      const targetFloorLabel = FLOOR_LABELS[toNode.floor].name;
      if (edge.type === 'elevator') {
        icon = 'elevator';
        title = `Take Central Elevator to ${targetFloorLabel}`;
        instruction = `Enter Elevator A or B (100% Step-free). Press button for ${targetFloorLabel} and exit into the concourse.`;
      } else {
        icon = 'stairs';
        title = `Take Central Stairs to ${targetFloorLabel}`;
        instruction = `Take Central Stairs up/down to the ${targetFloorLabel} concourse.`;
      }
    } else if (edge.type === 'ramp') {
      icon = 'accessible';
      title = `Follow Step-free Accessible Ramp`;
      instruction = edge.description || `Follow the gentle step-free ramp toward ${toNode.label}.`;
    } else if (i === 0) {
      icon = 'location_on';
      title = `Start at ${fromNode.label}`;
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const dirText = getDirectionText(dx, dy);
      instruction = `Head ${dirText} along the concourse toward ${toNode.label}.`;
    } else if (i === pathNodes.length - 2) {
      icon = 'check_circle';
      title = `Arrive at ${toNode.label}`;
      instruction = `Your destination ${toNode.label} will be immediately on your side.`;
    } else {
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const dirText = getDirectionText(dx, dy);
      icon = getIconForDirection(dx, dy);
      title = `Walk ${dirText} along hallway`;
      instruction = `Follow the illuminated blue line ${dirText} passing ${toNode.label} (${edge.distance}m).`;
    }

    steps.push({
      stepIndex: i + 1,
      totalSteps: pathNodes.length - 1,
      floor: fromNode.floor,
      floorLabel: FLOOR_LABELS[fromNode.floor].name,
      title,
      instruction,
      icon,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      distanceMeters: edge.distance,
      isFloorTransition: isTransition,
      transitionType: isTransition ? (edge.type as 'elevator' | 'stairs') : edge.type === 'ramp' ? 'ramp' : undefined,
      pathPoints: [
        [fromNode.x, fromNode.y],
        [toNode.x, toNode.y]
      ]
    });
  }

  // Update totalSteps count on all steps
  steps.forEach((s) => {
    s.totalSteps = steps.length;
  });

  return {
    pathNodeIds: pathNodes.map((n) => n.id),
    nodes: pathNodes,
    steps,
    totalDistanceMeters,
    estimatedMinutes,
    floorsTraversed,
    isStepFree,
    hasStairs,
    hasElevator,
    hasRamp
  };
}

function getDirectionText(dx: number, dy: number): string {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'East' : 'West';
  } else {
    return dy > 0 ? 'South' : 'North';
  }
}

function getIconForDirection(dx: number, dy: number): string {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'turn_right' : 'turn_left';
  } else {
    return dy > 0 ? 'straight' : 'straight';
  }
}
