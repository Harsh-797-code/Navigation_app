package com.trailblazers.navigation.dto;

import com.trailblazers.navigation.model.Node;
import java.util.List;

public class RouteResponse {
    private boolean found;
    private double totalDistanceMeters;
    private List<Node> path;
    private String errorMessage;

    public RouteResponse(boolean found, double totalDistanceMeters, List<Node> path, String errorMessage) {
        this.found = found;
        this.totalDistanceMeters = totalDistanceMeters;
        this.path = path;
        this.errorMessage = errorMessage;
    }

    public boolean isFound() { return found; }
    public double getTotalDistanceMeters() { return totalDistanceMeters; }
    public List<Node> getPath() { return path; }
    public String getErrorMessage() { return errorMessage; }
}