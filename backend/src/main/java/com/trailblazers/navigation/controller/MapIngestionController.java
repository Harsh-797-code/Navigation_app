package com.trailblazers.navigation.controller;

import com.trailblazers.navigation.service.MapIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/map")
public class MapIngestionController {

    private final MapIngestionService ingestionService;

    public MapIngestionController(MapIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFloorPlan(
            @RequestParam("file") MultipartFile file,
            @RequestParam("floorId") int floorId,
            @RequestParam(value = "metersPerPixel", defaultValue = "0.05") double metersPerPixel) {

        try {
            // Save temporary image file
            Path tempFile = Files.createTempFile("floorplan_", file.getOriginalFilename());
            file.transferTo(tempFile.toFile());

            // Process image with Gemini and persist to Supabase
            String response = ingestionService.ingestFloorPlan(tempFile, floorId, metersPerPixel);

            // Delete temporary file
            Files.deleteIfExists(tempFile);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error ingesting map: " + e.getMessage());
        }
    }
}
