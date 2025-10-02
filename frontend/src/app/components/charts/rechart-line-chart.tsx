import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from 'recharts';
const data = [
  {name: 'Page A', uv: 400, pv: 2400, amt: 2400},
  {name: 'Page B', uv: 300, pv: 1398, amt: 2210},
  {name: 'Page C', uv: 200, pv: 9800, amt: 2290},
  {name: 'Page D', uv: 278, pv: 3908, amt: 2000},
];

const MyChart = () => (
  <LineChart width={600} height={300} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
    <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
    <Line type="monotone" dataKey="uv" stroke="purple" strokeWidth={2} name="My data series name" />
    <XAxis dataKey="name" />
    <YAxis width="auto" label={{ value: 'UV', position: 'insideLeft', angle: -90 }} />
    <Legend align="right" />
    <Tooltip />
  </LineChart>
);

export default MyChart;