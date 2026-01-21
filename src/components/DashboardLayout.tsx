import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarInset } from '@/components/ui/sidebar';

const DashboardLayout = () => {
  return (
    <>
      <Sidebar />
      <SidebarInset>
      
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
};

export default DashboardLayout;
