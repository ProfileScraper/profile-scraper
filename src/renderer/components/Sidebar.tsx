import React from 'react';
import { NavLink } from 'react-router-dom';
import { useScraper } from '../hooks/useScraper';
import logoImg from '../assets/logo.png';

export function Sidebar() {
  const { isRunning } = useScraper();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6 border-b flex items-center gap-3">
        <img src={logoImg} alt="ProfileScraper" className="w-10 h-10 rounded-lg" />
        <h1 className="text-xl font-bold text-gray-800">ProfileScraper</h1>
      </div>

      <nav className="flex-1 py-4">
        <NavLink to="/profiles" className={navLinkClass}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Profiles
        </NavLink>

        <NavLink to="/jobs" className={navLinkClass}>
          <div className="flex items-center flex-1">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Jobs
            {isRunning && (
              <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </NavLink>

        <NavLink to="/help" className={navLinkClass}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help
        </NavLink>
      </nav>

      <div className="p-4 border-t text-xs text-gray-500 text-center">
        v1.0.0
      </div>
    </aside>
  );
}
