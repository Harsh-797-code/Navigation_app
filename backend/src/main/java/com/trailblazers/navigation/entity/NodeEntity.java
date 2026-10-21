package com.trailblazers.navigation.entity;

import com.trailblazers.navigation.model.NodeType;
import jakarta.persistence.*;

@Entity
@Table(name = "nodes", schema = "public")
public class NodeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "floor_id")
    private Long floorId;

    private double x;
    private double y;

    @Enumerated(EnumType.STRING)
    private NodeType type;

    private String name;

    // Default Constructor for JPA
    public NodeEntity() {}

    // Getters
    public Long getId() { return id; }
    public Long getFloorId() { return floorId; }
    public double getX() { return x; }
    public double getY() { return y; }
    public NodeType getType() { return type; }
    public String getName() { return name; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setFloorId(Long floorId) { this.floorId = floorId; }
    public void setX(double x) { this.x = x; }
    public void setY(double y) { this.y = y; }
    public void setType(NodeType type) { this.type = type; }
    public void setName(String name) { this.name = name; }
}