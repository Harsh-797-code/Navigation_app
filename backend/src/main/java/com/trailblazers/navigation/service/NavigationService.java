package com.trailblazers.navigation.service;

import com.trailblazers.navigation.algorithm.DijkstraAlgorithm;
import com.trailblazers.navigation.dto.RouteRequest;
import com.trailblazers.navigation.dto.RouteResponse;
import com.trailblazers.navigation.model.Graph;
import com.trailblazers.navigation.model.RouteResult;
import com.trailblazers.navigation.repository.MockMapRepository;
import org.springframework.stereotype.Service;

@Service
public class NavigationService {

    private final MockMapRepository mockMapRepository;
    private final DijkstraAlgorithm dijkstraAlgorithm;

    public NavigationService(MockMapRepository mockMapRepository) {
        this.mockMapRepository = mockMapRepository;
        this.dijkstraAlgorithm = new DijkstraAlgorithm();
    }

    public RouteResponse calculateRoute(RouteRequest request) {
        Graph graph = mockMapRepository.getSampleBuildingGraph();

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