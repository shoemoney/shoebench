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
import { useIsMobile } from "@/hooks/use-mobile";

import type { TierAccuracy } from "@/lib/types";

interface TierAccuracyChartProps {
  data: TierAccuracy[];
  selectedModels: string[];
  getModelColor: (modelName: string) => string;
}

type TierChartData = {
  tier: string;
  tierLabel: string;
  [modelName: string]: number | string;
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

export function TierAccuracyChart({
  data,
  selectedModels,
  getModelColor,
}: TierAccuracyChartProps) {
  const isMobile = useIsMobile();

  // Filter data by selected models
  const filteredData = data.filter((d) => selectedModels.includes(d.modelName));

  // Get unique models from filtered data
  const models = [...new Set(filteredData.map((d) => d.modelName))];

  // Transform data for grouped bar chart
  // Structure: [{ tier: 'easy', tierLabel: 'Easy', 'model1': 80, 'model2': 75, ... }]
  const chartData: TierChartData[] = TIER_ORDER.filter((tier) =>
    filteredData.some((d) => d.tier === tier)
  ).map((tier) => {
    const row: TierChartData = {
      tier,
      tierLabel: TIER_LABELS[tier] || tier,
    };

    models.forEach((modelName) => {
      const entry = filteredData.find(
        (d) => d.tier === tier && d.modelName === modelName
      );
      // Use short model name for data key
      const shortName = modelName
        .replace("openai/", "")
        .replace("anthropic/", "")
        .replace("google/", "")
        .replace("meta-llama/", "");
      row[shortName] = entry ? entry.accuracyPercent : 0;
    });

    return row;
  });

  // Get short model names for bars
  const modelBars = models.map((fullName) => ({
    fullName,
    shortName: fullName
      .replace("openai/", "")
      .replace("anthropic/", "")
      .replace("google/", "")
      .replace("meta-llama/", ""),
    color: getModelColor(fullName),
  }));

  const mobileBarHeight = Math.max(320, chartData.length * 100 + 120);

  // Create chart config for shadcn ChartContainer
  const chartConfig = modelBars.reduce(
    (acc, m) => {
      acc[m.shortName] = {
        label: m.shortName,
        color: m.color,
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[420px] sm:h-[520px] w-full"
      style={isMobile ? { height: mobileBarHeight } : undefined}
    >
      <BarChart
        data={chartData}
        layout={isMobile ? "vertical" : "horizontal"}
        margin={
          isMobile
            ? { top: 10, right: 24, left: 70, bottom: 24 }
            : { top: 10, right: 24, left: 12, bottom: 24 }
        }
      >
        <defs>
          {modelBars.map((m) => {
            const id = getGradientId("tier", m.shortName);
            return (
              <linearGradient
                key={id}
                id={id}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={withAlpha(m.color, 0.95)} />
                <stop offset="100%" stopColor={withAlpha(m.color, 0.55)} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
        {isMobile ? (
          <>
            <XAxis
              type="number"
              domain={[0, 100]}
              label={{
                value: "Accuracy (%)",
                position: "insideBottom",
                offset: -10,
                fill: "#9ca3af",
              }}
              stroke="#9ca3af"
            />
            <YAxis
              type="category"
              dataKey="tierLabel"
              width={60}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              stroke="#9ca3af"
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="tierLabel"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              stroke="#9ca3af"
            />
            <YAxis
              domain={[0, 100]}
              label={{
                value: "Accuracy (%)",
                angle: -90,
                position: "insideLeft",
                fill: "#9ca3af",
              }}
              stroke="#9ca3af"
            />
          </>
        )}
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border border-white/10 bg-neutral-900/95 p-3 text-neutral-100 shadow-xl">
                  <p className="font-semibold mb-2">{label}</p>
                  {payload.map((entry: any) => (
                    <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-neutral-300">{entry.dataKey}:</span>
                      <span className="font-medium">{entry.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        {modelBars.map((m) => (
          <Bar
            key={m.shortName}
            dataKey={m.shortName}
            fill={`url(#${getGradientId("tier", m.shortName)})`}
            radius={isMobile ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          >
            {!isMobile && (
              <LabelList
                dataKey={m.shortName}
                position="top"
                content={(props: any) => {
                  const x = Number(props?.x ?? 0);
                  const y = Number(props?.y ?? 0);
                  const width = Number(props?.width ?? 0);
                  const value = Number(props?.value ?? 0);
                  const cx = x + width / 2;
                  const cy = y - 6;
                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      className="pointer-events-none text-[10px] font-medium fill-neutral-300"
                    >
                      {value.toFixed(0)}%
                    </text>
                  );
                }}
              />
            )}
            {chartData.map((entry, index) => (
              <Cell
                key={`${m.shortName}-${index}`}
                fill={`url(#${getGradientId("tier", m.shortName)})`}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}
