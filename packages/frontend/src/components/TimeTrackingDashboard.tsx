import React, { useState, useEffect } from 'react';
import { PieChart } from './PieChart';
import { BarChart } from './BarChart';
import { getWebSocketService, WebSocketMessage } from '../services/websocket-service';
import './TimeTrackingDashboard.css';

export interface TimeAllocationData {
  category: string;
  categoryId: string;
  actualHours: number;
  idealHours: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface ComparativeMetrics {
  averageTimePerCategory: Record<string, number>;
  familyMemberComparison: Record<string, Record<string, number>>;
}

export interface DashboardProps {
  familyMemberId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const TimeTrackingDashboard: React.FC<DashboardProps> = ({
  familyMemberId,
  startDate,
  endDate
}) => {
  const [allocations, setAllocations] = useState<TimeAllocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | undefined>(familyMemberId);
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(
    startDate ? startDate.toISOString().split('T')[0] : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string>(
    endDate ? endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [comparativeMetrics, setComparativeMetrics] = useState<ComparativeMetrics>({
    averageTimePerCategory: {},
    familyMemberComparison: {}
  });

  useEffect(() => {
    // Mock family members - in production, fetch from API
    setFamilyMembers([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' }
    ]);

    // Connect to WebSocket for real-time updates
    const wsService = getWebSocketService();
    
    const connectWebSocket = async () => {
      try {
        if (!wsService.isConnected()) {
          await wsService.connect();
        }
      } catch (err) {
        console.error('Failed to connect to WebSocket:', err);
      }
    };

    connectWebSocket();

    // Subscribe to real-time updates
    const unsubscribe = wsService.subscribe((message: WebSocketMessage) => {
      if (message.type === 'metrics_updated' || message.type === 'event_created' || 
          message.type === 'event_updated' || message.type === 'event_deleted') {
        // Refresh dashboard data when events change
        fetchDashboardData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedFamilyMemberId, selectedStartDate, selectedEndDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedFamilyMemberId) {
        params.append('familyMemberId', selectedFamilyMemberId);
      }
      if (selectedStartDate) {
        params.append('startDate', selectedStartDate);
      }
      if (selectedEndDate) {
        params.append('endDate', selectedEndDate);
      }

      // Fetch ideal allocations
      const idealResponse = await fetch(
        `/api/ideal-allocation?${params.toString()}`
      );
      
      if (!idealResponse.ok) {
        throw new Error('Failed to fetch ideal allocations');
      }

      const idealData = await idealResponse.json();

      // For now, mock actual time data (in production, this would come from events)
      const mockActualData = idealData.map((ideal: any) => ({
        category: ideal.categoryName,
        categoryId: ideal.categoryId,
        actualHours: Math.random() * ideal.targetValue * 1.5, // Mock actual hours
        idealHours: ideal.targetValue,
        percentage: 0, // Will be calculated
        color: getCategoryColor(ideal.categoryName),
        icon: getCategoryIcon(ideal.categoryName)
      }));

      // Calculate percentages
      const totalActualHours = mockActualData.reduce((sum: number, item: any) => sum + item.actualHours, 0);
      const dataWithPercentages = mockActualData.map((item: any) => ({
        ...item,
        percentage: totalActualHours > 0 ? (item.actualHours / totalActualHours) * 100 : 0
      }));

      setAllocations(dataWithPercentages);

      // Calculate comparative metrics
      const averageTimePerCategory: Record<string, number> = {};
      const familyMemberComparison: Record<string, Record<string, number>> = {};

      // Mock comparative data
      familyMembers.forEach(member => {
        familyMemberComparison[member.name] = {};
        dataWithPercentages.forEach((item: any) => {
          const mockValue = Math.random() * item.idealHours * 1.3;
          familyMemberComparison[member.name][item.category] = mockValue;
          
          if (!averageTimePerCategory[item.category]) {
            averageTimePerCategory[item.category] = 0;
          }
          averageTimePerCategory[item.category] += mockValue;
        });
      });

      // Calculate averages
      Object.keys(averageTimePerCategory).forEach(category => {
        averageTimePerCategory[category] /= familyMembers.length;
      });

      setComparativeMetrics({
        averageTimePerCategory,
        familyMemberComparison
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (categoryName: string): string => {
    const colors: Record<string, string> = {
      'Work': '#3B82F6',
      'Family Time': '#10B981',
      'Health/Fitness': '#EF4444',
      'Upskilling': '#8B5CF6',
      'Relaxation': '#F59E0B'
    };
    return colors[categoryName] || '#607D8B';
  };

  const getCategoryIcon = (categoryName: string): string => {
    const icons: Record<string, string> = {
      'Work': '💼',
      'Family Time': '👨‍👩‍👧‍👦',
      'Health/Fitness': '💪',
      'Upskilling': '📚',
      'Relaxation': '🧘'
    };
    return icons[categoryName] || '📌';
  };

  const calculateDeviation = (actual: number, ideal: number): number => {
    if (ideal === 0) return 0;
    return ((actual - ideal) / ideal) * 100;
  };

  const isSignificantDeviation = (actual: number, ideal: number): boolean => {
    const deviation = Math.abs(calculateDeviation(actual, ideal));
    return deviation > 20; // More than 20% difference
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const totalActualHours = allocations.reduce((sum, item) => sum + item.actualHours, 0);
  const totalIdealHours = allocations.reduce((sum, item) => sum + item.idealHours, 0);

  const pieChartData = allocations.map(a => ({
    label: a.category,
    value: a.actualHours,
    color: a.color
  }));

  const barChartData = allocations.map(a => ({
    label: a.category,
    value: a.actualHours,
    idealValue: a.idealHours,
    color: a.color
  }));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Time Tracking Dashboard</h1>
        <p>Compare your actual time allocation with your ideal preferences</p>
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <label htmlFor="family-member-select">Family Member:</label>
          <select
            id="family-member-select"
            value={selectedFamilyMemberId || ''}
            onChange={(e) => setSelectedFamilyMemberId(e.target.value || undefined)}
            className="filter-select"
          >
            <option value="">All Family Members</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="start-date-input">Start Date:</label>
          <input
            id="start-date-input"
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="end-date-input">End Date:</label>
          <input
            id="end-date-input"
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Actual Hours</h3>
          <div className="summary-value">{totalActualHours.toFixed(1)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Ideal Hours</h3>
          <div className="summary-value">{totalIdealHours.toFixed(1)}</div>
        </div>
        <div className="summary-card">
          <h3>Overall Deviation</h3>
          <div className={`summary-value ${Math.abs(totalActualHours - totalIdealHours) > totalIdealHours * 0.2 ? 'deviation-high' : ''}`}>
            {calculateDeviation(totalActualHours, totalIdealHours).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="dashboard-visualizations">
        <div className="visualization-section">
          <PieChart data={pieChartData} size={300} title="Time Allocation Breakdown" />
        </div>
        <div className="visualization-section">
          <BarChart data={barChartData} title="Actual vs Ideal Hours" showIdeal={true} />
        </div>
      </div>

      <div className="comparative-metrics-section">
        <h2>Comparative Metrics</h2>
        
        <div className="metrics-grid">
          <div className="metrics-card">
            <h3>Average Time Per Activity (All Family Members)</h3>
            <div className="metrics-list">
              {Object.entries(comparativeMetrics.averageTimePerCategory).map(([category, hours]) => (
                <div key={category} className="metric-item">
                  <span className="metric-label">{category}</span>
                  <span className="metric-value">{(hours as number).toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </div>

          <div className="metrics-card">
            <h3>Family Member Comparison</h3>
            <div className="comparison-table">
              <div className="table-header">
                <div className="table-cell">Member</div>
                {allocations.map(a => (
                  <div key={a.categoryId} className="table-cell">{a.category}</div>
                ))}
              </div>
              {Object.entries(comparativeMetrics.familyMemberComparison).map(([memberName, categories]) => (
                <div key={memberName} className="table-row">
                  <div className="table-cell">{memberName}</div>
                  {allocations.map(a => (
                    <div key={a.categoryId} className="table-cell">
                      {(categories[a.category] || 0).toFixed(1)}h
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="allocations-grid">
        {allocations.map((allocation) => {
          const deviation = calculateDeviation(allocation.actualHours, allocation.idealHours);
          const hasSignificantDeviation = isSignificantDeviation(allocation.actualHours, allocation.idealHours);

          return (
            <div 
              key={allocation.categoryId} 
              className={`allocation-card ${hasSignificantDeviation ? 'significant-deviation' : ''}`}
            >
              <div className="card-header">
                <span className="category-icon" style={{ backgroundColor: allocation.color }}>
                  {allocation.icon}
                </span>
                <h3>{allocation.category}</h3>
              </div>

              <div className="card-content">
                <div className="time-comparison">
                  <div className="time-item">
                    <span className="label">Actual</span>
                    <span className="value">{allocation.actualHours.toFixed(1)}h</span>
                  </div>
                  <div className="time-divider">vs</div>
                  <div className="time-item">
                    <span className="label">Ideal</span>
                    <span className="value">{allocation.idealHours.toFixed(1)}h</span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min((allocation.actualHours / allocation.idealHours) * 100, 100)}%`,
                      backgroundColor: allocation.color
                    }}
                  />
                </div>

                <div className={`deviation ${deviation > 0 ? 'positive' : 'negative'}`}>
                  <span className="deviation-label">Deviation:</span>
                  <span className="deviation-value">
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </span>
                </div>

                {hasSignificantDeviation && (
                  <div className="deviation-warning">
                    ⚠️ Significant deviation from ideal allocation
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allocations.length === 0 && (
        <div className="empty-state">
          <p>No time allocation data available</p>
          <p>Set your ideal time allocation preferences to get started</p>
        </div>
      )}
    </div>
  );
};
