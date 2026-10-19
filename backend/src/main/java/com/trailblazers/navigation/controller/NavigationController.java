package com.trailblazers.navigation.controller;

import com.trailblazers.navigation.dto.RouteRequest;
import com.trailblazers.navigation.dto.RouteResponse;
import com.trailblazers.navigation.service.NavigationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/navigation")
@CrossOrigin(origins = "*") // Allows React frontend to call this endpoint without CORS issues
public class NavigationController {

    private final NavigationService navigationService;

    public NavigationController(NavigationService navigationService) {
        this.navigationService = navigationService;
    }

    @PostMapping("/route")
    public RouteResponse getRoute(@RequestBody RouteRequest request) {
        return navigationService.calculateRoute(request);
    }
}