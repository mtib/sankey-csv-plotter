# CSV Data Plotter

A static website template for uploading CSV files and generating interactive data visualizations.

## Features

- **File Upload**: Upload CSV files with drag-and-drop interface
- **Data Visualization**: Generates 3D scatter plots and 2D heatmaps
- **Data Summary**: Shows statistics about your dataset
- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Plots**: Powered by Plotly.js for rich interactions

## CSV Format

The application expects CSV files with the following format:
```
<column1>,<column2>,<column3>,<count>
```

Where:
- `column1`, `column2`, `column3` are dimension names (can be any names)
- `count` is a numeric value representing the count/value for that combination
- Each row should have a unique combination of the three dimensions

### Example CSV:
```csv
Region,Product,Category,Sales
North,Laptop,Electronics,150
South,Phone,Electronics,120
East,Monitor,Electronics,65
```

## Getting Started

### Prerequisites

- Node.js (for TypeScript compilation) or any modern web browser
- A local web server (optional but recommended)

### Building the Project

1. Clone or download this repository
2. Build the TypeScript code:
   ```bash
   make build
   ```

### Running Locally

To serve the project locally:
```bash
make serve
```

This will start a local server at `http://localhost:8000`

### Development

To watch for changes and auto-rebuild:
```bash
make watch
```

### Cleaning

To remove generated files:
```bash
make clean
```

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.ts              # TypeScript source code
├── app.js              # Compiled JavaScript (generated)
├── sample.csv          # Example CSV file
├── Makefile            # Build automation
└── README.md           # This file
```

## Usage

1. Open `index.html` in your web browser
2. Click "Choose CSV File" to upload your data
3. Click "Generate Plot" to create visualizations
4. Interact with the plots (zoom, rotate, hover for details)
5. View data summary statistics below the plots

## Visualizations

The application generates two types of plots:

1. **3D Scatter Plot**: Shows all three dimensions with count represented by marker size and color
2. **2D Heatmap**: Aggregates data showing relationships between the first two dimensions

## Browser Compatibility

- Modern browsers with ES2017 support
- Chrome 58+
- Firefox 55+
- Safari 11+
- Edge 79+

## Dependencies

- [Plotly.js](https://plotly.com/javascript/) - For interactive plotting (loaded via CDN)
- TypeScript compiler (for development)

## Customization

You can customize the visualization by modifying the `generatePlot()` method in `app.ts`:

- Change plot types
- Modify color schemes
- Adjust marker sizes
- Add new chart types

## License

This is a template project - use it however you'd like!