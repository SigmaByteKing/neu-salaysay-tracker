import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Upload, 
  FileText,
  Filter as FilterIcon,
  LogIn,
  LogOut,
  Trash,
  Eye,
  User,
  Calendar,
  X,
  Moon,
  Sun
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Profile } from "@/types/database.types";
import { ActivityLog } from "@/types/activity.types";
import { toast } from 'sonner';
import { getActivityLogs } from "@/utils/activity";
import { AuthContext } from "@/App";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ActivityLogs() {
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useContext(AuthContext);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [violationTypes, setViolationTypes] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Failed to load user profiles");
      } else {
        if (session?.user) {
          const { data } = await supabase.auth.getUser();
          const currentUser = data.user;
          
          if (currentUser && profiles) {
            const profileToUpdate = profiles.find(p => p.id === currentUser.id);
            if (profileToUpdate && !profileToUpdate.avatar_url && currentUser.user_metadata?.avatar_url) {
              profileToUpdate.avatar_url = currentUser.user_metadata.avatar_url;
            }
          }
        }
        
        setUserProfiles(profiles || []);
      }

      const { data: files, error: filesError } = await supabase
        .from('salaysay_submissions')
        .select('violation_type')
        .order('violation_type');
        
      if (filesError) {
        console.error("Error fetching violation types:", filesError);
      } else if (files) {
        const uniqueTypes = [...new Set(files.map(file => file.violation_type))];
        setViolationTypes(uniqueTypes);
      }

      await fetchActivityLogs();
    };

    if (session) {
      fetchData();
    }
  }, [navigate, userFilter, actionFilter, violationTypeFilter, currentPage, session, authLoading, startDate, endDate]);

  useEffect(() => {
    let count = 0;
    if (userFilter !== 'all') count++;
    if (actionFilter !== 'all') count++;
    if (violationTypeFilter !== 'all') count++;
    if (startDate !== null) count++;
    if (endDate !== null) count++;
    setActiveFilters(count);
  }, [userFilter, actionFilter, violationTypeFilter, startDate, endDate]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const formattedStartDate = startDate ? startDate.toISOString() : null;
      const formattedEndDate = endDate ? new Date(endDate.setHours(23, 59, 59, 999)).toISOString() : null;
      
      const { logs, totalCount } = await getActivityLogs({
        userFilter, 
        actionFilter,
        violationTypeFilter,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        page: currentPage, 
        itemsPerPage
      });
      
      setActivities(logs);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const clearFilters = () => {
    setUserFilter('all');
    setActionFilter('all');
    setViolationTypeFilter('all');
    setStartDate(null);
    setEndDate(null);
    setCurrentPage(1);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getActionIcon = (activity: ActivityLog) => {
    switch (activity.action_type) {
      case 'upload':
        return <Upload className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />;
      case 'view':
        return <Eye className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />;
      case 'login':
        return <LogIn className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />;
      case 'logout':
        return <LogOut className={`h-5 w-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />;
      case 'delete':
        return <Trash className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />;
      default:
        return <FileText className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
    }
  };

  const renderUserInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles.find(profile => profile.id === userId);
    return profile?.full_name || profile?.email || 'Unknown user';
  };

  const getActionTypeDisplay = (actionType: string) => {
    switch (actionType) {
      case 'upload': return 'Upload';
      case 'view': return 'View';
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      case 'delete': return 'Delete';
      default: return actionType.charAt(0).toUpperCase() + actionType.slice(1).replace('_', ' ');
    }
  };

  const getFileName = (activity: ActivityLog) => {
    if (activity.file && activity.file.file_name) {
      return activity.file.file_name;
    }
    
    if (activity.deleted_file_info && activity.deleted_file_info.file_name) {
      return activity.deleted_file_info.file_name;
    }
    
    return activity.file?.file_path.split('/').pop() || 'Unknown file';
  };

  const getViolationType = (activity: ActivityLog) => {
    if (activity.file && activity.file.violation_type) {
      return activity.file.violation_type;
    }
    
    if (activity.deleted_file_info && activity.deleted_file_info.violation_type) {
      return activity.deleted_file_info.violation_type;
    }
    
    return 'Unknown type';
  };

  const renderFileInfo = (activity: ActivityLog) => {
    if (!activity.file && !activity.deleted_file_info) return null;
    
    const fileName = getFileName(activity);
    const violationType = getViolationType(activity);
    
    return (
      <div className={`mt-2 p-2 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
          <FileText className="h-4 w-4" />
          <span className="font-medium">{fileName}</span>
        </div>
        {violationType && violationType !== 'Unknown type' && (
          <div className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>Violation Type: {violationType}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900' 
      : 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100'}`}>
      
      {/* Background Patterns */}
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
        <header className={`h-24 flex items-center justify-between px-8 shadow-lg sticky top-0 z-10 ${darkMode 
          ? 'bg-gray-900/80 backdrop-blur-md' 
          : 'bg-white/80 backdrop-blur-md'}`}>
    <div className="flex items-center gap-4">
      <img 
        src="/lovable-uploads/NEULogoPic.png" 
        alt="NEU Logo" 
        className="w-14 h-14"
      />
      <div>
      <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'}`}>NEU-STAT</h1>
      <p className="text-sm text-blue-900">Salaysay Tracking And Archival Tool</p>
    </div>
     </div>
  
    <div className="flex items-center gap-4">
      <button onClick={toggleDarkMode} className={`p-2.5 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}>
        {darkMode ? <Sun size={22} /> : <Moon size={22} />}
      </button>
      
      <Button
        variant={darkMode ? "outline" : "secondary"}
        className={`text-base px-5 py-2.5 ${darkMode 
          ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' 
          : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </div>
  </header>

      <div className="container mx-auto py-6 px-6 max-w-6xl relative z-10">
        <Card className={`mb-6 shadow-xl overflow-hidden ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}>
          <CardHeader className={`pb-3 ${darkMode ? 'border-b border-gray-800' : 'border-b'}`}>
            <div className="flex justify-between items-center">
              <CardTitle className={darkMode ? 'text-white' : 'text-gray-800'}>System Activity</CardTitle>
              <div className="flex items-center gap-3">
                {activeFilters > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className={`flex items-center gap-1 text-sm ${darkMode 
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                      : 'bg-white'}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`flex items-center gap-2 ${darkMode 
                        ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' 
                        : 'bg-white border-gray-200'}`}
                    >
                      <FilterIcon className="h-4 w-4" />
                      <span>Filters</span>
                      {activeFilters > 0 && (
                        <span className={`rounded-full w-5 h-5 flex items-center justify-center text-xs ${darkMode 
                          ? 'bg-blue-700 text-white' 
                          : 'bg-blue-600 text-white'}`}>
                          {activeFilters}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={`w-80 p-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`} align="end">
                    <div className="space-y-4">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Filter Activity Logs</h4>
                      
                      <div className="space-y-2">
                        <label className={`text-sm font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>User</label>
                        <Select 
                          value={userFilter} 
                          onValueChange={setUserFilter}
                        >
                          <SelectTrigger className={`w-full ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black'}`}>
                            <SelectValue>
                              {userFilter === "all" ? "All Users" : getUserName(userFilter)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                            <SelectItem value="all" className={darkMode ? 'text-white' : 'text-black'}>All Users</SelectItem>
                            {userProfiles.map(profile => (
                              <SelectItem key={profile.id} value={profile.id} className={darkMode ? 'text-white' : 'text-black'}>
                                {profile.full_name || profile.email || 'Unknown user'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className={`text-sm font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>Action Type</label>
                        <Select 
                          value={actionFilter} 
                          onValueChange={setActionFilter}
                        >
                          <SelectTrigger className={`w-full ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black'}`}>
                            <SelectValue>
                              {actionFilter === "all" ? "All Actions" : getActionTypeDisplay(actionFilter)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                            <SelectItem value="all" className={darkMode ? 'text-white' : 'text-black'}>All Actions</SelectItem>
                            <SelectItem value="upload" className={darkMode ? 'text-white' : 'text-black'}>Upload</SelectItem>
                            <SelectItem value="view" className={darkMode ? 'text-white' : 'text-black'}>View</SelectItem>
                            <SelectItem value="login" className={darkMode ? 'text-white' : 'text-black'}>Login</SelectItem>
                            <SelectItem value="logout" className={darkMode ? 'text-white' : 'text-black'}>Logout</SelectItem>
                            <SelectItem value="delete" className={darkMode ? 'text-white' : 'text-black'}>Delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className={`text-sm font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>Violation Type</label>
                        <Select 
                          value={violationTypeFilter} 
                          onValueChange={setViolationTypeFilter}
                        >
                          <SelectTrigger className={`w-full ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black'}`}>
                            <SelectValue>
                              {violationTypeFilter === "all" ? "All Violation Types" : violationTypeFilter}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
                            <SelectItem value="all" className={darkMode ? 'text-white' : 'text-black'}>All Violation Types</SelectItem>
                            {violationTypes.map(type => (
                              <SelectItem key={type} value={type} className={darkMode ? 'text-white' : 'text-black'}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className={`text-sm font-medium block ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>Date Range</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!startDate ? (darkMode ? "text-gray-500" : "text-gray-400") : ""} 
                                  ${darkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white'}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "PP") : "Start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className={`w-auto p-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={startDate}
                                  onSelect={setStartDate}
                                  initialFocus
                                  className={darkMode ? "dark-calendar" : ""}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!endDate ? (darkMode ? "text-gray-500" : "text-gray-400") : ""} 
                                  ${darkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white'}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "PP") : "End date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className={`w-auto p-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={endDate}
                                  onSelect={setEndDate}
                                  initialFocus
                                  className={darkMode ? "dark-calendar" : ""}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <Button 
                          variant="outline" 
                          onClick={clearFilters}
                          className={darkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : ''}
                        >
                          Clear all
                        </Button>
                        <Button 
                          onClick={() => {
                            setCurrentPage(1);
                            fetchActivityLogs();
                          }}
                          className={darkMode 
                            ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                            : 'bg-blue-700 hover:bg-blue-800 text-white'}
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className={`mb-4 ${darkMode ? 'bg-gray-800' : ''}`}>
                <TabsTrigger 
                  value="list" 
                  className={darkMode ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}
                >
                  List View
                </TabsTrigger>
                <TabsTrigger 
                  value="table" 
                  className={darkMode ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}
                >
                  Table View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-4">
                {loading ? (
                  <div className={`text-center py-10 ${darkMode ? 'text-gray-300' : ''}`}>Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className={`text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No activity logs found with the current filters.
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div 
                      key={activity.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${darkMode 
                        ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                        : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                    >
                      <div className="mt-1">
                        {getActionIcon(activity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {activity.user?.avatar_url ? (
                              <AvatarImage 
                                src={activity.user.avatar_url || ""} 
                                alt={activity.user?.full_name || "User"} 
                                className="object-cover"
                              />
                            ) : (
                              <AvatarFallback className={`text-xs ${darkMode 
                                ? 'bg-blue-700 text-white' 
                                : 'bg-blue-600 text-white'}`}>
                                {renderUserInitials(activity.user?.full_name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className={`font-medium ${darkMode ? 'text-white' : ''}`}>
                            {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                          </span>
                          <span className={darkMode ? 'text-gray-300' : ''}>
                            {activity.description}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(activity.created_at)}
                        </p>
                        {renderFileInfo(activity)}
                        {activity.file && activity.file.uploader && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Uploaded by:</span>
                            <Avatar className="h-5 w-5">
                              {activity.file.uploader.avatar_url ? (
                                <AvatarImage 
                                  src={activity.file.uploader.avatar_url} 
                                  alt={activity.file.uploader.full_name || "User"} 
                                />
                              ) : (
                                <AvatarFallback className={`text-xs ${darkMode 
                                  ? 'bg-blue-700 text-white' 
                                  : 'bg-blue-600 text-white'}`}>
                                  {renderUserInitials(activity.file.uploader.full_name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : ''}`}>
                              {activity.file.uploader.full_name || activity.file.uploader.email || 'Unknown user'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            
            <TabsContent value="table">
              <div className={`rounded-md border ${darkMode ? 'border-gray-700' : ''}`}>
                <Table>
                  <TableHeader className={darkMode ? 'bg-gray-800/50' : ''}>
                    <TableRow className={darkMode ? 'border-gray-700' : ''}>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>Action</TableHead>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>User</TableHead>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>Description</TableHead>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>File</TableHead>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>Uploaded By</TableHead>
                      <TableHead className={darkMode ? 'text-gray-300' : ''}>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className={darkMode ? 'border-gray-700' : ''}>
                        <TableCell colSpan={6} className={`text-center ${darkMode ? 'text-gray-300' : ''}`}>
                          Loading activities...
                        </TableCell>
                      </TableRow>
                    ) : activities.length === 0 ? (
                      <TableRow className={darkMode ? 'border-gray-700' : ''}>
                        <TableCell colSpan={6} className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No activity logs found with the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activities.map((activity) => (
                        <TableRow key={activity.id} className={darkMode 
                          ? 'border-gray-700 hover:bg-gray-800/50' 
                          : 'hover:bg-gray-50'}>
                          <TableCell className="w-12">
                            {getActionIcon(activity)}
                          </TableCell>
                          <TableCell className={darkMode ? 'text-gray-200' : ''}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {activity.user?.avatar_url ? (
                                  <AvatarImage 
                                    src={activity.user.avatar_url || ""} 
                                    alt={activity.user?.full_name || "User"} 
                                    className="object-cover"
                                  />
                                ) : (
                                  <AvatarFallback className={`text-xs ${darkMode 
                                    ? 'bg-blue-700 text-white' 
                                    : 'bg-blue-600 text-white'}`}>
                                    {renderUserInitials(activity.user?.full_name)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span>
                                {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={darkMode ? 'text-gray-200' : ''}>
                            {activity.description}
                          </TableCell>
                          <TableCell>
                            {(activity.file || activity.deleted_file_info) ? (
                              <div className="text-sm">
                                <span className={darkMode ? 'text-gray-200' : ''}>
                                  {getFileName(activity)}
                                </span>
                                <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                                  {getViolationType(activity)}
                                </div>
                              </div>
                            ) : (
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {activity.file && activity.file.uploader ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {activity.file.uploader.avatar_url ? (
                                    <AvatarImage 
                                      src={activity.file.uploader.avatar_url || ""} 
                                      alt={activity.file.uploader.full_name || "User"} 
                                      className="object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className={`text-xs ${darkMode 
                                      ? 'bg-blue-700 text-white' 
                                      : 'bg-blue-600 text-white'}`}>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <span className={`text-sm ${darkMode ? 'text-gray-200' : ''}`}>
                                  {activity.file.uploader.full_name || activity.file.uploader.email || 'Unknown'}
                                </span>
                              </div>
                            ) : activity.action_type === "delete" && activity.user ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {activity.user.avatar_url ? (
                                    <AvatarImage 
                                      src={activity.user.avatar_url || ""} 
                                      alt={activity.user.full_name || "User"} 
                                      className="object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className={`text-xs ${darkMode 
                                      ? 'bg-blue-700 text-white' 
                                      : 'bg-blue-600 text-white'}`}>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <span className={`text-sm ${darkMode ? 'text-gray-200' : ''}`}>
                                  {activity.user.full_name || activity.user.email || 'Unknown'}
                                </span>


                                
                              </div>
                            ) : (
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>-</span>
                            )}
                          </TableCell>
                          <TableCell className={darkMode ? 'text-gray-300' : ''}>
                            {formatDate(activity.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  aria-disabled={currentPage <= 1}
                  className={`${currentPage <= 1 ? "pointer-events-none opacity-50" : ""} ${
                    darkMode ? 'text-gray-300 hover:bg-gray-800' : ''
                  }`}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      isActive={currentPage === pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={darkMode && currentPage !== pageNum 
                        ? 'text-gray-300 hover:bg-gray-800' 
                        : darkMode && currentPage === pageNum
                        ? 'bg-blue-700' 
                        : ''}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  aria-disabled={currentPage >= totalPages}
                  className={`${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""} ${
                    darkMode ? 'text-gray-300 hover:bg-gray-800' : ''
                  }`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
      
      <div className="text-center text-xs mb-4">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          © 2025 New Era University. All rights reserved.
        </span>
      </div>
    </div>
  </div>
);
}
