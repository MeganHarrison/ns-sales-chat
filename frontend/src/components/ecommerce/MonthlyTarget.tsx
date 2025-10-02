'use client';

import React from 'react';

const MonthlyTarget: React.FC = () => {
  const targetAmount = 150000;
  const currentAmount = 124563;
  const progress = (currentAmount / targetAmount) * 100;
  const remaining = targetAmount - currentAmount;
  const daysLeft = 8; // Days remaining in month

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Target</h3>
          <span className="text-sm text-gray-500">{daysLeft} days left</span>
        </div>

        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-gray-900">
            ${currentAmount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            of ${targetAmount.toLocaleString()} target
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{progress.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              ${remaining.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              ${Math.round(remaining / daysLeft).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Daily needed</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800">
              You're {progress > 80 ? 'on track' : 'behind'} to meet your monthly goal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTarget;