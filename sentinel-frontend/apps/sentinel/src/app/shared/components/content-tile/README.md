# Content Projection Tile Components

This set of components demonstrates an advanced Angular pattern using **Content Projection** instead of the more common input binding approach.

## Overview

Content projection allows component consumers to inject content into designated spots in your component template. This creates a more flexible, declarative API that fosters component composition.

## Components

### ContentTileComponent

The main container for displaying information in a tile format.

- Only requires minimal inputs: `title`, `iconName`, and optional `iconClass`
- Uses the default content projection slot for the main value
- Uses a named slot for details

### TileDetailComponent

A reusable component for displaying detail items with associated icons.

- Handles the icon selection based on an input property
- Uses content projection for the detail text content

### TileDividerComponent

A simple divider to place between detail items.

### DetailsContainerComponent

A container for organizing detail items.

- Uses the default content projection slot to accept multiple detail components

## Usage Example

```html
<app-content-tile title="Project" iconName="project">
  {{ projectName }}
  <app-details-container details>
    <app-tile-detail icon="lucideFile"> {{ totalFiles }} files </app-tile-detail>
    <app-tile-divider></app-tile-divider>
    <app-tile-detail icon="lucideArrowDown"> ID: {{ projectId }} </app-tile-detail>
  </app-details-container>
</app-content-tile>
```

## Why Content Projection?

### Advantages over Input Properties

1. **More Declarative**: The markup closely resembles the final structure
2. **Easier Component Composition**: Components can be assembled like building blocks
3. **Greater Flexibility**: Consumers can include any content, not just predefined properties
4. **Better Separation of Concerns**: Components focus on structure while content is provided by consumers
5. **Powerful Customization**: Different slot selections enable precise content placement

### Use Cases

Content projection is ideal when:

- Components need to be highly customizable
- You want to create "wrapper" components that manage styling/layout
- Complex nested structures are required
- You want to enable higher levels of component reuse

## Advanced Features

This implementation demonstrates several content projection techniques:

- **Default Content Projection**: Used for the main value
- **Named Slots**: Used for the details section with the `details` selector
- **Composition Pattern**: Multiple detail components can be composed together with dividers

For more information, see the [Angular Content Projection Guide](https://angular.io/guide/content-projection).
