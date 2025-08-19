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
        
        if (dimensionHeaders.length >= 3) {
            this.create3DPlot(dimensionHeaders);
        } else if (dimensionHeaders.length === 2) {
            this.create2DPlot(dimensionHeaders);
        } else {
            this.createBarChart(dimensionHeaders);
        }

        if (dimensionHeaders.length >= 2) {
            this.createHeatmap(dimensionHeaders);
        }
    }

    private create3DPlot(dimensionHeaders: string[]): void {
        const xHeader = dimensionHeaders[0];
        const yHeader = dimensionHeaders[1];
        const zHeader = dimensionHeaders[2];

        const trace = {
            x: this.csvData.map(r => r[xHeader]),
            y: this.csvData.map(r => r[yHeader]),
            z: this.csvData.map(r => r[zHeader]),
            mode: 'markers',
            marker: {
                size: this.csvData.map(r => Math.max(5, Math.min(20, r.count / Math.max(1, Math.max(...this.csvData.map(d => d.count)) / 20)))),
                color: this.csvData.map(r => r.count),
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Count'
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            text: this.csvData.map(r => {
                const dims = dimensionHeaders.map(h => `${h}: ${r[h]}`).join('<br>');
                return `${dims}<br>Count: ${r.count}`;
            }),
            hovertemplate: '%{text}<extra></extra>'
        };

        const layout = {
            title: {
                text: 'CSV Data Visualization (3D)',
                font: { size: 18 }
            },
            scene: {
                xaxis: { title: xHeader },
                yaxis: { title: yHeader },
                zaxis: { title: zHeader }
            },
            margin: { l: 0, r: 0, b: 0, t: 40 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        this.plotContainer.innerHTML = '';
        (window as any).Plotly.newPlot(this.plotContainer, [trace], layout, { responsive: true });
    }

    private create2DPlot(dimensionHeaders: string[]): void {
        const xHeader = dimensionHeaders[0];
        const yHeader = dimensionHeaders[1];

        const trace = {
            x: this.csvData.map(r => r[xHeader]),
            y: this.csvData.map(r => r[yHeader]),
            mode: 'markers',
            marker: {
                size: this.csvData.map(r => Math.max(8, Math.min(30, r.count / Math.max(1, Math.max(...this.csvData.map(d => d.count)) / 30)))),
                color: this.csvData.map(r => r.count),
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Count'
                },
                opacity: 0.7
            },
            type: 'scatter',
            text: this.csvData.map(r => {
                const dims = dimensionHeaders.map(h => `${h}: ${r[h]}`).join('<br>');
                return `${dims}<br>Count: ${r.count}`;
            }),
            hovertemplate: '%{text}<extra></extra>'
        };

        const layout = {
            title: {
                text: 'CSV Data Visualization (2D)',
                font: { size: 18 }
            },
            xaxis: { title: xHeader },
            yaxis: { title: yHeader },
            margin: { l: 60, r: 40, b: 60, t: 60 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        this.plotContainer.innerHTML = '';
        (window as any).Plotly.newPlot(this.plotContainer, [trace], layout, { responsive: true });
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

    private createHeatmap(dimensionHeaders: string[]): void {
        if (dimensionHeaders.length < 2) return;

        const xHeader = dimensionHeaders[0];
        const yHeader = dimensionHeaders[1];

        // Create a summary heatmap
        const heatmapData: { [key: string]: { [key: string]: number } } = {};
        
        this.csvData.forEach(record => {
            const xVal = record[xHeader] as string;
            const yVal = record[yHeader] as string;
            
            if (!heatmapData[yVal]) {
                heatmapData[yVal] = {};
            }
            if (!heatmapData[yVal][xVal]) {
                heatmapData[yVal][xVal] = 0;
            }
            heatmapData[yVal][xVal] += record.count;
        });

        const uniqueX = [...new Set(this.csvData.map(r => r[xHeader] as string))].sort();
        const uniqueY = [...new Set(this.csvData.map(r => r[yHeader] as string))].sort();

        const z = uniqueY.map(y => 
            uniqueX.map(x => heatmapData[y]?.[x] || 0)
        );

        const heatmapTrace = {
            z: z,
            x: uniqueX,
            y: uniqueY,
            type: 'heatmap',
            colorscale: 'Viridis',
            showscale: true,
            hoverongaps: false
        };

        const heatmapLayout = {
            title: {
                text: `Heatmap: ${yHeader} vs ${xHeader}`,
                font: { size: 16 }
            },
            xaxis: { title: xHeader },
            yaxis: { title: yHeader },
            margin: { l: 80, r: 40, b: 60, t: 60 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        // Create a second plot container for the heatmap
        const heatmapContainer = document.createElement('div');
        heatmapContainer.style.width = '100%';
        heatmapContainer.style.height = '400px';
        heatmapContainer.style.marginTop = '20px';
        
        this.plotContainer.appendChild(heatmapContainer);
        (window as any).Plotly.newPlot(heatmapContainer, [heatmapTrace], heatmapLayout, { responsive: true });
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