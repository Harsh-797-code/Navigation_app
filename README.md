# MediPath: Indoor Hospital Navigation

MediPath is an indoor wayfinding application for hospitals. It helps visitors
find departments, rooms, laboratories, lifts, stairs, and other destinations
across multiple floors while supporting accessibility-focused route choices.

The repository contains two applications:

- **Frontend**: a React and Vite single-page application with the MediPath user
  experience, destination search, route preview, step-by-step navigation,
  floor switching, QR checkpoint selection, accessibility preferences, and
  browser sensor tracking.
- **Backend**: a Spring Boot service that stores navigation graphs in
  PostgreSQL/Supabase, calculates routes with Dijkstra's algorithm, and can
  convert uploaded floor-plan images into graph data using the Gemini API.

> **Current integration note:** the frontend currently calculates routes from
> the graph bundled in `frontend/src/data/hospitalGraph.ts`. The backend API is
> available independently for database-backed routing and map ingestion; the
> frontend does not yet call `/api/navigation/route`.

## Features

- Searchable hospital destinations grouped by category and floor
- Route overview followed by a live-navigation view
- Step-by-step directions with distance and estimated travel time
- Route preferences:
  - Standard shortest route
  - Avoid stairs
  - Accessible route only
- Floor-aware routing and lift/stair support
- QR checkpoint and current-location start-point flows
- Font-size accessibility control and multilingual UI selector
- Optional browser-based step and heading tracking
- Backend Dijkstra routing over a persisted node/edge graph
- Gemini-assisted floor-plan graph extraction and ingestion

## Repository structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── components/       # Login and navigation screens
│   │   ├── data/             # Bundled hospital graph and destinations
│   │   ├── services/         # Browser sensor tracking
│   │   └── types/            # Shared frontend graph and route types
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/main/java/
│   │   └── com/trailblazers/navigation/
│   │       ├── algorithm/    # Dijkstra shortest-path implementation
│   │       ├── controller/   # REST endpoints
│   │       ├── entity/       # PostgreSQL/JPA entities
│   │       ├── ocr/          # Gemini floor-plan reader
│   │       └── service/      # Routing and ingestion services
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
└── README.md
```

## Prerequisites

- Node.js 18 or newer and npm
- Java 21
- A PostgreSQL database for the backend
- A Gemini API key only if using floor-plan ingestion

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

Useful frontend commands:

```powershell
npm run build       # Create a production build
npm run preview     # Preview the production build
npm run lint        # Run the TypeScript compiler without emitting files
npx tsx scripts/testGraph.ts
```

The frontend does not require the backend for its bundled demonstration graph.
The login screen is currently a client-side demonstration flow; it does not
authenticate against a server.

## Configure and run the backend

The backend uses Spring Boot and listens on port `8080` by default. Before
starting it, configure the database connection in
`backend/src/main/resources/application.properties` or override the Spring
properties with environment variables/command-line properties.

At minimum, configure:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
GEMINI_API_KEY
```

Do not commit database passwords or API keys. If credentials have ever been
committed to a repository, rotate them before deploying.

Start the backend from the repository root:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Useful backend commands:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
```

The backend expects the following PostgreSQL tables:

- `nodes`: `id`, `floor_id`, `x`, `y`, `type`, `name`
- `edges`: `id`, `from_node_id`, `to_node_id`, `distance`, `is_stairs`,
  `is_lift`, `is_accessible`

`spring.jpa.hibernate.ddl-auto` is set to `none`, so the database schema must
already exist.

## Backend API

### Calculate a route

`POST /api/navigation/route`

Request body:

```json
{
  "startNodeId": 1,
  "destinationNodeId": 9,
  "preferences": {
    "avoidStairs": false,
    "accessibleOnly": true
  }
}
```

Successful response:

```json
{
  "found": true,
  "totalDistanceMeters": 42.5,
  "path": [
    {
      "id": 1,
      "floorId": 1,
      "x": 2.4,
      "y": 3.1,
      "type": "ENTRANCE",
      "name": "Main Entrance"
    }
  ],
  "errorMessage": null
}
```

The route service loads all nodes and edges from PostgreSQL, treats edges as
undirected, and applies `avoidStairs` and `accessibleOnly` constraints during
pathfinding.

Example:

```powershell
curl.exe -X POST http://localhost:8080/api/navigation/route `
  -H "Content-Type: application/json" `
  -d '{\"startNodeId\":1,\"destinationNodeId\":9,\"preferences\":{\"avoidStairs\":false,\"accessibleOnly\":true}}'
```

### Ingest a floor plan

`POST /api/map/upload`

This endpoint accepts a floor-plan image as `file`, a numeric `floorId`, and
an optional `metersPerPixel` value (default `0.05`). Gemini analyzes the image,
the result is converted into nodes and edges, and the graph is persisted to
PostgreSQL.

```powershell
curl.exe -X POST http://localhost:8080/api/map/upload `
  -F "file=@C:\path\to\floor-plan.png" `
  -F "floorId=1" `
  -F "metersPerPixel=0.05"
```

The upload requires a valid `GEMINI_API_KEY` and a database connection. Review
the generated graph before using it for production navigation because image
analysis can require human verification.

## Development notes

- The frontend graph and backend database graph use matching node, edge, and
  route concepts, but they are maintained separately today.
- Frontend route preferences are implemented in
  `frontend/src/data/hospitalGraph.ts`.
- Backend route preferences are implemented in
  `backend/src/main/java/com/trailblazers/navigation/algorithm/DijkstraAlgorithm.java`.
- Browser sensor support depends on device and browser permissions. It is
  intended as a supplemental tracking mechanism, not a replacement for
  verified map data.

## License

Frontend source files include Apache License 2.0 notices where applicable.