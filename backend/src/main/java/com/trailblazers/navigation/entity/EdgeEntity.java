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

    public Long getId() { return id; }
    public Long getFromNodeId() { return fromNodeId; }
    public Long getToNodeId() { return toNodeId; }
    public double getDistance() { return distance; }
    public boolean isStairs() { return isStairs; }
    public boolean isLift() { return isLift; }
    public boolean isAccessible() { return isAccessible; }
}