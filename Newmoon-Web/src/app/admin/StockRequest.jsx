import { useState } from "react";
import { Table, Button, Modal, Form, Input, message, Tag, Space, Select, Tooltip } from "antd";
import {
  InboxOutlined, ReloadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined,
  CheckOutlined, CloseOutlined, ShopOutlined,
  InfoCircleOutlined, SearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import { clientPagination } from "@/components/Pagination";

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

// ─── Palette ─────────────────────────────────────────────────────
const TEXT = "#292524";
const MUTED = "#78716C";
const ACCENT = "#EA580C";
const AMBER = "#D97706";
const AMBER_SOFT = "rgba(245,158,11,0.15)";
const GREEN = "#16A34A";
const GREEN_SOFT = "rgba(22,163,74,0.12)";
const RED = "#DC2626";
const RED_SOFT = "rgba(220,38,38,0.12)";

const FIELD_LABEL = { color: "#451A03", fontWeight: 500 };
const GRADIENT_BTN = {
  background: "linear-gradient(135deg, #EA580C, #F97316)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 600,
  boxShadow: "0 4px 15px rgba(234,88,12,0.35)",
};
const RED_BTN = {
  background: "linear-gradient(135deg, #DC2626, #EF4444)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 600,
  boxShadow: "0 4px 15px rgba(220,38,38,0.3)",
};

const { TextArea } = Input;

function StockRequest() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stockRequestsAll"],
    queryFn: () => api.get("/stock-requests/all"),
  });

  // Laravel paginator body: { current_page, data: [...], per_page, ... }
  // axios wraps it: response.data = body, so rows live at response.data.data
  const requests = data?.data?.data || [];

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const refreshAfterAction = async () => {
    await queryClient.refetchQueries({
      queryKey: ["stockRequestsAll"],
      type: "active",
    });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/stock-requests/${id}/approve`, { admin_notes: adminNotes }),
    onSuccess: async () => {
      message.success("Stock request approved");
      setShowApproveModal(false);
      approveForm.resetFields();
      setSelected(null);
      await refreshAfterAction();
    },
    onError: (e) =>
      message.error(e.response?.data?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/stock-requests/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: async () => {
      message.success("Stock request rejected");
      setShowRejectModal(false);
      rejectForm.resetFields();
      setSelected(null);
      await refreshAfterAction();
    },
    onError: (e) =>
      message.error(e.response?.data?.message || "Failed to reject"),
  });

  const handleApprove = (values) => {
    approveMutation.mutate({ id: selected.id, adminNotes: values.admin_notes || null });
  };

  const handleReject = (values) => {
    rejectMutation.mutate({ id: selected.id, adminNotes: values.admin_notes || null });
  };

  const statusTag = (status) => {
    const m = {
      pending: { soft: AMBER_SOFT, color: AMBER, icon: <ClockCircleOutlined />, text: "Pending" },
      approved: { soft: GREEN_SOFT, color: GREEN, icon: <CheckCircleOutlined />, text: "Approved" },
      rejected: { soft: RED_SOFT, color: RED, icon: <CloseCircleOutlined />, text: "Rejected" },
    };
    const c = m[status] || m.pending;
    return (
      <Tag
        className="rounded-full px-3 py-1"
        icon={c.icon}
        style={{ background: c.soft, color: c.color, border: "none", fontWeight: 600 }}
      >
        {c.text}
      </Tag>
    );
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
      : "-";

  const columns = [
    {
      title: "Branch",
      key: "branch",
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>
            <ShopOutlined className="mr-1" style={{ color: ACCENT }} />
            {r.branch?.name || "-"}
          </div>
          <div className="text-xs" style={{ color: MUTED }}>{r.branch?.code || "No code"}</div>
        </div>
      ),
    },
    {
      title: "Requested By",
      key: "staff",
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>
            {r.user?.firstname} {r.user?.lastname}
          </div>
          <div className="text-xs" style={{ color: MUTED }}>ID: {r.user?.id}</div>
        </div>
      ),
    },
    {
      title: "Product",
      key: "product",
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>{r.product?.name || "-"}</div>
          <div className="text-xs" style={{ color: MUTED }}>SKU: {r.product?.sku || "-"}</div>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      align: "center",
      render: (_, r) => (
        <span className="font-bold" style={{ color: ACCENT }}>
          {Number(r.quantity).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (v) =>
        v ? (
          <span className="line-clamp-2 text-sm" style={{ color: TEXT }}>{v}</span>
        ) : (
          <span style={{ color: MUTED }}>-</span>
        ),
    },
    {
      title: "Requested",
      key: "requested",
      render: (_, r) => (
        <span className="text-sm" style={{ color: MUTED }}>
          {fmtDate(r.requested_at || r.created_at)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => statusTag(v),
    },
    {
      title: "Admin Notes",
      dataIndex: "admin_notes",
      key: "admin_notes",
      render: (v) =>
        v ? (
          <span className="line-clamp-2 text-sm" style={{ color: TEXT }}>{v}</span>
        ) : (
          <span style={{ color: MUTED }}>-</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, r) => (
        <Space size="small">
          {r.status === "pending" ? (
            <>
              <Tooltip title="Approve">
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => { setSelected(r); setShowApproveModal(true); }}
                  style={GRADIENT_BTN}
                >
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => { setSelected(r); setShowRejectModal(true); }}
                  style={RED_BTN}
                >
                  Reject
                </Button>
              </Tooltip>
            </>
          ) : (
            <span className="text-sm" style={{ color: MUTED }}>No actions</span>
          )}
        </Space>
      ),
    },
  ];

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    totalQty: requests
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + Number(r.quantity || 0), 0),
  };

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<InboxOutlined />}
        badge="Inventory"
        title="Stock Request"
        accent="Management"
        subtitle="Approve or reject staff stock requests"
        stats={[
          { icon: <InboxOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Requests", value: stats.total },
          { icon: <ClockCircleOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Pending", value: stats.pending, valueColor: "text-amber-300" },
          { icon: <CheckCircleOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "Approved", value: stats.approved, valueColor: "text-green-300" },
          { icon: <InboxOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Approved Qty", value: `${stats.totalQty} pcs` },
        ]}
      />

      <div className="mb-6">
        <FilterBar title="Filters" subtitle="Narrow down the stock requests">
          <span className="text-sm font-semibold text-stone-700">Filter by status:</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            className="rounded-xl"
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="approved">Approved</Select.Option>
            <Select.Option value="rejected">Rejected</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
            className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
          >
            Refresh
          </Button>
        </FilterBar>
      </div>

      <SectionCard
        icon={<InboxOutlined />}
        title="Stock Requests"
        subtitle="Review and process staff stock requests"
        extra={<CountPill>{filtered.length} request(s)</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1300 }}
          pagination={clientPagination({ label: "requests" })}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<InboxOutlined />}
                title="No stock requests found"
                description="Try adjusting your filter"
              />
            ),
          }}
        />
      </SectionCard>

      {/* Approve Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg bg-[#FFF1E6] text-[#EA580C]">
              <CheckOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Approve Stock Request</p>
              <p className="text-xs font-normal text-stone-500">Approve this staff stock request</p>
            </div>
          </div>
        }
        open={showApproveModal}
        onCancel={() => { setShowApproveModal(false); approveForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnClose
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
            <div className="font-semibold text-stone-800">
              {selected.user?.firstname} {selected.user?.lastname}
            </div>
            <div className="font-bold text-[#EA580C]">{selected.product?.name}</div>
            <div className="text-sm text-stone-500">Quantity: {selected.quantity}</div>
            <div className="text-sm text-stone-500">Branch: {selected.branch?.name}</div>
            {selected.reason && (
              <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>
            )}
          </div>
        )}
        <Form form={approveForm} layout="vertical" onFinish={handleApprove} initialValues={{ admin_notes: "" }}>
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Admin Notes (Optional)</span>}
            name="admin_notes"
            rules={[{ max: 500, message: "Notes cannot exceed 500 characters" }]}
          >
            <TextArea
              rows={4}
              placeholder="Add any notes for this approval"
              maxLength={500}
              showCount
              disabled={approveMutation.isPending}
              className="rounded-xl"
            />
          </Form.Item>
          <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-3">
            <p className="mb-0 text-xs text-[#EA580C]">
              <InfoCircleOutlined className="mr-1" />
              This action will approve the stock request and notify the staff member.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowApproveModal(false); approveForm.resetFields(); setSelected(null); }}
                disabled={approveMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                htmlType="submit"
                loading={approveMutation.isPending}
                icon={<CheckOutlined />}
                style={GRADIENT_BTN}
                className="rounded-xl"
              >
                Approve
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg bg-[#FEF2F2] text-[#DC2626]">
              <CloseOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Reject Stock Request</p>
              <p className="text-xs font-normal text-stone-500">Reject this staff stock request</p>
            </div>
          </div>
        }
        open={showRejectModal}
        onCancel={() => { setShowRejectModal(false); rejectForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnClose
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl border border-red-100 bg-[#FEF2F2] p-4">
            <div className="font-semibold text-stone-800">
              {selected.user?.firstname} {selected.user?.lastname}
            </div>
            <div className="font-bold text-[#DC2626]">{selected.product?.name}</div>
            <div className="text-sm text-stone-500">Quantity: {selected.quantity}</div>
            <div className="text-sm text-stone-500">Branch: {selected.branch?.name}</div>
            {selected.reason && (
              <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>
            )}
          </div>
        )}
        <Form form={rejectForm} layout="vertical" onFinish={handleReject} initialValues={{ admin_notes: "" }}>
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Rejection Reason (Optional)</span>}
            name="admin_notes"
            rules={[{ max: 500, message: "Reason cannot exceed 500 characters" }]}
          >
            <TextArea
              rows={4}
              placeholder="Provide a reason for rejection"
              maxLength={500}
              showCount
              disabled={rejectMutation.isPending}
              className="rounded-xl"
            />
          </Form.Item>
          <div className="mb-4 rounded-xl border border-red-100 bg-[#FEF2F2] p-3">
            <p className="mb-0 text-xs text-[#DC2626]">
              <InfoCircleOutlined className="mr-1" />
              This action will reject the stock request and notify the staff member.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowRejectModal(false); rejectForm.resetFields(); setSelected(null); }}
                disabled={rejectMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                htmlType="submit"
                loading={rejectMutation.isPending}
                icon={<CloseOutlined />}
                style={RED_BTN}
                className="rounded-xl"
              >
                Reject
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default StockRequest;