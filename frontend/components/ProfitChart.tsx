import React, { useEffect, useRef } from 'react';
import type { ChartData, ChartOptions, Chart } from 'chart.js'; // Import Chart type

// Make sure Chart.js is globally available or correctly imported if using a bundler
// For CDN usage, window.Chart should be available.

interface ProfitChartProps {
  data: ChartData;
  options: ChartOptions;
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ data, options }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null); // Store Chart instance

  useEffect(() => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Destroy previous chart instance if it exists
        if (chartRef.current) {
          chartRef.current.destroy();
        }
        // Create new chart instance
        // Access Chart constructor from window object as it's loaded via CDN
        const ChartJS = (window as any).Chart;
        if (ChartJS) {
            chartRef.current = new ChartJS(context, {
              type: 'line', // Default type, can be overridden by options if needed
              data: data,
              options: options,
            });
        } else {
            console.error("Chart.js not found on window object.");
        }
      }
    }

    // Cleanup function to destroy chart when component unmounts or before re-render
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, options]); // Re-create chart if data or options change

  return <canvas ref={canvasRef} aria-label="Gráfico de lucratividade" role="img"></canvas>;
};
