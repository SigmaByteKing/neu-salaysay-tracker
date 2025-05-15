
export interface ActivityLog {
  id: string;
  created_at: string;
  user_id: string;
  action_type: 'upload' | 'view' | 'login' | 'logout' | 'delete';
  description: string;
  related_file_id?: string;
  new_status?: string | null;
  user?: {
    email: string;
    full_name: string;
    avatar_url: string;
  };
  file?: {
    violation_type: string;
    file_path: string;
    file_name?: string;
    user_id?: string;
    uploader?: {
      full_name: string;
      email: string;
      avatar_url: string;
    }
  };
  deleted_file_info?: {
    file_name: string;
    violation_type: string;
  };
}
