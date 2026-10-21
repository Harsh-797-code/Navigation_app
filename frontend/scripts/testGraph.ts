/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Automated Verification Suite for MediPath Routing & Backend Compatibility
 */

import {
  HOSPITAL_GRAPH,
  HOSPITAL_NODES,
  HOSPITAL_EDGES,
  HospitalGraph,
  calculateBackendRoute,
  calculateRoute,
  adaptToFrontendRoute,
  generateTurnByTurnSteps,
  findEdgeBetween,
} from '../src/data/hospitalGraph';
import { RouteResult } from '../src/types/navigation';

console.log('=== MEDIPATH FINAL FOCUSED ROUTING & SCHEMA TEST SUITE ===\n');

let allPassed = true;
function assert(desc: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc} ${detail ? '— ' + detail : ''}`);
    allPassed = false;
  }
}

// -------------------------------------------------------------
// 1. Accessibility Note Verification (No False Elevator Claims)
// -------------------------------------------------------------
console.log('--- 1. Accessibility Note Verification ---');
const n1to3 = calculateRoute(HOSPITAL_GRAPH, 1, 3, 'accessible');
assert('Node 1 to Node 3 with accessible preference is found', n1to3.found === true);
assert(
  'Node 1 to Node 3 does NOT claim elevator accessible',
  !n1to3.accessibilityNote?.includes('elevator')
);
assert(
  'Node 1 to Node 3 correctly reports step-free corridor route',
  n1to3.accessibilityNote === 'Step-free corridor route (all segments marked accessible)'
);

const n1to9None = calculateRoute(HOSPITAL_GRAPH, 1, 9, 'none');
assert(
  'Node 1 to Node 9 (none) accurately notes stairs in use',
  n1to9None.accessibilityNote?.includes('Route includes stairs') === true
);

const n1to9Accessible = calculateRoute(HOSPITAL_GRAPH, 1, 9, 'accessible');
assert(
  'Node 1 to Node 9 (accessible) accurately notes step-free elevator',
  n1to9Accessible.accessibilityNote === 'Step-free elevator accessible route'
);

// -------------------------------------------------------------
// 2. Missing Edge Safety in adaptToFrontendRoute()
// -------------------------------------------------------------
console.log('\n--- 2. Missing Edge Safety Handling ---');
const disconnectedBackendResult: RouteResult = {
  found: true,
  totalDistanceMeters: 50,
  path: [
    HOSPITAL_GRAPH.getNode(1)!,
    HOSPITAL_GRAPH.getNode(9)!, // Node 1 and Node 9 have NO connecting edge!
  ],
  errorMessage: null,
};

const safeAdapterResult = adaptToFrontendRoute(
  disconnectedBackendResult,
  HOSPITAL_GRAPH,
  'none',
  1,
  9
);

assert('Missing edge between adjacent path nodes causes found=false', safeAdapterResult.found === false);
assert(
  'Missing edge provides descriptive error message',
  typeof safeAdapterResult.errorMessage === 'string' &&
    safeAdapterResult.errorMessage.includes('no connecting edge exists')
);
assert('Missing edge returns empty steps array safely', safeAdapterResult.steps.length === 0);

// -------------------------------------------------------------
// 3. Turn-by-Turn Steps Final Step Arrival & Transit Consistency
// -------------------------------------------------------------
console.log('\n--- 3. Turn-by-Turn Steps & Final Arrival Step ---');
// Test route ending directly at an elevator: Node 5 to Node 7
const liftOnlyRoute = calculateRoute(HOSPITAL_GRAPH, 5, 7, 'none');
assert('Lift route from 5 to 7 found is true', liftOnlyRoute.found === true);
const finalLiftStep = liftOnlyRoute.steps[liftOnlyRoute.steps.length - 1];
assert(
  'Final step of elevator destination represents arrival',
  finalLiftStep.title.includes('Arrive at') && finalLiftStep.icon === 'check_circle'
);

// General route final step check (Node 1 to Node 9)
const finalStep1to9 = n1to9Accessible.steps[n1to9Accessible.steps.length - 1];
assert(
  'Final step for Node 1 to Node 9 represents arrival at Computer Lab 204',
  finalStep1to9.title === 'Arrive at Computer Lab 204' && finalStep1to9.icon === 'check_circle'
);

// Verify elevator instruction only on lift edge
const elevatorSteps = n1to9Accessible.steps.filter((s) => s.icon === 'elevator');
assert('Elevator instruction step exists for Edge 106', elevatorSteps.length === 1);
assert('Elevator instruction mentions Floor transition', elevatorSteps[0].floor === 'Floor 1 → Floor 2');

// -------------------------------------------------------------
// 4. Path Reconstruction Verification in calculateBackendRoute()
// -------------------------------------------------------------
console.log('\n--- 4. Path Reconstruction Verification ---');
const reconstructed = calculateBackendRoute(HOSPITAL_GRAPH, 1, 9, 'none');
assert('Path starts at Node 1', reconstructed.path[0].id === 1);
assert('Path ends at Node 9', reconstructed.path[reconstructed.path.length - 1].id === 9);

let allConsecutiveEdgesValid = true;
for (let i = 0; i < reconstructed.path.length - 1; i++) {
  const edge = findEdgeBetween(HOSPITAL_GRAPH, reconstructed.path[i].id, reconstructed.path[i + 1].id);
  if (!edge) allConsecutiveEdgesValid = false;
}
assert('Every consecutive node pair in reconstructed path has a valid graph edge', allConsecutiveEdgesValid);

// -------------------------------------------------------------
// 5. Preservation of Edges 103 & 107
// -------------------------------------------------------------
console.log('\n--- 5. Preservation of Edges 103 and 107 ---');
const edge103 = HOSPITAL_EDGES.find((e) => e.id === 103)!;
assert('Edge 103 fromNodeId is 2', edge103.fromNodeId === 2);
assert('Edge 103 toNodeId is 4', edge103.toNodeId === 4);
assert('Edge 103 distance is 8.0m', edge103.distance === 8.0);
assert('Edge 103 preserves stairs: false', edge103.stairs === false);
assert('Edge 103 preserves accessible: true', edge103.accessible === true);

const edge107 = HOSPITAL_EDGES.find((e) => e.id === 107)!;
assert('Edge 107 fromNodeId is 6', edge107.fromNodeId === 6);
assert('Edge 107 toNodeId is 8', edge107.toNodeId === 8);
assert('Edge 107 distance is 8.0m', edge107.distance === 8.0);
assert('Edge 107 preserves stairs: false', edge107.stairs === false);
assert('Edge 107 preserves accessible: true', edge107.accessible === true);

// -------------------------------------------------------------
// 6. Test the Three Preferences & Required Scenarios
// -------------------------------------------------------------
console.log('\n--- 6. Testing Three Preferences & Scenarios ---');

// 6.1: Node 1 to Node 9 (none)
console.log('\nScenario 6.1: Node 1 to Node 9 (preference: none)');
assert('Found is true', n1to9None.found === true);
assert('Distance is 56.0m (shorter via stairs)', n1to9None.totalDistanceMeters === 56.0);
assert(
  'Path is [1, 2, 4, 6, 8, 9]',
  JSON.stringify(n1to9None.path.map((n) => n.id)) === JSON.stringify([1, 2, 4, 6, 8, 9])
);
console.log('Path:', n1to9None.path.map((n) => `#${n.id} (${n.name})`).join(' -> '));

// 6.2: Node 1 to Node 9 (avoid-stairs)
console.log('\nScenario 6.2: Node 1 to Node 9 (preference: avoid-stairs)');
const n1to9Avoid = calculateRoute(HOSPITAL_GRAPH, 1, 9, 'avoid-stairs');
assert('Found is true', n1to9Avoid.found === true);
assert('Distance is 57.0m (via elevator)', n1to9Avoid.totalDistanceMeters === 57.0);
assert(
  'Path is [1, 2, 5, 7, 8, 9]',
  JSON.stringify(n1to9Avoid.path.map((n) => n.id)) === JSON.stringify([1, 2, 5, 7, 8, 9])
);
assert('Excludes stairs nodes 4 and 6', !n1to9Avoid.path.some((n) => n.id === 4 || n.id === 6));
console.log('Path:', n1to9Avoid.path.map((n) => `#${n.id} (${n.name})`).join(' -> '));

// 6.3: Node 1 to Node 9 (accessible)
console.log('\nScenario 6.3: Node 1 to Node 9 (preference: accessible)');
assert('Found is true', n1to9Accessible.found === true);
assert('Distance is 57.0m', n1to9Accessible.totalDistanceMeters === 57.0);
assert(
  'Path is [1, 2, 5, 7, 8, 9]',
  JSON.stringify(n1to9Accessible.path.map((n) => n.id)) === JSON.stringify([1, 2, 5, 7, 8, 9])
);
console.log('Path:', n1to9Accessible.path.map((n) => `#${n.id} (${n.name})`).join(' -> '));

// 6.4: Node 1 to Node 3
console.log('\nScenario 6.4: Node 1 to Node 3');
assert('Found is true', n1to3.found === true);
assert('Distance is 15.0m', n1to3.totalDistanceMeters === 15.0);
assert('Path is [1, 2, 3]', JSON.stringify(n1to3.path.map((n) => n.id)) === JSON.stringify([1, 2, 3]));
assert('Final step arrives at Room 101', n1to3.steps[n1to3.steps.length - 1].title === 'Arrive at Room 101');
console.log('Path:', n1to3.path.map((n) => `#${n.id} (${n.name})`).join(' -> '));

// 6.5: Invalid Node ID
console.log('\nScenario 6.5: Invalid node ID');
const invalidResult = calculateRoute(HOSPITAL_GRAPH, 1, 999, 'none');
assert('Found is false', invalidResult.found === false);
assert('Distance is 0', invalidResult.totalDistanceMeters === 0);
assert('Path is empty', invalidResult.path.length === 0);
assert('Useful error message returned', typeof invalidResult.errorMessage === 'string' && invalidResult.errorMessage.includes('999'));
console.log('ErrorMessage:', invalidResult.errorMessage);

// 6.6: Start equal to destination
console.log('\nScenario 6.6: Start equal to destination');
const sameNodeResult = calculateRoute(HOSPITAL_GRAPH, 2, 2, 'none');
assert('Found is true', sameNodeResult.found === true);
assert('Distance is 0', sameNodeResult.totalDistanceMeters === 0);
assert('Path has single node [2]', sameNodeResult.path.length === 1 && sameNodeResult.path[0].id === 2);
assert('errorMessage is null', sameNodeResult.errorMessage === null);
assert(
  'Single step with destination arrival',
  sameNodeResult.steps.length === 1 && sameNodeResult.steps[0].title === 'You are at your destination'
);
console.log('Steps:', sameNodeResult.steps[0].title);

console.log('\n======================================================');
if (allPassed) {
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! (100%)');
} else {
  console.error('TEST FAILURES OCCURRED!');
  process.exit(1);
}
