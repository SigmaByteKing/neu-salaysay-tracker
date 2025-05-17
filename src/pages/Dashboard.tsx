import { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { 
  Send, 
  User, 
  Users, 
  ActivitySquare, 
  FileIcon, 
  Filter, 
  Calendar, 
  Search, 
  ChevronDown, 
  BarChart, 
  RefreshCw, 
  ChevronUp,
  Sun,
  Moon
} from "lucide-react";
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
  const [calendarOpen, setCalendarOpen] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [filters, setFilters] = useState({
    violationTypes: VIOLATION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}),
    startDate: null,
    endDate: null,
    userId: null,
    keyword: ""
  });
  const [fileStats, setFileStats] = useState({
    totalFiles: 0,
    violationTypeCounts: {},
    topSenders: []
  });
  
  const [globalTopSenders, setGlobalTopSenders] = useState([]);
  const [userProfile, setUserProfile] = useState({
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

        const senderCounts = {};
        
        if (allData) {
          allData.forEach(file => {
            if (file.metadata) {
              const metadata = file.metadata;
              if (metadata.sender_name) {
                senderCounts[metadata.sender_name] = (senderCounts[metadata.sender_name] || 0) + 1;
              }
            }
          });

          const topSenders = Object.entries(senderCounts)
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
  const handleStatsUpdate = (stats) => {
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

  const handleFilterChange = (violationType, checked) => {
    setFilters(prev => ({
      ...prev,
      violationTypes: {
        ...prev.violationTypes,
        [violationType]: checked,
      },
    }));
  };

  const handleDateChange = (date, type) => {
    setFilters(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: date
    }));
    setCalendarOpen(null);
  };

  const handleUserFilterChange = (userId) => {
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

  const handleKeywordFilterChange = (e) => {
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSenderClick = (senderName) => {
    setKeywordFilter(senderName);
    setFilters(prev => ({
      ...prev,
      keyword: senderName
    }));
  };

  return (
    <div className={`min-h-screen ${darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900' 
      : 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100'}`}>
    
    {/* Background Patterns - matching login page*/} 
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 opacity-30">
      <div className="fixed w-full h-full">
        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
          <div key={i} className={`fixed ${pos} w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-blue-600/40' : 'bg-blue-400/60'}`} style={{transform: `translate(${pos.includes('right') ? '30%' : '-30%'}, ${pos.includes('bottom') ? '30%' : '-30%'})`}}></div>
        ))}
      </div>
      <svg className="fixed bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C83.45,59.92,200.66,80.59,321.39,56.44Z" className={darkMode ? "fill-blue-700/30" : "fill-blue-500/30"}></path>
      </svg>
      <svg className="fixed bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className={darkMode ? "fill-blue-800/30" : "fill-blue-700/30"}></path>
      </svg>
    </div>

    {/* Header */}
        <header className={`h-24 ${darkMode 
  ? 'bg-gradient-to-r from-gray-900 to-blue-900 text-white' 
  : 'bg-gradient-to-r from-blue-700 to-blue-900 text-white'} 
  flex items-center justify-between px-8 shadow-lg sticky top-0 z-50`}>
  <div className="flex items-center gap-4">
    <img 
      src="/lovable-uploads/NEULogoPic.png" 
      alt="NEU Logo" 
      className="w-14 h-14"
    />
    <div>
      <h1 className="text-2xl font-bold">NEU-STAT</h1>
      <p className="text-sm text-blue-100">Salaysay Tracking And Archival Tool</p>
    </div>
  </div>
  <div className="flex items-center gap-5">
    <button onClick={toggleDarkMode} className={`p-2.5 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-blue-800 text-white'}`}>
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.avatarUrl || ""} alt={userProfile.fullName || "User"} />
              <AvatarFallback className={`${darkMode ? 'bg-gray-800 text-blue-300' : 'bg-blue-100 text-blue-700'} font-semibold text-lg`}>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 shadow-lg border rounded-md`}>
          <div className="space-y-1">
            <p className={`font-medium text-sm ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{userProfile.fullName || "User"}</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userProfile.email}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <Button
      onClick={handleSignOut}
      variant="outline"
      className={`h-10 px-4 ${darkMode 
        ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' 
        : 'bg-white/10 hover:bg-white/20 text-white border-transparent'}`}
    >
          Sign Out
        </Button>
      </div>
    </header>
    
    <div className="container mx-auto px-6 py-8 max-w-6xl relative z-10">
      {/* Welcome Card */}
      <Card className={`${darkMode 
        ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700' 
        : 'bg-white/80 backdrop-blur-sm border-blue-100'} 
        rounded-xl shadow-lg mb-8`}>
        <div className="flex justify-between items-center p-6">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Salaysay Tracking And Archival Tool</h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
              NEU-STAT is New Era University's official Salaysay Tracking System, enabling seamless submission, monitoring, and approval of Salaysay documents.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/activity-logs')} 
              variant="outline" 
              className={`flex items-center gap-2 ${darkMode 
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200' 
                : 'border-gray-200 hover:bg-blue-50'}`}
            >
              <ActivitySquare className="h-4 w-4" />
              Activity Logs
            </Button>
            <Button 
              onClick={handleSubmitSalaysay} 
              className={`flex items-center gap-2 ${darkMode
                ? 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800'
                : 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800'} text-white shadow-sm`}
            >
              <Send className="h-4 w-4" />
              Submit Salaysay
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Charts */}
      <Card className={`${darkMode 
        ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700' 
        : 'bg-white/80 backdrop-blur-sm border-blue-100'} 
        rounded-xl shadow-lg mb-8 overflow-hidden`}>
        <CardHeader className={`pb-2 ${darkMode 
          ? 'bg-gradient-to-r from-gray-800 to-gray-700' 
          : 'bg-gradient-to-r from-blue-50 to-blue-100'}`}>
          <div className="flex justify-between items-center">
            <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              Dashboard Overview
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-600'} font-medium`}>
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFileExplorer}
                className={`flex items-center gap-2 ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-blue-50 text-blue-600'}`}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Visualized statistics of salaysay documents
          </CardDescription>
        </CardHeader>
        <CardContent className={`pt-4 ${darkMode ? 'text-gray-200' : ''}`}>
          {fileStats && <DashboardCharts 
            violationCounts={fileStats.violationTypeCounts} 
            topSenders={fileStats.topSenders}
            totalFiles={fileStats.totalFiles}
          />}
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card className={`${darkMode 
        ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700' 
        : 'bg-white/80 backdrop-blur-sm border-blue-100'} 
        rounded-xl shadow-lg overflow-hidden`}>
        <CardHeader className={`pb-2 ${darkMode 
          ? 'bg-gradient-to-r from-gray-800 to-gray-700' 
          : 'bg-gradient-to-r from-blue-50 to-blue-100'}`}>
          <div className="flex justify-between items-center">
            <CardTitle className={`text-xl font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'} flex items-center gap-2`}>
              <FileIcon className="h-5 w-5" />
              Your Salaysay Files
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="show-all-users" className={`text-sm flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                  <Users className="h-4 w-4" />
                  Show all users' files
                </Label>
                <Switch 
                  id="show-all-users" 
                  checked={showAllUsers} 
                  onCheckedChange={toggleShowAllUsers}
                  className={`${darkMode 
                    ? 'data-[state=checked]:bg-blue-600' 
                    : 'data-[state=checked]:bg-blue-600'}`}
                />
              </div>
              <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex items-center gap-1 ${darkMode
                      ? hasActiveFilters 
                        ? 'bg-blue-900/50 border-blue-800 text-blue-300' 
                        : 'bg-gray-800 border-gray-700 text-gray-300'
                      : hasActiveFilters 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'border-gray-200'}`}
                  >
                    <Filter className={`h-3.5 w-3.5 ${hasActiveFilters ? (darkMode ? 'text-blue-300' : 'text-blue-500') : ''}`} />
                    Filter {hasActiveFilters && <span className={`ml-1 text-xs ${darkMode ? 'bg-blue-700' : 'bg-blue-500'} text-white rounded-full w-4 h-4 flex items-center justify-center`}>{getActiveFiltersCount()}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`w-80 p-0 shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100'}`} align="end">
                  <ScrollArea className="h-[70vh] max-h-[500px]">
                    <div className="p-4 space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Filters</h4>
                        {hasActiveFilters && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearFilters} 
                            className={`text-xs ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'} p-0 h-auto`}
                          >
                            Clear all
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h5 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>Search by Keyword</h5>
                        <div className="relative">
                          <Search className={`absolute left-2 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <Input
                            placeholder="Search in filename, student number, sender name..."
                            value={keywordFilter}
                            onChange={handleKeywordFilterChange}
                            className={`pl-8 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder:text-gray-500' : ''}`}
                          />
                        </div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                          Search in file name, student number, sender name, and other AI-extracted information
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : ''}`}>Date Range</h5>
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
                                className={`justify-start text-left font-normal ${darkMode
                                  ? `bg-gray-700 border-gray-600 ${filters.startDate ? 'text-blue-300' : 'text-gray-300'}`
                                  : filters.startDate ? 'bg-blue-50 border-blue-200' : ''}`}
                              >
                                <Calendar className={`mr-2 h-4 w-4 ${darkMode && filters.startDate ? 'text-blue-300' : ''}`} />
                                {filters.startDate ? format(filters.startDate, 'PP') : <span>Start date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className={`w-auto p-0 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`} align="start">
                              <CalendarComponent
                                mode="single"
                                selected={filters.startDate || undefined}
                                onSelect={(date) => {
                                  handleDateChange(date, 'start');
                                }}
                                initialFocus
                                className={darkMode ? 'dark-calendar' : ''}
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
                                className={`justify-start text-left font-normal ${darkMode
                                  ? `bg-gray-700 border-gray-600 ${filters.endDate ? 'text-blue-300' : 'text-gray-300'}`
                                  : filters.endDate ? 'bg-blue-50 border-blue-200' : ''}`}
                              >
                                <Calendar className={`mr-2 h-4 w-4 ${darkMode && filters.endDate ? 'text-blue-300' : ''}`} />
                                {filters.endDate ? format(filters.endDate, 'PP') : <span>End date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className={`w-auto p-0 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`} align="start">
                              <CalendarComponent
                                mode="single"
                                selected={filters.endDate || undefined}
                                onSelect={(date) => {
                                  handleDateChange(date, 'end');
                                }}
                                initialFocus
                                className={darkMode ? 'dark-calendar' : ''}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {showAllUsers && (
                        <div className="space-y-2">
                          <h5 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>Filter by User</h5>
                          <div className="relative">
                            <Select
                              value={filters.userId || 'all'}
                              onValueChange={handleUserFilterChange}
                            >
                              <SelectTrigger className={`w-full ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : ''}`}>
                                <SelectValue placeholder="Select a user">
                                  {filters.userId 
                                    ? usersList.find(user => user.id === filters.userId)?.name || "Select a user" 
                                    : "All Users"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className={`max-h-60 ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : ''}`}>
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
                        <h5 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>Filter by Classification</h5>
                        <div className="space-y-3">
                          {VIOLATION_TYPES.map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`filter-${type}`} 
                                checked={filters.violationTypes[type]} 
                                onCheckedChange={(checked) => 
                                  handleFilterChange(type, checked === true)
                                }
                                className={darkMode ? 'border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600' : ''}
                              />
                              <Label htmlFor={`filter-${type}`} className={`text-sm ${darkMode ? 'text-gray-300' : ''}`}>
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
                className={`${darkMode 
                  ? 'data-[state=on]:bg-blue-900/50 data-[state=on]:text-blue-300 text-gray-300' 
                  : 'data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700'}`}
              >
                <BarChart className="h-4 w-4 mr-1" />
                File Statistics
              </Toggle>
            </div>
          </div>

          {showStatisticsInMain && (
            <div className="mb-6">
              <Card className={`${darkMode 
                ? 'bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600' 
                : 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-100'} rounded-lg shadow-sm`}>
                <CardContent className="p-4">
                  <FileStatistics 
                    stats={fileStats} 
                    keywordFilter={filters.keyword}
                    onSenderClick={handleSenderClick}
                    darkMode={darkMode}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <div className={`border rounded-lg overflow-hidden shadow ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}>
            <table className="w-full">
              <thead className={`${darkMode 
                ? 'bg-gradient-to-r from-gray-800 to-gray-700' 
                : 'bg-gradient-to-r from-gray-50 to-blue-50'} text-sm`}>
                <tr>
                  <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>File Name</th>
                  <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Date Uploaded</th>
                  <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Classification</th>
                  <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Uploaded By</th>
                  <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={darkMode ? 'text-gray-300' : ''}>
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
                    darkMode={darkMode}
                  />
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="text-center mt-6 pb-4">
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          © 2025 New Era University. All rights reserved.
        </span>
      </div>
    </div>
    
    <UploadDialog 
      isOpen={isUploadDialogOpen}
      onClose={() => setIsUploadDialogOpen(false)}
      userId={userProfile.id || ""}
      onUploadComplete={refreshFileExplorer}
      darkMode={darkMode}
    />
  </div>
);
}
