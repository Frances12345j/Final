import React from "react";
import { Modal, Table, Button, Tag, Progress } from "antd";
import {
  WarningOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLowStock } from "../context/LowStockContext";

export default function LowStockAlertModal() {
  const { lowStockItems, lowStockCount, isModalOpen, closeModal, refreshLowStock, loading } = useLowStock();
  const navigate = useNavigate();

  const handleGoToInventory = () => {
    closeModal();
    navigate("/inventory");
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <span className="font-bold text-stone-900">{name}</span>
          {record.sku && (
            <div className="text-[11px] text-stone-400 font-mono">{record.sku}</div>
          )}
        </div>
      ),
    },
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      render: (branch) => <Tag color="orange">{branch}</Tag>,
    },
    {
      title: "Stock Level",
      key: "stock",
      align: "center",
      render: (_, r) => {
        const percent = Math.min(100, Math.round((Number(r.current_stock) / Number(r.reorder_level)) * 100));
        const isOut = Number(r.current_stock) <= 0;
        return (
          <div className="w-28 mx-auto">
            <div className="flex justify-between items-center text-xs mb-1 font-semibold">
              <span className={isOut ? "text-red-600" : "text-amber-600"}>
                {r.current_stock} pcs
              </span>
              <span className="text-stone-400 font-normal">/ {r.reorder_level}</span>
            </div>
            <Progress
              percent={percent}
              size="small"
              status={isOut ? "exception" : "normal"}
              strokeColor={isOut ? "#EF4444" : "#F59E0B"}
              showInfo={false}
            />
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => (
        <Tag color={status === "Out of Stock" ? "red" : "orange"} icon={<WarningOutlined />}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Shortage",
      dataIndex: "shortage",
      key: "shortage",
      align: "right",
      render: (shortage) => (
        <span className="font-bold text-red-600">
          +{shortage} pcs needed
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: () => (
        <Button
          size="small"
          type="primary"
          onClick={handleGoToInventory}
          className="rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold"
        >
          Restock
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={isModalOpen}
      onCancel={closeModal}
      footer={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={refreshLowStock}
          loading={loading}
          className="rounded-xl mr-auto"
        >
          Refresh
        </Button>,
        <Button key="close" onClick={closeModal} className="rounded-xl px-4">
          Dismiss
        </Button>,
        <Button
          key="inventory"
          type="primary"
          icon={<InboxOutlined />}
          onClick={handleGoToInventory}
          className="rounded-xl bg-linear-to-r from-orange-600 to-amber-500 border-none font-semibold px-5 shadow-md shadow-orange-500/20"
        >
          Go to Restock in Products
        </Button>,
      ]}
      width={780}
      centered
      className="rounded-3xl"
      title={
        <div className="flex items-center gap-3 pt-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 text-lg shadow-inner">
            <WarningOutlined />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 mb-0">Low Stock Alert</h3>
            <p className="text-xs text-amber-800 font-semibold mb-0">
              {lowStockCount} {lowStockCount === 1 ? "item is" : "items are"} below reorder level
            </p>
          </div>
        </div>
      }
    >
      <div className="py-2">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-3">
          <div className="mt-0.5 text-amber-600">
            <WarningOutlined />
          </div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Urgent Restock Recommended: </span>
            These items need to be restocked soon to avoid stockouts. You can click <strong>Restock</strong> to open the product management page.
          </div>
        </div>

        <Table
          dataSource={lowStockItems}
          columns={columns}
          rowKey={(r) => `${r.branch_id}-${r.product_id}`}
          pagination={false}
          size="middle"
          className="rounded-xl overflow-hidden border border-orange-100"
          locale={{
            emptyText: (
              <div className="py-8 text-center text-stone-400">
                <CheckCircleOutlined className="text-green-500 text-2xl mb-2" />
                <p className="mb-0 text-sm font-semibold text-stone-600">All products are adequately stocked!</p>
              </div>
            ),
          }}
        />
      </div>
    </Modal>
  );
}
