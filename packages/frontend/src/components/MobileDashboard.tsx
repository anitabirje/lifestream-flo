/**
 * Mobile Dashboard Component
 * Optimized dashboard view for mobile devices
 * Requirements: 2.1, 2.2, 2.3
 */

import React, { useState } from 'react';
import './MobileDashboard.css';

export interface TimeAllocationData {
  category: string;
  actualHours: number;
  idealHours: number;
  percentage: number;
  color: string;
}

export interface MobileDashboardProps {
  allocations: TimeAllocationData[];
  loading?: boolean;
  onCategoryClick?: (category: string) => void;
}

/**
 * Mobile Dashboard Component
 * Displays time allocation metrics in mobile-optimized format
 */
export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  allocations,
  loading = false,
  onCategoryClick,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    onCategoryClick?.(category);
  };

  const totalActualHours = allocations.reduce((sum, item) => sum + item.actualHours, 0);
  const totalIdealHours = allocations.reduce((sum, item) => sum + item.idealHours, 0);

  const calculateDeviation = (actual: number, ideal: number): number => {
    if (ideal === 0) return 0;
    return ((actual - ideal) / ideal) * 100;
  };

  const isSignificantDeviation = (actual: number, ideal: number): boolean => {
    const deviation = Math.abs(calculateDeviation(actual, ideal));
    return deviation > 20;
  };

  if (loading) {
    return (
      <div className="mobile-dashboard-container">
        <div className="mobile-loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="mobile-dashboard-container">
      {/* Header */}
      <div className="mobile-dashboard-header">
        <h1>Time Tracking</h1>
        <p>Weekly allocation overview</p>
      </div>

      {/* Summary Cards */}
      <div className="mobile-summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Actual</div>
          <div className="summary-value">{totalActualHours.toFixed(1)}h</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Ideal</div>
          <div className="summary-value">{totalIdealHours.toFixed(1)}h</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Deviation</div>
          <div className={`summary-value ${Math.abs(totalActualHours - totalIdealHours) > totalIdealHours * 0.2 ? 'deviation-high' : ''}`}>
            {calculateDeviation(totalActualHours, totalIdealHours).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Allocations List */}
      <div className="mobile-allocations-list">
        {allocations.length === 0 ? (
          <div className="no-allocations">
            <p>No time allocation data available</p>
          </div>
        ) : (
          allocations.map((allocation) => {
            const deviation = calculateDeviation(allocation.actualHours, allocation.idealHours);
            const hasSignificantDeviation = isSignificantDeviation(allocation.actualHours, allocation.idealHours);

            return (
              <div
                key={allocation.category}
                className={`mobile-allocation-card ${selectedCategory === allocation.category ? 'selected' : ''} ${hasSignificantDeviation ? 'significant-deviation' : ''}`}
                onClick={() => handleCategoryClick(allocation.category)}
              >
                <div className="allocation-header">
                  <div className="allocation-title">
                    <div
                      className="category-color"
                      style={{ backgroundColor: allocation.color }}
                    />
                    <h3>{allocation.category}</h3>
                  </div>
                  <div className="allocation-percentage">{allocation.percentage.toFixed(1)}%</div>
                </div>

                <div className="allocation-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((allocation.actualHours / allocation.idealHours) * 100, 100)}%`,
                        backgroundColor: allocation.color,
                      }}
                    />
                  </div>
                </div>

                <div className="allocation-times">
                  <div className="time-item">
                    <span className="time-label">Actual</span>
                    <span className="time-value">{allocation.actualHours.toFixed(1)}h</span>
                  </div>
                  <div className="time-divider">/</div>
                  <div className="time-item">
                    <span className="time-label">Ideal</span>
                    <span className="time-value">{allocation.idealHours.toFixed(1)}h</span>
                  </div>
                </div>

                <div className={`allocation-deviation ${deviation > 0 ? 'positive' : 'negative'}`}>
                  <span className="deviation-label">Deviation:</span>
                  <span className="deviation-value">
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </span>
                </div>

                {hasSignificantDeviation && (
                  <div className="deviation-warning">
                    ⚠️ Significant deviation from ideal
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mobile-dashboard-footer">
        <p>Tap a category to see more details</p>
      </div>
    </div>
  );
};

export default MobileDashboard;
