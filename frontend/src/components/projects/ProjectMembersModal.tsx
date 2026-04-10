import { useMemo, useState } from 'react';
import { UserPlus, Crown, User, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
  useUserSuggestions,
} from '@/hooks/useProjectMembers';
import { useAuthStore } from '@/stores/authStore';
import { getInitials, getUserColor } from '@/lib/utils';
import type { Project } from '@/types';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function ProjectMembersModal({ isOpen, onClose, project }: ProjectMembersModalProps) {
  const [email, setEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const { user: currentUser } = useAuthStore();
  
  const { data: members, isLoading } = useProjectMembers(project.id);
  const addMember = useAddProjectMember(project.id);
  const removeMember = useRemoveProjectMember(project.id);
  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useUserSuggestions(email);

  const isOwner = project.owner_id === currentUser?.id;
  const existingEmails = useMemo(
    () => new Set((members ?? []).map((member) => member.user.email.toLowerCase())),
    [members],
  );
  const filteredSuggestions = useMemo(
    () => suggestions.filter((user) => !existingEmails.has(user.email.toLowerCase())),
    [suggestions, existingEmails],
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAddingMember(true);
    try {
      await addMember.mutateAsync({ email: email.trim(), role: 'member' });
      setEmail('');
    } catch {
      // Error handled in hook
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600 dark:text-[#7C3AED]" />
            Project Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-gray-300">
            {isOwner
              ? 'Only project owners can add or remove members. Invite teammates by email below.'
              : 'Only the project owner can manage members. You can still view who has access.'}
          </div>

          {isOwner && (
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search by name or email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    disabled={!email.trim() || isAddingMember}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                  >
                    {isAddingMember ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {email.trim().length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {isFetchingSuggestions ? (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        Searching users...
                      </div>
                    ) : filteredSuggestions.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto">
                        {filteredSuggestions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800"
                            onClick={() => setEmail(user.email)}
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback
                                className="text-[10px] text-white"
                                style={{ backgroundColor: user.color || getUserColor(user.id) }}
                              >
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                                {user.name}
                              </p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {user.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        No matching users found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search existing users by name/email, then add by selected email
              </p>
            </form>
          )}

          <div className="border-t border-gray-200 dark:border-slate-800 pt-4">
            <h4 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
              Members & owner ({members?.length || 0})
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950/50 rounded-lg border border-gray-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.avatar_url} />
                        <AvatarFallback
                          className="text-sm text-white"
                          style={{ backgroundColor: member.user.color || getUserColor(member.user.id) }}
                        >
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.user.name}
                          </span>
                          {member.role === 'owner' && (
                            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          )}
                          {member.user.id === currentUser?.id && (
                            <Badge className="bg-[#7C3AED]/20 text-[#A855F7] text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</span>
                      </div>
                    </div>

                    {isOwner && member.role !== 'owner' && member.user.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.user.id)}
                        disabled={removeMember.isPending}
                        className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-400/10"
                      >
                        {removeMember.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-gray-600 dark:text-gray-300">No members yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
