package com.trailblazers.navigation.repository;

import com.trailblazers.navigation.entity.NodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpringDataNodeRepository extends JpaRepository<NodeEntity, Long> {
}