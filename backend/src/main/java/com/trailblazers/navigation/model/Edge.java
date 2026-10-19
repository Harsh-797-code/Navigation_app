package com.trailblazers.navigation.model;

public class Edge {
    private final Long id;
    private final Long fromNodeId;
    private final Long toNodeId;
    private final double distance; // meters
    private final boolean stairs;
    private final boolean lift;
    private final boolean accessible;

    public Edge(Long id, Long fromNodeId, Long toNodeId, double distance, boolean stairs, boolean lift, boolean accessible) {
        this.id = id;
        this.fromNodeId = fromNodeId;
        this.toNodeId = toNodeId;
        this.distance = distance;
        this.stairs = stairs;
        this.lift = lift;
        this.accessible = accessible;
    }

    public Long getId() { return id; }
    public Long getFromNodeId() { return fromNodeId; }
    public Long getToNodeId() { return toNodeId; }
    public double getDistance() { return distance; }
    public boolean isStairs() { return stairs; }
    public boolean isLift() { return lift; }
    public boolean isAccessible() { return accessible; }
}
