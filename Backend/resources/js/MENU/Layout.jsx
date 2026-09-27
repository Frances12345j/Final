import React, { useState, useEffect, useCallback } from "react";
import { Badge, Modal, Tooltip } from "antd";
import { BellOutlined, LogoutOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import MenuSidebar from "./Sidebar";
import LowStockAlertModal from "../components/LowStockAlertModal.jsx";
import { api } from "../config/api";
import { clearAuthSession } from "../utils/authStorage";
import { useLowStock } from "../context/LowStockContext";

function tagStyle(color) {
  const map = {
    green: { bg: "#F0FDF4", text: "#15803D" },
    orange: { bg: "#FFF7ED", text: "#C2410C" },
    amber: { bg: "#FFFBEB", text: "#B45309" },
    red: { bg: "#FEF2F2", text: "#B91C1C" },
  };
  const c = map[color] || map.orange;
  return { fontSize: 9, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.text, fontWeight: 600, flexShrink: 0, alignSelf: "flex-start", marginTop: 2 };
}

function MenuLayout({ children }) {
  const navigate = useNavigate();
  const { lowStockCount, openModal: openLowStockModal } = useLowStock();

  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const HEADER_BG = "linear-gradient(135deg, #EA580C 0%, #F97316 100%)";
  const HEADER_SHADOW = "0 4px 16px rgba(67,20,7,0.30)";
  const HEADER_BORDER = "rgba(255,247,237,0.10)";

  const TEXT = "#FFF7ED";
  const FAINT = "#B07A5A";
  const ACCENT = "#F97316";
  const ACCENT_SOFT = "rgba(249,115,22,0.18)";
  const BORDER = "rgba(255,247,237,0.10)";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.unread_count);
    } catch { }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { params: { per_page: 10 } });
      setNotifications(res.data.data || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
    setLogoutModalVisible(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#431407" }}>
      <MenuSidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        {/* Orange Header Bar with Low Stock Alert + Bell + Logout */}
        <div
          style={{
            height: 68,
            boxSizing: "border-box",
            background: HEADER_BG,
            borderBottom: `1px solid ${HEADER_BORDER}`,
            boxShadow: HEADER_SHADOW,
            flexShrink: 0,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "0 24px",
            position: "relative",
          }}
        >
          {/* Low Stock Alert pill — gibalhin gikan sa sidebar */}
          {lowStockCount > 0 && (
            <Tooltip title={`${lowStockCount} items below reorder level - Click to view details`} placement="bottom">
              <button
                onClick={openLowStockModal}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, rgba(234, 88, 12, 0.28) 0%, rgba(245, 158, 11, 0.38) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.65)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  color: "#FFF",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "-0.2px",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(234, 88, 12, 0.40) 0%, rgba(245, 158, 11, 0.50) 100%)"}
                onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(234, 88, 12, 0.28) 0%, rgba(245, 158, 11, 0.38) 100%)"}
              >
                <WarningOutlined style={{ color: "#FBBF24", fontSize: 15 }} />
                <span>Low Stock Alert</span>
                <span
                  style={{
                    background: "#EA580C",
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 800,
                    borderRadius: 999,
                    padding: "1px 7px",
                    minWidth: 20,
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  {lowStockCount}
                </span>
              </button>
            </Tooltip>
          )}

          {/* Notification bell */}
          <button
            onClick={() => {
              setNotificationPanelVisible(!notificationPanelVisible);
              if (!notificationPanelVisible) fetchNotifications();
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF7ED",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,247,237,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Badge count={unreadCount} size="small" offset={[2, -2]}>
              <BellOutlined style={{ fontSize: 22, color: "#FFF7ED" }} />
            </Badge>
          </button>

          {/* Logout button */}
          <Tooltip title="Sign Out" placement="bottom">
            <button
              onClick={() => setLogoutModalVisible(true)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                borderRadius: 8,
                color: "#FFF7ED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,247,237,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LogoutOutlined style={{ fontSize: 20 }} />
            </button>
          </Tooltip>

          {notificationPanelVisible && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
                onClick={() => setNotificationPanelVisible(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 24,
                  top: "100%",
                  marginTop: 8,
                  zIndex: 50,
                  width: 340,
                  background: "#5C1E0A",
                  borderRadius: 12,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                  border: `1px solid ${BORDER}`,
                  maxHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: `1px solid ${BORDER}`,
                    background: "rgba(67,20,7,0.4)",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        color: ACCENT,
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: FAINT }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                        style={{
                          padding: "9px 14px",
                          cursor: "pointer",
                          background: !n.is_read ? ACCENT_SOFT : "transparent",
                          borderBottom: `1px solid ${BORDER}`,
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: !n.is_read ? ACCENT : "transparent",
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.4, wordBreak: "break-word" }}>
                            {n.message}
                          </div>
                          {n.data?.branch_name && (
                            <div style={{ fontSize: 10, color: ACCENT, marginTop: 2, fontWeight: 600 }}>
                              {n.data.branch_name}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: FAINT, marginTop: 2 }}>
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                          {n.type === "Stock_Received" && <span style={tagStyle("green")}>Received</span>}
                          {n.type === "Cash_Advance_Request" && <span style={tagStyle("orange")}>Cash Adv</span>}
                          {n.type === "Stock_Request" && <span style={tagStyle("amber")}>Request</span>}
                          {n.type === "Low_Stock" && <span style={tagStyle("red")}>Low Stock</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "linear-gradient(180deg, #FFF7ED 0%, #FFF1E0 100%)",
            padding: "20px 24px",
          }}
        >
          {children}
        </div>
      </div>

      {/* Sign Out Modal */}
      <Modal
        title="Sign Out"
        open={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        onOk={handleLogout}
        okText="Yes, Sign Out"
        okButtonProps={{ danger: true, className: "rounded-lg" }}
        cancelButtonProps={{ className: "rounded-lg" }}
      >
        <p style={{ color: "#7C2D12" }}>Are you sure you want to sign out?</p>
        <p style={{ fontSize: 12, color: "#B07A5A", marginTop: 4 }}>You will need to sign in again to access the dashboard.</p>
      </Modal>

      <LowStockAlertModal />
    </div>
  );
}

export default MenuLayout;