/**
 * Weather Display Component
 * Shows weather icons and information alongside calendar events
 */

import React from 'react';

/**
 * Weather data interface
 */
export interface WeatherData {
  date: string;
  location: string;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  aqi: number;
  uvIndex: number;
  precipitationChance: number;
  conditions: string;
}

/**
 * Weather display props
 */
export interface WeatherDisplayProps {
  weatherData: WeatherData;
  compact?: boolean; // Compact mode for inline display
  showDetails?: boolean; // Show detailed information
}

/**
 * Get weather icon based on conditions
 */
const getWeatherIcon = (conditions: string): string => {
  const conditionsLower = conditions.toLowerCase();
  
  if (conditionsLower.includes('rain') || conditionsLower.includes('drizzle')) {
    return '🌧️';
  }
  if (conditionsLower.includes('cloud')) {
    return '☁️';
  }
  if (conditionsLower.includes('sun') || conditionsLower.includes('clear')) {
    return '☀️';
  }
  if (conditionsLower.includes('snow')) {
    return '❄️';
  }
  if (conditionsLower.includes('storm') || conditionsLower.includes('thunder')) {
    return '⛈️';
  }
  if (conditionsLower.includes('fog') || conditionsLower.includes('mist')) {
    return '🌫️';
  }
  if (conditionsLower.includes('wind')) {
    return '💨';
  }
  
  return '🌤️'; // Partly cloudy default
};

/**
 * Get precipitation icon
 */
const getPrecipitationIcon = (chance: number): string => {
  if (chance >= 70) return '☔';
  if (chance >= 40) return '🌂';
  return '💧';
};

/**
 * Get AQI color
 */
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '#00e400'; // Good
  if (aqi <= 100) return '#ffff00'; // Moderate
  if (aqi <= 150) return '#ff7e00'; // Unhealthy for sensitive groups
  if (aqi <= 200) return '#ff0000'; // Unhealthy
  if (aqi <= 300) return '#8f3f97'; // Very unhealthy
  return '#7e0023'; // Hazardous
};

/**
 * Get UV index color
 */
const getUVColor = (uvIndex: number): string => {
  if (uvIndex <= 2) return '#289500'; // Low
  if (uvIndex <= 5) return '#f7e400'; // Moderate
  if (uvIndex <= 7) return '#f85900'; // High
  if (uvIndex <= 10) return '#d8001d'; // Very high
  return '#6b49c8'; // Extreme
};

/**
 * Weather Display Component
 */
export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  weatherData,
  compact = false,
  showDetails = true
}) => {
  const weatherIcon = getWeatherIcon(weatherData.conditions);
  const precipIcon = getPrecipitationIcon(weatherData.precipitationChance);

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <span style={styles.icon}>{weatherIcon}</span>
        <span style={styles.temperature}>
          {weatherData.temperature}°{weatherData.temperatureUnit}
        </span>
        {weatherData.precipitationChance > 30 && (
          <span style={styles.precipitation}>
            {precipIcon} {weatherData.precipitationChance}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.largeIcon}>{weatherIcon}</span>
        <div style={styles.mainInfo}>
          <div style={styles.temperature}>
            {weatherData.temperature}°{weatherData.temperatureUnit}
          </div>
          <div style={styles.conditions}>{weatherData.conditions}</div>
        </div>
      </div>

      {showDetails && (
        <div style={styles.details}>
          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>{precipIcon}</span>
            <span style={styles.detailLabel}>Precipitation:</span>
            <span style={styles.detailValue}>{weatherData.precipitationChance}%</span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>☀️</span>
            <span style={styles.detailLabel}>UV Index:</span>
            <span 
              style={{
                ...styles.detailValue,
                color: getUVColor(weatherData.uvIndex),
                fontWeight: 'bold'
              }}
            >
              {weatherData.uvIndex}
            </span>
          </div>

          <div style={styles.detailItem}>
            <span style={styles.detailIcon}>🌬️</span>
            <span style={styles.detailLabel}>AQI:</span>
            <span 
              style={{
                ...styles.detailValue,
                color: getAQIColor(weatherData.aqi),
                fontWeight: 'bold'
              }}
            >
              {weatherData.aqi}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Styles
 */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    minWidth: '200px'
  },
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  largeIcon: {
    fontSize: '48px'
  },
  icon: {
    fontSize: '20px'
  },
  mainInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  temperature: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },
  conditions: {
    fontSize: '14px',
    color: '#666'
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #e0e0e0'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  detailIcon: {
    fontSize: '18px'
  },
  detailLabel: {
    color: '#666',
    flex: 1
  },
  detailValue: {
    fontWeight: '500',
    color: '#333'
  },
  precipitation: {
    fontSize: '12px',
    color: '#666'
  }
};

export default WeatherDisplay;
