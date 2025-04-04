# Performance Metrics Tracking

This directory contains performance metrics data and visualization tools for the Sentinel analysis tool.

## Overview

The performance metrics tracking system helps identify bottlenecks and track performance improvements over time. It records:

1. Overall execution time
2. Detailed timing for each stage of analysis
3. Memory usage
4. Cache effectiveness
5. File counts and analysis results

## Files

The system generates the following files:

- `performance_summary.csv` - Overall performance metrics for each run
- `performance_details.csv` - Detailed timing for each processing stage

## Visualizing Performance Data

To visualize the performance data, run:

```bash
cd sentinel-refactored
./tools/visualize_metrics.py
```

This will generate the following visualizations:

- `overall_trend.png` - Overall execution time and memory usage trends
- `stage_breakdown.png` - Breakdown of time spent in each processing stage (latest run)
- `stage_trends.png` - Trends of time spent in each stage over multiple runs
- `cache_effectiveness.png` - Cache hit rate and effectiveness over time

## Interpreting Results

When analyzing performance metrics, look for:

1. **Overall execution time trends**: Are runs getting faster or slower over time?
2. **Stage bottlenecks**: Which stages take the most time?
3. **Cache effectiveness**: Is the cache being used effectively?
4. **Memory usage trends**: Is memory usage stable or growing?

## Adding New Metrics

To add new metrics:

1. Update the `PerfMetrics` struct in `cmd/sentinel/main.go`
2. Add the new metrics to the CSV output in the `SaveToFile()` method
3. Update the visualization script as needed

## Best Practices

1. Run the analysis tool multiple times with the same codebase to see cache effectiveness
2. Compare performance before and after making changes to the codebase
3. Look for specific stages that take disproportionate time
4. Set goals for performance improvements based on collected metrics
