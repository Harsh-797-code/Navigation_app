package com.trailblazers.navigation.algorithm;

import com.trailblazers.navigation.dto.RoutePreferences;
import com.trailblazers.navigation.model.*;

import java.util.*;

public class DijkstraAlgorithm {

    private static class NodeDistancePair implements Comparable<NodeDistancePair> {
        final Long nodeId;
        final double distance;

        NodeDistancePair(Long nodeId, double distance) {
            this.nodeId = nodeId;
            this.distance = distance;
        }

        @Override
        public int compareTo(NodeDistancePair other) {
            return Double.compare(this.distance, other.distance);
        }
    }

    public RouteResult findShortestPath(Graph graph, Long startNodeId, Long destNodeId, RoutePreferences preferences) {
        if (!graph.containsNode(startNodeId)) {
            return RouteResult.failure("Start node ID " + startNodeId + " not found.");
        }
        if (!graph.containsNode(destNodeId)) {
            return RouteResult.failure("Destination node ID " + destNodeId + " not found.");
        }

        if (startNodeId.equals(destNodeId)) {
            return RouteResult.success(0.0, List.of(graph.getNode(startNodeId)));
        }

        Map<Long, Double> distances = new HashMap<>();
        Map<Long, Long> previousNodes = new HashMap<>();
        PriorityQueue<NodeDistancePair> pq = new PriorityQueue<>();
        Set<Long> visited = new HashSet<>();

        distances.put(startNodeId, 0.0);
        pq.add(new NodeDistancePair(startNodeId, 0.0));

        while (!pq.isEmpty()) {
            NodeDistancePair current = pq.poll();
            Long currentId = current.nodeId;

            if (visited.contains(currentId)) continue;
            visited.add(currentId);

            if (currentId.equals(destNodeId)) break;

            for (Edge edge : graph.getNeighbors(currentId)) {
                // Apply constraints based on preferences
                if (preferences != null) {
                    if (preferences.isAvoidStairs() && edge.isStairs()) continue;
                    if (preferences.isAccessibleOnly() && !edge.isAccessible()) continue;
                }

                Long neighborId = edge.getToNodeId();
                if (visited.contains(neighborId)) continue;

                double newDist = distances.get(currentId) + edge.getDistance();

                if (newDist < distances.getOrDefault(neighborId, Double.MAX_VALUE)) {
                    distances.put(neighborId, newDist);
                    previousNodes.put(neighborId, currentId);
                    pq.add(new NodeDistancePair(neighborId, newDist));
                }
            }
        }

        if (!distances.containsKey(destNodeId)) {
            return RouteResult.failure("No valid path found given constraints.");
        }

        // Reconstruct path
        List<Node> path = new LinkedList<>();
        Long curr = destNodeId;
        while (curr != null) {
            path.add(0, graph.getNode(curr));
            curr = previousNodes.get(curr);
        }

        return RouteResult.success(distances.get(destNodeId), path);
    }
}
