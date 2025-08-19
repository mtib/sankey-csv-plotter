# Interactive Sankey Diagram Visualizer

Upload CSV files and explore multi-dimensional data with interactive Sankey diagrams featuring advanced filtering and split-link visualization.

## Features

- **Interactive Sankey Diagrams**: Custom SVG-based visualization with precise control
- **Advanced Filtering**: Click nodes to select, hover to preview - supports AND/OR logic across dimensions
- **Split-Link Visualization**: See exact percentages of filtered data with gold/gray sections
- **Multi-Dimensional Support**: Handle arbitrary number of data dimensions
- **Real-time Updates**: Instant visual feedback on selection changes

## CSV Format

Upload CSV files with format: `<dim1>,<dim2>,...,<dimN>,<count>`

**Example:**
```csv
Region,Product,Category,Brand,Sales
North,Laptop,Electronics,Apple,150
South,Phone,Electronics,Samsung,120
East,Monitor,Electronics,LG,65
```

## Quick Start

```bash
# Build and serve locally
make serve

# Or just build
make build
```

Open `http://localhost:8000` in your browser.

## How to Use

1. **Upload CSV**: Drag and drop or select your data file
2. **Explore**: Hover over nodes to preview filtering effects
3. **Select**: Click nodes to permanently add them to your filter
4. **Analyze**: Watch split-links show exact percentages of matching data
5. **Clear**: Double-click anywhere to reset all selections

## Filtering Logic

- **Same dimension**: OR logic (North OR South)
- **Different dimensions**: AND logic (North AND Apple)
- **Visual feedback**: Gold sections show matching data percentage

## Deployment

Automatically deploys to GitHub Pages on push to `main` branch.

## Built With

- TypeScript + Custom SVG rendering
- Glassmorphism UI design
- GitHub Actions CI/CD