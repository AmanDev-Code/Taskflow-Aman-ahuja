export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  color: string;
  created_at: Date;
  updated_at: Date;
}
