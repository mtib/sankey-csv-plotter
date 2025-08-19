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
        this.plotContainer.innerHTML = '';
        
        // Create SVG container
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.width = '100%';
        svg.style.height = '600px';
        svg.style.background = 'rgba(255, 255, 255, 0.9)';
        svg.style.borderRadius = '15px';
        svg.setAttribute('viewBox', '0 0 800 600');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.plotContainer.appendChild(svg);

        // Fixed dimensions for consistent layout
        const width = 800;
        const height = 600;
        const margin = { top: 60, right: 60, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Create data structure for nodes and links
        const nodeData = this.prepareSankeyData(dimensionHeaders);
        
        // Calculate positions with proper link alignment
        const { nodePositions, linkPositions } = this.calculatePositions(nodeData, chartWidth, chartHeight, dimensionHeaders);
        
        // Create main group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        svg.appendChild(g);

        // Draw links first (so they appear behind nodes)
        this.drawLinks(g, nodeData, nodePositions, linkPositions);
        
        // Draw nodes
        this.drawNodes(g, nodeData, nodePositions, dimensionHeaders);

        // Add title
        this.addTitle(svg, width);
    }

    private prepareSankeyData(dimensionHeaders: string[]) {
        const nodes: Array<{
            id: string;
            label: string; 
            header: string;
            value: string;
            dimIndex: number;
            totalValue: number;
        }> = [];
        
        const nodeMap = new Map<string, number>();
        
        // Create nodes for each unique value in each dimension
        dimensionHeaders.forEach((header, dimIndex) => {
            const uniqueValues = [...new Set(this.csvData.map(r => r[header] as string))];
            uniqueValues.forEach(value => {
                const id = `${header}:${value}`;
                const totalValue = this.csvData
                    .filter(r => r[header] === value)
                    .reduce((sum, r) => sum + r.count, 0);
                
                const nodeIndex = nodes.length;
                nodeMap.set(id, nodeIndex);
                nodes.push({
                    id,
                    label: `${header}: ${value}`,
                    header,
                    value,
                    dimIndex,
                    totalValue
                });
            });
        });

        // Create links between consecutive dimensions
        const links: Array<{
            source: number;
            target: number;
            value: number;
            records: CSVRecord[];
            sourceNode: string;
            targetNode: string;
        }> = [];

        for (let dimIndex = 0; dimIndex < dimensionHeaders.length - 1; dimIndex++) {
            const sourceHeader = dimensionHeaders[dimIndex];
            const targetHeader = dimensionHeaders[dimIndex + 1];
            
            const linkMap = new Map<string, {value: number, records: CSVRecord[]}>();
            
            this.csvData.forEach(record => {
                const sourceValue = record[sourceHeader] as string;
                const targetValue = record[targetHeader] as string;
                const sourceId = `${sourceHeader}:${sourceValue}`;
                const targetId = `${targetHeader}:${targetValue}`;
                const linkKey = `${sourceId} → ${targetId}`;
                
                if (!linkMap.has(linkKey)) {
                    linkMap.set(linkKey, {value: 0, records: []});
                }
                const linkData = linkMap.get(linkKey)!;
                linkData.value += record.count;
                linkData.records.push(record);
            });
            
            linkMap.forEach((linkData, linkKey) => {
                const [sourceId, targetId] = linkKey.split(' → ');
                const sourceIndex = nodeMap.get(sourceId);
                const targetIndex = nodeMap.get(targetId);
                
                if (sourceIndex !== undefined && targetIndex !== undefined) {
                    links.push({
                        source: sourceIndex,
                        target: targetIndex,
                        value: linkData.value,
                        records: linkData.records,
                        sourceNode: sourceId,
                        targetNode: targetId
                    });
                }
            });
        }

        return { nodes, links, nodeMap };
    }

    private calculatePositions(nodeData: any, chartWidth: number, chartHeight: number, dimensionHeaders: string[]) {
        const { nodes, links } = nodeData;
        const nodePositions = new Map<number, {x: number, y: number, height: number}>();
        const linkPositions = new Map<number, {sourceY: number, targetY: number, height: number}>();
        
        const nodePadding = 10;
        const columnWidth = chartWidth / Math.max(1, dimensionHeaders.length - 1);
        
        // Group nodes by dimension
        const nodesByDim = new Map<number, number[]>();
        nodes.forEach((node: any, index: number) => {
            if (!nodesByDim.has(node.dimIndex)) {
                nodesByDim.set(node.dimIndex, []);
            }
            nodesByDim.get(node.dimIndex)!.push(index);
        });


        // Calculate node positions for each dimension
        nodesByDim.forEach((nodeIndices, dimIndex) => {
            const x = dimIndex * columnWidth;
            const totalDimValue = nodeIndices.reduce((sum, nodeIndex) => sum + nodes[nodeIndex].totalValue, 0);
            const availableHeight = chartHeight - (nodeIndices.length - 1) * nodePadding;
            
            let currentY = 0;
            
            nodeIndices.forEach(nodeIndex => {
                const node = nodes[nodeIndex];
                const height = (node.totalValue / totalDimValue) * availableHeight;
                
                nodePositions.set(nodeIndex, {
                    x,
                    y: currentY,
                    height
                });
                
                currentY += height + nodePadding;
            });
        });

        // Calculate link positions to align with node flows
        const nodeIncomingLinks = new Map<number, number[]>();
        const nodeOutgoingLinks = new Map<number, number[]>();
        
        // Track which links are incoming/outgoing for each node
        links.forEach((link: any, linkIndex: number) => {
            if (!nodeOutgoingLinks.has(link.source)) {
                nodeOutgoingLinks.set(link.source, []);
            }
            nodeOutgoingLinks.get(link.source)!.push(linkIndex);
            
            if (!nodeIncomingLinks.has(link.target)) {
                nodeIncomingLinks.set(link.target, []);
            }
            nodeIncomingLinks.get(link.target)!.push(linkIndex);
        });

        // Calculate link positions based on cumulative heights
        nodes.forEach((node: any, nodeIndex: number) => {
            const nodePos = nodePositions.get(nodeIndex)!;
            
            // Sort outgoing links by target position for consistent ordering
            const outgoingLinks = nodeOutgoingLinks.get(nodeIndex) || [];
            outgoingLinks.sort((a, b) => {
                const targetA = nodePositions.get(links[a].target)!.y;
                const targetB = nodePositions.get(links[b].target)!.y;
                return targetA - targetB;
            });
            
            // Calculate source positions for outgoing links
            let currentSourceY = nodePos.y;
            outgoingLinks.forEach(linkIndex => {
                const link = links[linkIndex];
                const linkHeight = (link.value / node.totalValue) * nodePos.height;
                
                if (!linkPositions.has(linkIndex)) {
                    linkPositions.set(linkIndex, {sourceY: 0, targetY: 0, height: linkHeight});
                }
                linkPositions.get(linkIndex)!.sourceY = currentSourceY;
                linkPositions.get(linkIndex)!.height = linkHeight;
                
                currentSourceY += linkHeight;
            });
            
            // Sort incoming links by source position for consistent ordering
            const incomingLinks = nodeIncomingLinks.get(nodeIndex) || [];
            incomingLinks.sort((a, b) => {
                const sourceA = nodePositions.get(links[a].source)!.y;
                const sourceB = nodePositions.get(links[b].source)!.y;
                return sourceA - sourceB;
            });
            
            // Calculate target positions for incoming links
            let currentTargetY = nodePos.y;
            incomingLinks.forEach(linkIndex => {
                const link = links[linkIndex];
                const linkHeight = (link.value / node.totalValue) * nodePos.height;
                
                if (!linkPositions.has(linkIndex)) {
                    linkPositions.set(linkIndex, {sourceY: 0, targetY: 0, height: linkHeight});
                }
                linkPositions.get(linkIndex)!.targetY = currentTargetY;
                
                currentTargetY += linkHeight;
            });
        });

        return { nodePositions, linkPositions };
    }

    private drawNodes(g: SVGGElement, nodeData: any, nodePositions: Map<number, any>, dimensionHeaders: string[]) {
        const { nodes } = nodeData;
        const colors = [
            '#667eea', '#ea4c89', '#7eea4c', '#ead24c', '#ca4cea', '#4ceaad'
        ];

        nodes.forEach((node: any, index: number) => {
            const pos = nodePositions.get(index);
            if (!pos) return;

            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.setAttribute('class', 'node');
            nodeGroup.setAttribute('data-node-index', index.toString());
            
            // Node rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', pos.x.toString());
            rect.setAttribute('y', pos.y.toString());
            rect.setAttribute('width', '30');
            rect.setAttribute('height', pos.height.toString());
            rect.setAttribute('fill', colors[node.dimIndex % colors.length]);
            rect.setAttribute('stroke', '#333');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('rx', '5');
            rect.style.cursor = 'pointer';
            
            // Node label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', (pos.x + 35).toString());
            text.setAttribute('y', (pos.y + pos.height / 2).toString());
            text.setAttribute('dy', '0.35em');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.textContent = node.label;
            
            nodeGroup.appendChild(rect);
            nodeGroup.appendChild(text);
            g.appendChild(nodeGroup);

            // Add hover events
            nodeGroup.addEventListener('mouseenter', () => {
                this.handleCustomNodeHover(index, nodeData, nodePositions, g);
            });
            
            nodeGroup.addEventListener('mouseleave', () => {
                this.resetCustomLinkColors(g);
            });
        });
    }

    private drawLinks(g: SVGGElement, nodeData: any, nodePositions: Map<number, any>, linkPositions: Map<number, any>) {
        const { links } = nodeData;

        links.forEach((link: any, linkIndex: number) => {
            const sourcePos = nodePositions.get(link.source);
            const targetPos = nodePositions.get(link.target);
            const linkPos = linkPositions.get(linkIndex);
            
            if (!sourcePos || !targetPos || !linkPos) return;

            // Create link path (trapezoid) using precise positions
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            const sourceX = sourcePos.x + 30; // Right edge of source node
            const targetX = targetPos.x; // Left edge of target node
            const sourceY1 = linkPos.sourceY;
            const sourceY2 = linkPos.sourceY + linkPos.height;
            const targetY1 = linkPos.targetY;
            const targetY2 = linkPos.targetY + linkPos.height;
            
            const pathData = `M ${sourceX} ${sourceY1} 
                             L ${targetX} ${targetY1}
                             L ${targetX} ${targetY2}
                             L ${sourceX} ${sourceY2} Z`;
            
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'rgba(150, 150, 150, 0.6)');
            path.setAttribute('stroke', 'rgba(150, 150, 150, 0.8)');
            path.setAttribute('stroke-width', '0.5');
            path.setAttribute('class', 'link');
            path.setAttribute('data-link-index', linkIndex.toString());
            
            g.appendChild(path);
        });
    }

    private handleCustomNodeHover(hoveredNodeIndex: number, nodeData: any, nodePositions: Map<number, any>, g: SVGGElement) {
        const { nodes, links } = nodeData;
        const hoveredNode = nodes[hoveredNodeIndex];
        
        // Get link positions from the stored data
        const linkPositions = this.getStoredLinkPositions(g);
        
        // Calculate proportions for each link
        const linkProportions = new Map<number, number>();
        
        links.forEach((link: any, linkIndex: number) => {
            const recordsWithHoveredValue = link.records.filter((record: CSVRecord) => 
                record[hoveredNode.header] === hoveredNode.value
            );
            const proportion = recordsWithHoveredValue.length > 0 ? 
                recordsWithHoveredValue.reduce((sum: number, r: CSVRecord) => sum + r.count, 0) / link.value : 0;
            linkProportions.set(linkIndex, proportion);
        });

        // Update link visuals
        const linkElements = g.querySelectorAll('.link');
        linkElements.forEach((linkElement, index) => {
            const proportion = linkProportions.get(index) || 0;
            
            if (proportion > 0) {
                this.drawSplitLink(linkElement as SVGPathElement, links[index], nodePositions, linkPositions, proportion, index);
            } else {
                (linkElement as SVGPathElement).setAttribute('fill', 'rgba(200, 200, 200, 0.2)');
            }
        });
    }

    private getStoredLinkPositions(g: SVGGElement): Map<number, any> {
        // This would ideally be stored from calculatePositions, but for now we'll recalculate
        // In a full implementation, you'd store linkPositions as a class property
        const linkPositions = new Map<number, any>();
        const linkElements = g.querySelectorAll('.link');
        
        linkElements.forEach((linkElement, index) => {
            const pathData = linkElement.getAttribute('d') || '';
            const coords = this.parsePathData(pathData);
            if (coords) {
                linkPositions.set(index, {
                    sourceY: coords.sourceY1,
                    targetY: coords.targetY1, 
                    height: coords.sourceY2 - coords.sourceY1
                });
            }
        });
        
        return linkPositions;
    }

    private parsePathData(pathData: string) {
        const match = pathData.match(/M\s+([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)/);
        if (match) {
            return {
                sourceX: parseFloat(match[1]),
                sourceY1: parseFloat(match[2]),
                targetX: parseFloat(match[3]),
                targetY1: parseFloat(match[4]),
                targetY2: parseFloat(match[6]),
                sourceY2: parseFloat(match[8])
            };
        }
        return null;
    }

    private drawSplitLink(
        pathElement: SVGPathElement, 
        link: any, 
        nodePositions: Map<number, any>, 
        linkPositions: Map<number, any>, 
        proportion: number, 
        linkIndex: number
    ) {
        const sourcePos = nodePositions.get(link.source);
        const targetPos = nodePositions.get(link.target);
        const linkPos = linkPositions.get(linkIndex);
        
        if (!sourcePos || !targetPos || !linkPos) return;
        
        const sourceX = sourcePos.x + 30;
        const targetX = targetPos.x;
        const sourceY1 = linkPos.sourceY;
        const sourceY2 = linkPos.sourceY + linkPos.height;
        const targetY1 = linkPos.targetY;
        const targetY2 = linkPos.targetY + linkPos.height;
        
        // Split the trapezoid based on proportion
        
        // Clear existing path and create two paths
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke', 'none');
        
        // Gold part (top portion representing records with hovered value)
        const goldPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const goldTargetSplit = targetY1 + (targetY2 - targetY1) * proportion;
        const goldSourceSplit = sourceY1 + (sourceY2 - sourceY1) * proportion;
        
        const goldPathData = `M ${sourceX} ${sourceY1} 
                              L ${targetX} ${targetY1}
                              L ${targetX} ${goldTargetSplit}
                              L ${sourceX} ${goldSourceSplit} Z`;
        goldPath.setAttribute('d', goldPathData);
        goldPath.setAttribute('fill', 'rgba(255, 215, 0, 0.8)');
        goldPath.setAttribute('stroke', 'rgba(255, 215, 0, 1.0)');
        goldPath.setAttribute('stroke-width', '0.5');
        goldPath.setAttribute('class', 'split-link-gold');
        
        // Gray part (bottom portion representing other records)
        if (proportion < 1.0) {
            const grayPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const grayPathData = `M ${sourceX} ${goldSourceSplit} 
                                  L ${targetX} ${goldTargetSplit}
                                  L ${targetX} ${targetY2}
                                  L ${sourceX} ${sourceY2} Z`;
            grayPath.setAttribute('d', grayPathData);
            grayPath.setAttribute('fill', 'rgba(128, 128, 128, 0.4)');
            grayPath.setAttribute('stroke', 'rgba(128, 128, 128, 0.6)');
            grayPath.setAttribute('stroke-width', '0.5');
            grayPath.setAttribute('class', 'split-link-gray');
            
            // Insert the gray path after the original
            pathElement.parentElement?.insertBefore(grayPath, pathElement.nextSibling);
        }
        
        // Insert the gold path after the original (so it appears on top)
        pathElement.parentElement?.insertBefore(goldPath, pathElement.nextSibling);
    }

    private resetCustomLinkColors(g: SVGGElement) {
        // Remove split links
        const splitLinks = g.querySelectorAll('.split-link-gold, .split-link-gray');
        splitLinks.forEach(element => element.remove());
        
        // Reset original links
        const linkElements = g.querySelectorAll('.link');
        linkElements.forEach(linkElement => {
            (linkElement as SVGPathElement).setAttribute('fill', 'rgba(150, 150, 150, 0.6)');
        });
    }

    private addTitle(svg: SVGElement, width: number) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', (width / 2).toString());
        title.setAttribute('y', '25');
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '18');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('font-family', 'Arial, sans-serif');
        title.textContent = 'Custom Sankey Diagram with Split Links';
        svg.appendChild(title);
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