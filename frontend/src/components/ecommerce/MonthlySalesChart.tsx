'use client';

import React from 'react';

const MonthlySalesChart: React.FC = () => {
  // Sample data for the chart
  const salesData = [
    { month: 'Jan', sales: 85000, orders: 890 },
    { month: 'Feb', sales: 92000, orders: 920 },
    { month: 'Mar', sales: 78000, orders: 810 },
    { month: 'Apr', sales: 105000, orders: 1050 },
    { month: 'May', sales: 118000, orders: 1180 },
    { month: 'Jun', sales: 134000, orders: 1340 },
    { month: 'Jul', sales: 142000, orders: 1420 },
    { month: 'Aug', sales: 138000, orders: 1380 },
    { month: 'Sep', sales: 124563, orders: 1247 }, // Current month
  ];

  const maxSales = Math.max(...salesData.map(d => d.sales));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Sales</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Orders</span>
            </div>
          </div>
        </div>

        <div className="relative h-64">
          <div className="absolute inset-0 flex items-end justify-between space-x-2">
            {salesData.map((data, index) => (
              <div key={data.month} className="flex-1 flex flex-col items-center space-y-2">
                {/* Sales bar */}
                <div className="w-full flex flex-col items-center space-y-1">
                  <div
                    className={`w-full rounded-t ${
                      index === salesData.length - 1
                        ? 'bg-blue-600'
                        : 'bg-blue-400'
                    } transition-all duration-300 hover:bg-blue-700`}
                    style={{
                      height: `${(data.sales / maxSales) * 180}px`,
                      minHeight: '20px'
                    }}
                    title={`Sales: $${data.sales.toLocaleString()}`}
                  />
                  <div className="text-xs text-gray-600 text-center">
                    ${(data.sales / 1000).toFixed(0)}k
                  </div>
                </div>

                {/* Month label */}
                <div className="text-xs font-medium text-gray-700">
                  {data.month}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              ${salesData[salesData.length - 1].sales.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              +12.5%
            </div>
            <div className="text-xs text-gray-500">Growth</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {salesData[salesData.length - 1].orders}
            </div>
            <div className="text-xs text-gray-500">Orders</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySalesChart;