package com.trailblazers.navigation.service;

import com.trailblazers.navigation.entity.EdgeEntity;
import com.trailblazers.navigation.entity.NodeEntity;
import com.trailblazers.navigation.model.NodeType;
import com.trailblazers.navigation.ocr.MapReader;
import com.trailblazers.navigation.repository.SpringDataEdgeRepository;
import com.trailblazers.navigation.repository.SpringDataNodeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MapIngestionService {

    private final SpringDataNodeRepository nodeRepository;
    private final SpringDataEdgeRepository edgeRepository;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    public MapIngestionService(SpringDataNodeRepository nodeRepository, SpringDataEdgeRepository edgeRepository) {
        this.nodeRepository = nodeRepository;
        this.edgeRepository = edgeRepository;
    }

    @Transactional
    public String ingestFloorPlan(Path imagePath, int floorId, double metersPerPixel) throws Exception {
        // Ensure API key environment variable is set for MapReader
        if (!geminiApiKey.isEmpty()) {
            System.setProperty("GEMINI_API_KEY", geminiApiKey);
        }

        // 1. Send floor-plan image to Gemini AI
        MapReader.FloorPlan plan = MapReader.readFloorPlan(imagePath, "gemini-flash-latest");

        // 2. Read image dimensions
        BufferedImage image = ImageIO.read(imagePath.toFile());
        if (image == null) {
            throw new IOException("Failed to load image from path: " + imagePath);
        }

        // 3. Convert normalized coordinates to database format
        MapReader.ConversionResult result = MapReader.toDbFormat(
                plan, floorId, image.getWidth(), image.getHeight(), metersPerPixel
        );

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodeDataList = (List<Map<String, Object>>) result.data.get("nodes");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> edgeDataList = (List<Map<String, Object>>) result.data.get("edges");

        // 4. Validate position sanity
        MapReader.checkPositions(nodeDataList);
// 5. Save Nodes to Supabase
        Map<String, NodeEntity> savedNodes = new HashMap<>();
        for (Map<String, Object> item : nodeDataList) {
            NodeEntity node = new NodeEntity();
            node.setName((String) item.get("name"));
            node.setFloorId(((Number) item.get("floor_id")).longValue());
            node.setX(((Number) item.get("x")).doubleValue());
            node.setY(((Number) item.get("y")).doubleValue());

            String typeStr = (String) item.get("type");
            node.setType(NodeType.valueOf(typeStr.toUpperCase()));

            NodeEntity saved = nodeRepository.save(node);
            savedNodes.put((String) item.get("key"), saved);
        }

// 6. Save Edges to Supabase
        int savedEdgeCount = 0;
        for (Map<String, Object> item : edgeDataList) {
            String fromKey = (String) item.get("from_key");
            String toKey = (String) item.get("to_key");

            NodeEntity fromNode = savedNodes.get(fromKey);
            NodeEntity toNode = savedNodes.get(toKey);

            if (fromNode != null && toNode != null) {
                EdgeEntity edge = new EdgeEntity();
                edge.setFromNodeId(fromNode.getId());
                edge.setToNodeId(toNode.getId());
                edge.setDistance(((Number) item.get("distance")).doubleValue());
                edge.setStairs((Boolean) item.get("is_stairs"));
                edge.setLift((Boolean) item.get("is_lift"));
                edge.setAccessible((Boolean) item.get("is_accessible"));

                edgeRepository.save(edge);
                savedEdgeCount++;
            }
        }

        return "Successfully ingested " + savedNodes.size() + " nodes and " + savedEdgeCount + " edges into Supabase.";
    }
}
