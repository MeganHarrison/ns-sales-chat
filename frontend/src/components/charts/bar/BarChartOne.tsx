'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  {
    name: 'Jan',
    revenue: 4000,
    orders: 2400,
  },
  {
    name: 'Feb',
    revenue: 3000,
    orders: 1398,
  },
  {
    name: 'Mar',
    revenue: 2000,
    orders: 9800,
  },
  {
    name: 'Apr',
    revenue: 2780,
    orders: 3908,
  },
  {
    name: 'May',
    revenue: 1890,
    orders: 4800,
  },
  {
    name: 'Jun',
    revenue: 2390,
    orders: 3800,
  },
  {
    name: 'Jul',
    revenue: 3490,
    orders: 4300,
  },
];

export default function BarChartOne() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Revenue & Orders</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#8884d8" />
          <Bar dataKey="orders" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}