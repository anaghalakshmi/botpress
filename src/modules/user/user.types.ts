// ── Profile response ───────────────────────────────────────────────────────
// The safe public shape of a user — never includes passwordHash
export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Admin user list item ───────────────────────────────────────────────────
export interface UserSummaryDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    orders: number;
  };
}
