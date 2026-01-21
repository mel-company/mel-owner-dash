import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stores from './pages/Stores';
import StoreDetails from './pages/StoreDetails';
import Employees from './pages/Employees';
import Accounting from './pages/Accounting';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Support from './pages/Support';
import DeliveryCompanies from './pages/DeliveryCompanies';
import PaymentMethods from './pages/PaymentMethods';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <DashboardLayout />
                </SidebarProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="stores"
              element={
                <ProtectedRoute requiredRoles={['owner', 'employee']}>
                  <Stores />
                </ProtectedRoute>
              }
            />
            <Route
              path="stores/:id"
              element={
                <ProtectedRoute requiredRoles={['owner', 'employee']}>
                  <StoreDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="accounting"
              element={
                <ProtectedRoute requiredRoles={['owner', 'employee']}>
                  <Accounting />
                </ProtectedRoute>
              }
            />
            <Route
              path="plans"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <SubscriptionPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="support"
              element={
                <ProtectedRoute requiredRoles={['support', 'owner']}>
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route
              path="delivery"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <DeliveryCompanies />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <PaymentMethods />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
