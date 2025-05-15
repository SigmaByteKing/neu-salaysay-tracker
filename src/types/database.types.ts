
// Add or update the ViolationType definition
export type ViolationType = "Other" | "Behavioral Issue" | "Dress Code Violation" | "Academic Misconduct" | "Property Damage" | "Attendance Issue";

// Add Profile type export that's being referenced in ActivityLogs.tsx
export interface Profile {
  id: string;
  created_at: string;
  updated_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}
