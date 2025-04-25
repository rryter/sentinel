```mermaid
graph TD
    Root["/"] --> Linting["/linting"]
    Root --> Projects["/projects"]
    Root --> Builds["/builds"]
    Root --> Settings["/settings"]
    Root --> GitHubCallback["/auth/github/callback"]

    %% Add styling
    style Root fill:#f9f,stroke:#333,stroke-width:2px
    style Linting fill:#bbf,stroke:#333,stroke-width:2px
    style Projects fill:#bbf,stroke:#333,stroke-width:2px
    style Builds fill:#bbf,stroke:#333,stroke-width:2px
    style Settings fill:#bbf,stroke:#333,stroke-width:2px
    style GitHubCallback fill:#fbb,stroke:#333,stroke-width:2px

    %% Add descriptions
    classDef default fill:#ddd,stroke:#fff,stroke-width:2px;

    %% Add notes
    subgraph Note
        direction LR
        DefaultRoute["Default route redirects to /linting"]
        LazyLoaded["All routes except GitHub callback are lazy loaded"]
    end
```

# Navigation Structure

This diagram shows the main navigation structure of the Sentinel application. Here are the key points:

1. Root Route (`/`)

   - Redirects to `/linting` by default

2. Main Routes:

   - `/linting` - Lazy loaded from @sentinel/linting
   - `/projects` - Lazy loaded from @sentinel/projects
   - `/builds` - Lazy loaded from @sentinel/build
   - `/settings` - Lazy loaded from @sentinel/settings

3. Authentication:
   - `/auth/github/callback` - Handles GitHub OAuth callback

Note: All main feature routes (linting, projects, builds, settings) are lazy loaded for better initial load performance.
