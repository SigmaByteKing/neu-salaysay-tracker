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
  ChevronDown
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const [selectedViolationTypes, setSelectedViolationTypes] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState(0);

  const form = useForm({
    defaultValues: {
      violationTypes: [] as string[],
    },
  });

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

  const getActionIcon = (activity: ActivityLog) => {
    switch (activity.action_type) {
      case 'upload':
        return <Upload className="h-5 w-5 text-blue-500" />;
      case 'view':
        return <Eye className="h-5 w-5 text-purple-500" />;
      case 'login':
        return <LogIn className="h-5 w-5 text-purple-500" />;
      case 'logout':
        return <LogOut className="h-5 w-5 text-orange-500" />;
      case 'delete':
        return <Trash className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
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
      <div className="text-sm text-muted-foreground mt-1">
        <strong>File:</strong> {fileName} ({violationType})
        {activity.file && activity.file.uploader && activity.action_type !== 'delete' && (
          <div className="text-xs text-muted-foreground mt-1">
            <strong>Uploaded by:</strong> {activity.file.uploader.full_name || activity.file.uploader.email || 'Unknown user'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#BBDEFB] overflow-auto">
      <header className="h-16 bg-[#0E254E] text-white flex items-center justify-between px-6 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/42a0c089-7817-4d54-b180-12a27a76a70f.png" 
            alt="NEU Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold">NEU-STAT</h1>
        </div>
        <Button
          variant="outline"
          className="bg-white/10 hover:bg-white/20 text-white border-transparent"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </header>

      <div className="container mx-auto py-6 px-6 max-w-6xl">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>System Activity</CardTitle>
              <div className="flex items-center gap-3">
                {activeFilters > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <FilterIcon className="h-4 w-4" />
                      <span>Filters</span>
                      {activeFilters > 0 && (
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          {activeFilters}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 p-4 bg-white" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Activity Logs</h4>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium block text-black">User</label>
                        <Select 
                          value={userFilter} 
                          onValueChange={setUserFilter}
                        >
                          <SelectTrigger className="w-full bg-white text-black">
                            <SelectValue>
                              {userFilter === "all" ? "All Users" : getUserName(userFilter)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all" className="text-black">All Users</SelectItem>
                            {userProfiles.map(profile => (
                              <SelectItem key={profile.id} value={profile.id} className="text-black">
                                {profile.full_name || profile.email || 'Unknown user'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium block text-black">Action Type</label>
                        <Select 
                          value={actionFilter} 
                          onValueChange={setActionFilter}
                        >
                          <SelectTrigger className="w-full bg-white text-black">
                            <SelectValue>
                              {actionFilter === "all" ? "All Actions" : getActionTypeDisplay(actionFilter)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all" className="text-black">All Actions</SelectItem>
                            <SelectItem value="upload" className="text-black">Upload</SelectItem>
                            <SelectItem value="view" className="text-black">View</SelectItem>
                            <SelectItem value="login" className="text-black">Login</SelectItem>
                            <SelectItem value="logout" className="text-black">Logout</SelectItem>
                            <SelectItem value="delete" className="text-black">Delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium block text-black">Violation Type</label>
                        <Select 
                          value={violationTypeFilter} 
                          onValueChange={setViolationTypeFilter}
                        >
                          <SelectTrigger className="w-full bg-white text-black">
                            <SelectValue>
                              {violationTypeFilter === "all" ? "All Violation Types" : violationTypeFilter}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all" className="text-black">All Violation Types</SelectItem>
                            {violationTypes.map(type => (
                              <SelectItem key={type} value={type} className="text-black">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium block text-black">Date Range</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "PP") : "Start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={startDate}
                                  onSelect={setStartDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "PP") : "End date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={endDate}
                                  onSelect={setEndDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={clearFilters}>Clear all</Button>
                        <Button onClick={() => {
                          setCurrentPage(1);
                          fetchActivityLogs();
                        }}>Apply Filters</Button>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-4">
                {loading ? (
                  <div className="text-center py-10">Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No activity logs found with the current filters.
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
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
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {renderUserInitials(activity.user?.full_name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">
                            {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                          </span>
                          <span>{activity.description}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(activity.created_at)}
                        </p>
                        {renderFileInfo(activity)}
                        {activity.action_type === "delete" && activity.deleted_file_info && (
                          <div className="mt-2 flex items-center gap-2">
                            {/* Removed "Uploaded by:" element for delete logs */}
                          </div>
                        )}
                        {activity.file && activity.file.uploader && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Uploaded by:</span>
                            <Avatar className="h-5 w-5">
                              {activity.file.uploader.avatar_url ? (
                                <AvatarImage 
                                  src={activity.file.uploader.avatar_url} 
                                  alt={activity.file.uploader.full_name || "User"} 
                                />
                              ) : (
                                <AvatarFallback className="text-xs bg-blue-500 text-white">
                                  {renderUserInitials(activity.file.uploader.full_name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-xs font-medium">
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Loading activities...
                          </TableCell>
                        </TableRow>
                      ) : activities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No activity logs found with the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="w-12">
                              {getActionIcon(activity)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {activity.user?.avatar_url ? (
                                    <AvatarImage 
                                      src={activity.user.avatar_url || ""} 
                                      alt={activity.user?.full_name || "User"} 
                                      className="object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {renderUserInitials(activity.user?.full_name)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <span>
                                  {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{activity.description}</TableCell>
                            <TableCell>
                              {(activity.file || activity.deleted_file_info) ? (
                                <div className="text-sm">
                                  {getFileName(activity)}
                                  <div className="text-xs text-muted-foreground">
                                    {getViolationType(activity)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
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
                                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                        <User className="h-3 w-3" />
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <span className="text-sm">
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
                                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                        <User className="h-3 w-3" />
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <span className="text-sm">
                                    {activity.user.full_name || activity.user.email || 'Unknown'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(activity.created_at)}</TableCell>
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
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
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
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
