import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, message, Tag, Space, Select, Tooltip, DatePicker,
} from "antd";
import {
  ExperimentOutlined, ReloadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined,
  CheckOutlined, CloseOutlined, ShopOutlined,
  InfoCircleOutlined, SearchOutlined, UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import { useServerPagination } from "@/components/Pagination";

const { TextArea } = Input;
const { RangePicker } = DatePicker;

/** How often the list + stats re-sync automatically. */
const POLL_INTERVAL_MS = 15000;

const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
);

const CountPill = ({ children }) => (
  <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
    {children}
  </span>
);

const SectionCard = ({ icon, title, subtitle, extra, children }) => (
  <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
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
    <div className="flex flex-wrap items-end gap-3">{children}</div>
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

const HeroHeader = ({ badgeIcon, badge, title, accent, subtitle, stats = [] }) => (
  <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
    <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
    {badgeIcon && (
      <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
        {badgeIcon}
      </div>
    )}
    <div className="relative z-10 px-6 py-7 sm:px-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
        {badgeIcon}
        {badge}
      </div>
      <h1 className="text-2xl font-bold text-white">
        {title} {accent && <span className="text-orange-400">{accent}</span>}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}

      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg || "bg-orange-500/15"}`}>
                <span className={stat.iconColor || "text-orange-400"}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/50">{stat.label}</p>
                <p className={`text-lg font-bold leading-tight text-white ${stat.valueColor || ""}`}>
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

const STATUS_META = {
  pending: { soft: AMBER_SOFT, color: AMBER, icon: <ClockCircleOutlined />, text: "Pending" },
  approved: { soft: GREEN_SOFT, color: GREEN, icon: <CheckCircleOutlined />, text: "Approved" },
  rejected: { soft: RED_SOFT, color: RED, icon: <CloseCircleOutlined />, text: "Rejected" },
};

function StatusTag({ status }) {
  const c = STATUS_META[status] || STATUS_META.pending;
  return (
    <Tag
      className="rounded-full px-3 py-1"
      icon={c.icon}
      style={{ background: c.soft, color: c.color, border: "none", fontWeight: 600 }}
    >
      {c.text}
    </Tag>
  );
}

function SupplyRequestAdmin() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(undefined);
  const [branchId, setBranchId] = useState(undefined);
  const [supply, setSupply] = useState(undefined);
  const [dates, setDates] = useState(null);

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [selected, setSelected] = useState(null);

  // Signature of the pending rows we have already shown, so we only announce
  // genuinely new requests (and never on the very first load).
  const knownPendingRef = useRef(null);

  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Never swap rows underneath an open approve/reject dialog.
  const refetchInterval = showApprove || showReject ? false : POLL_INTERVAL_MS;

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      status,
      branch_id: branchId,
      supply,
      from: dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined,
      to: dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined,
    }),
    [search, status, branchId, supply, dates]
  );

  const {
    data: requests, total, isLoading, isFetching, refetch, pagination, setCurrentPage,
  } = useServerPagination({
    queryKey: ["supplyRequestsAll"],
    url: "/supply-requests",
    params: filterParams,
    label: "supply requests",
    pageSize: 10,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: statistics } = useQuery({
    queryKey: ["supplyRequestStats"],
    queryFn: () => api.get("/supply-requests/statistics"),
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: suppliesData } = useQuery({
    queryKey: ["supplies"],
    queryFn: () => api.get("/supplies"),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["supplyRequestBranches"],
    queryFn: () => api.get("/supply-requests/branches"),
  });

  const supplies = suppliesData?.data ?? [];
  const branches = branchesData?.data ?? [];
  const stats = statistics?.data;

  // After approve/reject we await a refetch of BOTH the list and the stats
  // so the table updates immediately without the user clicking Refresh.
  const refreshAfterAction = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["supplyRequestsAll"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["supplyRequestStats"], type: "active" }),
    ]);
  };

  // Announce requests that arrived since the previous poll.
  useEffect(() => {
    if (!requests) return;

    const pendingIds = requests.filter((r) => r.status === "pending").map((r) => r.id);
    const signature = pendingIds.join(",");

    if (knownPendingRef.current === null) {
      knownPendingRef.current = signature;
      return;
    }
    if (signature === knownPendingRef.current) return;

    const previous = new Set(knownPendingRef.current ? knownPendingRef.current.split(",") : []);
    knownPendingRef.current = signature;

    const fresh = pendingIds.filter((id) => !previous.has(id));
    if (fresh.length === 0) return;

    message.info(
      fresh.length === 1
        ? "1 new supply request received"
        : `${fresh.length} new supply requests received`
    );
  }, [requests]);

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/supply-requests/${id}/approve`, { admin_notes: adminNotes }),
    onSuccess: async () => {
      message.success("Supply request approved");
      setShowApprove(false);
      approveForm.resetFields();
      setSelected(null);
      await refreshAfterAction();
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/supply-requests/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: async () => {
      message.success("Supply request rejected");
      setShowReject(false);
      rejectForm.resetFields();
      setSelected(null);
      await refreshAfterAction();
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to reject"),
  });

  const openApprove = (r) => { setSelected(r); setShowApprove(true); };
  const openReject = (r) => { setSelected(r); setShowReject(true); };

  const resetFilters = () => {
    setSearch(""); setStatus(undefined); setBranchId(undefined);
    setSupply(undefined); setDates(null); setCurrentPage(1);
  };

  const hasFilters = Boolean(search || status || branchId || supply || dates);

  const fmtDate = (d) => d
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
      key: "user",
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>
            {r.user?.firstname} {r.user?.lastname}
          </div>
          <div className="text-xs" style={{ color: MUTED }}>{r.user?.position || "Staff"}</div>
        </div>
      ),
    },
    {
      title: "Supply",
      key: "supply",
      render: (_, r) => (
        <span className="font-semibold" style={{ color: TEXT }}>{r.supply_name || "-"}</span>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      align: "center",
      render: (_, r) => (
        <div>
          <div className="font-bold" style={{ color: ACCENT }}>{Number(r.quantity).toLocaleString()}</div>
          <div className="text-xs" style={{ color: MUTED }}>{r.unit}</div>
        </div>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (v) => v
        ? <span className="line-clamp-2 text-sm" style={{ color: TEXT }}>{v}</span>
        : <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Requested",
      dataIndex: "requested_at",
      key: "requested_at",
      render: (v) => <span className="text-sm" style={{ color: MUTED }}>{fmtDate(v)}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => <StatusTag status={v} />,
    },
    {
      title: "Admin Notes",
      dataIndex: "admin_notes",
      key: "admin_notes",
      render: (v) => v
        ? <span className="line-clamp-2 text-sm" style={{ color: TEXT }}>{v}</span>
        : <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, r) => (
        <Space size="small">
          {r.status === "pending" && (
            <>
              <Tooltip title="Approve">
                <Button size="small" icon={<CheckOutlined />} style={GRADIENT_BTN}
                  onClick={() => openApprove(r)}>
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" icon={<CloseOutlined />} style={RED_BTN}
                  onClick={() => openReject(r)}>
                  Reject
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<ExperimentOutlined />}
        badge="Operations"
        title="Supply"
        accent="Requests"
        subtitle="Review and process staff requests for operational supplies"
        stats={[
          { icon: <ExperimentOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Requests", value: stats?.total_requested ?? "—" },
          { icon: <ClockCircleOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Pending", value: stats?.pending ?? "—", valueColor: "text-amber-300" },
          { icon: <CheckCircleOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "Approved", value: stats?.approved ?? "—", valueColor: "text-green-300" },
          { icon: <CloseCircleOutlined />, iconBg: "bg-red-500/15", iconColor: "text-red-400", label: "Rejected", value: stats?.rejected ?? "—", valueColor: "text-red-300" },
        ]}
      />

      <div className="mb-6">
        <FilterBar title="Filters" subtitle="Search and narrow down supply requests">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold" style={{ ...FIELD_LABEL }}>Search</label>
            <Input
              allowClear
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Reason, supply, or staff name"
              prefix={<SearchOutlined style={{ color: ACCENT }} />}
              style={{ width: 240 }}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold" style={{ ...FIELD_LABEL }}>Branch</label>
            <Select
              allowClear showSearch optionFilterProp="label" placeholder="All branches"
              value={branchId} onChange={(v) => { setBranchId(v); setCurrentPage(1); }}
              style={{ width: 180 }}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold" style={{ ...FIELD_LABEL }}>Supply</label>
            <Select
              allowClear placeholder="All supplies"
              value={supply} onChange={(v) => { setSupply(v); setCurrentPage(1); }}
              style={{ width: 190 }}
              options={supplies.map((s) => ({ value: s.value, label: s.name }))}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold" style={{ ...FIELD_LABEL }}>Status</label>
            <Select
              allowClear placeholder="All statuses"
              value={status} onChange={(v) => { setStatus(v); setCurrentPage(1); }}
              style={{ width: 150 }}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold" style={{ ...FIELD_LABEL }}>Date Requested</label>
            <RangePicker
              value={dates}
              onChange={(v) => { setDates(v); setCurrentPage(1); }}
              style={{ width: 240 }}
              placeholder={["From", "To"]}
            />
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />} onClick={() => refetch()}
              loading={isFetching} className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
            >
              Refresh
            </Button>
            {hasFilters && (
              <Button onClick={resetFilters} className="rounded-xl">Clear</Button>
            )}
          </Space>
        </FilterBar>
      </div>

      <SectionCard
        icon={<ExperimentOutlined />}
        title="Supply Requests"
        subtitle="Operational supplies requested by branch staff"
        extra={<CountPill>{total ?? 0} request(s)</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1300 }}
          pagination={pagination}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<ExperimentOutlined />}
                title="No supply requests found"
                description={hasFilters ? "Try adjusting your filters" : "Staff requests will appear here"}
              />
            ),
          }}
        />
      </SectionCard>

      {/* ===== APPROVE MODAL ===== */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1E6] text-lg text-[#EA580C]">
              <CheckOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Approve Supply Request</p>
              <p className="text-xs font-normal text-stone-500">Approve this operational supply request</p>
            </div>
          </div>
        }
        open={showApprove}
        onCancel={() => { setShowApprove(false); approveForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
            <div className="font-semibold text-stone-800">
              {selected.user?.firstname} {selected.user?.lastname}
            </div>
            <div className="font-bold" style={{ color: ACCENT }}>
              {Number(selected.quantity).toLocaleString()} {selected.unit} of {selected.supply_name}
            </div>
            <div className="text-sm text-stone-500">Branch: {selected.branch?.name}</div>
            {selected.reason && <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>}
          </div>
        )}
        <Form form={approveForm} layout="vertical" onFinish={(v) => approveMutation.mutate({ id: selected.id, adminNotes: v.admin_notes || null })}>
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Admin Notes (Optional)</span>}
            name="admin_notes"
            rules={[{ max: 500, message: "Notes cannot exceed 500 characters" }]}
          >
            <TextArea rows={4} placeholder="Add any notes for this approval" maxLength={500} showCount
              disabled={approveMutation.isPending} className="rounded-xl" />
          </Form.Item>
          <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-3">
            <p className="mb-0 text-xs" style={{ color: ACCENT }}>
              <InfoCircleOutlined className="mr-1" />
              Approval is recorded only. No inventory is deducted automatically.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => { setShowApprove(false); approveForm.resetFields(); setSelected(null); }}
                disabled={approveMutation.isPending} className="rounded-xl">
                Cancel
              </Button>
              <Button htmlType="submit" loading={approveMutation.isPending} icon={<CheckOutlined />}
                style={GRADIENT_BTN} className="rounded-xl">
                Approve
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== REJECT MODAL ===== */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF2F2] text-lg text-[#DC2626]">
              <CloseOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Reject Supply Request</p>
              <p className="text-xs font-normal text-stone-500">Reject this operational supply request</p>
            </div>
          </div>
        }
        open={showReject}
        onCancel={() => { setShowReject(false); rejectForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl border border-red-100 bg-[#FEF2F2] p-4">
            <div className="font-semibold text-stone-800">
              {selected.user?.firstname} {selected.user?.lastname}
            </div>
            <div className="font-bold" style={{ color: RED }}>
              {Number(selected.quantity).toLocaleString()} {selected.unit} of {selected.supply_name}
            </div>
            <div className="text-sm text-stone-500">Branch: {selected.branch?.name}</div>
            {selected.reason && <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>}
          </div>
        )}
        <Form form={rejectForm} layout="vertical" onFinish={(v) => rejectMutation.mutate({ id: selected.id, adminNotes: v.admin_notes || null })}>
          <Form.Item
            label={<span style={FIELD_LABEL} className="text-sm font-semibold">Rejection Reason</span>}
            name="admin_notes"
            rules={[{ max: 500, message: "Reason cannot exceed 500 characters" }]}
          >
            <TextArea rows={4} placeholder="Provide a reason for rejection" maxLength={500} showCount
              disabled={rejectMutation.isPending} className="rounded-xl" />
          </Form.Item>
          <div className="mb-4 rounded-xl border border-red-100 bg-[#FEF2F2] p-3">
            <p className="mb-0 text-xs" style={{ color: RED }}>
              <InfoCircleOutlined className="mr-1" />
              The staff member will see this reason on their supply request.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => { setShowReject(false); rejectForm.resetFields(); setSelected(null); }}
                disabled={rejectMutation.isPending} className="rounded-xl">
                Cancel
              </Button>
              <Button htmlType="submit" loading={rejectMutation.isPending} icon={<CloseOutlined />}
                style={RED_BTN} className="rounded-xl">
                Reject
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default SupplyRequestAdmin;