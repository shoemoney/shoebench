"use client";

import { useState, useMemo } from "react";
import {
  Trophy,
  DollarSign,
  TrendingUp,
  Filter,
  ChevronDown,
  Calendar,
  Footprints,
  AlertCircle,
} from "lucide-react";
import benchmarkData from "../data/shoebench-results.json";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

import { CostEfficiencyScatter } from "@/components/charts/CostEfficiencyScatter";
import { ErrorAnalysisTable } from "@/components/tables/ErrorAnalysisTable";
import { ResultsTable } from "@/components/tables/ResultsTable";
import { buildModelRows } from "@/lib/buildModelRows";

import type { BenchmarkData, ModelMetrics } from "@/lib/types";
import {
  classifyModel,
  getModelTypeLabel,
  getModelTypeColor,
  type ModelType,
} from "@/lib/modelClassification";
import { formatModelName } from "@/lib/modelUtils";

// Type-safe data access
const typedBenchmarkData = benchmarkData as BenchmarkData;
const { modelMetrics, errors, metadata, shoeMetrics } = typedBenchmarkData;

// Leaderboard data derived from modelMetrics
interface LeaderboardEntry {
  model: string;
  fullModel: string;
  accuracy: number;
  avgScore: number;
  totalCost: number;
  avgLatency: number;
  exactMatches: number;
  variantMatches: number;
  totalTests: number;
  modelType: ModelType;
}

const leaderboardData: LeaderboardEntry[] = modelMetrics
  .map((m: ModelMetrics) => ({
    model: formatModelName(m.modelName),
    fullModel: m.modelName,
    accuracy: m.overallAccuracy,
    avgScore: m.avgScore,
    totalCost: m.totalCost,
    avgLatency: m.avgLatency,
    exactMatches: m.exactMatches,
    variantMatches: m.variantMatches,
    totalTests: m.totalTests,
    modelType: classifyModel(m.modelName),
  }))
  .sort((a, b) => b.accuracy - a.accuracy);

// Count models by type
const modelTypeCounts = {
  all: leaderboardData.length,
  open: leaderboardData.filter((m) => m.modelType === "open").length,
  closed: leaderboardData.filter((m) => m.modelType === "closed").length,
  free: leaderboardData.filter((m) => m.modelType === "free").length,
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

function currency(n: number) {
  // Round up to 2 decimal places
  const rounded = Math.ceil(n * 100) / 100;
  return `$${rounded.toFixed(2)}`;
}

function barValueLabel(suffix: string, decimals: number, withBackground = false) {
  return (props: any) => {
    const x = Number(props?.x ?? 0);
    const y = Number(props?.y ?? 0);
    const width = Number(props?.width ?? 0);
    const value = Number(props?.value ?? 0);
    const cx = x + width / 2;
    const cy = y - 8;
    const text = `$${value.toFixed(decimals)}${suffix}`;

    if (withBackground) {
      // Horizontal text above bar, bright white
      return (
        <g className="pointer-events-none">
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="text-[11px] font-bold"
            fill="#ffffff"
          >
            {text}
          </text>
        </g>
      );
    }

    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        className="pointer-events-none text-xs font-medium fill-neutral-300"
      >
        {value.toFixed(decimals)}
        {suffix}
      </text>
    );
  };
}

function barValueLabelHorizontalSmart(
  suffix: string,
  decimals: number,
  maxValue: number
) {
  return (props: any) => {
    const x = Number(props?.x ?? 0);
    const y = Number(props?.y ?? 0);
    const width = Number(props?.width ?? 0);
    const height = Number(props?.height ?? 0);
    const value = Number(props?.value ?? 0);
    const ratio = maxValue > 0 ? value / maxValue : 0;
    const inside = ratio >= 0.75;
    const tx = inside ? x + width - 6 : x + width + 6;
    const anchor: any = inside ? "end" : "start";
    const cls = inside
      ? "pointer-events-none text-[10px] font-medium fill-neutral-50"
      : "pointer-events-none text-[10px] font-medium fill-neutral-300";
    return (
      <text
        x={tx}
        y={y + height / 2}
        dy={3}
        textAnchor={anchor}
        className={cls}
      >
        {value.toFixed(decimals)}
        {suffix}
      </text>
    );
  };
}

function truncateLabel(input: unknown, max = 14) {
  const label = String(input ?? "");
  if (label.length <= max) return label;
  return label.slice(0, Math.max(1, max - 1)) + "...";
}

export default function BenchmarkVisualizer() {
  // Default to all models selected
  const allModels = leaderboardData.map((m) => m.fullModel);
  const top10Models = leaderboardData.slice(0, 10).map((m) => m.fullModel);
  const [selectedModels, setSelectedModels] = useState<string[]>(allModels);
  const [modelTypeFilter, setModelTypeFilter] = useState<ModelType | "all">(
    "all"
  );

  const filteredLeaderboard = leaderboardData.filter(
    (m) =>
      selectedModels.includes(m.fullModel) &&
      (modelTypeFilter === "all" || m.modelType === modelTypeFilter)
  );

  const isMobile = useIsMobile();
  const mobileBarHeight = Math.max(320, filteredLeaderboard.length * 36 + 120);

  // Phase 6: memoize the ModelRow[] feeding the new sortable Results table.
  // useMemo keeps the array reference stable so TanStack does not rebuild
  // its internal row models on unrelated parent re-renders (PITFALLS Pitfall 6).
  const resultsRows = useMemo(
    () => buildModelRows(typedBenchmarkData),
    []
  );

  const totalTestsPerModel = leaderboardData[0]?.totalTests ?? 0;

  // Cost tab: show 10 cheapest + 10 most expensive (ignores global filter)
  const allCostData = leaderboardData
    .map((m) => ({
      model: m.model,
      fullModel: m.fullModel,
      totalCost: Math.ceil(m.totalCost * 100) / 100, // Round up to 2 decimals
    }))
    .sort((a, b) => a.totalCost - b.totalCost);

  const cheapest10 = allCostData.slice(0, 10);
  const mostExpensive10 = allCostData.slice(-10).reverse();
  const costModelsSet = new Set([
    ...cheapest10.map((m) => m.fullModel),
    ...mostExpensive10.map((m) => m.fullModel),
  ]);
  const costData = allCostData.filter((m) => costModelsSet.has(m.fullModel));

  const getModelColor = (modelName: string) => {
    const colors = [
      "hsl(0, 75%, 60%)",
      "hsl(20, 85%, 60%)",
      "hsl(40, 90%, 60%)",
      "hsl(60, 85%, 55%)",
      "hsl(90, 75%, 55%)",
      "hsl(140, 70%, 50%)",
      "hsl(190, 75%, 55%)",
      "hsl(220, 80%, 60%)",
      "hsl(260, 75%, 65%)",
      "hsl(300, 70%, 65%)",
      "hsl(330, 70%, 60%)",
      "hsl(280, 60%, 62%)",
    ];
    const index = leaderboardData.findIndex((r) => r.fullModel === modelName);
    return colors[(index + colors.length) % colors.length];
  };

  const handleModelToggle = (modelName: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelName)
        ? prev.filter((m) => m !== modelName)
        : [...prev, modelName]
    );
  };
  const handleSelectAll = () =>
    setSelectedModels(leaderboardData.map((m) => m.fullModel));
  const handleDeselectAll = () => setSelectedModels([]);
  const handleSelectTop10 = () => setSelectedModels(top10Models);

  const costMax = Math.max(0, ...costData.map((d) => d.totalCost));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_800px_at_10%_0%,rgba(59,130,246,0.18),transparent_70%),radial-gradient(1200px_800px_at_90%_0%,rgba(34,197,94,0.14),transparent_70%),radial-gradient(900px_700px_at_50%_100%,rgba(234,88,12,0.14),transparent_70%)]" />

      <header className="relative mx-auto max-w-7xl px-4 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Footprints className="h-10 w-10 text-neutral-100" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                ShoeBench
              </h1>
              <p className="mt-1 max-w-prose text-xs text-neutral-300 sm:text-sm">
                Vision Model Shoe Identification Benchmark — A fork of{" "}
                <a
                  href="https://skatebench.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Theo Browne's Skatebench
                </a>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-neutral-800/60 text-neutral-200"
            >
              {metadata?.totalModels ?? leaderboardData.length} models
            </Badge>
            <Badge
              variant="secondary"
              className="bg-neutral-800/60 text-neutral-200"
            >
              {metadata?.totalShoes ?? 0} shoes
            </Badge>
            {metadata?.timestamp ? (
              <Badge
                variant="outline"
                className="border-neutral-700 text-neutral-300"
              >
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {new Date(metadata.timestamp).toLocaleString()}
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-16">
        <Tabs defaultValue="leaderboard" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl border border-neutral-800 bg-neutral-900/70 p-1">
              <TabsTrigger
                value="leaderboard"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                <Trophy className="h-4 w-4" /> Leaderboard
              </TabsTrigger>
              <TabsTrigger
                value="cost"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <DollarSign className="h-4 w-4" /> Cost
              </TabsTrigger>
              <TabsTrigger
                value="combined"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4" /> Cost vs Accuracy
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <AlertCircle className="h-4 w-4" /> Errors
              </TabsTrigger>
              <TabsTrigger
                value="shoes"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-pink-600 data-[state=active]:text-white"
              >
                <Footprints className="h-4 w-4" /> Shoes
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                Results (new)
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-neutral-700 bg-neutral-900/60 text-white hover:bg-neutral-800 sm:w-auto"
                >
                  <Filter className="mr-2 h-4 w-4" /> Models (
                  {selectedModels.length}/{leaderboardData.length})
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 border-neutral-700 bg-neutral-900/95 text-white backdrop-blur">
                <DropdownMenuLabel className="text-neutral-200">
                  Select models
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <div className="flex gap-2 p-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectTop10}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    Top 10
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeselectAll}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    Clear
                  </Button>
                </div>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <ScrollArea className="h-80">
                  {leaderboardData.map((m) => (
                    <DropdownMenuItem
                      key={m.fullModel}
                      className="group flex items-center gap-3 py-2 hover:bg-neutral-800 focus:bg-neutral-800"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Checkbox
                        id={m.fullModel}
                        checked={selectedModels.includes(m.fullModel)}
                        onCheckedChange={() => handleModelToggle(m.fullModel)}
                        className="border-neutral-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: getModelColor(m.fullModel) }}
                        />
                        <label
                          htmlFor={m.fullModel}
                          className="cursor-pointer truncate text-sm text-neutral-200"
                        >
                          {m.model}
                        </label>
                      </div>
                      <Badge className="ml-auto bg-neutral-800 text-neutral-200">
                        {m.accuracy.toFixed(1)}%
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Model Type Filter */}
            <div className="flex gap-1 rounded-lg border border-neutral-700 bg-neutral-900/60 p-1">
              <Button
                size="sm"
                variant={modelTypeFilter === "all" ? "default" : "ghost"}
                onClick={() => setModelTypeFilter("all")}
                className={
                  modelTypeFilter === "all"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }
              >
                All ({modelTypeCounts.all})
              </Button>
              <Button
                size="sm"
                variant={modelTypeFilter === "closed" ? "default" : "ghost"}
                onClick={() => setModelTypeFilter("closed")}
                className={
                  modelTypeFilter === "closed"
                    ? "bg-blue-600 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }
              >
                Closed ({modelTypeCounts.closed})
              </Button>
              <Button
                size="sm"
                variant={modelTypeFilter === "open" ? "default" : "ghost"}
                onClick={() => setModelTypeFilter("open")}
                className={
                  modelTypeFilter === "open"
                    ? "bg-green-600 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }
              >
                Open ({modelTypeCounts.open})
              </Button>
              <Button
                size="sm"
                variant={modelTypeFilter === "free" ? "default" : "ghost"}
                onClick={() => setModelTypeFilter("free")}
                className={
                  modelTypeFilter === "free"
                    ? "bg-purple-600 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }
              >
                Free ({modelTypeCounts.free})
              </Button>
            </div>
          </div>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-green-400" /> Model Rankings
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Vision models ranked by overall accuracy (exact + variant
                  matches) out of {totalTestsPerModel} tests per model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800 hover:bg-transparent">
                      <TableHead className="text-neutral-400 w-16">
                        Rank
                      </TableHead>
                      <TableHead className="text-neutral-400">Model</TableHead>
                      <TableHead className="text-neutral-400">Model Type</TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Accuracy
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Avg Score
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Cost per Run
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Response Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaderboard.map((entry, index) => (
                      <TableRow
                        key={entry.fullModel}
                        className="border-neutral-800 hover:bg-neutral-800/50"
                      >
                        <TableCell className="font-medium text-neutral-300">
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            )}
                            {index === 1 && (
                              <span className="text-neutral-400">#2</span>
                            )}
                            {index === 2 && (
                              <span className="text-neutral-400">#3</span>
                            )}
                            {index > 2 && (
                              <span className="text-neutral-500">
                                #{index + 1}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{
                                backgroundColor: getModelColor(entry.fullModel),
                              }}
                            />
                            <span className="font-medium text-neutral-100">
                              {entry.model}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getModelTypeColor(entry.modelType)}
                          >
                            {getModelTypeLabel(entry.modelType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              entry.accuracy >= 80
                                ? "text-green-400"
                                : entry.accuracy >= 60
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }`}
                          >
                            {entry.accuracy.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-neutral-300">
                          {entry.avgScore.toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right text-neutral-300">
                          {currency(entry.totalCost)}
                        </TableCell>
                        <TableCell className="text-right text-neutral-300">
                          {entry.avgLatency > 0
                            ? `${(entry.avgLatency / 1000).toFixed(1)}s`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-blue-400" /> Cost
                  efficiency by model
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Total cost to run {totalTestsPerModel} tests (lower is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    totalCost: {
                      label: "Total Cost",
                      color: "hsl(217, 91%, 60%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={costData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={
                      isMobile
                        ? { top: 10, right: 24, left: 140, bottom: 24 }
                        : { top: 30, right: 24, left: 12, bottom: 130 }
                    }
                  >
                    <defs>
                      {costData.map((d) => {
                        const base = getModelColor(d.fullModel);
                        const id = getGradientId("ct", d.model);
                        return (
                          <linearGradient
                            key={id}
                            id={id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={withAlpha(base, 0.95)}
                            />
                            <stop
                              offset="100%"
                              stopColor={withAlpha(base, 0.55)}
                            />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                    {isMobile ? (
                      <>
                        <XAxis
                          type="number"
                          label={{
                            value: "Cost ($)",
                            position: "insideBottom",
                            offset: -10,
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          width={12}
                          tick={{ fontSize: 12, fill: "#9ca3af" }}
                          tickFormatter={(v: string) => truncateLabel(v)}
                          stroke="#9ca3af"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          dataKey="model"
                          angle={-90}
                          textAnchor="end"
                          height={120}
                          fontSize={11}
                          stroke="#9ca3af"
                          interval={0}
                          tick={{ fill: "#d1d5db", dy: -5 }}
                        />
                        <YAxis
                          label={{
                            value: "Total Cost ($)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#9ca3af",
                          }}
                          stroke="#9ca3af"
                        />
                      </>
                    )}
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: any) => [`Total cost: $${Number(value).toFixed(2)}`]}
                      labelFormatter={(label) => `Model: ${label}`}
                    />
                    <Bar
                      dataKey="totalCost"
                      radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="totalCost"
                        position={isMobile ? "right" : "top"}
                        content={
                          isMobile
                            ? barValueLabelHorizontalSmart("", 2, costMax || 1)
                            : barValueLabel("", 2, true)
                        }
                      />
                      {costData.map((entry) => (
                        <Cell
                          key={entry.model}
                          fill={`url(#${getGradientId("ct", entry.model)})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost vs Accuracy Tab */}
          <TabsContent value="combined">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-orange-400" /> Cost Efficiency
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Top-left is ideal: higher accuracy, lower total cost. Tooltip shows accuracy-per-dollar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CostEfficiencyScatter
                  data={modelMetrics}
                  selectedModels={selectedModels}
                  getModelColor={getModelColor}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-5 w-5 text-red-400" /> Error Analysis
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Shoes that models misidentified (brand_only or wrong)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorAnalysisTable
                  errors={errors}
                  models={Array.from(new Set(modelMetrics.map(m => m.modelName)))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shoes Tab */}
          <TabsContent value="shoes">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Hardest Shoes */}
              <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <AlertCircle className="h-5 w-5 text-red-400" /> Hardest to Identify
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    Shoes with lowest accuracy across all models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      accuracy: {
                        label: "Accuracy",
                        color: "hsl(0, 75%, 60%)",
                      },
                    }}
                    className="h-[400px] w-full"
                  >
                    <BarChart
                      data={(shoeMetrics || []).slice(0, 10).map(s => ({
                        name: s.displayName.length > 25
                          ? s.displayName.slice(0, 25) + '...'
                          : s.displayName,
                        fullName: s.displayName,
                        accuracy: s.accuracy,
                        brand: s.brand,
                        avgScore: s.avgScore,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        stroke="#9ca3af"
                        label={{
                          value: "Accuracy %",
                          position: "insideBottom",
                          offset: -5,
                          fill: "#9ca3af",
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 13, fill: "#ffffff", style: { whiteSpace: "nowrap" } }}
                        stroke="#9ca3af"
                        tickLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value}% accuracy (${props.payload.avgScore} avg score)`,
                          props.payload.brand
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.fullName || label
                        }
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {(shoeMetrics || []).slice(0, 10).map((entry) => (
                          <Cell
                            key={entry.shoeId}
                            fill={`hsl(${entry.accuracy * 1.2}, 70%, 50%)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Easiest Shoes */}
              <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Trophy className="h-5 w-5 text-green-400" /> Easiest to Identify
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    Shoes with highest accuracy across all models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      accuracy: {
                        label: "Accuracy",
                        color: "hsl(142, 76%, 36%)",
                      },
                    }}
                    className="h-[400px] w-full"
                  >
                    <BarChart
                      data={(shoeMetrics || []).slice(-10).reverse().map(s => ({
                        name: s.displayName.length > 25
                          ? s.displayName.slice(0, 25) + '...'
                          : s.displayName,
                        fullName: s.displayName,
                        accuracy: s.accuracy,
                        brand: s.brand,
                        avgScore: s.avgScore,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#303341" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        stroke="#9ca3af"
                        label={{
                          value: "Accuracy %",
                          position: "insideBottom",
                          offset: -5,
                          fill: "#9ca3af",
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 13, fill: "#ffffff", style: { whiteSpace: "nowrap" } }}
                        stroke="#9ca3af"
                        tickLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value}% accuracy (${props.payload.avgScore} avg score)`,
                          props.payload.brand
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.fullName || label
                        }
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {(shoeMetrics || []).slice(-10).reverse().map((entry) => (
                          <Cell
                            key={entry.shoeId}
                            fill={`hsl(${entry.accuracy * 1.2}, 70%, 50%)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Full Shoe List Table */}
              <Card className="lg:col-span-2 border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Footprints className="h-5 w-5 text-pink-400" /> All Shoes
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    Complete breakdown by shoe (sorted by difficulty)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-800 hover:bg-transparent">
                        <TableHead className="text-neutral-400">Shoe</TableHead>
                        <TableHead className="text-neutral-400">Brand</TableHead>
                        <TableHead className="text-neutral-400">Difficulty</TableHead>
                        <TableHead className="text-neutral-400 text-right">Accuracy</TableHead>
                        <TableHead className="text-neutral-400 text-right">Avg Score</TableHead>
                        <TableHead className="text-neutral-400 text-right">Exact</TableHead>
                        <TableHead className="text-neutral-400 text-right">Variant</TableHead>
                        <TableHead className="text-neutral-400 text-right">Brand Only</TableHead>
                        <TableHead className="text-neutral-400 text-right">Wrong</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(shoeMetrics || []).map((shoe) => (
                        <TableRow
                          key={shoe.shoeId}
                          className="border-neutral-800 hover:bg-neutral-800/50"
                        >
                          <TableCell className="font-medium text-neutral-100">
                            {shoe.displayName}
                          </TableCell>
                          <TableCell className="text-neutral-300">
                            {shoe.brand}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                shoe.difficulty === 'hard'
                                  ? 'border-red-600 text-red-400'
                                  : shoe.difficulty === 'medium'
                                    ? 'border-yellow-600 text-yellow-400'
                                    : 'border-green-600 text-green-400'
                              }
                            >
                              {shoe.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                shoe.accuracy >= 80
                                  ? "text-green-400"
                                  : shoe.accuracy >= 60
                                    ? "text-yellow-400"
                                    : "text-red-400"
                              }`}
                            >
                              {shoe.accuracy}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-neutral-300">
                            {shoe.avgScore}
                          </TableCell>
                          <TableCell className="text-right text-green-400">
                            {shoe.exactCount}
                          </TableCell>
                          <TableCell className="text-right text-blue-400">
                            {shoe.variantCount}
                          </TableCell>
                          <TableCell className="text-right text-yellow-400">
                            {shoe.brandOnlyCount}
                          </TableCell>
                          <TableCell className="text-right text-red-400">
                            {shoe.wrongCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <ResultsTable rows={resultsRows} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
