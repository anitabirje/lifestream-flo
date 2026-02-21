import React from 'react';

export interface BarChartData {
  label: string;
  value: number;
  color: string;
  idealValue?: number;
}

export interface BarChartProps {
  data: BarChartData[];
  title?: string;
  showIdeal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, showIdeal = false }) => {
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.value, d.idealValue || 0))
  );
  
  return (
    <div className="bar-chart-container">
      {title && <h3 className="bar-chart-title">{title}</h3>}
      <div className="bar-chart">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const idealPercentage = item.idealValue ? (item.idealValue / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="bar-item">
              <div className="bar-label">{item.label}</div>
              <div className="bar-container">
                {showIdeal && item.idealValue && (
                  <div
                    className="bar-ideal"
                    style={{
                      width: `${idealPercentage}%`,
                      backgroundColor: '#e5e7eb'
                    }}
                    title={`Ideal: ${item.idealValue.toFixed(1)}h`}
                  />
                )}
                <div
                  className="bar-actual"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color
                  }}
                  title={`Actual: ${item.value.toFixed(1)}h`}
                />
              </div>
              <div className="bar-value">
                {item.value.toFixed(1)}h
                {showIdeal && item.idealValue && (
                  <span className="bar-ideal-value"> / {item.idealValue.toFixed(1)}h</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
