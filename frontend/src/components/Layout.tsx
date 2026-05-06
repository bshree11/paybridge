import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
    LayoutDashboard,
    CreditCard,
    FileText,
    Shield,
    Settings,
    LogOut,
    Receipt,

}from 'lucide-react';

//Sidebar menu items
const menuItems = [
    {path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard
    },
    {path: '/payments', label: 'Payments', icon: CreditCard},
    {path: '/trasactions', label:'Transactions', icon: Receipt},
    {path: '/kyc', label: 'KYC', icon: FileText},
    {path: '/settings', label: 'Settings', icon: Settings},

];

//extra menu for compliance officers and admins
const complianceMenu =[ 
    {path:'/compliance', label: 'Compliance', icon: Shield},
];

export default function Layout(){
    const {user, logout} = useAuth();
    const location = useLocation();

    // show compliance menu only for officers and admins
      const isComplianceUser = user?.role === 'compliance_officer' || user?.role === 'admin';

     return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">PayBridge</h1>
          <p className="text-xs text-gray-500 mt-1">Payment Orchestration</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {/* Compliance section */}
          {isComplianceUser && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase px-3">
                  Compliance
                </p>
              </div>
              {complianceMenu.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User info + logout at bottom */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {location.pathname.slice(1) || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.kycStatus === 'verified'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                KYC: {user?.kycStatus || 'unverified'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content goes here */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );


}