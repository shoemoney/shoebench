"use client";

import { useState } from "react";
import {
  Trophy,
  DollarSign,
  Clock,
  TrendingUp,
  Filter,
  ChevronDown,
  Calendar,
  Footprints,
  Layers,
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

import { TierAccuracyChart } from "@/components/charts/TierAccuracyChart";
import { CostEfficiencyScatter } from "@/components/charts/CostEfficiencyScatter";
import { ErrorAnalysisTable } from "@/components/tables/ErrorAnalysisTable";

import type { BenchmarkData, ModelMetrics } from "@/lib/types";
import {
  classifyModel,
  getModelTypeLabel,
  getModelTypeColor,
  type ModelType,
} from "@/lib/modelClassification";

// Type-safe data access
const typedBenchmarkData = benchmarkData as BenchmarkData;
const { modelMetrics, tierAccuracy, errors, metadata, shoeMetrics } = typedBenchmarkData;

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
    model: m.modelName
      .replace("openai/", "")
      .replace("anthropic/", "")
      .replace("google/", "")
      .replace("meta-llama/", ""),
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
  return `$${n.toFixed(4)}`;
}

function barValueLabel(suffix: string, decimals: number) {
  return (props: any) => {
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
  const [selectedModels, setSelectedModels] = useState<string[]>(
    leaderboardData.map((m) => m.fullModel)
  );
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

  const totalTestsPerModel = leaderboardData[0]?.totalTests ?? 0;

  const costData = filteredLeaderboard
    .map((m) => ({
      model: m.model,
      fullModel: m.fullModel,
      totalCost: Number(m.totalCost.toFixed(6)),
    }))
    .sort((a, b) => a.totalCost - b.totalCost);

  const speedData = filteredLeaderboard
    .map((m) => ({
      model: m.model,
      fullModel: m.fullModel,
      duration: Number((m.avgLatency / 1000).toFixed(2)),
      durationMs: m.avgLatency,
    }))
    .sort((a, b) => a.duration - b.duration);

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

  const costMax = Math.max(0, ...costData.map((d) => d.totalCost));
  const speedMax = Math.max(0, ...speedData.map((d) => d.duration));

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
                Vision Model Shoe Identification Benchmark
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
                value="tiers"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                <Layers className="h-4 w-4" /> Tiers
              </TabsTrigger>
              <TabsTrigger
                value="cost"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <DollarSign className="h-4 w-4" /> Cost
              </TabsTrigger>
              <TabsTrigger
                value="speed"
                className="flex items-center gap-2 rounded-md px-4 py-2 text-neutral-300 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                <Clock className="h-4 w-4" /> Speed
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
                    onClick={handleSelectAll}
                    className="flex-1 border-neutral-600 bg-neutral-800 hover:bg-neutral-700"
                  >
                    Select all
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
                      <TableHead className="text-neutral-400">Type</TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Accuracy
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Avg Score
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Cost
                      </TableHead>
                      <TableHead className="text-neutral-400 text-right">
                        Latency
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

          {/* Tiers Tab */}
          <TabsContent value="tiers">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Layers className="h-5 w-5 text-amber-400" /> Accuracy by Difficulty Tier
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  How models perform on Easy, Medium, and Hard shoes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TierAccuracyChart
                  data={tierAccuracy}
                  selectedModels={selectedModels}
                  getModelColor={getModelColor}
                />
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
                        : { top: 10, right: 24, left: 12, bottom: 64 }
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
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#9ca3af"
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
                      formatter={(value: any) => [`Total cost: $${value}`]}
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
                            ? barValueLabelHorizontalSmart("", 4, costMax || 1)
                            : barValueLabel("", 4)
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

          {/* Speed Tab */}
          <TabsContent value="speed">
            <Card className="border-neutral-800 bg-neutral-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-purple-400" /> Response speed
                  by model
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Average response time in seconds (lower is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    duration: {
                      label: "Response Time",
                      color: "hsl(262, 83%, 58%)",
                    },
                  }}
                  className="h-[420px] sm:h-[520px] w-full"
                  style={isMobile ? { height: mobileBarHeight } : undefined}
                >
                  <BarChart
                    data={speedData}
                    layout={isMobile ? "vertical" : "horizontal"}
                    margin={
                      isMobile
                        ? { top: 10, right: 24, left: 140, bottom: 24 }
                        : { top: 10, right: 24, left: 12, bottom: 64 }
                    }
                  >
                    <defs>
                      {speedData.map((d) => {
                        const base = getModelColor(d.fullModel);
                        const id = getGradientId("sp", d.model);
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
                            value: "Response Time (s)",
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
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          label={{
                            value: "Response Time (s)",
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
                      formatter={(value: any) => [
                        `Average response time: ${value} seconds`,
                      ]}
                      labelFormatter={(label) => `Model: ${label}`}
                    />
                    <Bar
                      dataKey="duration"
                      radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="duration"
                        position={isMobile ? "right" : "top"}
                        content={
                          isMobile
                            ? barValueLabelHorizontalSmart(
                                "s",
                                2,
                                speedMax || 1
                              )
                            : barValueLabel("s", 2)
                        }
                      />
                      {speedData.map((entry) => (
                        <Cell
                          key={entry.model}
                          fill={`url(#${getGradientId("sp", entry.model)})`}
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
                        name: s.displayName.length > 20
                          ? s.displayName.slice(0, 20) + '...'
                          : s.displayName,
                        fullName: s.displayName,
                        accuracy: s.accuracy,
                        brand: s.brand,
                        avgScore: s.avgScore,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
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
                        width={110}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        stroke="#9ca3af"
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
                        name: s.displayName.length > 20
                          ? s.displayName.slice(0, 20) + '...'
                          : s.displayName,
                        fullName: s.displayName,
                        accuracy: s.accuracy,
                        brand: s.brand,
                        avgScore: s.avgScore,
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
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
                        width={110}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        stroke="#9ca3af"
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
        </Tabs>
      </main>
    </div>
  );
}
