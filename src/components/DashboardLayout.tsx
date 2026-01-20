import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex ">
      <Sidebar />
      <main className="flex-1 mr-72 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
