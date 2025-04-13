import json
import matplotlib.pyplot as plt
from datetime import datetime
import matplotlib.dates as mdates
from flask import Flask, send_file
import io
import threading
import time

app = Flask(__name__)

def parse_metrics():
    with open('metrics/metrics.json', 'r') as f:
        data = json.load(f)
    
    # Extract timestamps and files per second
    timestamps = [datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')) for m in data]
    fps = [m['files_per_second_wall_time'] for m in data]
    
    return timestamps, fps

def create_plot():
    # Create the plot
    plt.figure(figsize=(12, 6))
    plt.clf()  # Clear the current figure
    
    # Get the data
    timestamps, fps = parse_metrics()
    
    # Create the line plot
    plt.plot(timestamps, fps, marker='o', linestyle='-', linewidth=2, markersize=8)
    
    # Customize the plot
    plt.title('Files Processed per Second Over Time', fontsize=14, pad=20)
    plt.xlabel('Timestamp', fontsize=12)
    plt.ylabel('Files per Second', fontsize=12)
    
    # Format x-axis
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
    plt.gcf().autofmt_xdate()  # Rotate and align the tick labels
    
    # Add grid
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Tight layout
    plt.tight_layout()
    
    # Save plot to bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=300, bbox_inches='tight')
    buf.seek(0)
    return buf

@app.route('/')
def home():
    return '''
    <html>
        <head>
            <title>Metrics Visualization</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    text-align: center;
                }
                h1 {
                    color: #333;
                }
                .plot {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-top: 20px;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
            </style>
            <script>
                function refreshImage() {
                    const img = document.getElementById('plot');
                    img.src = '/plot?' + new Date().getTime();
                }
                
                // Refresh every 5 seconds
                setInterval(refreshImage, 5000);
            </script>
        </head>
        <body>
            <div class="container">
                <h1>Files Processed per Second</h1>
                <div class="plot">
                    <img id="plot" src="/plot" alt="Metrics Plot">
                </div>
            </div>
        </body>
    </html>
    '''

@app.route('/plot')
def plot():
    buf = create_plot()
    return send_file(buf, mimetype='image/png')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 