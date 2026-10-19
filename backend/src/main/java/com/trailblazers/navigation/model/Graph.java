package com.trailblazers.navigation.model;

import java.util.*;

public class Graph {
    private final Map<Long, Node> nodes = new HashMap<>();
    private final Map<Long, List<Edge>> adjacencyList = new HashMap<>();

    public void addNode(Node node) {
        nodes.put(node.getId(), node);
        adjacencyList.putIfAbsent(node.getId(), new ArrayList<>());
    }

    public void addUndirectedEdge(Edge edge) {
        adjacencyList.computeIfAbsent(edge.getFromNodeId(), k -> new ArrayList<>()).add(edge);

        // Reverse edge for bi-directional movement
        Edge reverseEdge = new Edge(
                edge.getId(),
                edge.getToNodeId(),
                edge.getFromNodeId(),
                edge.getDistance(),
                edge.isStairs(),
                edge.isLift(),
                edge.isAccessible()
        );
        adjacencyList.computeIfAbsent(edge.getToNodeId(), k -> new ArrayList<>()).add(reverseEdge);
    }

    public Node getNode(Long id) {
        return nodes.get(id);
    }

    public List<Edge> getNeighbors(Long nodeId) {
        return adjacencyList.getOrDefault(nodeId, Collections.emptyList());
    }

    public boolean containsNode(Long id) {
        return nodes.containsKey(id);
    }
}