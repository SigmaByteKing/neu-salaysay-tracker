
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, TrendingUp, FileBarChart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type FileStats = {
  totalFiles: number;
  violationTypeCounts: Record<string, number>;
  senderNames?: Record<string, {
    count: number;
    violationTypes: Record<string, number>;
  }>;
  topSenders: Array<[string, { count: number }]>;
}

interface FileStatisticsProps {
  stats: FileStats;
  keywordFilter: string;
  className?: string;
  onSenderClick?: (senderName: string) => void;
}

export function FileStatistics({ stats, keywordFilter, className = "", onSenderClick }: FileStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generate gradient colors based on violation types
  const getGradientClass = (index: number, total: number) => {
    const gradients = [
      "from-blue-500 to-blue-600",
      "from-green-500 to-green-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-purple-500 to-purple-600",
      "from-cyan-500 to-cyan-600"
    ];
    
    return gradients[index % gradients.length];
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Total Matching Files</h4>
                <p className="text-2xl font-bold text-blue-600 mt-2">{stats.totalFiles}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <FileBarChart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">By Classification</h4>
            <div className="space-y-2">
              {Object.entries(stats.violationTypeCounts).map(([type, count], index) => (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getGradientClass(index, Object.keys(stats.violationTypeCounts).length)}`}></div>
                    <span className="text-sm text-gray-600">{type}</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 font-medium">{count}</Badge>
                </div>
              ))}
              {Object.keys(stats.violationTypeCounts).length === 0 && (
                <p className="text-sm text-gray-500 italic">No classification data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Top Submitters</h4>
              <div className="bg-blue-100 rounded-full p-1.5">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="space-y-2">
              {stats.topSenders.map(([name, data], index) => (
                <Button
                  key={name}
                  variant="ghost"
                  className="w-full justify-between text-left font-normal hover:bg-blue-50 p-2 h-auto"
                  onClick={() => onSenderClick?.(name)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getGradientClass(index, stats.topSenders.length)}`}></div>
                    <span className="truncate flex-1 text-sm">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">{data.count}</Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              ))}
              {stats.topSenders.length === 0 && (
                <p className="text-sm text-gray-500 italic">No sender data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Show sender name statistics if keyword search is active */}
      {keywordFilter && stats.senderNames && Object.keys(stats.senderNames).length > 0 && (
        <Card className="bg-white border-blue-100 shadow-sm mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Sender Analysis
              </h4>
              <Badge variant="outline" className="bg-blue-50">
                {Object.keys(stats.senderNames).length} sender(s)
              </Badge>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.senderNames).map(([name, data]) => (
                <div key={name} className="pb-2 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-blue-800">{name}</span>
                    <Badge variant="outline" className="bg-blue-50">{data.count} file(s)</Badge>
                  </div>
                  <div className="pl-2 space-y-1">
                    {Object.entries(data.violationTypes).map(([type, count], index) => (
                      <div key={`${name}-${type}`} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${getGradientClass(index, Object.keys(data.violationTypes).length)}`}></div>
                          <span className="text-gray-600">{type}</span>
                        </div>
                        <span className="text-gray-700 font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
