package com.trailblazers.navigation.repository;

import com.trailblazers.navigation.model.*;
import org.springframework.stereotype.Repository;

@Repository
public class MockMapRepository {

    public Graph getSampleBuildingGraph() {
        Graph graph = new Graph();

        // Floor 1 Nodes
        Node n1 = new Node(1L, 1L, 100, 200, NodeType.ENTRANCE, "Main Entrance");
        Node n2 = new Node(2L, 1L, 150, 200, NodeType.JUNCTION, "Floor 1 Main Corridor Junction");
        Node n3 = new Node(3L, 1L, 150, 250, NodeType.ROOM, "Room 101");
        Node n4 = new Node(4L, 1L, 150, 150, NodeType.STAIRS, "Floor 1 Stairs");
        Node n5 = new Node(5L, 1L, 200, 200, NodeType.LIFT, "Floor 1 Elevator");

        // Floor 2 Nodes
        Node n6 = new Node(6L, 2L, 150, 150, NodeType.STAIRS, "Floor 2 Stairs");
        Node n7 = new Node(7L, 2L, 200, 200, NodeType.LIFT, "Floor 2 Elevator");
        Node n8 = new Node(8L, 2L, 250, 200, NodeType.JUNCTION, "Floor 2 Corridor Junction");
        Node n9 = new Node(9L, 2L, 300, 200, NodeType.ROOM, "Computer Lab 204");

        graph.addNode(n1); graph.addNode(n2); graph.addNode(n3); graph.addNode(n4); graph.addNode(n5);
        graph.addNode(n6); graph.addNode(n7); graph.addNode(n8); graph.addNode(n9);

        // Floor 1 Edges
        graph.addUndirectedEdge(new Edge(101L, 1L, 2L, 10.0, false, false, true));
        graph.addUndirectedEdge(new Edge(102L, 2L, 3L, 5.0, false, false, true));
        graph.addUndirectedEdge(new Edge(103L, 2L, 4L, 8.0, false, false, true));
        graph.addUndirectedEdge(new Edge(104L, 2L, 5L, 12.0, false, false, true));

        // Inter-floor connections (Stairs & Elevator)
        graph.addUndirectedEdge(new Edge(105L, 4L, 6L, 15.0, true, false, false)); // Stairs (Not accessible)
        graph.addUndirectedEdge(new Edge(106L, 5L, 7L, 15.0, false, true, true));  // Elevator (Accessible)

        // Floor 2 Edges
        graph.addUndirectedEdge(new Edge(107L, 6L, 8L, 8.0, false, false, true));
        graph.addUndirectedEdge(new Edge(108L, 7L, 8L, 5.0, false, false, true));
        graph.addUndirectedEdge(new Edge(109L, 8L, 9L, 15.0, false, false, true));

        return graph;
    }
}
