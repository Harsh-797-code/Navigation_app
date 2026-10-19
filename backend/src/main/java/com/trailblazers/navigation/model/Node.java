package com.trailblazers.navigation.model;

import java.util.Objects;

public class Node {
    private final Long id;
    private final Long floorId;
    private final double x;
    private final double y;
    private final NodeType type;
    private final String name;

    public Node(Long id, Long floorId, double x, double y, NodeType type, String name) {
        this.id = id;
        this.floorId = floorId;
        this.x = x;
        this.y = y;
        this.type = type;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getFloorId() { return floorId; }
    public double getX() { return x; }
    public double getY() { return y; }
    public NodeType getType() { return type; }
    public String getName() { return name; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Node node = (Node) o;
        return Objects.equals(id, node.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}