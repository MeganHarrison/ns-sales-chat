'use client';

import React, { useState } from 'react';

type StatisticsView = 'revenue' | 'orders' | 'customers';

const StatisticsChart: React.FC = () => {
  const [activeView, setActiveView] = useState<StatisticsView>('revenue');

  const data = {
    revenue: {
      title: 'Revenue Overview',
      current: '$124,563',
      previous: '$110,892',
      change: '+12.3%',
      chartData: [
        { label: 'Week 1', value: 28000, previousValue: 25000 },
        { label: 'Week 2', value: 32000, previousValue: 28000 },
        { label: 'Week 3', value: 35000, previousValue: 30000 },
        { label: 'Week 4', value: 29563, previousValue: 27892 },
      ]
    },
    orders: {
      title: 'Orders Overview',
      current: '1,247',
      previous: '1,109',
      change: '+12.4%',
      chartData: [
        { label: 'Week 1', value: 280, previousValue: 250 },
        { label: 'Week 2', value: 320, previousValue: 280 },
        { label: 'Week 3', value: 350, previousValue: 300 },
        { label: 'Week 4', value: 297, previousValue: 279 },
      ]
    },
    customers: {
      title: 'Customers Overview',
      current: '892',
      previous: '756',
      change: '+18.0%',
      chartData: [
        { label: 'Week 1', value: 210, previousValue: 180 },
        { label: 'Week 2', value: 230, previousValue: 190 },
        { label: 'Week 3', value: 250, previousValue: 200 },
        { label: 'Week 4', value: 202, previousValue: 186 },
      ]
    }
  };

  const currentData = data[activeView];
  const maxValue = Math.max(...currentData.chartData.flatMap(d => [d.value, d.previousValue]));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900">{currentData.title}</h3>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {Object.entries(data).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveView(key as StatisticsView)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
                  activeView === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{currentData.current}</div>
            <div className="text-sm text-gray-600">Current Period</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500">{currentData.previous}</div>
            <div className="text-sm text-gray-600">Previous Period</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentData.change}</div>
            <div className="text-sm text-gray-600">Change</div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-48">
          <div className="absolute inset-0 flex items-end justify-between space-x-4">
            {currentData.chartData.map((item, index) => (
              <div key={item.label} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full flex items-end justify-center space-x-1">
                  {/* Previous period bar */}
                  <div
                    className="bg-gray-300 rounded-t flex-1"
                    style={{
                      height: `${(item.previousValue / maxValue) * 140}px`,
                      minHeight: '10px',
                      maxWidth: '20px'
                    }}
                    title={`Previous: ${item.previousValue.toLocaleString()}`}
                  />
                  {/* Current period bar */}
                  <div
                    className="bg-blue-500 rounded-t flex-1 hover:bg-blue-600 transition-colors duration-200"
                    style={{
                      height: `${(item.value / maxValue) * 140}px`,
                      minHeight: '10px',
                      maxWidth: '20px'
                    }}
                    title={`Current: ${item.value.toLocaleString()}`}
                  />
                </div>
                <div className="text-xs font-medium text-gray-700">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Current Period</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">Previous Period</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsChart;