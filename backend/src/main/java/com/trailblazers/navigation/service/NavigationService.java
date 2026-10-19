package com.trailblazers.navigation.service;

import com.trailblazers.navigation.algorithm.DijkstraAlgorithm;
import com.trailblazers.navigation.dto.RouteRequest;
import com.trailblazers.navigation.dto.RouteResponse;
import com.trailblazers.navigation.entity.EdgeEntity;
import com.trailblazers.navigation.entity.NodeEntity;
import com.trailblazers.navigation.model.*;
import com.trailblazers.navigation.repository.SpringDataEdgeRepository;
import com.trailblazers.navigation.repository.SpringDataNodeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NavigationService {

    private final SpringDataNodeRepository nodeRepository;
    private final SpringDataEdgeRepository edgeRepository;
    private final DijkstraAlgorithm dijkstraAlgorithm;

    public NavigationService(SpringDataNodeRepository nodeRepository, SpringDataEdgeRepository edgeRepository) {
        this.nodeRepository = nodeRepository;
        this.edgeRepository = edgeRepository;
        this.dijkstraAlgorithm = new DijkstraAlgorithm();
    }

    public RouteResponse calculateRoute(RouteRequest request) {
        // Fetch real data from Supabase
        List<NodeEntity> nodeEntities = nodeRepository.findAll();
        List<EdgeEntity> edgeEntities = edgeRepository.findAll();

        Graph graph = new Graph();

        // Populate Graph Nodes
        for (NodeEntity ne : nodeEntities) {
            graph.addNode(new Node(ne.getId(), ne.getFloorId(), ne.getX(), ne.getY(), ne.getType(), ne.getName()));
        }

        // Populate Graph Edges
        for (EdgeEntity ee : edgeEntities) {
            graph.addUndirectedEdge(new Edge(
                    ee.getId(),
                    ee.getFromNodeId(),
                    ee.getToNodeId(),
                    ee.getDistance(),
                    ee.isStairs(),
                    ee.isLift(),
                    ee.isAccessible()
            ));
        }

        // Run Dijkstra on real database graph
        RouteResult result = dijkstraAlgorithm.findShortestPath(
                graph,
                request.getStartNodeId(),
                request.getDestinationNodeId(),
                request.getPreferences()
        );

        return new RouteResponse(
                result.isFound(),
                result.getTotalDistanceMeters(),
                result.getPath(),
                result.getErrorMessage()
        );
    }
}