"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

import type { TierAccuracy } from "@/lib/types";
import { formatModelName } from "@/lib/modelUtils";

interface TierAccuracyChartProps {
  data: TierAccuracy[];
  selectedModels: string[];
  getModelColor: (modelName: string) => string;
}

type SingleTierChartData = {
  modelName: string;
  shortName: string;
  accuracy: number;
  color: string;
};

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("hsl("))
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  if (color.startsWith("rgb("))
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  return color;
}

function getGradientId(prefix: string, model: string) {
  return `${prefix}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

const TIER_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const TIER_ORDER = ["easy", "medium", "hard"];

function SingleTierChart({
  tier,
  tierLabel,
  data,
}: {
  tier: string;
  tierLabel: string;
  data: SingleTierChartData[];
}) {
  // Sort by accuracy descending
  const sortedData = [...data].sort((a, b) => b.accuracy - a.accuracy);

  const chartHeight = Math.max(200, sortedData.length * 40 + 60);

  const chartConfig = sortedData.reduce(
    (acc, d) => {
      acc[d.shortName] = {
        label: d.shortName,
        color: d.color,
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-neutral-200 mb-2 px-1">{tierLabel}</h3>
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ height: chartHeight }}
      >
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 140, bottom: 5 }}
        >
          <defs>
            {sortedData.map((d) => {
              const id = getGradientId(`tier-${tier}`, d.shortName);
              return (
                <linearGradient
                  key={id}
                  id={id}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={withAlpha(d.color, 0.95)} />
                  <stop offset="100%" stopColor={withAlpha(d.color, 0.75)} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#303341" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            stroke="#9ca3af"
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={130}
            tick={{ fontSize: 12, fill: "#d1d5db" }}
            stroke="#9ca3af"
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as SingleTierChartData;
                return (
                  <div className="rounded-lg border border-white/10 bg-neutral-900/95 p-3 text-neutral-100 shadow-xl">
                    <p className="font-semibold mb-1">{d.shortName}</p>
                    <p className="text-sm">
                      <span className="text-neutral-400">Accuracy:</span>{" "}
                      <span className="font-medium">{d.accuracy.toFixed(1)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="accuracy"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="accuracy"
              position="right"
              content={(props: any) => {
                const x = Number(props?.x ?? 0);
                const y = Number(props?.y ?? 0);
                const width = Number(props?.width ?? 0);
                const height = Number(props?.height ?? 0);
                const value = Number(props?.value ?? 0);
                return (
                  <text
                    x={x + width + 8}
                    y={y + height / 2 + 4}
                    className="text-xs font-medium fill-neutral-300"
                  >
                    {value.toFixed(1)}%
                  </text>
                );
              }}
            />
            {sortedData.map((d, index) => (
              <Cell
                key={`${d.shortName}-${index}`}
                fill={`url(#${getGradientId(`tier-${tier}`, d.shortName)})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function TierAccuracyChart({
  data,
  selectedModels,
  getModelColor,
}: TierAccuracyChartProps) {
  // Filter data by selected models
  const filteredData = data.filter((d) => selectedModels.includes(d.modelName));

  // Group data by tier
  const tierData = TIER_ORDER.map((tier) => {
    const tierEntries = filteredData.filter((d) => d.tier === tier);
    const chartData: SingleTierChartData[] = tierEntries.map((entry) => ({
      modelName: entry.modelName,
      shortName: formatModelName(entry.modelName),
      accuracy: entry.accuracyPercent,
      color: getModelColor(entry.modelName),
    }));
    return {
      tier,
      tierLabel: TIER_LABELS[tier] || tier,
      data: chartData,
    };
  }).filter((t) => t.data.length > 0);

  return (
    <div className="flex flex-col gap-6 w-full">
      {tierData.map((t) => (
        <SingleTierChart
          key={t.tier}
          tier={t.tier}
          tierLabel={t.tierLabel}
          data={t.data}
        />
      ))}
    </div>
  );
}
