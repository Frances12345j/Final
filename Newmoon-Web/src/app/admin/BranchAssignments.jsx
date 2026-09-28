import { useState } from "react";
import { Table, Tag, Button, Modal, Form, Input, Select, Space, message, Tooltip, Switch } from "antd";
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  BankOutlined,
  TeamOutlined,
  ReloadOutlined,
  CarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from "@/config/api";
import { clientPagination, serverPagination } from "@/components/Pagination";
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

const HeroPrimaryButton = ({ children, ...props }) => (
  <Button
    {...props}
    className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! hover:brightness-110!"
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

// ─── Palette — matches Inventory Report (warm cream + orange) ─────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFF7ED";
const BORDER = "#FFEDD5";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.10)";
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
  boxShadow: "none",
};
const SECONDARY_BTN = {
  background: PANEL_BG,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: `1px solid ${ACCENT}40`,
  color: ACCENT,
  fontWeight: 500,
};

const fetchStaff = async () => {
  try {
    const response = await api.get("/staff?paginate=false");
    if (response.data?.data) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    console.error("Failed to fetch staff:", e);
    return [];
  }
};

const fetchAssignments = async () => {
  try {
    const response = await api.get("/staff-assignments?paginate=false");
    if (response.data?.data) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (e) {
    console.error("Failed to fetch assignments:", e);
    return [];
  }
};

const fetchBranches = async () => {
  try {
    const response = await api.get("/branches");
    const branchesData = response.data?.data;
    return Array.isArray(branchesData) ? branchesData : (Array.isArray(response.data) ? response.data : []);
  } catch (e) {
    console.error("Failed to fetch branches:", e);
    return [];
  }
};

const createAssignment = async (data) => {
  const response = await api.post("/staff-assignments", data);
  return response.data;
};

const updateAssignment = async ({ id, data }) => {
  const response = await api.put(`/staff-assignments/${id}`, data);
  return response.data;
};

const deleteAssignment = async (id) => {
  const response = await api.delete(`/staff-assignments/${id}`);
  return response.data;
};

const toggleAssignmentStatus = async ({ id, is_active }) => {
  const response = await api.put(`/staff-assignments/${id}`, { is_active });
  return response.data;
};

function BranchAssignments() {
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const loading = staffLoading || assignmentsLoading || branchesLoading;

  const staffList = Array.isArray(staff) ? staff : [];
  const branchesList = Array.isArray(branches) ? branches : [];
  const staffOnly = staffList.filter(user => user.role === 'staff');
  const riders = staffList.filter(user => user.role === 'delivery_rider');
  const allUsers = [...staffOnly, ...riders];

  const usersWithAssignment = allUsers.map((user) => {
    const assignment = assignments.find((a) => a.user_id === user.id && a.is_active) ||
                       assignments.find((a) => a.user_id === user.id);
    return {
      ...user,
      assignment: assignment || null,
      branch: assignment?.branch || null,
      position: assignment?.position || "Unassigned",
      daily_rate: assignment?.daily_rate || 0,
      is_active: assignment?.is_active ?? false,
    };
  });

  const totalStaff = staffOnly.length;
  const totalRiders = riders.length;
  const totalUsers = allUsers.length;
  const assignedCount = usersWithAssignment.filter((u) => u.assignment).length;
  const unassignedCount = totalUsers - assignedCount;
  const totalBranches = branchesList.length;

  const addMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      message.success("Branch assignment added successfully");
      setShowAddModal(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors) {
        const firstField = Object.keys(validationErrors)[0];
        const firstMessage = validationErrors[firstField]?.[0];
        message.error(firstMessage || "Failed to add branch assignment");
      } else {
        message.error(error?.response?.data?.message || "Failed to add branch assignment");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAssignment,
    onSuccess: () => {
      message.success("Branch assignment updated successfully");
      setShowEditModal(false);
      setEditingAssignment(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors) {
        const firstField = Object.keys(validationErrors)[0];
        const firstMessage = validationErrors[firstField]?.[0];
        message.error(firstMessage || "Failed to update branch assignment");
      } else {
        message.error(error?.response?.data?.message || "Failed to update branch assignment");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      message.success("Branch assignment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      message.error(error?.response?.data?.message || "Failed to delete branch assignment");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleAssignmentStatus,
    onSuccess: (data, variables) => {
      message.success(variables.is_active ? "Assignment activated." : "Assignment deactivated.");
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      message.error(error?.response?.data?.message || "Failed to update assignment status.");
    },
  });

  const handleAddAssignment = async (values) => {
    if (!values.user_id || !values.branch_id) {
      message.error("Please select both a user and a branch");
      return;
    }
    const selectedUser = allUsers.find(u => u.id === Number(values.user_id));
    const defaultPosition = selectedUser?.role === 'delivery_rider' ? 'Delivery Rider' : 'Staff';
    const defaultRate = selectedUser?.role === 'delivery_rider' ? 400 : 500;
    const payload = {
      user_id: Number(values.user_id),
      branch_id: Number(values.branch_id),
      position: values.position || defaultPosition,
      daily_rate: values.daily_rate ? Number(values.daily_rate) : defaultRate,
      is_active: true,
    };
    await addMutation.mutateAsync(payload);
  };

  const handleUpdateAssignment = async (values) => {
    if (!values.user_id || !values.branch_id) {
      message.error("Please select both a user and a branch");
      return;
    }
    const selectedUser = allUsers.find(u => u.id === Number(values.user_id));
    const defaultPosition = selectedUser?.role === 'delivery_rider' ? 'Delivery Rider' : 'Staff';
    const defaultRate = selectedUser?.role === 'delivery_rider' ? 400 : 500;
    const payload = {
      id: editingAssignment.id,
      data: {
        user_id: Number(values.user_id),
        branch_id: Number(values.branch_id),
        position: values.position || defaultPosition,
        daily_rate: values.daily_rate ? Number(values.daily_rate) : defaultRate,
      },
    };
    await updateMutation.mutateAsync(payload);
  };

  const handleDeleteAssignment = (record) => {
    Modal.confirm({
      title: "Delete Branch Assignment",
      icon: <DeleteOutlined style={{ color: RED }} />,
      content: (
        <div>
          <p className="mb-2">Are you sure you want to remove this branch assignment?</p>
          <p className="text-sm" style={{ color: MUTED }}>User: <strong style={{ color: TEXT }}>{record.user?.firstname} {record.user?.lastname}</strong></p>
          <p className="text-sm" style={{ color: MUTED }}>Branch: <strong style={{ color: TEXT }}>{record.branch?.name}</strong></p>
        </div>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        await deleteMutation.mutateAsync(record.assignment.id);
      },
    });
  };

  const handleToggleAssignment = (record) => {
    const nextActive = !record.is_active;
    Modal.confirm({
      title: nextActive ? "Activate Branch Assignment" : "Deactivate Branch Assignment",
      content: (
        <div>
          <p className="mb-2">{nextActive ? "This user will be assigned to this branch." : "This user will no longer be assigned to this branch."}</p>
          <p className="text-sm" style={{ color: MUTED }}>User: <strong style={{ color: TEXT }}>{record.user?.firstname} {record.user?.lastname}</strong></p>
          <p className="text-sm" style={{ color: MUTED }}>Branch: <strong style={{ color: TEXT }}>{record.branch?.name}</strong></p>
        </div>
      ),
      okText: nextActive ? "Activate" : "Deactivate",
      okButtonProps: { danger: !nextActive },
      cancelText: "Cancel",
      onOk: async () => {
        await toggleMutation.mutateAsync({ id: record.assignment.id, is_active: nextActive });
      },
    });
  };

  const openEditModal = (record) => {
    setEditingAssignment(record);
    setShowEditModal(true);
    setTimeout(() => editForm.setFieldsValue({
      user_id: record.user_id,
      branch_id: record.branch_id,
      position: record.position,
      daily_rate: record.daily_rate,
    }), 0);
  };

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 60,
      render: (_, __, idx) => <span style={{ color: MUTED }}>{idx + 1}</span>,
    },
    {
      title: "User",
      key: "user",
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
            style={{ background: GRADIENT_BTN.background }}
          >
            {r.firstname?.charAt(0)?.toUpperCase() || <UserOutlined />}
          </div>
          <div>
            <div className="font-semibold" style={{ color: TEXT }}>{r.firstname} {r.lastname}</div>
            <div className="text-xs" style={{ color: FAINT }}>{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      render: (_, r) =>
        r.role === 'delivery_rider'
          ? <Tag icon={<CarOutlined />} style={{ background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}40` }}>Rider</Tag>
          : <Tag icon={<TeamOutlined />} style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` }}>Staff</Tag>,
    },
    {
      title: "Branch",
      key: "branch",
      render: (_, r) =>
        r.assignment
          ? <Tag style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` }}>{r.branch?.name || "N/A"}</Tag>
          : <Tag style={{ background: PANEL_BG, color: MUTED, border: `1px solid ${BORDER}` }}>Not Assigned</Tag>,
    },
    {
      title: "Position",
      key: "position",
      render: (_, r) => <span style={{ color: TEXT }}>{r.position || "—"}</span>,
    },
    {
      title: "Daily Rate",
      key: "daily_rate",
      render: (_, r) => <span className="font-medium" style={{ color: ACCENT }}>₱{r.daily_rate || 0}</span>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) =>
        r.assignment
          ? r.is_active
            ? <Tag style={{ background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}40` }}>Active</Tag>
            : <Tag style={{ background: RED_SOFT, color: "#DC2626", border: `1px solid ${RED}40` }}>Inactive</Tag>
          : <Tag style={{ background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}40` }}>Unassigned</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          {r.assignment ? (
            <>
              <Tooltip title={r.is_active ? "Deactivate" : "Activate"}>
                <Switch
                  checked={r.is_active}
                  onChange={() => handleToggleAssignment(r)}
                  loading={toggleMutation.isPending}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Edit Assignment">
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} style={{ color: ACCENT }} />
              </Tooltip>
              <Tooltip title="Delete Assignment">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAssignment(r)} />
              </Tooltip>
            </>
          ) : (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
              setShowAddModal(true);
              setTimeout(() => form.setFieldsValue({ user_id: r.id }), 0);
            }} style={GRADIENT_BTN}>
              Assign
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      {/* Hero Header */}
      <HeroHeader
        badgeIcon={<BankOutlined />}
        badge="Branch Management"
        title="Branch"
        accent="Assignments"
        subtitle="Manage staff and rider branch assignments"
        actions={
          <>
            <HeroButton
              icon={<ReloadOutlined />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['assignments'] });
                queryClient.invalidateQueries({ queryKey: ['branches'] });
              }}
              loading={loading}
            >
              Refresh
            </HeroButton>
            <HeroPrimaryButton
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setShowAddModal(true);
              }}
            >
              Add Assignment
            </HeroPrimaryButton>
          </>
        }
        stats={[
          { icon: <TeamOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Staff", value: totalStaff },
          { icon: <CarOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Total Riders", value: totalRiders },
          { icon: <TeamOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "Assigned", value: assignedCount, valueColor: "text-orange-300" },
          { icon: <UserOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Unassigned", value: unassignedCount },
          { icon: <BankOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Branches", value: totalBranches },
        ]}
      />

      {/* Staff & Riders Directory */}
      <SectionCard
        icon={<TeamOutlined />}
        title="Staff & Riders Directory"
        subtitle="View and manage all member assignments"
        extra={<CountPill>{totalUsers} {totalUsers === 1 ? "Member" : "Members"}</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={usersWithAssignment}
          rowKey="id"
          loading={loading}
          pagination={clientPagination({ label: "members" })}
          locale={{ emptyText: <TableEmpty icon={<TeamOutlined className="text-3xl" />} title="No staff or riders found" description="Add assignments to get started" /> }}
        />
      </SectionCard>

      {/* Add Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              <PlusOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Add Branch Assignment</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Assign a staff member to a branch</p>
            </div>
          </div>
        }
        open={showAddModal}
        onCancel={() => { setShowAddModal(false); form.resetFields(); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={form} layout="vertical" onFinish={handleAddAssignment} initialValues={{ position: "", daily_rate: "" }}>
          <Form.Item
            label={<span style={FIELD_LABEL}>User</span>}
            name="user_id"
            rules={[{ required: true, message: "Please select a user" }]}
          >
            <Select
              placeholder="Select User"
              showSearch
              optionFilterProp="children"
              className="rounded-xl!"
            >
              {allUsers.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  {u.firstname} {u.lastname} ({u.username}) - {u.role === 'delivery_rider' ? 'Rider' : 'Staff'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Branch</span>}
            name="branch_id"
            rules={[{ required: true, message: "Please select a branch" }]}
          >
            <Select
              placeholder="Select Branch"
              showSearch
              optionFilterProp="children"
              className="rounded-xl!"
            >
              {branchesList.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Position</span>}
            name="position"
          >
            <Input
              placeholder="Auto-filled based on role"
              className="rounded-xl!"
            />
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Daily Rate</span>}
            name="daily_rate"
          >
            <Input
              type="number"
              placeholder="Auto-filled based on role"
              className="rounded-xl!"
            />
          </Form.Item>
          <div
            className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-3"
          >
            <p className="mb-0 text-xs" style={{ color: "#9A3412" }}>
              <InfoCircleOutlined className="mr-1" />
              Position and daily rate are auto-filled based on the selected user's role. You can override them manually.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowAddModal(false); form.resetFields(); }}
                disabled={addMutation.isPending}
                className="rounded-xl"
                style={SECONDARY_BTN}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={addMutation.isPending}
                className="rounded-xl"
                style={GRADIENT_BTN}
              >
                Add Assignment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              <EditOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Edit Branch Assignment</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Update assignment details</p>
            </div>
          </div>
        }
        open={showEditModal}
        onCancel={() => { setShowEditModal(false); setEditingAssignment(null); editForm.resetFields(); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateAssignment}>
          <Form.Item
            label={<span style={FIELD_LABEL}>User</span>}
            name="user_id"
            rules={[{ required: true, message: "Please select a user" }]}
          >
            <Select
              placeholder="Select User"
              showSearch
              optionFilterProp="children"
              className="rounded-xl!"
            >
              {allUsers.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  {u.firstname} {u.lastname} ({u.username}) - {u.role === 'delivery_rider' ? 'Rider' : 'Staff'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Branch</span>}
            name="branch_id"
            rules={[{ required: true, message: "Please select a branch" }]}
          >
            <Select
              placeholder="Select Branch"
              showSearch
              optionFilterProp="children"
              className="rounded-xl!"
            >
              {branchesList.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Position</span>}
            name="position"
          >
            <Input
              placeholder="Enter position"
              className="rounded-xl!"
            />
          </Form.Item>
          <Form.Item
            label={<span style={FIELD_LABEL}>Daily Rate</span>}
            name="daily_rate"
          >
            <Input
              type="number"
              placeholder="Enter daily rate"
              className="rounded-xl!"
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setShowEditModal(false); setEditingAssignment(null); editForm.resetFields(); }}
                disabled={updateMutation.isPending}
                className="rounded-xl"
                style={SECONDARY_BTN}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
                className="rounded-xl"
                style={GRADIENT_BTN}
              >
                Update Assignment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default BranchAssignments;