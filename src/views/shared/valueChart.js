/**
 * Shared value chart functionality for asset and collection pages
 * This module provides a consistent chart implementation across both views
 */

class ValueChartManager {
    constructor(canvasId, options = {}) {
        this.canvasId = canvasId;
        this.chart = null;
        this.currentPeriod = 'all';
        this.chartData = [];
        this.currentCurrency = options.currency || 'CNY';
        this.chartType = options.chartType || 'collection'; // 'asset' or 'collection'
    }

    /**
     * Initialize the chart with Chart.js
     */
    initChart() {
        try {
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                return false;
            }

            const canvas = document.getElementById(this.canvasId);
            if (!canvas) {
                console.error('Chart canvas not found:', this.canvasId);
                return false;
            }

            const ctx = canvas.getContext('2d');
            const chartConfig = this.getChartConfig();

            console.log('Initializing chart...');
            this.chart = new Chart(ctx, chartConfig);
            console.log('Chart initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing chart:', error);
            return false;
        }
    }

    /**
     * Get the Chart.js configuration object
     */
    getChartConfig() {
        const self = this;

        return {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Value',
                    data: [],
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--text-accent') || '#0078d4',
                    backgroundColor: 'rgba(0, 120, 212, 0.1)',
                    borderWidth: 2,
                    tension: 0.2,
                    fill: false,
                    pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--text-accent') || '#0078d4',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'nearest',
                    axis: 'x'
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--text-accent') || '#0078d4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        padding: 16,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return 'Value: ' + self.formatCurrency(value, self.currentCurrency);
                            },
                            afterLabel: function(context) {
                                const point = context.raw;
                                const entry = point.entry;

                                if (!entry || !entry.activities || entry.activities.length === 0) {
                                    return [];
                                }

                                const afterLabels = [];
                                afterLabels.push('');
                                afterLabels.push('Activities:');

                                // Show up to 10 activities
                                const activitiesToShow = entry.activities.slice(0, 10);

                                activitiesToShow.forEach(activity => {
                                    const typeDisplay = activity.type.replace('_', ' ');
                                    const activityValue = self.formatCurrency(activity.totalValue, self.currentCurrency);

                                    let activityLabel = '';
                                    if (activity.type === 'snapshot') {
                                        activityLabel = `• ${typeDisplay}: ${activityValue}`;
                                    } else if (activity.type === 'income' || activity.type === 'transfer_in' || activity.type === 'buy') {
                                        activityLabel = `• ${typeDisplay}: +${activityValue}`;
                                    } else {
                                        activityLabel = `• ${typeDisplay}: -${activityValue}`;
                                    }

                                    if (activity.description) {
                                        activityLabel += ` ${activity.description}`;
                                    }

                                    afterLabels.push(activityLabel);
                                });

                                if (entry.activities.length > 10) {
                                    afterLabels.push(`• ... and ${entry.activities.length - 10} more`);
                                }

                                return afterLabels;
                            },
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: undefined,
                        max: undefined,
                        grace: 0,
                        offset: false,
                        grid: {
                            display: true,
                            color: function(context) {
                                const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--border-secondary') || '#e5e5e5';
                                return context.tick.major ? baseColor : 'rgba(229, 229, 229, 0.3)';
                            },
                            lineWidth: function(context) {
                                return context.tick.major ? 1 : 0.5;
                            },
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        border: {
                            display: true,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-primary') || '#d1d1d1',
                            width: 1
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666666',
                            maxTicksLimit: 6,
                            padding: 8,
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                const date = new Date(value);
                                const now = new Date();
                                const diffDays = (now - date) / (1000 * 60 * 60 * 24);

                                if (diffDays < 30) {
                                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                } else if (diffDays < 365) {
                                    return date.toLocaleDateString(undefined, { month: 'short' });
                                } else {
                                    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                                }
                            }
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            display: true,
                            color: function(context) {
                                const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--border-secondary') || '#e5e5e5';
                                return context.tick.major ? baseColor : 'rgba(229, 229, 229, 0.2)';
                            },
                            lineWidth: function(context) {
                                return context.tick.major ? 1 : 0.5;
                            },
                            drawOnChartArea: true,
                            drawTicks: true
                        },
                        border: {
                            display: true,
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-primary') || '#d1d1d1',
                            width: 1
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666666',
                            maxTicksLimit: 6,
                            padding: 8,
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return self.formatCurrency(value, self.currentCurrency);
                            }
                        }
                    }
                }
            }
        };
    }

    /**
     * Update chart with new value history data
     */
    updateChart(valueHistory) {
        if (!this.chart) {
            console.log('Chart not initialized yet');
            return;
        }

        console.log('Updating chart with value history:', valueHistory.length);

        // Store the raw data
        this.chartData = valueHistory;

        const dataPoints = this.processValueHistoryForChart(valueHistory);
        const filteredData = this.filterDataByPeriod(dataPoints, this.currentPeriod);

        this.chart.data.datasets[0].data = filteredData;

        // Calculate x-axis range
        const now = new Date();
        let xAxisMin, xAxisMax;

        if (this.currentPeriod === 'all') {
            if (filteredData.length > 0) {
                const xValues = filteredData.map(point => point.x);
                xAxisMin = Math.min(...xValues);
                xAxisMax = Math.max(...xValues);
            } else {
                xAxisMin = undefined;
                xAxisMax = undefined;
            }
        } else {
            // For specific periods, use actual data range if available
            if (filteredData.length > 0) {
                const xValues = filteredData.map(point => point.x);
                xAxisMin = Math.min(...xValues);
                xAxisMax = Math.max(...xValues);
            } else {
                // Fallback to period boundaries if no data
                let cutoffDate;
                switch (this.currentPeriod) {
                    case '1m': cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); break;
                    case '3m': cutoffDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); break;
                    case '6m': cutoffDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000)); break;
                    case '1y': cutoffDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)); break;
                    default: cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                xAxisMin = cutoffDate.getTime();
                xAxisMax = now.getTime();
            }
        }

        this.chart.options.scales.x.min = xAxisMin;
        this.chart.options.scales.x.max = xAxisMax;
        this.chart.options.scales.y.min = undefined;
        this.chart.options.scales.y.max = undefined;

        console.log('Setting x-axis range:', xAxisMin ? new Date(xAxisMin).toISOString() : 'undefined', 'to', xAxisMax ? new Date(xAxisMax).toISOString() : 'undefined');

        this.chart.update('active');
        console.log('Chart updated with', filteredData.length, 'data points');
    }

    /**
     * Change the time period filter
     */
    setPeriod(period) {
        this.currentPeriod = period;
        this.updateChart(this.chartData);
    }

    /**
     * Process value history into chart data points
     */
    processValueHistoryForChart(valueHistory) {
        if (!valueHistory || valueHistory.length === 0) {
            return [];
        }
            

        const dataPoints = [];
        valueHistory.forEach(entry => {
            const entryDate = new Date(entry.date);
            const value = entry.currentValue.currentValue;

            dataPoints.push({
                x: entryDate.getTime(),
                y: value,
                entry: entry
            });
        });

        return dataPoints;
    }

    /**
     * Filter data points by selected time period
     */
    filterDataByPeriod(dataPoints, period) {
        if (period === 'all' || dataPoints.length === 0) {
            return dataPoints;
        }

        const now = new Date();
        let cutoffDate;

        switch (period) {
            case '1m': cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); break;
            case '3m': cutoffDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); break;
            case '6m': cutoffDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000)); break;
            case '1y': cutoffDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)); break;
            default: return dataPoints;
        }

        const cutoffTimestamp = cutoffDate.getTime();
        const filteredPoints = dataPoints.filter(point => point.x >= cutoffTimestamp);

        console.log(`Filtered from ${dataPoints.length} to ${filteredPoints.length} points for period ${period}`);
        console.log('Cutoff date:', cutoffDate.toISOString());

        // If filtering removes all points, include the most recent point from before the cutoff
        if (filteredPoints.length === 0 && dataPoints.length > 0) {
            const pointsBeforeCutoff = dataPoints.filter(point => point.x < cutoffTimestamp);
            if (pointsBeforeCutoff.length > 0) {
                const mostRecentBeforeCutoff = pointsBeforeCutoff[pointsBeforeCutoff.length - 1];
                // Create a synthetic point at the cutoff date with the same value
                const syntheticPoint = {
                    x: cutoffTimestamp,
                    y: mostRecentBeforeCutoff.y,
                    synthetic: true,
                    entry: mostRecentBeforeCutoff.entry
                };
                console.log('No points in range, adding synthetic point at cutoff:', syntheticPoint);
                return [syntheticPoint];
            } else {
                console.log('No points in range and no points before cutoff');
                return [];
            }
        }

        // If we have filtered points, add a connecting point at the cutoff if needed
        if (filteredPoints.length > 0 && dataPoints.length > filteredPoints.length) {
            const firstFilteredPoint = filteredPoints[0];

            // If the first filtered point is not exactly at the cutoff,
            // add a synthetic point at the cutoff for better visualization
            if (firstFilteredPoint.x > cutoffTimestamp) {
                const pointsBeforeCutoff = dataPoints.filter(point => point.x < cutoffTimestamp);
                if (pointsBeforeCutoff.length > 0) {
                    const lastBeforeCutoff = pointsBeforeCutoff[pointsBeforeCutoff.length - 1];
                    const syntheticPoint = {
                        x: cutoffTimestamp,
                        y: lastBeforeCutoff.y,
                        synthetic: true,
                        entry: lastBeforeCutoff.entry
                    };
                    filteredPoints.unshift(syntheticPoint);
                    console.log('Added synthetic connecting point at cutoff');
                }
            }
        }

        return filteredPoints;
    }

    /**
     * Format currency value for display
     */
    formatCurrency(value, currency) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        } catch (e) {
            return `${currency} ${value.toLocaleString()}`;
        }
    }

    /**
     * Setup period button handlers
     */
    setupPeriodButtons(containerSelector = '.chart-controls') {
        const self = this;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('chart-period-btn')) {
                // Remove active class from all buttons
                document.querySelectorAll('.chart-period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Add active class to clicked button
                e.target.classList.add('active');

                // Update chart with new period
                const period = e.target.dataset.period;
                self.setPeriod(period);
            }
        });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValueChartManager;
}
