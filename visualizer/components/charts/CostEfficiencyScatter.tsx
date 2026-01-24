"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";

import type { ModelMetrics } from "@/lib/types";

interface CostEfficiencyScatterProps {
  data: ModelMetrics[];
  selectedModels: string[];
  getModelColor: (modelName: string) => string;
}

type ScatterDataPoint = {
  model: string;
  fullModel: string;
  accuracy: number;
  cost: number;
  accuracyPerDollar: number;
};

function currency(n: number) {
  return `$${n.toFixed(4)}`;
}

export function CostEfficiencyScatter({
  data,
  selectedModels,
  getModelColor,
}: CostEfficiencyScatterProps) {
  const isMobile = useIsMobile();

  // Filter data by selected models
  const filteredData = data.filter((d) => selectedModels.includes(d.modelName));

  // Transform for scatter chart
  const scatterData: ScatterDataPoint[] = filteredData.map((m) => {
    const shortName = m.modelName
      .replace("openai/", "")
      .replace("anthropic/", "")
      .replace("google/", "")
      .replace("meta-llama/", "");

    const accuracyPerDollar = m.totalCost > 0
      ? m.overallAccuracy / m.totalCost
      : 0;

    return {
      model: shortName,
      fullModel: m.modelName,
      accuracy: m.overallAccuracy,
      cost: m.totalCost,
      accuracyPerDollar,
    };
  });

  // Calculate mean accuracy for reference line
  const meanAccuracy = scatterData.length > 0
    ? scatterData.reduce((sum, d) => sum + d.accuracy, 0) / scatterData.length
    : 0;

  return (
    <ChartContainer
      config={{
        accuracy: {
          label: "Accuracy",
          color: "hsl(142, 76%, 36%)",
        },
      }}
      className="h-[420px] sm:h-[520px] w-full"
      style={isMobile ? { height: 360 } : undefined}
    >
      <ScatterChart
        margin={{
          top: 10,
          right: isMobile ? 12 : 120,
          left: 12,
          bottom: isMobile ? 16 : 32,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
        <XAxis
          type="number"
          dataKey="cost"
          name="Total Cost"
          label={{
            value: "Total Cost ($)",
            position: "insideBottom",
            offset: -20,
            fill: "#9ca3af",
          }}
          stroke="#9ca3af"
          domain={[0, "auto"]}
          tickFormatter={(tick) => tick.toFixed(3)}
        />
        <YAxis
          type="number"
          dataKey="accuracy"
          name="Accuracy"
          unit="%"
          label={{
            value: "Accuracy (%)",
            angle: -90,
            position: "insideLeft",
            fill: "#9ca3af",
          }}
          stroke="#9ca3af"
          domain={[0, 100]}
        />
        <ReferenceLine
          y={meanAccuracy}
          stroke="#6b7280"
          strokeDasharray="5 5"
          label={{
            value: `Mean: ${meanAccuracy.toFixed(1)}%`,
            position: "right",
            fill: "#6b7280",
            fontSize: 11,
          }}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload as ScatterDataPoint;
              return (
                <div className="rounded-lg border border-white/10 bg-neutral-900/95 p-3 text-neutral-100 shadow-xl">
                  <p className="font-semibold">{d.model}</p>
                  <p className="text-sm text-neutral-300">
                    Accuracy: {d.accuracy.toFixed(1)}%
                  </p>
                  <p className="text-sm text-neutral-300">
                    Total cost: {currency(d.cost)}
                  </p>
                  <p className="text-sm text-green-400 mt-1">
                    Efficiency: {d.accuracyPerDollar.toFixed(0)}% per $1
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter data={scatterData} isAnimationActive={false}>
          {scatterData.map((entry) => (
            <Cell
              key={entry.fullModel}
              fill={getModelColor(entry.fullModel)}
            />
          ))}
          {!isMobile && (
            <LabelList
              dataKey="model"
              content={({ x, y, value }: any) => {
                const nx = (typeof x === "number" ? x : Number(x)) || 0;
                const ny = (typeof y === "number" ? y : Number(y)) || 0;
                return (
                  <text
                    x={nx + 10}
                    y={ny}
                    dy={4}
                    textAnchor="start"
                    className="pointer-events-none text-xs font-medium fill-neutral-200"
                    style={{
                      textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    {String(value)}
                  </text>
                );
              }}
            />
          )}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}
