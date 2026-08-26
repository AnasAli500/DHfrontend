import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

export const StudentGrowthChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="_id" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="count" stroke="#9333ea" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const AttendanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie data={data} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={100} label>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

export const ExamPerformanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="_id" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const ClassDistributionChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="className" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
