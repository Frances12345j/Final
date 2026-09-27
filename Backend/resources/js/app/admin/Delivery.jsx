import React, { useState, useEffect } from "react";
import {
  Alert,
  Table,
  DatePicker,
  Select,
  Button,
  Typography,
  Tag,
  Modal,
  Descriptions,
  Image,
  Avatar,
} from "antd";
import {
  TruckOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ShoppingOutlined,
  DownloadOutlined,
  PhoneOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "@/config/api";
import { useServerPagination } from "@/components/Pagination";
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
);

const HeroButton = ({ children, ...props }) => (
  <Button
    {...props}
    className="h-11! rounded-xl! border-white/20! bg-white/5! px-5! font-medium! text-white! hover:border-orange-300! hover:text-orange-300!"
  >
    {children}
  </Button>
);

const CountPill = ({ children }) => (
  <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
    {children}
  </span>
);

const SectionCard = ({ icon, title, subtitle, extra, children, className = "" }) => (
  <div className={`rounded-2xl border border-orange-100 bg-white shadow-sm ${className}`}>
    {(title || extra) && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
          </div>
        </div>
        {extra}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const FilterBar = ({ title = "Filters", subtitle = "Narrow down the view", children }) => (
  <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
        <SearchOutlined />
      </div>
      <div>
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

const TableEmpty = ({ icon, title, description }) => (
  <div className="py-10 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
      {icon}
    </div>
    <p className="text-base font-semibold text-stone-700">{title}</p>
    {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
  </div>
);

const HeroHeader = ({ badgeIcon, badge, title, accent, subtitle, actions, stats = [] }) => (
  <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
    <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
    <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />
    {badgeIcon && (
      <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
        {badgeIcon}
      </div>
    )}
    <div className="relative z-10 px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          {badge && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              {badgeIcon}
              {badge}
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">
            {title} {accent && <span className="text-orange-400">{accent}</span>}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 xl:min-w-max">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg || "bg-orange-500/15"}`}>
                <span className={stat.iconColor || "text-orange-400"}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">{stat.label}</p>
                <p className={`text-white font-bold text-lg leading-tight ${stat.valueColor || ""}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Palette — light warm-cream + orange (matches Inventory Report) ─────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFEDD5";
const BORDER = "#FFEDD5";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.12)";
const AMBER = "#F59E0B";
const AMBER_SOFT = "rgba(245,158,11,0.15)";
const GREEN = "#16A34A";
const GREEN_SOFT = "rgba(22,163,74,0.12)";
const RED = "#EF4444";
const RED_SOFT = "rgba(239,68,68,0.15)";

// Inline style tokens
const FIELD_LABEL = { color: "#451A03", fontWeight: 500 };
const GRADIENT_BTN = {
  background: "linear-gradient(135deg, #EA580C, #F97316)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(234,88,12,0.35)",
};
const SECONDARY_BTN = {
  background: "#FFFFFF",
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};

const STATUS_COLORS = {
  ready: { color: AMBER, label: "Ready" },
  picked_up: { color: ACCENT, label: "Picked Up" },
  out_for_delivery: { color: ACCENT_DEEP, label: "Out for Delivery" },
  delivered: { color: GREEN, label: "Delivered" },
};

const DeliveryReport = () => {
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [branches, setBranches] = useState([]);
  const [riders, setRiders] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const {
    data,
    isLoading: loading,
    error: queryError,
    pagination,
    setCurrentPage,
    raw: deliveryResult,
  } = useServerPagination({
    queryKey: [
      "deliveries",
      dateRange[0]?.format("YYYY-MM-DD"),
      dateRange[1]?.format("YYYY-MM-DD"),
      selectedStatus,
      selectedBranch,
      selectedRider,
    ],
    url: "/reports/deliveries",
    params: {
      start_date: dateRange[0]?.format("YYYY-MM-DD"),
      end_date: dateRange[1]?.format("YYYY-MM-DD"),
      status: selectedStatus,
      branch_id: selectedBranch,
      rider_id: selectedRider,
    },
    label: "deliveries",
  });

  const summary = deliveryResult?.summary || null;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, selectedStatus, selectedBranch, selectedRider]);

  // Keep the dismissible error message synced with the query error
  useEffect(() => {
    setError(queryError?.response?.data?.message || queryError?.message || null);
  }, [queryError]);

  // Load branches for the filter
  useEffect(() => {
    api.get("/branches")
      .then((res) => setBranches(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBranches([]));
  }, []);

  // Load riders for filter
  useEffect(() => {
    api.get("/staff?role=delivery_rider&paginate=false").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRiders(list);
    }).catch(() => {});
  }, []);

  const handleExport = () => {
    const headers = ["Order #", "Customer", "Address", "Branch", "Rider", "Status", "Total", "Payment", "Date"];
    const csvRows = [headers.join(",")];
    data.forEach((o) => {
      csvRows.push([
        o.order_number,
        `"${o.customer_name}"`,
        `"${o.delivery_address || ""}"`,
        `"${o.branch_name}"`,
        `"${o.rider_name}"`,
        o.status,
        o.total,
        o.payment_method,
        o.created_at,
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliveries_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showDetail = (order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const heroStats = summary ? [
    {
      icon: <TruckOutlined />,
      iconColor: "text-orange-400",
      label: "Total Deliveries",
      value: summary.total_deliveries,
    },
    {
      icon: <CheckCircleOutlined />,
      iconColor: "text-emerald-400",
      label: "Delivered",
      value: summary.delivered,
    },
    {
      icon: <ClockCircleOutlined />,
      iconColor: "text-amber-400",
      label: "Out for Delivery",
      value: summary.out_for_delivery,
    },
    {
      icon: <ShoppingOutlined />,
      iconColor: "text-orange-400",
      label: "Ready / Picked Up",
      value: summary.ready + summary.picked_up,
    },
  ] : [];

  const columns = [
    {
      title: "Order #",
      dataIndex: "order_number",
      key: "order_number",
      width: 140,
      render: (val, record) => (
        <a onClick={() => showDetail(record)} className="font-medium transition-all hover:opacity-80" style={{ color: ACCENT }}>
          {val}
        </a>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 180,
      render: (val) => (
        <div className="flex items-center gap-2">
          <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: ACCENT }} />
          <span>{val}</span>
        </div>
      ),
    },
    {
      title: "Address",
      dataIndex: "delivery_address",
      key: "delivery_address",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 130,
    },
    {
      title: "Rider",
      dataIndex: "rider_name",
      key: "rider_name",
      width: 150,
      render: (val) => (
        <Tag icon={<UserOutlined />} color={val === "Unassigned" ? "default" : "gold"}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const s = STATUS_COLORS[status] || { color: FAINT, label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Items",
      dataIndex: "items_count",
      key: "items_count",
      width: 70,
      align: "center",
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 110,
      align: "right",
      render: (val) => <span className="font-semibold" style={{ color: ACCENT }}>₱{Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 100,
      render: (val) => <Tag>{val?.toUpperCase() || "N/A"}</Tag>,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (val) => dayjs(val).format("MMM D, YYYY h:mm A"),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => showDetail(record)} style={{ color: ACCENT }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<TruckOutlined />}
        badge="Fulfillment"
        title="Delivery"
        accent="Report"
        subtitle="Delivery status, rider assignments, and order fulfillment"
        actions={
          <HeroButton icon={<DownloadOutlined />} onClick={handleExport}>
            Export CSV
          </HeroButton>
        }
        stats={heroStats}
      />

      <FilterBar title="Filters" subtitle="Narrow down the delivery view">
        <div>
          <Text type="secondary" className="block text-xs mb-1" style={FIELD_LABEL}>Date Range</Text>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates || [dayjs().startOf("month"), dayjs().endOf("month")])}
            allowClear={false}
            size="middle"
            className="rounded-xl"
          />
        </div>
        <div>
          <Text type="secondary" className="block text-xs mb-1" style={FIELD_LABEL}>Status</Text>
          <Select
            style={{ width: 160 }}
            value={selectedStatus}
            onChange={setSelectedStatus}
            allowClear
            placeholder="All Statuses"
            className="rounded-xl"
            options={[
              { value: "ready", label: "Ready" },
              { value: "picked_up", label: "Picked Up" },
              { value: "out_for_delivery", label: "Out for Delivery" },
              { value: "delivered", label: "Delivered" },
            ]}
          />
        </div>
        <div>
          <Text type="secondary" className="block text-xs mb-1" style={FIELD_LABEL}>Branch</Text>
          <Select
            style={{ width: 180 }}
            value={selectedBranch}
            onChange={setSelectedBranch}
            allowClear
            placeholder="All Branches"
            className="rounded-xl"
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
        <div>
          <Text type="secondary" className="block text-xs mb-1" style={FIELD_LABEL}>Rider</Text>
          <Select
            style={{ width: 180 }}
            value={selectedRider}
            onChange={setSelectedRider}
            allowClear
            placeholder="All Riders"
            className="rounded-xl"
            options={riders.map((r) => ({ value: r.id, label: r.firstname ? `${r.firstname} ${r.lastname || ""}` : r.name }))}
          />
        </div>
      </FilterBar>

      {error && (
        <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} className="mb-6 rounded-xl" />
      )}

      <SectionCard
        icon={<TruckOutlined />}
        title="Delivery Orders"
        subtitle="All delivery orders for the selected filters"
        extra={<CountPill>{pagination?.total ?? 0} delivery(ies)</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={pagination}
          size="middle"
          locale={{
            emptyText: (
              <TableEmpty
                icon={<TruckOutlined style={{ fontSize: 20 }} />}
                title="No delivery orders found"
                description="Try adjusting the filters or date range"
              />
            ),
          }}
        />
      </SectionCard>

      {/* Detail Modal */}
      <Modal
        title={<span><TruckOutlined className="mr-2" style={{ color: ACCENT }} /><span style={{ color: "#451A03", fontWeight: "bold" }}>Order #{selectedOrder?.order_number || ""}</span></span>}
        open={detailModalVisible}
        onCancel={() => { setDetailModalVisible(false); setSelectedOrder(null); }}
        footer={null}
        width={700}
        className="rounded-2xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <Descriptions column={2} size="small" bordered
              styles={{
                label: { color: MUTED, fontWeight: 600 },
                content: { color: TEXT },
              }}>
              <Descriptions.Item label="Customer">{selectedOrder.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedOrder.customer_phone || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Delivery Address" span={2}>
                <div className="flex items-center gap-1">
                  <EnvironmentOutlined style={{ color: ACCENT }} />
                  {selectedOrder.delivery_address || "N/A"}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Branch">{selectedOrder.branch_name}</Descriptions.Item>
              <Descriptions.Item label="Rider">
                <Tag icon={<UserOutlined />} color={selectedOrder.rider_name === "Unassigned" ? "default" : "gold"}>
                  {selectedOrder.rider_name}
                </Tag>
                {selectedOrder.rider_phone && (
                  <Text className="ml-2 text-xs" style={{ color: MUTED }}>
                    <PhoneOutlined /> {selectedOrder.rider_phone}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[selectedOrder.status]?.color}>
                  {STATUS_COLORS[selectedOrder.status]?.label || selectedOrder.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment">
                <Tag>{selectedOrder.payment_method?.toUpperCase() || "N/A"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                <span className="text-lg font-bold" style={{ color: ACCENT }}>₱{Number(selectedOrder.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Items">{selectedOrder.items_count}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(selectedOrder.created_at).format("MMM D, YYYY h:mm A")}</Descriptions.Item>
              {selectedOrder.delivered_at && (
                <Descriptions.Item label="Delivered At">{dayjs(selectedOrder.delivered_at).format("MMM D, YYYY h:mm A")}</Descriptions.Item>
              )}
            </Descriptions>

            {selectedOrder.delivery_photo && (
              <div>
                <Text strong className="mb-2 block" style={{ color: TEXT }}>Delivery Photo Proof</Text>
                <Image
                  src={selectedOrder.delivery_photo}
                  alt="Delivery proof"
                  style={{ maxHeight: 300, borderRadius: 8, border: `1px solid ${BORDER}` }}
                />
              </div>
            )}

            {selectedOrder.delivery_notes && (
              <div>
                <Text strong className="mb-1 block" style={{ color: TEXT }}>Delivery Notes</Text>
                <div className="bg-[#FFF1E6] border border-orange-100 p-3 rounded-xl">
                  <Text style={{ color: TEXT }}>{selectedOrder.delivery_notes}</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

export default DeliveryReport;