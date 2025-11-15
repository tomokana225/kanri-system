import React, { useRef, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setOpen, children }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on click outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setOpen]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white p-4 border-r border-gray-200 flex-shrink-0
                   sidebar-transition md:relative md:translate-x-0
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">メニュー</h2>
        <nav className="space-y-2">
            {children}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
