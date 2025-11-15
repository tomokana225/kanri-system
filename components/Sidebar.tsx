import React, { useRef, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setOpen, children }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on click outside
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
      {/* Overlay for all screen sizes */}
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar - now a toggleable drawer on all screen sizes */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white p-4 border-r border-gray-200 
                   flex flex-col
                   sidebar-transition 
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">メニュー</h2>
        <nav className="flex-1 flex flex-col">
            {children}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;