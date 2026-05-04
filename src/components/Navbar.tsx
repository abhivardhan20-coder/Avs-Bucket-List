import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu, Tv, BarChart2, LogOut, Bell, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import NotificationPopover from './NotificationPopover';
import { MediaItem } from '../types';
import ContentModal from './ContentModal';
import { useNotifications } from '../hooks/useNotifications';
import { SyncMonitor } from './SyncMonitor';

interface NavbarProps {
  activeTab: 'home' | 'watchlist' | 'watched' | 'stats' | 'upcoming';
  setActiveTab: (tab: 'home' | 'watchlist' | 'watched' | 'stats' | 'upcoming') => void;
  watchedCount: number;
  onSearchClick: () => void;
  onSettingsClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  watchedCount,
  onSearchClick,
  onSettingsClick
}) => {
  const { logout, user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [selectedNotifItem, setSelectedNotifItem] = useState<MediaItem | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Use the notification hook to get counts and items
  const { notifications, loading: loadingNotifications } = useNotifications();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavItemClass = (isActive: boolean) =>
    `px-5 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive
      ? 'bg-[#7f1d1d] text-white shadow-lg shadow-red-900/20 scale-105'
      : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`;

  const getMobileNavItemClass = (isActive: boolean) =>
    `px-4 py-2 rounded text-left transition-colors flex items-center gap-2 ${isActive
      ? 'bg-[#7f1d1d] text-white font-bold'
      : 'text-gray-300 hover:bg-white/5'
    }`;

  return (
    <>
      <nav className={`fixed w-full z-50 transition-colors duration-300 ${isScrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">

          <div className="flex items-center gap-8">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveTab('home')}
            >
              <Tv className="w-8 h-8 text-red-600 transition-transform group-hover:scale-110" />
              <h1 className="text-white text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap">
                AV's Bucket List
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setActiveTab('home')}
                className={getNavItemClass(activeTab === 'home')}
              >
                Home
              </button>

              <button
                onClick={() => setActiveTab('watchlist')}
                className={getNavItemClass(activeTab === 'watchlist')}
              >
                Watchlist
              </button>

              <button
                onClick={() => setActiveTab('watched')}
                className={`${getNavItemClass(activeTab === 'watched')} flex items-center gap-2`}
                aria-label={`Watched items, ${watchedCount} items`}
              >
                Watched
                {watchedCount > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center transition-colors ${activeTab === 'watched' ? 'bg-white text-[#7f1d1d]' : 'bg-[#7f1d1d] text-white'}`}>
                    {watchedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={getNavItemClass(activeTab === 'stats')}
              >
                <BarChart2 className="w-4 h-4" /> Stats
              </button>

              <button
                onClick={() => setActiveTab('upcoming')}
                className={getNavItemClass(activeTab === 'upcoming')}
              >
                Upcoming
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 text-white">
            <button
              onClick={onSearchClick}
              className="hover:text-gray-300 transition-colors p-2 -m-2"
              title="Search"
              aria-label="Search for movies and series"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative hover:text-gray-300 transition-colors ${isNotifOpen ? 'text-white' : 'text-gray-300'}`}
                title="Notifications"
                aria-label={`${notifications.length} notifications`}
              >
                <Bell className="w-5 h-5" />
                {!loadingNotifications && notifications.length > 0 && (
                  <span
                    key={notifications.length}
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] px-0.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-sm border border-[#141414] animate-in zoom-in duration-300"
                  >
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <NotificationPopover
                  items={notifications}
                  loading={loadingNotifications}
                  onItemClick={setSelectedNotifItem}
                  onClose={() => setIsNotifOpen(false)}
                />
              )}
            </div>

            <SyncMonitor />

            <div className="relative" ref={profileRef}>
              <div
                className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-blue-500 transition-colors uppercase"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title="Settings"
              >
                {user?.name?.[0] || 'D'}
              </div>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-10 bg-[#141414] border border-gray-800 rounded shadow-2xl w-48 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-gray-800 mb-2">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { onSettingsClick(); setIsProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            <button
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#141414] border-t border-gray-800 p-4 absolute w-full animate-in slide-in-from-top-5 shadow-2xl">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
                className={getMobileNavItemClass(activeTab === 'home')}
              >
                Home
              </button>
              <button
                onClick={() => { setActiveTab('watchlist'); setIsMobileMenuOpen(false); }}
                className={getMobileNavItemClass(activeTab === 'watchlist')}
              >
                Watchlist
              </button>
              <button
                onClick={() => { setActiveTab('watched'); setIsMobileMenuOpen(false); }}
                className={`${getMobileNavItemClass(activeTab === 'watched')} flex justify-between items-center`}
              >
                <span>Watched</span>
                {watchedCount > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${activeTab === 'watched' ? 'bg-white text-[#7f1d1d]' : 'bg-[#7f1d1d] text-white'}`}>
                    {watchedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('stats'); setIsMobileMenuOpen(false); }}
                className={getMobileNavItemClass(activeTab === 'stats')}
              >
                <BarChart2 className="w-4 h-4" /> My Stats
              </button>
              <button
                onClick={() => { setActiveTab('upcoming'); setIsMobileMenuOpen(false); }}
                className={getMobileNavItemClass(activeTab === 'upcoming')}
              >
                <Calendar className="w-4 h-4" /> Upcoming
              </button>
              <div className="border-t border-gray-800 pt-2 mt-2">
                <button
                  onClick={() => { onSettingsClick(); setIsMobileMenuOpen(false); }}
                  className={getMobileNavItemClass(false)}
                >
                  Settings
                </button>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className={`${getMobileNavItemClass(false)} text-red-400 hover:text-red-300`}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {selectedNotifItem && (
        <ContentModal
          item={selectedNotifItem}
          isOpen={!!selectedNotifItem}
          onClose={() => setSelectedNotifItem(null)}
        />
      )}
    </>
  );
};

export default Navbar;