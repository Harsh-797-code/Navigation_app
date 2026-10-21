package com.trailblazers.navigation.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "edges", schema = "public")
public class EdgeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_node_id")
    private Long fromNodeId;

    @Column(name = "to_node_id")
    private Long toNodeId;

    private double distance;

    @Column(name = "is_stairs")
    private boolean isStairs;

    @Column(name = "is_lift")
    private boolean isLift;

    @Column(name = "is_accessible")
    private boolean isAccessible;

    public EdgeEntity() {}

    // Getters
    public Long getId() { return id; }
    public Long getFromNodeId() { return fromNodeId; }
    public Long getToNodeId() { return toNodeId; }
    public double getDistance() { return distance; }
    public boolean isStairs() { return isStairs; }
    public boolean isLift() { return isLift; }
    public boolean isAccessible() { return isAccessible; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setFromNodeId(Long fromNodeId) { this.fromNodeId = fromNodeId; }
    public void setToNodeId(Long toNodeId) { this.toNodeId = toNodeId; }
    public void setDistance(double distance) { this.distance = distance; }
    public void setStairs(boolean stairs) { isStairs = stairs; }
    public void setLift(boolean lift) { isLift = lift; }
    public void setAccessible(boolean accessible) { isAccessible = accessible; }
}