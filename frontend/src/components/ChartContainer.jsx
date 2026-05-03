import React from 'react';
import './Dashboard.css';

const ChartContainer = ({ title, children }) => {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      {children || <p>Chart data loading...</p>}
    </div>
  );
};

export default ChartContainer;
