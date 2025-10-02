'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  {
    name: 'Jan',
    revenue: 4000,
    profit: 2400,
  },
  {
    name: 'Feb',
    revenue: 3000,
    profit: 1398,
  },
  {
    name: 'Mar',
    revenue: 2000,
    profit: 9800,
  },
  {
    name: 'Apr',
    revenue: 2780,
    profit: 3908,
  },
  {
    name: 'May',
    revenue: 1890,
    profit: 4800,
  },
  {
    name: 'Jun',
    revenue: 2390,
    profit: 3800,
  },
  {
    name: 'Jul',
    revenue: 3490,
    profit: 4300,
  },
];

export default function LineChartOne() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Revenue & Profit Trends</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
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
          <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
          <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}