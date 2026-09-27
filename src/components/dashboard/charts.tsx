"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#1E3A5F", "#0D9488", "#EA580C", "#CA8A04", "#64748B", "#DC2626"];

export function TicketStatusChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#1E3A5F" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriorityChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
