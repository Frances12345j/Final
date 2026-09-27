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
} from "./ProtectedRoute.jsx";

const RootRedirect = () => (
  <Navigate
    to={localStorage.getItem("isLoggedIn") === "true" ? "/dashboard" : "/login"}
    replace
  />
);

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
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <SalesRecord />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/customers"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <Customers />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
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
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <CashAdvance />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/stock-requests"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <StockRequest />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/supply-requests"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <SupplyRequest />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/staff-performance"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <StaffPerformance />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
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
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <UserProfiles />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
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
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <RequestAdmin />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/pullout-admin"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <PullOutAdmin />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/back-to-sales"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <BackToSale />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Reports Routes */}
      <Route
        path="/reports"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <ReportGeneration />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/reports/sales"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <SalesReport />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/reports/inventory"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <InventoryReport />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/reports/attendance"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <AttendanceReport />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/reports/branch"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <BranchReport />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/reports/pullout"
        element={
          localStorage.getItem("role") === "admin" ? (
            <ProtectedRoute>
              <Layout>
                <PullOutReport />
              </Layout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

     

      <Route
        path="/delivery"
        element={
          localStorage.getItem("role") === "admin" ? (
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
