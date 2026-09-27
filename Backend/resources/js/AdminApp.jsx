import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Layout from "./Layout/Layout.jsx";

// Admin components in ./app/admin
import Dashboard from "./app/admin/Dashboard.jsx";
import BranchDetails from "./app/admin/BranchDetails.jsx";
import Login from "./app/admin/Login.jsx";
import Attendance from "./app/admin/AttendanceSheet.jsx";
import ProductList from "./app/admin/ProductList.jsx";
import StaffList from "./app/admin/Staff.jsx";
import BranchAssignments from "./app/admin/BranchAssignments.jsx";
import BranchMap from "./app/admin/BranchMap.jsx";
import RequestAdmin from "./app/admin/RequestAdmin.jsx";
import CashAdvance from "./app/admin/CashAdvance.jsx";
import StockRequest from "./app/admin/StockRequest.jsx";
import SupplyRequest from "./app/admin/SupplyRequest.jsx";
import StaffPerformance from "./app/admin/StaffPerformance.jsx";
import BackToSale from "./app/admin/BackToSale.jsx";
import PullOutAdmin from "./app/admin/PullOutAdmin.jsx";
import Customers from "./app/admin/Customers.jsx";
import SalesRecord from "./app/admin/SalesRecord.jsx";
import Delivery from "./app/admin/Delivery.jsx";
import UserProfiles from "./app/admin/UserProfiles.jsx";

// Reports
import SalesReport from "./Reports/SalesReport.jsx";
import InventoryReport from "./Reports/InventoryReport.jsx";
import AttendanceReport from "./Reports/AttendanceReport.jsx";
import BranchReport from "./Reports/BranchReport.jsx";
import PullOutReport from "./Reports/PullOutReport.jsx";
import ReportGeneration from "./Reports/ReportGeneration.jsx";

// Auth
import ProtectedRoute, {
  AuthHistoryGuard,
  GuestRoute,
  AdminRoute,
} from "./ProtectedRoute.jsx";
import { getIsLoggedIn, checkDevRunSession } from "./utils/authStorage.js";

const RootRedirect = () => {
  checkDevRunSession();
  return (
    <Navigate
      to={getIsLoggedIn() ? "/dashboard" : "/login"}
      replace
    />
  );
};

function AdminApp() {
  return (
    <>
      <AuthHistoryGuard />
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      {/* Public */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <BranchDetails />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-map"
        element={
          <ProtectedRoute>
            <Layout>
              <BranchMap />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <SalesRecord />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <Customers />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout>
              <ProductList />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cash-advance"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <CashAdvance />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock-requests"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <StockRequest />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/supply-requests"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <SupplyRequest />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff-performance"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <StaffPerformance />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <Layout>
              <StaffList />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user-profiles"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <UserProfiles />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Branch Assignments */}
      <Route
        path="/branch-assign"
        element={
          <ProtectedRoute>
            <Layout>
              <BranchAssignments />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-assignments"
        element={<Navigate to="/branch-assign" replace />}
      />

      <Route
        path="/RequestAdmin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <RequestAdmin />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pullout-admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <PullOutAdmin />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/back-to-sales"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <BackToSale />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Reports Routes */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <ReportGeneration />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/sales"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <SalesReport />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/inventory"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <InventoryReport />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/attendance"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AttendanceReport />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/branch"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <BranchReport />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/pullout"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <PullOutReport />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

     

      <Route
        path="/delivery"
        element={
          getAuthRole() === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <Delivery />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default AdminApp;
