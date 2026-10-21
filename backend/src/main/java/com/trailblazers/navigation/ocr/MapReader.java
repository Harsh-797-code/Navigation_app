package com.trailblazers.navigation.ocr;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;

/**
 * Converts a floor-plan image into the maps.json format used by the OCR
 * pipeline. It can be called directly from a backend through readFloorPlan
 * and toDbFormat, or from the command line.
 *
 * Requirements:
 *   - Java 15 or newer (the source uses text blocks)
 *   - GEMINI_API_KEY environment variable
 *
 * Example:
 *   javac ocr_ai/MapReader.java
 *   java -cp ocr_ai MapReader ocr_ai/map_img/FF.jpg --floor-id 1
 *       --meters-per-pixel 0.05
 */
public final class MapReader {
    private static final String DEFAULT_MODEL = "gemini-3.1-flash-lite";
    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String PROMPT = """
            Analyze the uploaded floor-plan image and return a navigation graph for exactly
            this floor. Use the response schema exactly; return no Markdown or explanatory
            text.

            Create one node in `rooms` for every:
            - labeled room, office, department or reception;
            - washroom;
            - entrance, and emergency exit if marked;
            - corridor junction (where corridors meet) or meaningful corridor endpoint;
            - staircase or lift/elevator.

            For each node:
            - `id` must be a unique, stable, human-readable identifier using lowercase
              letters, numbers, and underscores only (for example `main_entrance` or
              `corridor_junction_1`);
            - `name` must be the visible label, or a concise descriptive name when the
              feature is unlabeled;
            - `type` must be one of `entrance`, `corridor`, `junction`, `room`, `stairs`,
              `lift`, `emergency_exit`, or `washroom`. Use `junction` for a point where
              corridors meet and `corridor` for a plain corridor point;
            - `box_2d` must be the bounding box of that feature as
              [ymin, xmin, ymax, xmax], four integers from 0 to 1000, normalized to the
              image: (0, 0) is the top-left corner and (1000, 1000) is the bottom-right
              corner. The box must match where the feature actually is on the plan, so
              different nodes must have different boxes. For a corridor junction or
              endpoint, use a small box around that point.

            Create an edge in `edges` only when two nodes are directly connected by a
            walkable corridor, doorway, or an obvious direct connection. Do not connect
            rooms merely because they are close together, and do not skip corridor
            junctions when they are needed to represent the route. Every `from_id` and
            `to_id` must exactly match an existing node `id`; do not create duplicate or
            self-loop edges. Treat connections as bidirectional by including only one edge
            for each pair.
            """;

    private MapReader() {
    }

    public enum NodeType {
        ENTRANCE, CORRIDOR, JUNCTION, ROOM, STAIRS, LIFT, EMERGENCY_EXIT, WASHROOM;

        static NodeType parse(String value) {
            try {
                return valueOf(value.toUpperCase());
            } catch (Exception exception) {
                throw new IllegalArgumentException("Unknown node type: " + value, exception);
            }
        }
    }

    public static final class AiNode {
        public final String id;
        public final String name;
        public final NodeType type;
        public final List<Integer> box2d;

        public AiNode(String id, String name, NodeType type, List<Integer> box2d) {
            this.id = id;
            this.name = name;
            this.type = type;
            this.box2d = Collections.unmodifiableList(new ArrayList<>(box2d));
        }
    }

    public static final class AiEdge {
        public final String fromId;
        public final String toId;

        public AiEdge(String fromId, String toId) {
            this.fromId = fromId;
            this.toId = toId;
        }
    }

    public static final class FloorPlan {
        public final List<AiNode> rooms;
        public final List<AiEdge> edges;

        public FloorPlan(List<AiNode> rooms, List<AiEdge> edges) {
            this.rooms = Collections.unmodifiableList(new ArrayList<>(rooms));
            this.edges = Collections.unmodifiableList(new ArrayList<>(edges));
        }
    }

    public static final class ConversionResult {
        public final Map<String, Object> data;
        public final List<String> warnings;

        private ConversionResult(Map<String, Object> data, List<String> warnings) {
            this.data = data;
            this.warnings = Collections.unmodifiableList(new ArrayList<>(warnings));
        }
    }

    /**
     * Calls Gemini and returns its validated floor-plan representation.
     */
    public static FloorPlan readFloorPlan(Path imagePath, String model)
            throws IOException, InterruptedException {
        String apiKey = apiKey(imagePath);
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY environment variable or .env entry is required");
        }

        String mimeType = Files.probeContentType(imagePath);
        if (mimeType == null || !mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
        }
        String imageBase64 = java.util.Base64.getEncoder().encodeToString(Files.readAllBytes(imagePath));

        Map<String, Object> imagePart = mapOf(
                "inline_data", mapOf("mime_type", mimeType, "data", imageBase64));
        Map<String, Object> textPart = mapOf("text", PROMPT);
        Map<String, Object> requestBody = mapOf(
                "contents", listOf(mapOf("parts", listOf(imagePart, textPart))),
                "generationConfig", mapOf(
                        "responseMimeType", "application/json",
                        "responseSchema", responseSchema(),
                        "temperature", 0));

        URI endpoint = URI.create(API_URL + encodePath(model) + ":generateContent?key=" + apiKey);
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(Json.write(requestBody)))
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() / 100 != 2) {
            throw new IOException("Gemini request failed (" + response.statusCode() + "): "
                    + response.body());
        }

        Object responseJson = Json.parse(response.body());
        String generatedJson = Json.asString(Json.objectPath(responseJson,
                "candidates", 0, "content", "parts", 0, "text"));
        if (generatedJson == null || generatedJson.isBlank()) {
            throw new IOException("Gemini returned no parsable result: " + response.body());
        }
        return parseFloorPlan(Json.parse(generatedJson));
    }

    /**
     * Converts Gemini coordinates into database-ready maps.json data.
     */
    public static ConversionResult toDbFormat(FloorPlan plan, int floorId, int imageWidth,
                                              int imageHeight, double metersPerPixel) {
        List<String> warnings = new ArrayList<>();
        Map<String, Map<String, Object>> nodes = new LinkedHashMap<>();
        for (AiNode node : plan.rooms) {
            if (nodes.containsKey(node.id)) {
                warnings.add("duplicate node id '" + node.id + "' skipped");
                continue;
            }
            if (node.box2d.size() != 4) {
                warnings.add("node '" + node.id + "' skipped: box_2d must have 4 numbers, got "
                        + node.box2d);
                continue;
            }
            boolean outside = false;
            for (int value : node.box2d) {
                outside |= value < 0 || value > 1000;
            }
            if (outside) {
                warnings.add("node '" + node.id + "': box_2d " + node.box2d
                        + " is outside 0-1000, clamped");
            }

            double x = (node.box2d.get(1) + node.box2d.get(3)) / 2.0 / 10.0;
            double y = (node.box2d.get(0) + node.box2d.get(2)) / 2.0 / 10.0;
            Map<String, Object> dbNode = new LinkedHashMap<>();
            dbNode.put("key", node.id);
            dbNode.put("floor_id", floorId);
            dbNode.put("x", round(clamp(x, 0, 100), 2));
            dbNode.put("y", round(clamp(y, 0, 100), 2));
            dbNode.put("type", node.type.name());
            dbNode.put("name", node.name);
            nodes.put(node.id, dbNode);
        }

        List<Map<String, Object>> edges = new ArrayList<>();
        Set<String> seenPairs = new HashSet<>();
        for (AiEdge edge : plan.edges) {
            Map<String, Object> from = nodes.get(edge.fromId);
            Map<String, Object> to = nodes.get(edge.toId);
            if (from == null || to == null) {
                warnings.add("edge " + edge.fromId + "->" + edge.toId
                        + " skipped: unknown node");
                continue;
            }
            if (edge.fromId.equals(edge.toId)) {
                warnings.add("self-loop on '" + edge.fromId + "' skipped");
                continue;
            }
            String pair = edge.fromId.compareTo(edge.toId) < 0
                    ? edge.fromId + "\u0000" + edge.toId
                    : edge.toId + "\u0000" + edge.fromId;
            if (!seenPairs.add(pair)) {
                warnings.add("duplicate edge " + edge.fromId + "<->" + edge.toId + " skipped");
                continue;
            }

            double dx = ((double) from.get("x") - (double) to.get("x")) / 100 * imageWidth;
            double dy = ((double) from.get("y") - (double) to.get("y")) / 100 * imageHeight;
            double distance = round(Math.hypot(dx, dy) * metersPerPixel, 2);
            if (distance <= 0) {
                warnings.add("edge " + edge.fromId + "<->" + edge.toId
                        + " skipped: zero distance");
                continue;
            }
            Map<String, Object> dbEdge = new LinkedHashMap<>();
            dbEdge.put("from_key", edge.fromId);
            dbEdge.put("to_key", edge.toId);
            dbEdge.put("distance", distance);
            dbEdge.put("is_stairs", false);
            dbEdge.put("is_lift", false);
            dbEdge.put("is_accessible", true);
            edges.add(dbEdge);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("floor_id", floorId);
        data.put("nodes", new ArrayList<>(nodes.values()));
        data.put("edges", edges);
        return new ConversionResult(data, warnings);
    }

    public static void checkPositions(List<Map<String, Object>> nodes) {
        if (nodes.size() < 3) {
            return;
        }
        Map<String, Integer> counts = new HashMap<>();
        String mostCommon = null;
        int max = 0;
        for (Map<String, Object> node : nodes) {
            String position = node.get("x") + "," + node.get("y");
            int count = counts.merge(position, 1, Integer::sum);
            if (count > max) {
                max = count;
                mostCommon = position;
            }
        }
        if ((double) max / nodes.size() > 0.3) {
            throw new IllegalArgumentException(max + " of " + nodes.size()
                    + " nodes share the same position (" + mostCommon + "). "
                    + "The model did not locate the features on the image. Nothing was inserted.");
        }
    }

    public static void main(String[] args) {
        try {
            Arguments options = Arguments.parse(args);
            if (options.metersPerPixel <= 0) {
                throw new IllegalArgumentException("--meters-per-pixel must be > 0");
            }
            if (options.insert) {
                System.err.println("WARNING: --insert is not implemented in the source Python "
                        + "pipeline; JSON files will be generated without database changes.");
            }

            BufferedImage image = ImageIO.read(options.image.toFile());
            if (image == null) {
                throw new IOException("Unsupported or unreadable image: " + options.image);
            }
            FloorPlan plan = readFloorPlan(options.image, options.model);
            Path rawPath = rawPath(options.output);
            Files.writeString(rawPath, Json.write(toRawMap(plan)), StandardCharsets.UTF_8);

            ConversionResult result = toDbFormat(plan, options.floorId, image.getWidth(),
                    image.getHeight(), options.metersPerPixel);
            Files.writeString(options.output, Json.write(result.data), StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> nodes = (List<Map<String, Object>>) result.data.get("nodes");
            checkPositions(nodes);
            System.out.println(nodes.size() + " nodes, "
                    + ((List<?>) result.data.get("edges")).size() + " edges -> "
                    + options.output + " (raw: " + rawPath + ")");
            for (String warning : result.warnings) {
                System.out.println("WARNING: " + warning);
            }
        } catch (Exception exception) {
            System.err.println("ERROR: " + exception.getMessage());
            System.exit(1);
        }
    }

    private static Map<String, Object> responseSchema() {
        Map<String, Object> node = mapOf(
                "type", "OBJECT",
                "properties", mapOf(
                        "id", mapOf("type", "STRING"),
                        "name", mapOf("type", "STRING"),
                        "type", mapOf("type", "STRING",
                                "enum", listOf("entrance", "corridor", "junction", "room",
                                        "stairs", "lift", "emergency_exit", "washroom")),
                        "box_2d", mapOf("type", "ARRAY", "items", mapOf("type", "INTEGER"))),
                "required", listOf("id", "name", "type", "box_2d"));
        Map<String, Object> edge = mapOf(
                "type", "OBJECT",
                "properties", mapOf("from_id", mapOf("type", "STRING"),
                        "to_id", mapOf("type", "STRING")),
                "required", listOf("from_id", "to_id"));
        return mapOf("type", "OBJECT",
                "properties", mapOf("rooms", mapOf("type", "ARRAY", "items", node),
                        "edges", mapOf("type", "ARRAY", "items", edge)),
                "required", listOf("rooms", "edges"));
    }

    private static FloorPlan parseFloorPlan(Object value) {
        Map<?, ?> object = Json.asObject(value);
        List<AiNode> rooms = new ArrayList<>();
        for (Object item : Json.asList(object.get("rooms"))) {
            Map<?, ?> node = Json.asObject(item);
            List<Integer> box = new ArrayList<>();
            for (Object number : Json.asList(node.get("box_2d"))) {
                box.add(Json.asInt(number));
            }
            rooms.add(new AiNode(Json.asString(node.get("id")), Json.asString(node.get("name")),
                    NodeType.parse(Json.asString(node.get("type"))), box));
        }
        List<AiEdge> edges = new ArrayList<>();
        for (Object item : Json.asList(object.get("edges"))) {
            Map<?, ?> edge = Json.asObject(item);
            edges.add(new AiEdge(Json.asString(edge.get("from_id")),
                    Json.asString(edge.get("to_id"))));
        }
        return new FloorPlan(rooms, edges);
    }

    private static Map<String, Object> toRawMap(FloorPlan plan) {
        List<Map<String, Object>> rooms = new ArrayList<>();
        for (AiNode node : plan.rooms) {
            rooms.add(mapOf("id", node.id, "name", node.name, "type", node.type.name().toLowerCase(),
                    "box_2d", node.box2d));
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (AiEdge edge : plan.edges) {
            edges.add(mapOf("from_id", edge.fromId, "to_id", edge.toId));
        }
        return mapOf("rooms", rooms, "edges", edges);
    }

    private static Path rawPath(Path output) {
        String filename = output.getFileName().toString();
        int dot = filename.lastIndexOf('.');
        String stem = dot >= 0 ? filename.substring(0, dot) : filename;
        return output.resolveSibling(stem + "_raw.json");
    }

    private static String encodePath(String value) {
        return value.replace(" ", "%20");
    }

    private static String apiKey(Path imagePath) throws IOException {
        String environmentKey = System.getenv("GEMINI_API_KEY");
        if (environmentKey != null && !environmentKey.isBlank()) {
            return environmentKey;
        }
        List<Path> candidates = new ArrayList<>();
        if (imagePath.getParent() != null) {
            candidates.add(imagePath.getParent().resolve(".env"));
            if (imagePath.getParent().getParent() != null) {
                candidates.add(imagePath.getParent().getParent().resolve(".env"));
            }
        }
        candidates.add(Paths.get(".env"));
        for (Path dotenv : candidates) {
            if (!Files.isRegularFile(dotenv)) {
                continue;
            }
            for (String line : Files.readAllLines(dotenv, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (trimmed.startsWith("GEMINI_API_KEY=")) {
                    return trimmed.substring("GEMINI_API_KEY=".length()).trim()
                            .replaceAll("^['\"]|['\"]$", "");
                }
            }
        }
        return null;
    }

    private static double clamp(double value, double min, double max) {
        return Math.min(Math.max(value, min), max);
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    private static <K, V> Map<K, V> mapOf(Object... values) {
        Map<K, V> result = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            result.put((K) values[i], (V) values[i + 1]);
        }
        return result;
    }

    private static <T> List<T> listOf(T... values) {
        List<T> result = new ArrayList<>();
        Collections.addAll(result, values);
        return result;
    }

    private static final class Arguments {
        final Path image;
        final int floorId;
        final double metersPerPixel;
        final String model;
        final Path output;
        final boolean insert;

        private Arguments(Path image, int floorId, double metersPerPixel, String model,
                          Path output, boolean insert) {
            this.image = image;
            this.floorId = floorId;
            this.metersPerPixel = metersPerPixel;
            this.model = model;
            this.output = output;
            this.insert = insert;
        }

        static Arguments parse(String[] args) {
            if (args.length == 0) {
                throw new IllegalArgumentException("Usage: MapReader <image> --floor-id <id> "
                        + "--meters-per-pixel <scale> [--model <model>] [--out <file>] "
                        + "[--insert] [--replace]");
            }
            Path image = Paths.get(args[0]);
            Integer floorId = null;
            Double scale = null;
            String model = DEFAULT_MODEL;
            Path output = Paths.get("maps.json");
            boolean insert = false;
            for (int i = 1; i < args.length; i++) {
                switch (args[i]) {
                    case "--floor-id":
                        floorId = Integer.valueOf(next(args, ++i, "--floor-id"));
                        break;
                    case "--meters-per-pixel":
                        scale = Double.valueOf(next(args, ++i, "--meters-per-pixel"));
                        break;
                    case "--model":
                        model = next(args, ++i, "--model");
                        break;
                    case "--out":
                        output = Paths.get(next(args, ++i, "--out"));
                        break;
                    case "--insert":
                        insert = true;
                        break;
                    case "--replace":
                        insert = true;
                        break;
                    default:
                        throw new IllegalArgumentException("Unknown argument: " + args[i]);
                }
            }
            if (floorId == null || scale == null) {
                throw new IllegalArgumentException("--floor-id and --meters-per-pixel are required");
            }
            return new Arguments(image, floorId, scale, model, output, insert);
        }

        private static String next(String[] args, int index, String option) {
            if (index >= args.length) {
                throw new IllegalArgumentException(option + " requires a value");
            }
            return args[index];
        }
    }

    private static final class Json {
        static Object parse(String text) {
            return new Parser(text).parseValue();
        }

        static String write(Object value) {
            StringBuilder result = new StringBuilder();
            writeValue(value, result, 0);
            return result.append('\n').toString();
        }

        @SuppressWarnings("unchecked")
        static Map<?, ?> asObject(Object value) {
            if (!(value instanceof Map)) {
                throw new IllegalArgumentException("Expected a JSON object");
            }
            return (Map<?, ?>) value;
        }

        @SuppressWarnings("unchecked")
        static List<Object> asList(Object value) {
            if (!(value instanceof List)) {
                throw new IllegalArgumentException("Expected a JSON array");
            }
            return (List<Object>) value;
        }

        static String asString(Object value) {
            if (!(value instanceof String)) {
                throw new IllegalArgumentException("Expected a JSON string");
            }
            return (String) value;
        }

        static int asInt(Object value) {
            if (!(value instanceof Number)) {
                throw new IllegalArgumentException("Expected a JSON number");
            }
            return ((Number) value).intValue();
        }

        static Object objectPath(Object value, Object... path) {
            Object current = value;
            for (Object part : path) {
                if (part instanceof Integer) {
                    current = asList(current).get((Integer) part);
                } else {
                    current = asObject(current).get(part);
                }
            }
            return current;
        }

        private static void writeValue(Object value, StringBuilder out, int indent) {
            if (value == null) {
                out.append("null");
            } else if (value instanceof String) {
                out.append('"').append(escape((String) value)).append('"');
            } else if (value instanceof Boolean || value instanceof Number) {
                out.append(value);
            } else if (value instanceof Map) {
                out.append("{\n");
                int index = 0;
                for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                    indent(out, indent + 2);
                    out.append('"').append(escape(String.valueOf(entry.getKey()))).append("\": ");
                    writeValue(entry.getValue(), out, indent + 2);
                    if (++index < ((Map<?, ?>) value).size()) {
                        out.append(',');
                    }
                    out.append('\n');
                }
                indent(out, indent);
                out.append('}');
            } else if (value instanceof Iterable) {
                out.append("[\n");
                List<Object> values = new ArrayList<>();
                for (Object item : (Iterable<?>) value) {
                    values.add(item);
                }
                for (int i = 0; i < values.size(); i++) {
                    indent(out, indent + 2);
                    writeValue(values.get(i), out, indent + 2);
                    if (i + 1 < values.size()) {
                        out.append(',');
                    }
                    out.append('\n');
                }
                indent(out, indent);
                out.append(']');
            } else {
                throw new IllegalArgumentException("Unsupported JSON value: " + value.getClass());
            }
        }

        private static String escape(String value) {
            return value.replace("\\", "\\\\").replace("\"", "\\\"")
                    .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
        }

        private static void indent(StringBuilder out, int count) {
            for (int i = 0; i < count; i++) {
                out.append(' ');
            }
        }
    }

    private static final class Parser {
        private final String input;
        private int position;

        Parser(String input) {
            this.input = input;
        }

        Object parseValue() {
            whitespace();
            if (position >= input.length()) {
                throw error("Unexpected end of JSON");
            }
            char current = input.charAt(position);
            if (current == '{') {
                return parseObject();
            }
            if (current == '[') {
                return parseArray();
            }
            if (current == '"') {
                return parseString();
            }
            if (input.startsWith("true", position)) {
                position += 4;
                return true;
            }
            if (input.startsWith("false", position)) {
                position += 5;
                return false;
            }
            if (input.startsWith("null", position)) {
                position += 4;
                return null;
            }
            return parseNumber();
        }

        private Map<String, Object> parseObject() {
            Map<String, Object> result = new LinkedHashMap<>();
            position++;
            whitespace();
            if (take('}')) {
                return result;
            }
            while (true) {
                whitespace();
                String key = parseString();
                whitespace();
                expect(':');
                result.put(key, parseValue());
                whitespace();
                if (take('}')) {
                    return result;
                }
                expect(',');
            }
        }

        private List<Object> parseArray() {
            List<Object> result = new ArrayList<>();
            position++;
            whitespace();
            if (take(']')) {
                return result;
            }
            while (true) {
                result.add(parseValue());
                whitespace();
                if (take(']')) {
                    return result;
                }
                expect(',');
            }
        }

        private String parseString() {
            expect('"');
            StringBuilder result = new StringBuilder();
            while (position < input.length()) {
                char current = input.charAt(position++);
                if (current == '"') {
                    return result.toString();
                }
                if (current != '\\') {
                    result.append(current);
                    continue;
                }
                if (position >= input.length()) {
                    throw error("Unterminated string");
                }
                char escaped = input.charAt(position++);
                switch (escaped) {
                    case '"': result.append('"'); break;
                    case '\\': result.append('\\'); break;
                    case '/': result.append('/'); break;
                    case 'b': result.append('\b'); break;
                    case 'f': result.append('\f'); break;
                    case 'n': result.append('\n'); break;
                    case 'r': result.append('\r'); break;
                    case 't': result.append('\t'); break;
                    case 'u':
                        if (position + 4 > input.length()) {
                            throw error("Invalid unicode escape");
                        }
                        result.append((char) Integer.parseInt(input.substring(position, position + 4), 16));
                        position += 4;
                        break;
                    default:
                        throw error("Invalid escape sequence");
                }
            }
            throw error("Unterminated string");
        }

        private Number parseNumber() {
            int start = position;
            while (position < input.length() && "-+0123456789.eE".indexOf(input.charAt(position)) >= 0) {
                position++;
            }
            String value = input.substring(start, position);
            try {
                return value.contains(".") || value.contains("e") || value.contains("E")
                        ? Double.valueOf(value) : Long.valueOf(value);
            } catch (NumberFormatException exception) {
                throw error("Invalid number: " + value);
            }
        }

        private void whitespace() {
            while (position < input.length() && Character.isWhitespace(input.charAt(position))) {
                position++;
            }
        }

        private boolean take(char expected) {
            if (position < input.length() && input.charAt(position) == expected) {
                position++;
                return true;
            }
            return false;
        }

        private void expect(char expected) {
            if (!take(expected)) {
                throw error("Expected '" + expected + "'");
            }
        }

        private IllegalArgumentException error(String message) {
            return new IllegalArgumentException(message + " at position " + position);
        }
    }
}
