
import { ActivityLog } from "@/types/activity.types";

export type ActionType = 'upload' | 'view' | 'login' | 'logout' | 'delete';
export type StatusType = string | null;

export interface ActivityLogFilters {
  userFilter?: string;
  actionFilter?: string;
  violationTypeFilter?: string;
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  itemsPerPage?: number;
  fileName?: string;
  selectedUserName?: string;
}

export interface ActivityLogResult {
  logs: ActivityLog[];
  totalCount: number;
}
