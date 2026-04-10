import { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, Layers, User as UserIcon, Bell, Search, Command, Check, MessageSquare, UserPlus, Calendar, FolderKanban, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useGlobalSearch } from '@/hooks/useSearch';
import { getInitials, getUserColor } from '@/lib/utils';
import { getStatusConfig } from '@/types';

const mockNotifications = [
  { id: 1, icon: Check, title: 'Task completed', message: 'John finished "Update API endpoints"', time: '2m ago', read: false },
  { id: 2, icon: MessageSquare, title: 'New comment', message: 'Sarah commented on "Design review"', time: '15m ago', read: false },
  { id: 3, icon: UserPlus, title: 'New team member', message: 'Alex joined the project', time: '1h ago', read: true },
  { id: 4, icon: Calendar, title: 'Deadline reminder', message: 'Sprint 4 ends tomorrow', time: '3h ago', read: true },
];

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    query: searchQuery,
    results: searchResults,
    isOpen: isSearchOpen,
    setIsOpen: setSearchOpen,
    handleSearchChange,
    handleClearSearch,
  } = useGlobalSearch();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleResultClick = (path: string) => {
    navigate(path);
    handleClearSearch();
  };

  const unreadCount = mockNotifications.filter(n => !n.read).length;
  const hasResults = searchResults.projects.length > 0 || searchResults.tasks.length > 0;

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/projects" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-lg shadow-purple-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              TaskFlow
            </span>
          </Link>

          {/* Center - Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchContainerRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Search projects and tasks..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                className="pl-10 pr-16 h-10 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
              />
              {searchQuery ? (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              )}

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  {searchResults.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : !hasResults ? (
                    <div className="py-8 text-center">
                      <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No results found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {/* Projects */}
                      {searchResults.projects.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-800">
                            Projects
                          </div>
                          {searchResults.projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleResultClick(`/projects/${project.id}`)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                            >
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center">
                                <FolderKanban className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {project.name}
                                </p>
                                {project.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {project.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tasks */}
                      {searchResults.tasks.length > 0 && (
                        <div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-800">
                            Tasks
                          </div>
                          {searchResults.tasks.map((task) => {
                            const statusConfig = getStatusConfig(task.status);
                            return (
                              <button
                                key={task.id}
                                onClick={() => handleResultClick(`/projects/${task.project_id}/tasks/${task.id}`)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                              >
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: statusConfig.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge
                                      className="text-[10px] font-medium px-1.5 py-0"
                                      style={{
                                        backgroundColor: statusConfig.bgColor,
                                        color: statusConfig.color,
                                      }}
                                    >
                                      {statusConfig.title}
                                    </Badge>
                                    {task.assignees.length > 0 && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {task.assignees[0].user_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{unreadCount} new</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {mockNotifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className={`flex items-start gap-3 p-3 cursor-pointer ${notification.read ? 'opacity-60' : ''} text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-800`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notification.read ? 'bg-gray-100 dark:bg-slate-800' : 'bg-purple-100 dark:bg-purple-500/20'}`}>
                        <notification.icon className={`h-4 w-4 ${notification.read ? 'text-gray-500' : 'text-purple-600 dark:text-purple-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.message}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0 mt-1" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                <div className="p-2">
                  <Button variant="ghost" className="w-full text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10">
                    View all notifications
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 rounded-lg px-2 hover:bg-gray-100 dark:hover:bg-slate-800 ml-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-gray-200 dark:ring-slate-700">
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback 
                          className="text-xs font-semibold text-white"
                        style={{ backgroundColor: getUserColor(user.id) }}
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-800 rounded-lg flex items-center">
                        <UserIcon className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span>Profile & Settings</span>
                      </Link>
                  </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                  <div className="p-1">
                  <DropdownMenuItem
                    onClick={logout}
                      className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 rounded-lg"
                  >
                      <LogOut className="mr-3 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
