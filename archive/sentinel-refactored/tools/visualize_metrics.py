#!/usr/bin/env python3
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import sys
from datetime import datetime

# Set style
sns.set_style("whitegrid")
plt.rcParams.update({'font.size': 10})

def load_data():
    """Load performance metrics from CSV files"""
    summary_file = os.path.join('metrics', 'performance_summary.csv')
    details_file = os.path.join('metrics', 'performance_details.csv')
    
    if not os.path.exists(summary_file):
        print(f"Error: Summary file not found at {summary_file}")
        return None, None
        
    if not os.path.exists(details_file):
        print(f"Error: Details file not found at {details_file}")
        return None, None
    
    summary_df = pd.read_csv(summary_file, parse_dates=['Timestamp'])
    details_df = pd.read_csv(details_file, parse_dates=['Timestamp'])
    
    return summary_df, details_df

def visualize_overall_trend(summary_df):
    """Generate overall performance trend visualization"""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10), sharex=True)
    
    # Total duration trend
    ax1.plot(summary_df['Timestamp'], summary_df['TotalDuration(ms)'], 'o-', color='blue')
    ax1.set_title('Total Analysis Duration Over Time')
    ax1.set_ylabel('Time (ms)')
    ax1.grid(True)
    
    # Memory usage trend
    ax2.plot(summary_df['Timestamp'], summary_df['MemoryUsed(MB)'], 'o-', color='red')
    ax2.set_title('Memory Usage Over Time')
    ax2.set_ylabel('Memory (MB)')
    ax2.set_xlabel('Timestamp')
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join('metrics', 'overall_trend.png'))
    plt.close()

def visualize_stage_breakdown(details_df):
    """Generate stage breakdown visualization"""
    # Get latest run data
    latest_timestamp = details_df['Timestamp'].max()
    latest_run = details_df[details_df['Timestamp'] == latest_timestamp]
    
    # Sort by duration descending
    latest_run = latest_run.sort_values('Duration(ms)', ascending=False)
    
    # Create bar chart
    plt.figure(figsize=(12, 8))
    bars = plt.bar(latest_run['Stage'], latest_run['Duration(ms)'], color=sns.color_palette("viridis", len(latest_run)))
    
    # Add labels
    plt.title(f'Analysis Stage Breakdown - {latest_timestamp.strftime("%Y-%m-%d %H:%M:%S")}')
    plt.ylabel('Duration (ms)')
    plt.xlabel('Analysis Stage')
    plt.xticks(rotation=45, ha='right')
    
    # Add values on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 5,
                 f'{int(height)}',
                 ha='center', va='bottom', rotation=0)
    
    plt.tight_layout()
    plt.savefig(os.path.join('metrics', 'stage_breakdown.png'))
    plt.close()

def visualize_stage_trends(details_df):
    """Generate stage trends visualization"""
    # Pivot the data to get stages as columns
    pivot_df = details_df.pivot_table(
        index='Timestamp', 
        columns='Stage', 
        values='Duration(ms)',
        aggfunc='first'
    ).reset_index()
    
    # Plot lines for each stage
    plt.figure(figsize=(12, 8))
    
    # Plot each stage as a line
    for column in pivot_df.columns:
        if column != 'Timestamp':
            plt.plot(pivot_df['Timestamp'], pivot_df[column], 'o-', label=column)
    
    plt.title('Stage Duration Trends Over Time')
    plt.xlabel('Timestamp')
    plt.ylabel('Duration (ms)')
    plt.legend(loc='best')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(os.path.join('metrics', 'stage_trends.png'))
    plt.close()

def visualize_cache_effectiveness(summary_df):
    """Generate cache effectiveness visualization"""
    if 'CachedFiles' not in summary_df.columns or 'FileCount' not in summary_df.columns:
        print("Cache data not available in summary file")
        return
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    # Calculate non-cached files
    summary_df['NonCachedFiles'] = summary_df['FileCount'] - summary_df['CachedFiles']
    
    # Create stacked bar chart
    bar_width = 0.6
    timestamps = range(len(summary_df))
    
    bars1 = ax.bar(timestamps, summary_df['CachedFiles'], bar_width, label='From Cache', color='green')
    bars2 = ax.bar(timestamps, summary_df['NonCachedFiles'], bar_width, bottom=summary_df['CachedFiles'], 
                   label='Newly Processed', color='orange')
    
    # Add cache hit percentage 
    for i, (cached, total) in enumerate(zip(summary_df['CachedFiles'], summary_df['FileCount'])):
        if total > 0:
            percentage = cached / total * 100
            ax.text(i, total + 5, f'{percentage:.1f}%', ha='center', va='bottom')
    
    # Set labels and title
    ax.set_xlabel('Run')
    ax.set_ylabel('File Count')
    ax.set_title('Cache Effectiveness Over Time')
    ax.set_xticks(timestamps)
    date_labels = [ts.strftime('%m/%d %H:%M') for ts in summary_df['Timestamp']]
    ax.set_xticklabels(date_labels, rotation=45, ha='right')
    ax.legend()
    
    plt.tight_layout()
    plt.savefig(os.path.join('metrics', 'cache_effectiveness.png'))
    plt.close()

def main():
    # Make sure metrics directory exists
    os.makedirs('metrics', exist_ok=True)
    
    # Load the data
    summary_df, details_df = load_data()
    if summary_df is None or details_df is None:
        return
    
    print(f"Loaded {len(summary_df)} summary records and {len(details_df)} detail records")
    
    # Generate visualizations
    visualize_overall_trend(summary_df)
    visualize_stage_breakdown(details_df)
    visualize_stage_trends(details_df)
    visualize_cache_effectiveness(summary_df)
    
    print("Visualizations created in metrics directory:")
    print("  - overall_trend.png")
    print("  - stage_breakdown.png")
    print("  - stage_trends.png")
    print("  - cache_effectiveness.png")

if __name__ == "__main__":
    main() 