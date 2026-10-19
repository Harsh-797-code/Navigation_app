package com.trailblazers.navigation.model;

import java.util.List;

public class RouteResult {
    private final boolean found;
    private final double totalDistanceMeters;
    private final List<Node> path;
    private final String errorMessage;

    public RouteResult(boolean found, double totalDistanceMeters, List<Node> path, String errorMessage) {
        this.found = found;
        this.totalDistanceMeters = totalDistanceMeters;
        this.path = path;
        this.errorMessage = errorMessage;
    }

    public static RouteResult success(double totalDistance, List<Node> path) {
        return new RouteResult(true, totalDistance, path, null);
    }

    public static RouteResult failure(String errorMessage) {
        return new RouteResult(false, 0.0, List.of(), errorMessage);
    }

    public boolean isFound() { return found; }
    public double getTotalDistanceMeters() { return totalDistanceMeters; }
    public List<Node> getPath() { return path; }
    public String getErrorMessage() { return errorMessage; }
}
