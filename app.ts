interface CSVRecord {
    [key: string]: string | number;
    count: number;
}

class CSVPlotter {
    private fileInput: HTMLInputElement;
    private processBtn: HTMLButtonElement;
    private clearBtn: HTMLButtonElement;
    private fileInfo: HTMLElement;
    private fileName: HTMLElement;
    private fileSize: HTMLElement;
    private plotContainer: HTMLElement;
    private dataSummary: HTMLElement;
    private totalRecords: HTMLElement;
    private columnCount: HTMLElement;
    private totalCount: HTMLElement;
    private avgCount: HTMLElement;
    
    private csvData: CSVRecord[] = [];
    private headers: string[] = [];

    constructor() {
        this.initializeElements();
        this.attachEventListeners();
    }

    private initializeElements(): void {
        this.fileInput = document.getElementById('csvFile') as HTMLInputElement;
        this.processBtn = document.getElementById('processBtn') as HTMLButtonElement;
        this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
        this.fileInfo = document.getElementById('fileInfo') as HTMLElement;
        this.fileName = document.getElementById('fileName') as HTMLElement;
        this.fileSize = document.getElementById('fileSize') as HTMLElement;
        this.plotContainer = document.getElementById('plotContainer') as HTMLElement;
        this.dataSummary = document.getElementById('dataSummary') as HTMLElement;
        this.totalRecords = document.getElementById('totalRecords') as HTMLElement;
        this.columnCount = document.getElementById('columnCount') as HTMLElement;
        this.totalCount = document.getElementById('totalCount') as HTMLElement;
        this.avgCount = document.getElementById('avgCount') as HTMLElement;
    }

    private attachEventListeners(): void {
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.processBtn.addEventListener('click', this.processCSV.bind(this));
        this.clearBtn.addEventListener('click', this.clearData.bind(this));
    }

    private handleFileSelect(event: Event): void {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (file) {
            this.fileName.textContent = file.name;
            this.fileSize.textContent = this.formatFileSize(file.size);
            this.fileInfo.style.display = 'block';
            this.processBtn.disabled = false;
        } else {
            this.fileInfo.style.display = 'none';
            this.processBtn.disabled = true;
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private async processCSV(): Promise<void> {
        const file = this.fileInput.files?.[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            this.csvData = this.parseCSV(text);
            this.updateDataSummary();
            this.generatePlot();
            this.clearBtn.style.display = 'inline-block';
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the format.');
        }
    }

    private readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    private parseCSV(text: string): CSVRecord[] {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        // Parse headers
        this.headers = lines[0].split(',').map(h => h.trim());
        if (this.headers.length < 2) {
            throw new Error('CSV must have at least 2 columns (dimensions + count)');
        }

        // Assume the last column is the count
        const countColumnIndex = this.headers.length - 1;
        const countColumnName = this.headers[countColumnIndex];
        const dimensionHeaders = this.headers.slice(0, -1);

        const records: CSVRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',').map(p => p.trim());
            if (parts.length !== this.headers.length) {
                console.warn(`Line ${i + 1}: Expected ${this.headers.length} columns, got ${parts.length}`);
                continue;
            }

            const count = parseFloat(parts[countColumnIndex]);
            if (isNaN(count)) {
                console.warn(`Line ${i + 1}: Invalid count value: ${parts[countColumnIndex]}`);
                continue;
            }

            const record: CSVRecord = { count };
            
            // Add all dimension columns
            dimensionHeaders.forEach((header, index) => {
                record[header] = parts[index];
            });

            records.push(record);
        }

        return records;
    }

    private updateDataSummary(): void {
        const totalSum = this.csvData.reduce((sum, record) => sum + record.count, 0);
        const avgCount = this.csvData.length > 0 ? totalSum / this.csvData.length : 0;

        this.totalRecords.textContent = this.csvData.length.toString();
        this.columnCount.textContent = this.headers.length.toString();
        this.totalCount.textContent = totalSum.toLocaleString();
        this.avgCount.textContent = avgCount.toFixed(2);
        
        this.dataSummary.style.display = 'block';
    }

    private generatePlot(): void {
        const dimensionHeaders = this.headers.slice(0, -1);
        
        if (dimensionHeaders.length >= 2) {
            this.createSankeyDiagram(dimensionHeaders);
        } else {
            this.createBarChart(dimensionHeaders);
        }
    }

    private createSankeyDiagram(dimensionHeaders: string[]): void {
        // Create nodes and links for the Sankey diagram
        const nodes: string[] = [];
        const nodeIndices = new Map<string, number>();
        const nodeToHeader = new Map<number, string>();
        const nodeToValue = new Map<number, string>();
        
        // Collect all unique values from all dimensions with their dimension prefix
        dimensionHeaders.forEach(header => {
            const uniqueValues = [...new Set(this.csvData.map(r => r[header] as string))];
            uniqueValues.forEach(value => {
                const nodeLabel = `${header}: ${value}`;
                if (!nodeIndices.has(nodeLabel)) {
                    const nodeIndex = nodes.length;
                    nodeIndices.set(nodeLabel, nodeIndex);
                    nodes.push(nodeLabel);
                    nodeToHeader.set(nodeIndex, header);
                    nodeToValue.set(nodeIndex, value);
                }
            });
        });

        // Create links between consecutive dimensions
        const links: { source: number; target: number; value: number; label: string; records: CSVRecord[] }[] = [];
        
        for (let dimIndex = 0; dimIndex < dimensionHeaders.length - 1; dimIndex++) {
            const sourceHeader = dimensionHeaders[dimIndex];
            const targetHeader = dimensionHeaders[dimIndex + 1];
            
            // Group data by source-target pairs
            const linkMap = new Map<string, {value: number, records: CSVRecord[]}>();
            
            this.csvData.forEach(record => {
                const sourceValue = record[sourceHeader] as string;
                const targetValue = record[targetHeader] as string;
                const sourceLabel = `${sourceHeader}: ${sourceValue}`;
                const targetLabel = `${targetHeader}: ${targetValue}`;
                const linkKey = `${sourceLabel} → ${targetLabel}`;
                
                if (!linkMap.has(linkKey)) {
                    linkMap.set(linkKey, {value: 0, records: []});
                }
                const linkData = linkMap.get(linkKey)!;
                linkData.value += record.count;
                linkData.records.push(record);
            });
            
            // Convert to links array
            linkMap.forEach((linkData, linkKey) => {
                const [sourceLabel, targetLabel] = linkKey.split(' → ');
                const sourceIndex = nodeIndices.get(sourceLabel);
                const targetIndex = nodeIndices.get(targetLabel);
                
                if (sourceIndex !== undefined && targetIndex !== undefined) {
                    links.push({
                        source: sourceIndex,
                        target: targetIndex,
                        value: linkData.value,
                        label: linkKey,
                        records: linkData.records
                    });
                }
            });
        }

        // Create color scheme for different dimensions
        const colors = [
            'rgba(102, 126, 234, 0.8)',  // Blue
            'rgba(234, 102, 126, 0.8)',  // Red
            'rgba(126, 234, 102, 0.8)',  // Green
            'rgba(234, 202, 102, 0.8)',  // Yellow
            'rgba(202, 102, 234, 0.8)',  // Purple
            'rgba(102, 234, 202, 0.8)',  // Cyan
        ];

        // Assign colors to nodes based on their dimension
        const nodeColors = nodes.map(node => {
            const dimensionIndex = dimensionHeaders.findIndex(header => node.startsWith(header + ':'));
            return colors[dimensionIndex % colors.length];
        });

        // Original link colors (will be modified on hover)
        const originalLinkColors = links.map(() => 'rgba(150, 150, 150, 0.4)');

        const trace = {
            type: 'sankey',
            orientation: 'h',
            node: {
                pad: 15,
                thickness: 30,
                line: {
                    color: 'black',
                    width: 0.5
                },
                label: nodes,
                color: nodeColors
            },
            link: {
                source: links.map(link => link.source),
                target: links.map(link => link.target),
                value: links.map(link => link.value),
                label: links.map(link => link.label),
                color: originalLinkColors,
                hovertemplate: '%{label}<br>Flow: %{value}<extra></extra>'
            }
        };

        const layout = {
            title: {
                text: 'Data Flow Visualization (Sankey Diagram)',
                font: { size: 18 }
            },
            font: { size: 10 },
            margin: { l: 10, r: 10, b: 10, t: 60 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d']
        };

        this.plotContainer.innerHTML = '';
        (window as any).Plotly.newPlot(this.plotContainer, [trace], layout, config).then(() => {
            // Add advanced hover interactions after plot is created
            (this.plotContainer as any).on('plotly_hover', (eventData: any) => {
                if (eventData.points[0].pointNumber !== undefined) {
                    const nodeIndex = eventData.points[0].pointNumber;
                    this.handleNodeHover(nodeIndex, links, nodeToHeader, nodeToValue, dimensionHeaders, originalLinkColors);
                }
            });

            (this.plotContainer as any).on('plotly_unhover', () => {
                this.resetLinkColors(originalLinkColors);
            });
        });
    }

    private handleNodeHover(
        hoveredNodeIndex: number,
        links: { source: number; target: number; value: number; label: string; records: CSVRecord[] }[],
        nodeToHeader: Map<number, string>,
        nodeToValue: Map<number, string>,
        dimensionHeaders: string[],
        originalLinkColors: string[]
    ): void {
        const hoveredHeader = nodeToHeader.get(hoveredNodeIndex);
        const hoveredValue = nodeToValue.get(hoveredNodeIndex);
        
        if (!hoveredHeader || !hoveredValue) return;

        // Find all records that have the hovered value
        const recordsWithHoveredValue = this.csvData.filter(record => 
            record[hoveredHeader] === hoveredValue
        );

        // Calculate connection strengths and proportions for other dimension pairs
        const connectionData = new Map<string, {withHovered: number, total: number}>();
        
        // First pass: count total connections for each pair
        for (let i = 0; i < dimensionHeaders.length - 1; i++) {
            for (let j = i + 1; j < dimensionHeaders.length; j++) {
                if (dimensionHeaders[i] === hoveredHeader || dimensionHeaders[j] === hoveredHeader) continue;
                
                const header1 = dimensionHeaders[i];
                const header2 = dimensionHeaders[j];
                
                // Count total connections
                this.csvData.forEach(record => {
                    const key = `${header1}:${record[header1]} ↔ ${header2}:${record[header2]}`;
                    if (!connectionData.has(key)) {
                        connectionData.set(key, {withHovered: 0, total: 0});
                    }
                    connectionData.get(key)!.total += record.count;
                });
                
                // Count connections with hovered value
                recordsWithHoveredValue.forEach(record => {
                    const key = `${header1}:${record[header1]} ↔ ${header2}:${record[header2]}`;
                    if (connectionData.has(key)) {
                        connectionData.get(key)!.withHovered += record.count;
                    }
                });
            }
        }

        // Color links based on rules
        const newLinkColors = links.map((link) => {
            const sourceNodeIndex = link.source;
            const targetNodeIndex = link.target;
            const sourceHeader = nodeToHeader.get(sourceNodeIndex);
            const targetHeader = nodeToHeader.get(targetNodeIndex);
            const sourceValue = nodeToValue.get(sourceNodeIndex);
            const targetValue = nodeToValue.get(targetNodeIndex);
            
            // Rule 1: Only highlight direct links that contain records with the hovered value
            if (sourceNodeIndex === hoveredNodeIndex || targetNodeIndex === hoveredNodeIndex) {
                // Check if any of the records in this link contain the hovered value
                const linkContainsHoveredValue = link.records.some(record => 
                    record[hoveredHeader] === hoveredValue
                );
                
                if (linkContainsHoveredValue) {
                    return 'rgba(255, 215, 0, 0.8)'; // Gold for direct connections with hovered value
                } else {
                    return 'rgba(200, 200, 200, 0.2)'; // Fade out direct links without hovered value
                }
            }

            // Rule 2: Color based on proportion of records with hovered value
            if (sourceHeader && targetHeader && sourceValue && targetValue) {
                const connectionKey1 = `${sourceHeader}:${sourceValue} ↔ ${targetHeader}:${targetValue}`;
                const connectionKey2 = `${targetHeader}:${targetValue} ↔ ${sourceHeader}:${sourceValue}`;
                
                const data1 = connectionData.get(connectionKey1);
                const data2 = connectionData.get(connectionKey2);
                const data = data1 || data2;
                
                if (data && data.total > 0) {
                    const proportion = data.withHovered / data.total;
                    
                    if (proportion >= 0.3) {
                        // High proportion: Gold with intensity based on proportion
                        const intensity = Math.min(1.0, proportion * 1.2); // Cap at full intensity
                        return `rgba(255, 215, 0, ${0.4 + intensity * 0.4})`; // Gold from 0.4 to 0.8 opacity
                    } else if (proportion > 0) {
                        // Low proportion: Faded with very low intensity
                        const intensity = proportion / 0.3; // Scale 0-0.3 to 0-1
                        return `rgba(180, 180, 180, ${0.2 + intensity * 0.3})`; // Light gray from 0.2 to 0.5 opacity
                    }
                }
            }

            // Default: fade out unrelated links
            return 'rgba(200, 200, 200, 0.2)';
        });

        // Update the diagram
        (window as any).Plotly.restyle(this.plotContainer, {
            'link.color': [newLinkColors]
        }, [0]);
    }

    private resetLinkColors(originalLinkColors: string[]): void {
        (window as any).Plotly.restyle(this.plotContainer, {
            'link.color': [originalLinkColors]
        }, [0]);
    }

    private createBarChart(dimensionHeaders: string[]): void {
        const header = dimensionHeaders[0];
        
        // Aggregate data by the single dimension
        const aggregated: { [key: string]: number } = {};
        this.csvData.forEach(record => {
            const key = record[header] as string;
            aggregated[key] = (aggregated[key] || 0) + record.count;
        });

        const sortedKeys = Object.keys(aggregated).sort((a, b) => aggregated[b] - aggregated[a]);

        const trace = {
            x: sortedKeys,
            y: sortedKeys.map(key => aggregated[key]),
            type: 'bar',
            marker: {
                color: 'rgba(102, 126, 234, 0.8)',
                line: {
                    color: 'rgba(102, 126, 234, 1.0)',
                    width: 1
                }
            },
            text: sortedKeys.map(key => aggregated[key].toLocaleString()),
            textposition: 'outside'
        };

        const layout = {
            title: {
                text: `Count by ${header}`,
                font: { size: 18 }
            },
            xaxis: { title: header },
            yaxis: { title: 'Count' },
            margin: { l: 60, r: 40, b: 60, t: 60 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        this.plotContainer.innerHTML = '';
        (window as any).Plotly.newPlot(this.plotContainer, [trace], layout, { responsive: true });
    }


    private clearData(): void {
        this.csvData = [];
        this.headers = [];
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
        this.dataSummary.style.display = 'none';
        this.processBtn.disabled = true;
        this.clearBtn.style.display = 'none';
        
        // Reset plot container
        this.plotContainer.innerHTML = `
            <div class="placeholder">
                <p>Upload a CSV file to generate a plot</p>
            </div>
        `;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CSVPlotter();
});