package com.trailblazers.navigation.repository;

import com.trailblazers.navigation.entity.EdgeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpringDataEdgeRepository extends JpaRepository<EdgeEntity, Long> {
}