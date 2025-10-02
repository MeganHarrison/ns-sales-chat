'use client';

import { useEffect, useState } from 'react';
import { KeapOrder, KeapOrderStatus } from '@/lib/keap/keap-types';
import * as utils from '@/lib/keap/keap-utils';

export default function KeapOrdersPage() {
  const [orders, setOrders] = useState<KeapOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Get last 90 days of orders
      const since = new Date();
      since.setDate(since.getDate() - 90);

      // Use API route instead of direct API call
      const response = await fetch(`/api/keap/orders?since=${since.toISOString()}&limit=100`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.items || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = utils.getOrderStats(orders);
  const monthlyRevenue = utils.generateMonthlyRevenueReport(orders);
  const totalRevenue = utils.calculateTotalRevenue(orders);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading orders...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Keap Orders</h1>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <div className="text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <div className="text-gray-600">Paid Orders</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-gray-600">Pending</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            ${stats.averageOrderValue.toFixed(2)}
          </div>
          <div className="text-gray-600">Avg Order Value</div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Revenue</h2>
        <div className="space-y-2">
          {monthlyRevenue.map(({ month, revenue, count }) => (
            <div key={month} className="flex items-center">
              <div className="w-24 text-sm text-gray-600">{month}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                <div
                  className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(revenue / Math.max(...monthlyRevenue.map(m => m.revenue))) * 100}%` }}
                >
                  <span className="text-white text-xs font-medium">
                    ${revenue.toFixed(0)} ({count})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Items
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {order.order_number || order.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.contact.given_name} {order.contact.family_name}
                  <div className="text-xs text-gray-400">{order.contact.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full
                    ${order.status === KeapOrderStatus.PAID ? 'bg-green-100 text-green-800' : ''}
                    ${order.status === KeapOrderStatus.DRAFT ? 'bg-gray-100 text-gray-800' : ''}
                    ${order.status === KeapOrderStatus.SENT ? 'bg-blue-100 text-blue-800' : ''}
                    ${order.status === KeapOrderStatus.REFUNDED ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {utils.formatMoney(order.total)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.order_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.order_items.length} items
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            const csv = utils.exportOrdersToCSV(orders);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `keap-orders-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Export to CSV
        </button>
      </div>
    </div>
  );
}