import React from "react";
import MenuSidebar from "./Sidebar";

function MenuLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#431407" }}>
      <MenuSidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
          height: "100vh",
          background: "linear-gradient(180deg, #FFF7ED 0%, #FFF1E0 100%)",
          padding: "20px 24px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default MenuLayout;