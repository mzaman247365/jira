import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import {
  BarChart3,
  TrendingDown,
  Activity,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { STATUSES, type Status, type IssueType } from "@/lib/constants";
import type { Issue, Project, Sprint, SprintSnapshot } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const [, params] = useRoute("/project/:projectId/reports");
  const projectId = params?.projectId || "";
  const [activeTab, setActiveTab] = useState("burndown");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  if (projectLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">{project.name} Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track project progress and team performance.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-2 border-b">
          <TabsList>
            <TabsTrigger value="burndown" className="gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Burndown
            </TabsTrigger>
            <TabsTrigger value="velocity" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Velocity
            </TabsTrigger>
            <TabsTrigger value="sprint-report" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Sprint Report
            </TabsTrigger>
            <TabsTrigger value="cfd" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Cumulative Flow
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="burndown" className="mt-0">
            <BurndownTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="velocity" className="mt-0">
            <VelocityTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="sprint-report" className="mt-0">
            <SprintReportTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="cfd" className="mt-0">
            <CumulativeFlowTab projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// --- Burndown Tab ---
function BurndownTab({ projectId }: { projectId: string }) {
  const [selectedSprintId, setSelectedSprintId] = useState("");

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: !!projectId,
  });

  const { data: burndownData = [], isLoading } = useQuery<SprintSnapshot[]>({
    queryKey: ["/api/sprints", selectedSprintId, "burndown"],
    enabled: !!selectedSprintId,
  });

  // Build chart data with ideal line
  const chartData = (() => {
    if (burndownData.length === 0) return [];

    const totalPoints = burndownData[0]?.totalPoints || 0;
    const len = burndownData.length;

    return burndownData.map((snap, i) => ({
      date: new Date(snap.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      remaining: snap.remainingPoints,
      ideal: Math.round(totalPoints - (totalPoints / Math.max(len - 1, 1)) * i),
    }));
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSprintId ? (
        <Card className="p-12 text-center text-muted-foreground">
          Select a sprint to view its burndown chart.
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No burndown data available for this sprint.
        </Card>
      ) : (
        <Card className="p-4">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                name="Ideal"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="remaining"
                stroke="#0052CC"
                strokeWidth={2}
                name="Remaining"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// --- Velocity Tab ---
function VelocityTab({ projectId }: { projectId: string }) {
  const { data: velocityData = [], isLoading } = useQuery<
    { sprintName: string; committed: number; completed: number }[]
  >({
    queryKey: ["/api/projects", projectId, "velocity"],
    enabled: !!projectId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (velocityData.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        No velocity data available. Complete sprints to see velocity.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={velocityData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="sprintName" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="committed" fill="#94a3b8" name="Committed" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#0052CC" name="Completed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// --- Sprint Report Tab ---
function SprintReportTab({ projectId }: { projectId: string }) {
  const [selectedSprintId, setSelectedSprintId] = useState("");

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: !!projectId,
  });

  const { data: reportData, isLoading } = useQuery<{
    committedPoints: number;
    completedPoints: number;
    completedIssues: Issue[];
    incompleteIssues: Issue[];
  }>({
    queryKey: ["/api/sprints", selectedSprintId, "report"],
    enabled: !!selectedSprintId,
  });

  const completionPct =
    reportData && reportData.committedPoints > 0
      ? Math.round((reportData.completedPoints / reportData.committedPoints) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSprintId ? (
        <Card className="p-12 text-center text-muted-foreground">
          Select a sprint to view its report.
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !reportData ? (
        <Card className="p-12 text-center text-muted-foreground">
          No report data available for this sprint.
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Committed</p>
              <p className="text-2xl font-bold">{reportData.committedPoints}</p>
              <p className="text-xs text-muted-foreground">story points</p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{reportData.completedPoints}</p>
              <p className="text-xs text-muted-foreground">story points</p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Completion</p>
              <p className="text-2xl font-bold">{completionPct}%</p>
              <Progress value={completionPct} className="h-2 mt-2" />
            </Card>
          </div>

          {/* Completed Issues */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">
              Completed Issues ({reportData.completedIssues.length})
            </h3>
            <Card className="divide-y">
              {reportData.completedIssues.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  No completed issues.
                </p>
              ) : (
                reportData.completedIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5">
                    <IssueTypeIcon type={issue.type as IssueType} className="h-4 w-4" />
                    <span className="text-sm font-medium flex-1 truncate">{issue.title}</span>
                    <StatusBadge status={issue.status as Status} />
                    {issue.storyPoints != null && (
                      <span className="text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-medium">
                        {issue.storyPoints}
                      </span>
                    )}
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* Incomplete Issues */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">
              Incomplete Issues ({reportData.incompleteIssues.length})
            </h3>
            <Card className="divide-y">
              {reportData.incompleteIssues.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  All issues completed!
                </p>
              ) : (
                reportData.incompleteIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5">
                    <IssueTypeIcon type={issue.type as IssueType} className="h-4 w-4" />
                    <span className="text-sm font-medium flex-1 truncate">{issue.title}</span>
                    <StatusBadge status={issue.status as Status} />
                    {issue.storyPoints != null && (
                      <span className="text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-medium">
                        {issue.storyPoints}
                      </span>
                    )}
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// --- Cumulative Flow Tab ---
function CumulativeFlowTab({ projectId }: { projectId: string }) {
  const [dateRange, setDateRange] = useState("30");

  const { data: cfdData = [], isLoading } = useQuery<
    { date: string; backlog: number; todo: number; in_progress: number; in_review: number; done: number }[]
  >({
    queryKey: ["/api/projects", projectId, "cfd?days=" + dateRange],
    enabled: !!projectId,
  });

  const chartData = cfdData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No cumulative flow data available yet.
        </Card>
      ) : (
        <Card className="p-4">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="done"
                stackId="1"
                fill={STATUSES.done.color}
                stroke={STATUSES.done.color}
                name="Done"
              />
              <Area
                type="monotone"
                dataKey="in_review"
                stackId="1"
                fill={STATUSES.in_review.color}
                stroke={STATUSES.in_review.color}
                name="In Review"
              />
              <Area
                type="monotone"
                dataKey="in_progress"
                stackId="1"
                fill={STATUSES.in_progress.color}
                stroke={STATUSES.in_progress.color}
                name="In Progress"
              />
              <Area
                type="monotone"
                dataKey="todo"
                stackId="1"
                fill={STATUSES.todo.color}
                stroke={STATUSES.todo.color}
                name="To Do"
              />
              <Area
                type="monotone"
                dataKey="backlog"
                stackId="1"
                fill={STATUSES.backlog.color}
                stroke={STATUSES.backlog.color}
                name="Backlog"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
