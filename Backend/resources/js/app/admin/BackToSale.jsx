import { useState } from "react";
import {
  Table, Tag, Select, Button, Space, Modal, Form, Input, message, Tooltip, DatePicker,
} from "antd";
import {
  ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  CheckOutlined, CloseOutlined, UserOutlined, ShoppingCartOutlined, ArrowLeftOutlined, SearchOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import { invalidateCache } from "@/utils/cache";
import { useServerPagination } from "@/components/Pagination";
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
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

const { TextArea } = Input;
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

function BackToSale() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  const {
    data: records,
    total,
    isLoading,
    pagination,
    setCurrentPage,
    refetch,
    raw: backToSaleData,
  } = useServerPagination({
    queryKey: ["backToSalesAll", statusFilter, searchText, dateRange],
    url: "/back-to-sales/all",
    params: {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchText.trim() || undefined,
      start_date: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
      end_date: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
    },
    label: "records",
  });

  const stats = backToSaleData?.stats || {};

  const approveMutation = useMutation({
    mutationFn: ({ id }) => api.post(`/back-to-sales/${id}/approve`),
    onSuccess: () => {
      message.success("Return approved — unsold stock saved to inventory for tomorrow's sale");
      setShowApproveModal(false);
      setSelected(null);
      invalidateCache("products");
      queryClient.invalidateQueries({ queryKey: ["backToSalesAll"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/back-to-sales/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Return rejected — quantity stays out of available inventory");
      setShowRejectModal(false);
      rejectForm.resetFields();
      setSelected(null);
      invalidateCache("products");
      queryClient.invalidateQueries({ queryKey: ["backToSalesAll"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to reject"),
  });

  const handleApprove = () => {
    approveMutation.mutate({ id: selected.id });
  };

  const handleReject = (values) => {
    rejectMutation.mutate({ id: selected.id, adminNotes: values.admin_notes || null });
  };

  const statusTag = (status) => {
    const m = {
      pending: { background: AMBER_SOFT, color: AMBER, icon: <ClockCircleOutlined />, text: "Pending" },
      approved: { background: GREEN_SOFT, color: GREEN, icon: <CheckCircleOutlined />, text: "Approved" },
      rejected: { background: RED_SOFT, color: "#EF4444", icon: <CloseCircleOutlined />, text: "Rejected" },
    };
    const c = m[status] || m.pending;
    return (
      <Tag
        className="rounded-full px-3 py-1"
        style={{ background: c.background, color: c.color, border: "none", fontWeight: 600 }}
        icon={c.icon}
      >
        {c.text}
      </Tag>
    );
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const columns = [
    {
      title: "Staff",
      key: "staff",
      width: 180,
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}><UserOutlined className="mr-1" style={{ color: ACCENT }} />{r.user?.firstname} {r.user?.lastname}</div>
          <div className="text-xs" style={{ color: MUTED }}>ID: {r.user?.id}</div>
        </div>
      ),
    },
    {
      title: "Product",
      key: "product",
      width: 180,
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>{r.product?.name}</div>
          <div className="text-xs" style={{ color: MUTED }}>Branch: {r.branch?.name}</div>
        </div>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
      render: (v) => <span className="font-semibold text-lg" style={{ color: ACCENT }}>{v}</span>,
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      width: 200,
      render: (v) => v || <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => statusTag(v),
    },
    {
      title: "Returned At",
      dataIndex: "returned_at",
      key: "returned_at",
      width: 160,
      render: (v) => fmtDate(v),
    },
    {
      title: "Processed",
      key: "processed",
      width: 160,
      render: (_, r) => {
        if (r.status === "approved" && r.approved_at) return <span style={{ color: ACCENT }}>{fmtDate(r.approved_at)}</span>;
        if (r.status === "rejected" && r.rejected_at) return <span style={{ color: "#EF4444" }}>{fmtDate(r.rejected_at)}</span>;
        return <span style={{ color: MUTED }}>-</span>;
      },
    },
    {
      title: "Admin Notes",
      dataIndex: "admin_notes",
      key: "admin_notes",
      width: 160,
      render: (v) => v || <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, r) => (
        <Space>
          {r.status === "pending" && (
            <>
              <Tooltip title="Approve return">
                <Button size="small" icon={<CheckOutlined />}
                  onClick={() => { setSelected(r); setShowApproveModal(true); }}
                  style={{ background: ACCENT, border: "none", color: "#FFFFFF", fontWeight: 700, fontSize: 11, borderRadius: 9999 }}>
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" danger icon={<CloseOutlined />}
                  onClick={() => { setSelected(r); setShowRejectModal(true); }}
                  style={{ fontSize: 11, borderRadius: 9999 }}>
                  Reject
                </Button>
              </Tooltip>
            </>
          )}
          {r.status !== "pending" && <span className="text-sm" style={{ color: MUTED }}>-</span>}
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<RollbackOutlined />}
        badge="Return Management"
        title="Back to"
        accent="Sales"
        subtitle="Manage unsold stock returned from branches"
        stats={[
          {
            icon: <ShoppingCartOutlined />,
            iconColor: "text-orange-400",
            label: "Total Returns",
            value: stats.total || 0,
          },
          {
            icon: <ClockCircleOutlined />,
            iconColor: "text-amber-400",
            label: "Pending",
            value: stats.pending || 0,
          },
          {
            icon: <CheckCircleOutlined />,
            iconColor: "text-emerald-400",
            label: "Approved",
            value: stats.approved || 0,
          },
          {
            icon: <ArrowLeftOutlined />,
            iconColor: "text-orange-400",
            label: "Qty Returned",
            value: (
              <span>
                {stats.total_quantity || 0} <span className="text-sm font-normal text-white/60">pcs</span>
              </span>
            ),
          },
        ]}
      />

      <FilterBar title="Filters" subtitle="Filter return requests">
        <span className="text-sm font-semibold text-stone-700">Status:</span>
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} style={{ width: 130 }} className="rounded-xl">
          <Select.Option value="all">All</Select.Option>
          <Select.Option value="pending">Pending</Select.Option>
          <Select.Option value="approved">Approved</Select.Option>
          <Select.Option value="rejected">Rejected</Select.Option>
        </Select>
        <Input
          placeholder="Search product or staff..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
          style={{ width: 220 }}
          allowClear
          className="rounded-xl"
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates)}
          style={{ width: 250 }}
          className="rounded-xl"
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
          className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
        >
          Refresh
        </Button>
      </FilterBar>

      <SectionCard
        icon={<RollbackOutlined />}
        title="Return Requests"
        subtitle="Review and process returned stock"
        extra={<CountPill>{total || records.length} record(s)</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={isLoading}
          pagination={pagination}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<RollbackOutlined style={{ fontSize: 20 }} />}
                title="No back-to-sales records found"
                description="Try adjusting your search or filters"
              />
            ),
          }}
        />
      </SectionCard>

      {/* Approve Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              <CheckCircleOutlined />
            </div>
            <div>
              <p className="font-bold" style={{ color: "#451A03" }}>Approve Return</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Confirm the return request</p>
            </div>
          </div>
        }
        open={showApproveModal}
        onCancel={() => { setShowApproveModal(false); setSelected(null); }}
        onOk={handleApprove}
        confirmLoading={approveMutation.isPending}
        okText="Approve"
        okButtonProps={{ icon: <CheckOutlined />, className: "rounded-xl", style: GRADIENT_BTN }}
        className="rounded-2xl"
      >
        {selected && (
          <div className="space-y-3">
            {/* Product/Staff summary */}
            <div className="rounded-xl bg-[#FFF1E6] border border-orange-100 p-4">
              <div className="font-semibold" style={{ color: TEXT }}>{selected.user?.firstname} {selected.user?.lastname}</div>
              <div className="mt-1 text-lg font-bold" style={{ color: ACCENT }}>{selected.product?.name}</div>
              <div className="mt-2 flex gap-4 text-sm">
                <span style={{ color: MUTED }}>Quantity: <strong>{selected.quantity}</strong></span>
                <span style={{ color: MUTED }}>Branch: <strong>{selected.branch?.name}</strong></span>
              </div>
              {selected.notes && <div className="mt-2 text-sm" style={{ color: MUTED }}>Notes: {selected.notes}</div>}
            </div>

            {/* Inventory restore info panel */}
            <div className="flex gap-3 rounded-xl bg-[#FFF1E6] border border-orange-100 p-4">
              <div className="mt-0.5 text-xl" style={{ color: ACCENT }}>✓</div>
              <div>
                <div className="text-sm font-bold" style={{ color: TEXT }}>Stock will be saved to inventory for tomorrow's sale</div>
                <div className="mt-1 text-sm" style={{ color: ACCENT }}>
                  Approving this return will save <strong>{selected.quantity} unit(s)</strong> of{" "}
                  <strong>{selected.product?.name}</strong> into{" "}
                  <strong>{selected.branch?.name}</strong>'s inventory with a fresh stock batch,
                  so the unsold products can be sold again tomorrow in the POS and viewed in Inventory.
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
              style={{ background: RED_SOFT, color: "#EF4444" }}
            >
              <CloseCircleOutlined />
            </div>
            <div>
              <p className="font-bold" style={{ color: "#451A03" }}>Reject Return</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Provide a reason for rejection</p>
            </div>
          </div>
        }
        open={showRejectModal}
        onCancel={() => { setShowRejectModal(false); rejectForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl p-4" style={{ background: RED_SOFT, border: `1px solid ${RED}40` }}>
            <div className="font-semibold" style={{ color: TEXT }}>{selected.user?.firstname} {selected.user?.lastname}</div>
            <div className="mt-1 text-lg font-bold" style={{ color: "#EF4444" }}>{selected.product?.name}</div>
            <div className="mt-2 flex gap-4 text-sm">
              <span style={{ color: MUTED }}>Quantity: <strong>{selected.quantity}</strong></span>
              <span style={{ color: MUTED }}>Branch: <strong>{selected.branch?.name}</strong></span>
            </div>
            {selected.notes && <div className="mt-2 text-sm" style={{ color: MUTED }}>Notes: {selected.notes}</div>}
          </div>
        )}
        <Form form={rejectForm} layout="vertical" onFinish={handleReject} initialValues={{ admin_notes: "" }}>
          <Form.Item label={<span style={FIELD_LABEL}>Rejection Reason (Optional)</span>} name="admin_notes" rules={[{ max: 500, message: "Reason cannot exceed 500 characters" }]}>
            <TextArea rows={4} placeholder="Provide a reason for rejection" maxLength={500} showCount disabled={rejectMutation.isPending} className="rounded-xl" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => { setShowRejectModal(false); rejectForm.resetFields(); setSelected(null); }} disabled={rejectMutation.isPending} className="rounded-xl" style={SECONDARY_BTN}>Cancel</Button>
              <Button danger htmlType="submit" loading={rejectMutation.isPending} icon={<CloseOutlined />} className="rounded-xl">Reject</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default BackToSale;