import { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Send, User, Users, ActivitySquare, FileIcon, Filter, Calendar, Search, ChevronDown, BarChart, RefreshCw, ChevronUp } from "lucide-react";
import { UploadDialog } from "@/components/UploadDialog";
import { FileExplorer } from "@/components/salaysay/FileExplorer";
import { FileStatistics } from "@/components/salaysay/FileStatistics";
import { DashboardCharts } from "@/components/salaysay/DashboardCharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthContext } from "@/App";
import { logLogoutActivity } from "@/utils/activity";
import { VIOLATION_TYPES } from "@/components/upload/types";
import { setupSalaysayStorageBucket } from "@/integrations/supabase/setupStorage";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState<'start' | 'end' | null>(null);
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [filters, setFilters] = useState<{
    violationTypes: Record<string, boolean>;
    startDate: Date | null;
    endDate: Date | null;
    userId: string | null;
    keyword: string;
  }>({
    violationTypes: VIOLATION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}),
    startDate: null,
    endDate: null,
    userId: null,
    keyword: ""
  });
  const [fileStats, setFileStats] = useState<{
    totalFiles: number;
    violationTypeCounts: Record<string, number>;
    senderNames?: Record<string, {
      count: number;
      violationTypes: Record<string, number>;
    }>;
    topSenders: Array<[string, { count: number }]>;
  }>({
    totalFiles: 0,
    violationTypeCounts: {},
    topSenders: []
  });
  
  const [globalTopSenders, setGlobalTopSenders] = useState<Array<[string, { count: number }]>>([]);
  const [userProfile, setUserProfile] = useState<{
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    id: string | null;
  }>({
    email: null,
    fullName: null,
    avatarUrl: null,
    id: null,
  });

  const [showStatisticsInMain, setShowStatisticsInMain] = useState(true);

  useEffect(() => {
    if (showAllUsers) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true });
          
        if (error) {
          console.error("Error fetching users:", error);
          return;
        }
        
        setUsersList(data.map(user => ({
          id: user.id,
          name: user.full_name || user.email || "Unknown user"
        })));
      };
      
      fetchUsers();
    }
  }, [showAllUsers]);

  useEffect(() => {
    const fetchTopSenders = async () => {
      try {
        const { data: allData, error: allError } = await supabase
          .from('salaysay_submissions')
          .select('metadata')
          .order('created_at', { ascending: false });

        if (allError) {
          console.error("Error fetching top senders data:", allError);
          return;
        }

        const senderCounts: Record<string, number> = {};
        
        if (allData) {
          allData.forEach(file => {
            if (file.metadata) {
              const metadata = file.metadata as any;
              if (metadata.sender_name) {
                senderCounts[metadata.sender_name] = (senderCounts[metadata.sender_name] || 0) + 1;
              }
            }
          });

          const topSenders: Array<[string, { count: number }]> = Object.entries(senderCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => [name, { count }]);

          setGlobalTopSenders(topSenders);
          
          // Update fileStats with the global top senders
          setFileStats(prev => ({
            ...prev,
            topSenders: topSenders
          }));
        }
      } catch (error) {
        console.error("Error fetching global top senders:", error);
      }
    };

    fetchTopSenders();
  }, [refreshTrigger]);

  // Handler to update filtered statistics from FileExplorer
  const handleStatsUpdate = (stats: any) => {
    setFileStats(prev => ({
      ...prev,
      totalFiles: stats.totalFiles,
      violationTypeCounts: stats.violationTypeCounts,
      senderNames: stats.senderNames,
      // Keep the global top senders unchanged
      topSenders: globalTopSenders
    }));
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      await setupSalaysayStorageBucket();

      setUserProfile(prev => ({ 
        ...prev, 
        email: session.user.email,
        id: session.user.id
      }));

      const avatarUrl = session.user.user_metadata?.avatar_url || 
                        session.user.user_metadata?.picture || 
                        null;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        
        if (session.user.email) {
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
              email: session.user.email,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            });
            
          if (updateError) {
            console.error("Error creating profile:", updateError);
          } else {
            console.log("Created/updated profile with avatar URL:", avatarUrl);
          }
        }
      } else if (profileData && (!profileData.avatar_url) && avatarUrl) {
        console.log("Updating existing profile with avatar URL from auth metadata");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
          
        if (updateError) {
          console.error("Error updating profile with avatar URL:", updateError);
        } else {
          console.log("Updated profile with avatar URL:", avatarUrl);
        }
      }

      setUserProfile({
        email: session.user.email,
        fullName: profileData?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
        avatarUrl: avatarUrl || profileData?.avatar_url || null,
        id: session.user.id,
      });
    };
    
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    if (userProfile.id) {
      try {
        console.log("Logging logout activity before sign out");
        await logLogoutActivity(userProfile.id);
      } catch (error) {
        console.error("Error logging logout:", error);
      }
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message
      });
    } else {
      navigate('/');
    }
  };

  const handleSubmitSalaysay = () => {
    setIsUploadDialogOpen(true);
  };

  const refreshFileExplorer = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const getInitials = () => {
    if (!userProfile.fullName) return "U";
    return userProfile.fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleShowAllUsers = () => {
    setShowAllUsers(prev => {
      if (prev) {
        setFilters(prevFilters => ({ ...prevFilters, userId: null }));
      }
      return !prev;
    });
  };

  const handleFilterChange = (violationType: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      violationTypes: {
        ...prev.violationTypes,
        [violationType]: checked,
      },
    }));
  };

  const handleDateChange = (date: Date | null, type: 'start' | 'end') => {
    setFilters(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: date
    }));
    setCalendarOpen(null);
  };

  const handleUserFilterChange = (userId: string) => {
    if (userId === 'all') {
      setFilters(prev => ({
        ...prev,
        userId: null
      }));
    } else {
      const selectedUser = usersList.find(user => user.id === userId);
      setFilters(prev => ({
        ...prev,
        userId: userId,
        selectedUserName: selectedUser?.name || "Unknown User"
      }));
    }
  };

  const handleKeywordFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeywordFilter(value);
    setFilters(prev => ({
      ...prev,
      keyword: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      violationTypes: VIOLATION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}),
      startDate: null,
      endDate: null,
      userId: null,
      keyword: ""
    });
    setKeywordFilter("");
  };

  const hasActiveFilters = Object.values(filters.violationTypes).some(val => val) || 
    filters.startDate !== null || 
    filters.endDate !== null ||
    filters.userId !== null ||
    filters.keyword !== "";

  const activeViolationTypeFilters = Object.entries(filters.violationTypes)
    .filter(([_, isActive]) => isActive)
    .map(([type]) => type);

  const getActiveFiltersCount = () => {
    let count = 0;
    
    count += Object.values(filters.violationTypes).filter(Boolean).length;
    
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    
    if (filters.userId) count++;
    
    if (filters.keyword) count++;
    
    return count;
  };

  const handleSenderClick = (senderName: string) => {
    setKeywordFilter(senderName);
    setFilters(prev => ({
      ...prev,
      keyword: senderName
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BBDEFB] to-[#90CAF9] overflow-auto">
      <header className="h-16 bg-gradient-to-r from-[#0E254E] to-[#1E3A7B] text-white flex items-center justify-between px-6 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/42a0c089-7817-4d54-b180-12a27a76a70f.png" 
            alt="NEU Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold">NEU-STAT</h1>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Avatar>
                    <AvatarImage src={userProfile.avatarUrl || ""} alt={userProfile.fullName || "User"} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white p-3 shadow-lg border rounded-md">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{userProfile.fullName || "User"}</p>
                  <p className="text-xs text-gray-500">{userProfile.email}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-transparent"
          >
            Sign Out
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        <Card className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-6 mb-6 border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-800">Salaysay Tracking And Archival Tool</h2>
              <p className="text-gray-600 mt-1">
                NEU-STAT is New Era University's official Salaysay Tracking System, enabling seamless submission, monitoring, and approval of Salaysay documents.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/activity-logs')} 
                variant="outline" 
                className="flex items-center gap-2 border-gray-200 hover:bg-blue-50"
              >
                <ActivitySquare className="h-4 w-4" />
                Activity Logs
              </Button>
              <Button 
                onClick={handleSubmitSalaysay} 
                className="flex items-center gap-2 bg-gradient-to-r from-[#0E254E] to-[#1E3A7B] hover:from-[#0b1e3d] hover:to-[#162c61] shadow-sm"
              >
                <Send className="h-4 w-4" />
                Submit Salaysay
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md mb-6 border-blue-100 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-blue-800">Dashboard Overview</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-600 font-medium">Last updated: {new Date().toLocaleTimeString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshFileExplorer}
                  className="flex items-center gap-2 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
            <CardDescription className="text-gray-600">
              Visualized statistics of salaysay documents
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {fileStats && <DashboardCharts 
              violationCounts={fileStats.violationTypeCounts} 
              topSenders={fileStats.topSenders}
              totalFiles={fileStats.totalFiles}
            />}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md border-blue-100">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-blue-800 flex items-center gap-2">
                <FileIcon className="h-5 w-5" />
                Your Salaysay Files
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-all-users" className="text-sm flex items-center gap-2 text-blue-700">
                    <Users className="h-4 w-4" />
                    Show all users' files
                  </Label>
                  <Switch 
                    id="show-all-users" 
                    checked={showAllUsers} 
                    onCheckedChange={toggleShowAllUsers}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`flex items-center gap-1 ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200'}`}
                    >
                      <Filter className={`h-3.5 w-3.5 ${hasActiveFilters ? 'text-blue-500' : ''}`} />
                      Filter {hasActiveFilters && <span className="ml-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{getActiveFiltersCount()}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 shadow-lg border-blue-100" align="end">
                    <ScrollArea className="h-[70vh] max-h-[500px]">
                      <div className="p-4 space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-blue-800">Filters</h4>
                          {hasActiveFilters && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={clearFilters} 
                              className="text-xs text-blue-500 hover:text-blue-700 p-0 h-auto"
                            >
                              Clear all
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Search by Keyword</h5>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search in filename, student number, sender name..."
                              value={keywordFilter}
                              onChange={handleKeywordFilterChange}
                              className="pl-8"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Search in file name, student number, sender name, and other AI-extracted information
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium mb-2">Date Range</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <Popover 
                              open={calendarOpen === 'start'} 
                              onOpenChange={(open) => !open && setCalendarOpen(null)}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setCalendarOpen('start')}
                                  className={`justify-start text-left font-normal ${filters.startDate ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {filters.startDate ? format(filters.startDate, 'PP') : <span>Start date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={filters.startDate || undefined}
                                  onSelect={(date) => {
                                    handleDateChange(date, 'start');
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            
                            <Popover 
                              open={calendarOpen === 'end'} 
                              onOpenChange={(open) => !open && setCalendarOpen(null)}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setCalendarOpen('end')}
                                  className={`justify-start text-left font-normal ${filters.endDate ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {filters.endDate ? format(filters.endDate, 'PP') : <span>End date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={filters.endDate || undefined}
                                  onSelect={(date) => {
                                    handleDateChange(date, 'end');
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {showAllUsers && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Filter by User</h5>
                            <div className="relative">
                              <Select
                                value={filters.userId || 'all'}
                                onValueChange={handleUserFilterChange}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a user">
                                    {filters.userId 
                                      ? usersList.find(user => user.id === filters.userId)?.name || "Select a user" 
                                      : "All Users"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  <ScrollArea className="h-full max-h-[200px]">
                                    <SelectItem value="all">All Users</SelectItem>
                                    {usersList.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Filter by Classification</h5>
                          <div className="space-y-3">
                            {VIOLATION_TYPES.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`filter-${type}`} 
                                  checked={filters.violationTypes[type]} 
                                  onCheckedChange={(checked) => 
                                    handleFilterChange(type, checked === true)
                                  }
                                />
                                <Label htmlFor={`filter-${type}`} className="text-sm">
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Toggle 
                  pressed={showStatisticsInMain}
                  onPressedChange={setShowStatisticsInMain}
                  className={`data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700`}
                >
                  <BarChart className="h-4 w-4 mr-1" />
                  File Statistics
                </Toggle>
              </div>
            </div>

            {showStatisticsInMain && (
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-100 shadow-sm">
                  <CardContent className="p-4">
                    <FileStatistics 
                      stats={fileStats} 
                      keywordFilter={filters.keyword}
                      onSenderClick={handleSenderClick}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden shadow bg-white">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50 text-sm">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-blue-700">File Name</th>
                    <th className="text-left px-4 py-3 font-medium text-blue-700">Date Uploaded</th>
                    <th className="text-left px-4 py-3 font-medium text-blue-700">Classification</th>
                    <th className="text-left px-4 py-3 font-medium text-blue-700">Uploaded By</th>
                    <th className="text-left px-4 py-3 font-medium text-blue-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userProfile.id && (
                    <FileExplorer 
                      userId={userProfile.id} 
                      refreshTrigger={refreshTrigger} 
                      showAllUsers={showAllUsers}
                      violationTypeFilters={activeViolationTypeFilters}
                      dateRangeFilter={{
                        startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
                        endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null
                      }}
                      userFilter={filters.userId}
                      keywordFilter={filters.keyword}
                      onStatsCalculated={handleStatsUpdate}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <UploadDialog 
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        userId={userProfile.id || ""}
        onUploadComplete={refreshFileExplorer}
      />
    </div>
  );
}
