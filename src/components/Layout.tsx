/**
 * Layout Component
 * Main application layout with dark theme and fixed sidebar
 * Requirements: 7.1 (dark theme), 7.6 (responsive layout with 250px sidebar)
 */

import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Sidebar - Fixed 250px width */}
      <aside className="w-[250px] min-w-[250px] h-full flex flex-col border-r border-zinc-800 bg-zinc-900">
        {sidebar}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
};

export default Layout;
