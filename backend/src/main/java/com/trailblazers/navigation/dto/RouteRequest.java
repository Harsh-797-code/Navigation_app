package com.trailblazers.navigation.dto;

public class RouteRequest {
    private Long startNodeId;
    private Long destinationNodeId;
    private RoutePreferences preferences;

    public Long getStartNodeId() { return startNodeId; }
    public void setStartNodeId(Long startNodeId) { this.startNodeId = startNodeId; }

    public Long getDestinationNodeId() { return destinationNodeId; }
    public void setDestinationNodeId(Long destinationNodeId) { this.destinationNodeId = destinationNodeId; }

    public RoutePreferences getPreferences() { return preferences; }
    public void setPreferences(RoutePreferences preferences) { this.preferences = preferences; }
}
