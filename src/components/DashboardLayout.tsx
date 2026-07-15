import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarInset } from '@/components/ui/sidebar';

const DashboardLayout = () => {
  return (
    <>
      <Sidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col bg-[#f8fafc] p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
};

export default DashboardLayout;
