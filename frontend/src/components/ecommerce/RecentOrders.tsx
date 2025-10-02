'use client';

import React from 'react';

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  product: string;
  amount: number;
  status: 'completed' | 'processing' | 'pending' | 'cancelled';
  date: string;
}

const RecentOrders: React.FC = () => {
  const orders: Order[] = [
    {
      id: '#12547',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@email.com',
      product: 'Weekly Meal Plan - Premium',
      amount: 89.99,
      status: 'completed',
      date: '2024-09-21'
    },
    {
      id: '#12546',
      customerName: 'Mike Chen',
      customerEmail: 'mike.chen@email.com',
      product: 'Protein Power Pack',
      amount: 129.99,
      status: 'processing',
      date: '2024-09-21'
    },
    {
      id: '#12545',
      customerName: 'Emily Davis',
      customerEmail: 'emily.davis@email.com',
      product: 'Vegan Deluxe Plan',
      amount: 79.99,
      status: 'completed',
      date: '2024-09-20'
    },
    {
      id: '#12544',
      customerName: 'James Wilson',
      customerEmail: 'j.wilson@email.com',
      product: 'Keto Starter Bundle',
      amount: 159.99,
      status: 'pending',
      date: '2024-09-20'
    },
    {
      id: '#12543',
      customerName: 'Lisa Thompson',
      customerEmail: 'lisa.t@email.com',
      product: 'Family Meal Plan',
      amount: 199.99,
      status: 'completed',
      date: '2024-09-19'
    },
    {
      id: '#12542',
      customerName: 'David Rodriguez',
      customerEmail: 'david.r@email.com',
      product: 'Gluten-Free Essentials',
      amount: 94.99,
      status: 'cancelled',
      date: '2024-09-19'
    }
  ];

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="rounded-lg bg-white shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all orders
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={order.product}>
                      {order.product}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${order.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {orders.length} of 247 orders</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-150">
              Previous
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-150">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;