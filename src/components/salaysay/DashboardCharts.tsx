
import React, { useEffect, useState } from "react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend
} from "recharts";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { ChartPie, LineChart as LineChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardChartsProps {
  violationCounts: Record<string, number>;
  topSenders: Array<[string, { count: number }]>;
  totalFiles: number;
}

interface ActivityData {
  month: string;
  count: number;
}

export function DashboardCharts({ violationCounts, totalFiles }: DashboardChartsProps) {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Process violation types data for pie chart
  const pieData = Object.entries(violationCounts).map(([name, value]) => ({
    name,
    value
  }));

  // Colors for charts
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF',
    '#4CAF50', '#F44336', '#2196F3', '#FF5722', '#607D8B'
  ];

  // Fetch activity data by month
  useEffect(() => {
    const fetchActivityData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('created_at')
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Error fetching activity data:", error);
          return;
        }

        // Group activities by month
        const monthlyData: Record<string, number> = {};
        
        // Process last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(today.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
          monthlyData[monthLabel] = 0;
        }

        // Count activities by month
        if (data) {
          data.forEach(log => {
            const date = new Date(log.created_at);
            const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
            
            if (monthLabel in monthlyData) {
              monthlyData[monthLabel]++;
            }
          });
        }

        // Convert to array format for Recharts
        const chartData = Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count
        }));

        setActivityData(chartData);
      } catch (error) {
        console.error("Error processing activity data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Violation Types Distribution */}
      <Card className="shadow-md border-blue-100 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <ChartPie className="h-5 w-5" />
              Classification Distribution
            </CardTitle>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {totalFiles} files
            </span>
          </div>
          <CardDescription className="text-gray-600">
            Distribution of document classifications
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-1">
          <div className="h-[340px]">
            <ChartContainer
              config={{
                violation: { color: "#0088FE" },
                minor: { color: "#00C49F" },
                major: { color: "#FFBB28" },
                critical: { color: "#FF8042" },
              }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 70, left: 70, bottom: 20 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={{
                      stroke: "#777",
                      strokeWidth: 0.5,
                      strokeDasharray: "2 2",
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Monthly Activity Chart */}
      <Card className="shadow-md border-blue-100 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Monthly User Activity
            </CardTitle>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
              Last 6 months
            </span>
          </div>
          <CardDescription className="text-gray-600">
            System activity trend over time
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-1">
          <div className="h-[340px] w-full">
            <ChartContainer
              config={{
                count: { color: "#0088FE" },
              }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-500">Loading activity data...</span>
                  </div>
                ) : (
                  <LineChart
                    data={activityData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 45 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.6} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10 }}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                      tickMargin={10}
                      scale="point"
                      padding={{ left: 15, right: 15 }}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={40}
                      tickMargin={8}
                      domain={[0, 'auto']}
                    />
                    <RechartTooltip 
                      formatter={(value) => [`${value} activities`, 'Count']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={30}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="Activity Count"
                      stroke="#0088FE" 
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      isAnimationActive={true}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
