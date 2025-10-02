'use client';

import React, { useState } from 'react';

type DemographicType = 'age' | 'location' | 'gender';

interface DemographicData {
  age: Array<{ label: string; value: number; percentage: number; color: string }>;
  location: Array<{ label: string; value: number; percentage: number; color: string }>;
  gender: Array<{ label: string; value: number; percentage: number; color: string }>;
}

const DemographicCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DemographicType>('age');

  const demographicData: DemographicData = {
    age: [
      { label: '18-24', value: 156, percentage: 17.5, color: 'bg-blue-500' },
      { label: '25-34', value: 312, percentage: 35.0, color: 'bg-blue-400' },
      { label: '35-44', value: 267, percentage: 29.9, color: 'bg-blue-300' },
      { label: '45-54', value: 134, percentage: 15.0, color: 'bg-blue-200' },
      { label: '55+', value: 23, percentage: 2.6, color: 'bg-blue-100' },
    ],
    location: [
      { label: 'California', value: 234, percentage: 26.2, color: 'bg-green-500' },
      { label: 'Texas', value: 178, percentage: 20.0, color: 'bg-green-400' },
      { label: 'New York', value: 145, percentage: 16.3, color: 'bg-green-300' },
      { label: 'Florida', value: 112, percentage: 12.6, color: 'bg-green-200' },
      { label: 'Others', value: 223, percentage: 25.0, color: 'bg-green-100' },
    ],
    gender: [
      { label: 'Female', value: 534, percentage: 59.9, color: 'bg-purple-500' },
      { label: 'Male', value: 312, percentage: 35.0, color: 'bg-purple-400' },
      { label: 'Other', value: 45, percentage: 5.1, color: 'bg-purple-300' },
    ],
  };

  const currentData = demographicData[activeTab];
  const totalCustomers = currentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900">Customer Demographics</h3>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {Object.keys(demographicData).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as DemographicType)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
                  activeTab === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Customers</div>
        </div>

        {/* Chart */}
        <div className="space-y-4">
          {currentData.map((item, index) => (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{item.value}</span>
                  <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${item.color} h-2 rounded-full transition-all duration-500 ease-out`}
                  style={{
                    width: `${item.percentage}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {currentData[0]?.label || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Most Common</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {currentData.length}
            </div>
            <div className="text-xs text-gray-500">Categories</div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="text-sm text-blue-800">
              {activeTab === 'age' && "Your primary customer base is millennials (25-34), representing 35% of all customers."}
              {activeTab === 'location' && "California leads with 26.2% of customers, followed by Texas at 20%."}
              {activeTab === 'gender' && "Female customers make up nearly 60% of your customer base."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicCard;