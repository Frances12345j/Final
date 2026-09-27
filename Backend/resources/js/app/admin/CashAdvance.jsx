import { useState } from "react";
import { Card, Table, Button, Modal, Form, Input, message, Tag, Space, Select, Tooltip } from "antd";
import {
  ReloadOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined,
  CheckOutlined, CloseOutlined, UserOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPesoSign } from '@fortawesome/free-solid-svg-icons';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import { clientPagination, serverPagination } from "@/components/Pagination";

const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFF7ED";
const BORDER = "#FED7AA";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "#FFF1E6";
const AMBER = "#F59E0B";
const AMBER_SOFT = "#FFFBEB";
const GREEN = "#16A34A";
const GREEN_SOFT = "#F0FDF4";
const RED = "#DC2626";
const RED_SOFT = "#FEF2F2";

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
  border: "1px solid #FED7AA",
  color: TEXT,
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "#FFFFFF",
  border: "1px solid #EA580C",
  color: ACCENT,
  fontWeight: 500,
};
const RED_BTN = {
  background: "linear-gradient(135deg, #EF4444, #DC2626)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(220,38,38,0.25)",
};

const { TextArea } = Input;

function CashAdvance() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cashAdvancesAll"],
    queryFn: () => api.get("/cash-advances/all"),
  });

  const advances = data?.data?.data || [];

  const filtered = statusFilter === "all"
    ? advances
    : advances.filter((a) => a.status === statusFilter);

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/cash-advances/${id}/approve`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Cash advance approved");
      setShowApproveModal(false);
      approveForm.resetFields();
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["cashAdvancesAll"] });
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }) =>
      api.post(`/cash-advances/${id}/reject`, { admin_notes: adminNotes }),
    onSuccess: () => {
      message.success("Cash advance rejected");
      setShowRejectModal(false);
      rejectForm.resetFields();
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["cashAdvancesAll"] });
    },
    onError: (e) => message.error(e.response?.data?.message || "Failed to reject"),
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
    return <Tag className="rounded-full px-3 py-1" icon={c.icon} style={{ background: c.soft, color: c.color, border: `1px solid ${c.color}30` }}>{c.text}</Tag>;
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const fmtCurrency = (v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const columns = [
    {
      title: "Staff",
      key: "staff",
      render: (_, r) => (
        <div>
          <div className="font-semibold"><UserOutlined className="mr-1" />{r.user?.firstname} {r.user?.lastname}</div>
          <div className="text-xs" style={{ color: MUTED }}>ID: {r.user?.id}</div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (v) => <span className="font-bold" style={{ color: ACCENT }}>{fmtCurrency(v)}</span>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (v) => v || <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => statusTag(v),
    },
    {
      title: "Requested At",
      dataIndex: "requested_at",
      key: "requested_at",
      render: (v) => fmtDate(v),
    },
    {
      title: "Processed At",
      key: "processed",
      render: (_, r) => {
        if (r.status === "approved" && r.approved_at) return <span style={{ color: ACCENT }}>{fmtDate(r.approved_at)}</span>;
        if (r.status === "rejected" && r.rejected_at) return <span style={{ color: "#F87171" }}>{fmtDate(r.rejected_at)}</span>;
        return <span style={{ color: MUTED }}>-</span>;
      },
    },
    {
      title: "Admin Notes",
      dataIndex: "admin_notes",
      key: "admin_notes",
      render: (v) => v || <span style={{ color: MUTED }}>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          {r.status === "pending" && (
            <>
              <Tooltip title="Approve">
                <Button type="primary" size="small" icon={<CheckOutlined />}
                  onClick={() => { setSelected(r); setShowApproveModal(true); }}
                  style={GRADIENT_BTN}>
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" icon={<CloseOutlined />}
                  onClick={() => { setSelected(r); setShowRejectModal(true); }}
                  style={RED_BTN}>
                  Reject
                </Button>
              </Tooltip>
            </>
          )}
          {r.status !== "pending" && <span className="text-sm" style={{ color: MUTED }}>No actions</span>}
        </Space>
      ),
    },
  ];

  const stats = {
    total: advances.length,
    pending: advances.filter((a) => a.status === "pending").length,
    approved: advances.filter((a) => a.status === "approved").length,
    rejected: advances.filter((a) => a.status === "rejected").length,
    totalAmount: advances.filter((a) => a.status === "approved").reduce((s, a) => s + Number(a.amount), 0),
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
          <FontAwesomeIcon icon={faPesoSign} />
        </div>

        <div className="relative z-10 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                <FontAwesomeIcon icon={faPesoSign} />
                Staff Requests
              </div>
              <h1 className="text-2xl font-bold text-white">
                Cash Advance <span className="text-orange-400">Management</span>
              </h1>
              <p className="mt-1 text-sm text-white/60">Approve or reject staff cash advance requests</p>
            </div>

            <div className="flex flex-wrap gap-2 xl:min-w-max">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
                className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! hover:brightness-110!"
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <FontAwesomeIcon icon={faPesoSign} className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Total Requests</p>
                <p className="text-white font-bold text-lg leading-tight">{stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <ClockCircleOutlined className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Pending</p>
                <p className="text-white font-bold text-lg leading-tight">{stats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <CheckCircleOutlined className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Approved</p>
                <p className="text-white font-bold text-lg leading-tight">{stats.approved}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <FontAwesomeIcon icon={faPesoSign} className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Approved Amount</p>
                <p className="text-orange-300 font-bold text-lg leading-tight">{fmtCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <ReloadOutlined />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Filters</h2>
            <p className="text-xs text-stone-500">Narrow down the cash advance view</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-stone-700">Status:</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            className="h-10! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="approved">Approved</Select.Option>
            <Select.Option value="rejected">Rejected</Select.Option>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <FontAwesomeIcon icon={faPesoSign} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Cash Advance Requests</h2>
              <p className="text-xs text-stone-500">Review and process staff advance requests</p>
            </div>
          </div>
          <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
            {filtered.length} request(s)
          </span>
        </div>
        <div className="p-4">
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={isLoading}
            pagination={clientPagination({ label: "requests" })}
            locale={{
              emptyText: (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                    <FontAwesomeIcon icon={faPesoSign} />
                  </div>
                  <p className="text-base font-semibold text-stone-700">No cash advance requests found</p>
                  <p className="mt-1 text-sm text-stone-400">Try adjusting your filter</p>
                </div>
              ),
            }}
          />
        </div>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1E6] text-lg text-[#EA580C]"><CheckOutlined /></div>
            <div>
              <p className="font-bold text-[#451A03]">Approve Cash Advance</p>
              <p className="text-xs font-normal text-stone-500">Approve this staff cash advance request</p>
            </div>
          </div>
        }
        open={showApproveModal}
        onCancel={() => { setShowApproveModal(false); approveForm.resetFields(); setSelected(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        {selected && (
          <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
            <div className="font-semibold text-stone-800">{selected.user?.firstname} {selected.user?.lastname}</div>
            <div className="text-lg font-bold text-[#EA580C]">{fmtCurrency(selected.amount)}</div>
            {selected.reason && <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>}
          </div>
        )}
        <Form form={approveForm} layout="vertical" onFinish={handleApprove} initialValues={{ admin_notes: "" }}>
          <Form.Item
            label={<span className="text-sm font-semibold" style={FIELD_LABEL}>Admin Notes (Optional)</span>}
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
            <p className="mb-0 text-xs text-[#C2410C]">
              <InfoCircleOutlined className="mr-1" />
              This action will mark the cash advance as approved and notify the staff member.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowApproveModal(false); approveForm.resetFields(); setSelected(null); }}
                disabled={approveMutation.isPending}
                className="rounded-xl border-stone-200 text-stone-600 hover:border-orange-300 hover:text-orange-600"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={approveMutation.isPending}
                icon={<CheckOutlined />}
                className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-[#F59E0B] border-none text-white shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:brightness-110!"
              >
                Approve
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-lg text-red-600"><CloseOutlined /></div>
            <div>
              <p className="font-bold text-[#451A03]">Reject Cash Advance</p>
              <p className="text-xs font-normal text-stone-500">Reject this staff cash advance request</p>
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
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="font-semibold text-stone-800">{selected.user?.firstname} {selected.user?.lastname}</div>
            <div className="text-lg font-bold text-red-600">{fmtCurrency(selected.amount)}</div>
            {selected.reason && <div className="mt-1 text-sm text-stone-500">Reason: {selected.reason}</div>}
          </div>
        )}
        <Form form={rejectForm} layout="vertical" onFinish={handleReject} initialValues={{ admin_notes: "" }}>
          <Form.Item
            label={<span className="text-sm font-semibold" style={FIELD_LABEL}>Rejection Reason (Optional)</span>}
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
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="mb-0 text-xs text-red-600">
              <InfoCircleOutlined className="mr-1" />
              This action will reject the cash advance and notify the staff member.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowRejectModal(false); rejectForm.resetFields(); setSelected(null); }}
                disabled={rejectMutation.isPending}
                className="rounded-xl border-stone-200 text-stone-600 hover:border-orange-300 hover:text-orange-600"
              >
                Cancel
              </Button>
              <Button
                htmlType="submit"
                loading={rejectMutation.isPending}
                icon={<CloseOutlined />}
                className="rounded-xl border-none bg-linear-to-r from-red-600 to-red-500 text-white shadow-[0_4px_15px_rgba(220,38,38,0.25)] hover:brightness-110!"
              >
                Reject
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CashAdvance;