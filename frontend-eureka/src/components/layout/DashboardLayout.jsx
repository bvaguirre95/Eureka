import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OrgSwitcher } from "./OrgSwitcher";

export const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="lg:pl-64">
        <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
        <OrgSwitcher />
        <main className="px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;