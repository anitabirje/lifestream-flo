import React from 'react';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartData[];
  size?: number;
  title?: string;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 200, title }) => {
  const radius = size / 2;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  let currentAngle = -90; // Start from top
  const slices = data.map((item) => {
    const percentage = total > 0 ? item.value / total : 0;
    const sliceAngle = percentage * 360;
    
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + sliceAngle) * Math.PI) / 180;
    
    const x1 = radius + (radius - 10) * Math.cos(startAngle);
    const y1 = radius + (radius - 10) * Math.sin(startAngle);
    const x2 = radius + (radius - 10) * Math.cos(endAngle);
    const y2 = radius + (radius - 10) * Math.sin(endAngle);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${radius} ${radius}`,
      `L ${x1} ${y1}`,
      `A ${radius - 10} ${radius - 10} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelX = radius + (radius - 25) * Math.cos(labelRad);
    const labelY = radius + (radius - 25) * Math.sin(labelRad);
    
    currentAngle += sliceAngle;
    
    return {
      path: pathData,
      color: item.color,
      percentage: (percentage * 100).toFixed(1),
      label: item.label,
      labelX,
      labelY,
      value: item.value
    };
  });
  
  return (
    <div className="pie-chart-container">
      {title && <h3 className="pie-chart-title">{title}</h3>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pie-chart">
        {slices.map((slice, index) => (
          <g key={index}>
            <path
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
            />
            {parseFloat(slice.percentage) > 5 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pie-chart-label"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                {slice.percentage}%
              </text>
            )}
          </g>
        ))}
      </svg>
      
      <div className="pie-chart-legend">
        {slices.map((slice, index) => (
          <div key={index} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: slice.color }}
            />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">{slice.value.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};
