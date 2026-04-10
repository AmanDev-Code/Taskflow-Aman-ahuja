export type MemberRole = 'owner' | 'admin' | 'member';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: Date;
}

export interface ProjectMemberWithUser extends ProjectMember {
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  user_color: string;
}
