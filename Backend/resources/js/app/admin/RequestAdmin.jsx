import { useState } from "react";
import { Table, Button, Modal, Form, Input, message, Tag, Space, Select, Tooltip } from "antd";
import { 
  DollarOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const { TextArea } = Input;

// ─── Palette — matches Inventory Report (warm cream + orange) ─────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFF7ED";
const BORDER = "rgba(234,88,12,0.10)";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.12)";
const AMBER = "#D97706";
const AMBER_SOFT = "rgba(245,158,11,0.15)";
const GREEN = "#16A34A";
const GREEN_SOFT = "rgba(22,163,74,0.12)";
const RED = "#DC2626";
const RED_SOFT = "rgba(220,38,38,0.12)";

// Inline style tokens
const FIELD_LABEL = { color: "#451A03", fontWeight: 500 };
const GRADIENT_BTN = {
  background: "linear-gradient(135deg, #EA580C, #F97316)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 600,
  boxShadow: "0 4px 15px rgba(234,88,12,0.35)",
};
const SECONDARY_BTN = {
  background: "#FFFFFF",
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: `1px solid ${ACCENT}80`,
  color: ACCENT,
  fontWeight: 500,
};


function RequestAdmin() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch all cash advances
  const { data: advancesData, isLoading: advancesLoading, refetch: refetchAdvances } = useQuery({
    queryKey: ['cashAdvancesAll'],
    queryFn: () => api.get("/cash-advances/all"),
  });

  // Fetch all stock requests
  const { data: stockRequestsData, isLoading: stockRequestsLoading, refetch: refetchStockRequests } = useQuery({
    queryKey: ['stockRequestsAll'],
    queryFn: () => api.get("/stock-requests/all"),
  });

  const advances = advancesData?.data?.data || [];
  const stockRequests = stockRequestsData?.data?.data || [];
  const isLoading = advancesLoading || stockRequestsLoading;

  // Combine both request types into a single array
  const allRequests = [
    ...advances.map(a => ({ ...a, request_type: 'cash_advance' })),
    ...stockRequests.map(s => ({ ...s, request_type: 'stock' }))
  ].sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

  // Filter requests based on status
  const filteredRequests = statusFilter === "all" 
    ? allRequests
    : allRequests.filter((a) => a.status === statusFilter);

  // Approve mutation for cash advances
  const approveAdvanceMutation = useMutation({
    mutationFn: ({ id, adminNotes }) => 
      api.post(`/cash-advances/${id}/approve`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Cash advance request approved successfully");
      setShowApproveModal(false);
      approveForm.resetFields();
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['cashAdvancesAll'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to approve request");
    },
  });

  // Reject mutation for cash advances
  const rejectAdvanceMutation = useMutation({
    mutationFn: ({ id, adminNotes }) => 
      api.post(`/cash-advances/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Cash advance request rejected successfully");
      setShowRejectModal(false);
      rejectForm.resetFields();
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['cashAdvancesAll'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to reject request");
    },
  });

  // Approve mutation for stock requests
  const approveStockMutation = useMutation({
    mutationFn: ({ id, adminNotes }) => 
      api.post(`/stock-requests/${id}/approve`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Stock request approved successfully");
      setShowApproveModal(false);
      approveForm.resetFields();
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['stockRequestsAll'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to approve request");
    },
  });

  // Reject mutation for stock requests
  const rejectStockMutation = useMutation({
    mutationFn: ({ id, adminNotes }) => 
      api.post(`/stock-requests/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Stock request rejected successfully");
      setShowRejectModal(false);
      rejectForm.resetFields();
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['stockRequestsAll'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to reject request");
    },
  });

  const handleApprove = (values) => {
    if (selectedRequest.request_type === "cash_advance") {
      approveAdvanceMutation.mutate({
        id: selectedRequest.id,
        adminNotes: values.admin_notes || null,
      });
    } else {
      approveStockMutation.mutate({
        id: selectedRequest.id,
        adminNotes: values.admin_notes || null,
      });
    }
  };

  const handleReject = (values) => {
    if (selectedRequest.request_type === "cash_advance") {
      rejectAdvanceMutation.mutate({
        id: selectedRequest.id,
        adminNotes: values.admin_notes || null,
      });
    } else {
      rejectStockMutation.mutate({
        id: selectedRequest.id,
        adminNotes: values.admin_notes || null,
      });
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { background: AMBER_SOFT, color: AMBER, icon: <ClockCircleOutlined />, text: "Pending" },
      approved: { background: GREEN_SOFT, color: GREEN, icon: <CheckCircleOutlined />, text: "Approved" },
      rejected: { background: RED_SOFT, color: "#DC2626", icon: <CloseCircleOutlined />, text: "Rejected" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Tag
        className="rounded-full px-3 py-1"
        style={{ background: config.background, color: config.color, border: "none", fontWeight: 600 }}
        icon={config.icon}
      >
        {config.text}
      </Tag>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getRequestTypeTag = (type) => {
    const config = {
      cash_advance: { background: AMBER_SOFT, color: AMBER, icon:<span style={{ fontSize: "14px",gap: '4', display: "inline-block" }}>₱</span>, text: "Cash Advance" },
      stock: { background: ACCENT_SOFT, color: ACCENT, icon: <InboxOutlined />, text: "Supply Request" },
    };
    const typeConfig = config[type] || config.cash_advance;
    return (
      <Tag className="rounded-full px-3 py-1" style={{ background: typeConfig.background, color: typeConfig.color, border: "none", fontWeight: 600 }} icon={typeConfig.icon}>
        {typeConfig.text}
      </Tag>
    );
  };

  // Unified columns for both request types
  const columns = [
    {
      title: "Staff",
      key: "staff",
      render: (_, record) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>
            {record.user?.firstname} {record.user?.lastname}
          </div>
          <div className="text-xs" style={{ color: MUTED }}>ID: {record.user?.id}</div>
        </div>
      ),
    },
    {
      title: "Type",
      key: "request_type",
      render: (_, record) => getRequestTypeTag(record.request_type),
    },
    {
      title: "Details",
      key: "details",
      render: (_, record) => {
        if (record.request_type === "cash_advance") {
          return <span className="font-bold" style={{ color: ACCENT }}>{formatCurrency(record.amount)}</span>;
        } else {
          return (
            <div>
              <div className="font-semibold" style={{ color: TEXT }}>{record.product?.name}</div>
              <div className="text-xs" style={{ color: MUTED }}>Qty: {record.quantity}</div>
              <div className="text-xs" style={{ color: MUTED }}>{record.branch?.name}</div>
            </div>
          );
        }
      },
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason) => reason || <span style={{ color: FAINT }}>-</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Requested At",
      dataIndex: "requested_at",
      key: "requested_at",
      render: (date) => formatDate(date),
    },
    {
      title: "Processed At",
      key: "processed_date",
      render: (_, record) => {
        if (record.status === "approved" && record.approved_at) {
          return <span style={{ color: GREEN }}>{formatDate(record.approved_at)}</span>;
        }
        if (record.status === "rejected" && record.rejected_at) {
          return <span style={{ color: "#DC2626" }}>{formatDate(record.rejected_at)}</span>;
        }
        return <span style={{ color: FAINT }}>-</span>;
      },
    },
    {
      title: "Admin Notes",
      dataIndex: "admin_notes",
      key: "admin_notes",
      render: (notes) => notes || <span style={{ color: FAINT }}>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {record.status === "pending" && (
            <>
              <Tooltip title="Approve">
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    setShowApproveModal(true);
                  }}
                  style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", border: "none", color: "#FFFFFF", fontWeight: 600 }}
                  className="rounded-xl hover:brightness-110 shadow-none"
                >
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    setShowRejectModal(true);
                  }}
                  style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)", border: "none", color: "#FFFFFF", fontWeight: 600 }}
                  className="rounded-xl hover:brightness-110 shadow-none"
                >
                  Reject
                </Button>
              </Tooltip>
            </>
          )}
          {record.status !== "pending" && (
            <span style={{ color: FAINT }}>No actions</span>
          )}
        </Space>
      ),
    },
  ];

  // Combined statistics
  const statistics = {
    total: allRequests.length,
    pending: allRequests.filter((a) => a.status === "pending").length,
    approved: allRequests.filter((a) => a.status === "approved").length,
    rejected: allRequests.filter((a) => a.status === "rejected").length,
    cashAdvanceTotal: advances
      .filter((a) => a.status === "approved")
      .reduce((sum, a) => sum + Number(a.amount), 0),
    stockTotal: stockRequests
      .filter((a) => a.status === "approved")
      .reduce((sum, a) => sum + Number(a.quantity), 0),
  };

  const handleRefresh = () => {
    refetchAdvances();
    refetchStockRequests();
  };

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<InboxOutlined />}
        badge="Request Center"
        title="Request"
        accent="Management"
        subtitle="Approve or reject staff requests"
        stats={[
          { icon: <InboxOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Requests", value: statistics.total },
          { icon: <ClockCircleOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Pending", value: statistics.pending, valueColor: "text-amber-300" },
          { icon: <CheckCircleOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "Approved", value: statistics.approved, valueColor: "text-green-300" },
          { icon: <DollarOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Cash Approved", value: formatCurrency(statistics.cashAdvanceTotal) },
        ]}
      />

      <div className="mb-6">
        <FilterBar title="Filters" subtitle="Narrow down the requests">
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
            onClick={handleRefresh}
            loading={isLoading}
            className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
          >
            Refresh
          </Button>
        </FilterBar>
      </div>

      <SectionCard
        icon={<InboxOutlined />}
        title="All Requests"
        subtitle="Approve or reject staff requests"
        extra={<CountPill>{filteredRequests.length} request(s)</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey="id"
          loading={isLoading}
          pagination={clientPagination({ label: "requests" })}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<DollarOutlined />}
                title="No requests found"
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
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg bg-[#FFF1E6] text-[#EA580C]"
            >
              <CheckOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">{selectedRequest?.request_type === "cash_advance" ? "Approve Cash Advance" : "Approve Stock Request"}</p>
              <p className="text-xs font-normal text-stone-500">Approve this staff request</p>
            </div>
          </div>
        }
        open={showApproveModal}
        onCancel={() => {
          setShowApproveModal(false);
          approveForm.resetFields();
          setSelectedRequest(null);
        }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selectedRequest && (
          <div className="mb-4 p-4 rounded-xl border border-orange-100 bg-[#FFF1E6]">
            <div className="font-semibold text-stone-800">
              {selectedRequest.user?.firstname} {selectedRequest.user?.lastname}
            </div>
            {selectedRequest.request_type === "cash_advance" ? (
              <div className="text-lg font-bold text-[#EA580C]">
                {formatCurrency(selectedRequest.amount)}
              </div>
            ) : (
              <>
                <div className="text-lg font-bold text-[#EA580C]">
                  {selectedRequest.product?.name}
                </div>
                <div style={{ color: MUTED }} className="text-sm">
                  Quantity: {selectedRequest.quantity}
                </div>
                <div style={{ color: MUTED }} className="text-sm">
                  Branch: {selectedRequest.branch?.name}
                </div>
              </>
            )}
            {selectedRequest.reason && (
              <div style={{ color: MUTED }} className="text-sm mt-1">
                Reason: {selectedRequest.reason}
              </div>
            )}
          </div>
        )}
        <Form
          form={approveForm}
          layout="vertical"
          onFinish={handleApprove}
          initialValues={{ admin_notes: "" }}
        >
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Admin Notes (Optional)</span>}
            name="admin_notes"
            rules={[
              { max: 500, message: "Notes cannot exceed 500 characters" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Add any notes for this approval"
              maxLength={500}
              showCount
              disabled={approveAdvanceMutation.isPending || approveStockMutation.isPending}
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setShowApproveModal(false);
                  approveForm.resetFields();
                  setSelectedRequest(null);
                }}
                disabled={approveAdvanceMutation.isPending || approveStockMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={approveAdvanceMutation.isPending || approveStockMutation.isPending}
                icon={<CheckOutlined />}
                className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-[#F59E0B] border-none text-white shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:brightness-110"
              >
                Approve Request
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg bg-[#FEF2F2] text-[#DC2626]"
            >
              <CloseOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">{selectedRequest?.request_type === "cash_advance" ? "Reject Cash Advance" : "Reject Stock Request"}</p>
              <p className="text-xs font-normal text-stone-500">Reject this staff request</p>
            </div>
          </div>
        }
        open={showRejectModal}
        onCancel={() => {
          setShowRejectModal(false);
          rejectForm.resetFields();
          setSelectedRequest(null);
        }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selectedRequest && (
          <div className="mb-4 p-4 rounded-xl border border-red-100 bg-[#FEF2F2]">
            <div className="font-semibold text-stone-800">
              {selectedRequest.user?.firstname} {selectedRequest.user?.lastname}
            </div>
            {selectedRequest.request_type === "cash_advance" ? (
              <div className="text-lg font-bold text-[#DC2626]">
                {formatCurrency(selectedRequest.amount)}
              </div>
            ) : (
              <>
                <div className="text-lg font-bold text-[#DC2626]">
                  {selectedRequest.product?.name}
                </div>
                <div style={{ color: MUTED }} className="text-sm">
                  Quantity: {selectedRequest.quantity}
                </div>
                <div style={{ color: MUTED }} className="text-sm">
                  Branch: {selectedRequest.branch?.name}
                </div>
              </>
            )}
            {selectedRequest.reason && (
              <div style={{ color: MUTED }} className="text-sm mt-1">
                Reason: {selectedRequest.reason}
              </div>
            )}
          </div>
        )}
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={handleReject}
          initialValues={{ admin_notes: "" }}
        >
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Rejection Reason (Optional)</span>}
            name="admin_notes"
            rules={[
              { max: 500, message: "Reason cannot exceed 500 characters" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Provide a reason for rejection"
              maxLength={500}
              showCount
              disabled={rejectAdvanceMutation.isPending || rejectStockMutation.isPending}
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  rejectForm.resetFields();
                  setSelectedRequest(null);
                }}
                disabled={rejectAdvanceMutation.isPending || rejectStockMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                danger
                htmlType="submit"
                loading={rejectAdvanceMutation.isPending || rejectStockMutation.isPending}
                icon={<CloseOutlined />}
                style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)", border: "none", color: "#FFFFFF", fontWeight: 700, boxShadow: "none" }}
                className="rounded-xl hover:brightness-110"
              >
                Reject Request
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default RequestAdmin;