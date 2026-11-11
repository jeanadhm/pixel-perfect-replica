import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const C = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;
const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
const tip = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export type SeriesDef = { key: string; name: string; color: string; axis?: "left" | "right" };

export function LinesChart({
  data,
  series,
  height = 280,
  reversed,
}: {
  data: object[];
  series: SeriesDef[];
  height?: number;
  reversed?: boolean;
}) {
  const hasRight = series.some((s) => s.axis === "right");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis yAxisId="left" {...axis} reversed={reversed} />
        {hasRight && <YAxis yAxisId="right" orientation="right" {...axis} />}
        <Tooltip {...tip} />
        {series.map((s) => (
          <Line
            key={s.key}
            yAxisId={s.axis ?? "left"}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaDuo({
  data,
  a,
  b,
  height = 260,
}: {
  data: object[];
  a: SeriesDef;
  b: SeriesDef;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis yAxisId="l" {...axis} />
        <YAxis yAxisId="r" orientation="right" {...axis} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId="l"
          type="monotone"
          dataKey={a.key}
          name={a.name}
          stroke={a.color}
          fill={a.color}
          fillOpacity={0.08}
          strokeWidth={2}
        />
        <Area
          yAxisId="r"
          type="monotone"
          dataKey={b.key}
          name={b.name}
          stroke={b.color}
          fill={b.color}
          fillOpacity={0.08}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  height = 220,
  colors = C,
}: {
  data: { name: string; value: number }[];
  height?: number;
  colors?: readonly string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="88%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tip} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data,
  bars,
  height = 240,
  layout = "horizontal",
}: {
  data: object[];
  bars: SeriesDef[];
  height?: number;
  layout?: "horizontal" | "vertical";
}) {
  const v = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 5, left: v ? 20 : -10, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border)" vertical={v} horizontal={!v} />
        {v ? (
          <>
            <XAxis type="number" {...axis} />
            <YAxis type="category" dataKey="label" {...axis} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
          </>
        )}
        <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color}
            radius={v ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LegendList({
  data,
  colors = C,
}: {
  data: { name: string; value: number }[];
  colors?: readonly string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="space-y-1.5 text-sm">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
          <span className="flex-1 text-muted-foreground">{d.name}</span>
          <span className="font-semibold tabular">{d.value}</span>
          <span className="w-10 text-right text-xs text-muted-foreground tabular">
            {Math.round((d.value / total) * 100)} %
          </span>
        </li>
      ))}
    </ul>
  );
}
