import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../config/api";
import { getIsLoggedIn } from "../utils/authStorage";

const LowStockContext = createContext({
  lowStockItems: [],
  lowStockCount: 0,
  loading: false,
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  refreshLowStock: () => {},
});

export const LowStockProvider = ({ children }) => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLowStock = useCallback(async () => {
    if (!getIsLoggedIn()) return;
    try {
      setLoading(true);
      const res = await api.get("/reports/low-stock-alert");
      const items = res.data?.items || [];
      const count = res.data?.count ?? items.length;
      setLowStockItems(items);
      setLowStockCount(count);

      // Auto-open modal once per browser session if low stock items exist
      if (count > 0 && !sessionStorage.getItem("lowStockAlertShown")) {
        setIsModalOpen(true);
        sessionStorage.setItem("lowStockAlertShown", "true");
      }
    } catch (err) {
      console.error("[LowStock] Error fetching low stock items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStock();
    // Poll every 60 seconds for updates
    const timer = setInterval(fetchLowStock, 60000);
    return () => clearInterval(timer);
  }, [fetchLowStock]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <LowStockContext.Provider
      value={{
        lowStockItems,
        lowStockCount,
        loading,
        isModalOpen,
        openModal,
        closeModal,
        refreshLowStock: fetchLowStock,
      }}
    >
      {children}
    </LowStockContext.Provider>
  );
};

export const useLowStock = () => useContext(LowStockContext);
