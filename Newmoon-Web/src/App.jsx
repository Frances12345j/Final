import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { spinConfig } from "./components/spinConfig.jsx";
import AdminApp from "./AdminApp";
import { LowStockProvider } from "./context/LowStockContext.jsx";
import "antd/dist/reset.css";
import "./index.css";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh: instant loads across admin pages
      gcTime: 1000 * 60 * 15,   // 15 minutes memory retention
      refetchOnWindowFocus: false, // Prevent laggy network refetches on window focus
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ConfigProvider spin={spinConfig}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <LowStockProvider>
              <AdminApp />
            </LowStockProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
}
