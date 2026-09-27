import React, { useState } from "react";
import {
  Card, Table, Tag, Button, Modal, Form, Input, Select, Space, message, Row, Col, Switch, Tooltip, Avatar
} from "antd";
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  KeyOutlined,
  ReloadOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import Loading from "@/components/Loading";
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

// ─── Palette — light warm-cream + orange (Inventory Report skin) ──────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFFFFF";
const BORDER = "rgba(234,88,12,0.10)";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.08)";
const AMBER = "#D97706";
const AMBER_SOFT = "rgba(245,158,11,0.12)";
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
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(234,88,12,0.35)",
};
const SECONDARY_BTN = {
  background: "#FFFFFF",
  border: "1px solid #E7E5E4",
  color: "#292524",
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};

function Staff() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const {
    data: staffList,
    total,
    isLoading,
    pagination,
    setCurrentPage,
    refetch,
  } = useServerPagination({
    queryKey: ["staff", searchTerm, positionFilter],
    url: "/staff",
    params: {
      paginate: "true",
      search: searchTerm || undefined,
      role: positionFilter ? (positionFilter === "Rider" ? "delivery_rider" : "staff") : undefined,
    },
    label: "staff",
    placeholderData: (prev) => prev,
  });

  const getPosition = (s) => (s.role === "delivery_rider" ? "Rider" : "Staff");

  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/staff", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      message.success("Staff member added successfully!");
      setShowAddModal(false);
      addForm.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Error adding staff member");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/staff/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      message.success("Staff member updated successfully!");
      setShowEditModal(false);
      setEditingStaff(null);
      editForm.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Error updating staff member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      message.success("Staff member deleted successfully");
      setShowDeleteModal(false);
      setSelectedStaff(null);
    },
    onError: (err) => {
      const errorData = err?.response?.data;
      if (errorData?.code === 'STAFF_DELETE_CONSTRAINT') {
        message.error(errorData.message || "Cannot delete staff with existing records. Consider disabling instead.");
        setShowDeleteModal(false);
      } else {
        message.error(errorData?.message || "Error deleting staff member");
      }
    },
  });

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      await addMutation.mutateAsync({
        username: values.username,
        password: values.password || "default123",
        firstname: values.firstname,
        lastname: values.lastname,
        middlename: values.middlename || null,
        address: values.address || null,
        email: values.email || null,
        phone: values.phone || null,
        position: values.position,
      });
    } catch (err) {
      if (err.errorFields) return;
    }
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        firstname: values.firstname,
        lastname: values.lastname,
        middlename: values.middlename || null,
        address: values.address || null,
        email: values.email || null,
        phone: values.phone || null,
        position: values.position,
        is_active: values.is_active,
      };
      if (values.password) payload.password = values.password;
      await updateMutation.mutateAsync({ id: editingStaff.id, payload });
    } catch (err) {
      if (err.errorFields) return;
    }
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setShowEditModal(true);
    setTimeout(() => editForm.setFieldsValue({
      username: s.username || "",
      firstname: s.firstname || "",
      lastname: s.lastname || "",
      middlename: s.middlename || "",
      address: s.address || "",
      position: getPosition(s),
      email: s.email || "",
      phone: s.phone || "",
      is_active: s.is_active !== undefined ? s.is_active : true,
      password: "",
    }), 0);
  };

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_, r) => {
        let initials = (r.firstname?.[0] || '') + (r.lastname?.[0] || '');
        return (
          <div className="flex items-center gap-3">
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={{ backgroundColor: getPosition(r) === "Rider" ? "#F59E0B" : "#EA580C", color: "#FFFFFF" }}
            />
            <div>
              <div className="font-semibold">
                {r.firstname} {r.middlename ? `${r.middlename.charAt(0)}. ` : ''}{r.lastname}
              </div>
              <div className="text-xs" style={{ color: MUTED }}>{r.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, r) => (
        <div className="text-sm">
          {r.email && <div><MailOutlined className="mr-1" style={{ color: MUTED }} />{r.email}</div>}
          {r.phone && <div><PhoneOutlined className="mr-1" style={{ color: MUTED }} />{r.phone}</div>}
          {!r.email && !r.phone && <span style={{ color: MUTED }}>—</span>}
        </div>
      ),
    },
    {
      title: "Position",
      key: "position",
      render: (_, r) => {
        const position = getPosition(r);
        return position === "Rider"
          ? <Tag className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-600">Rider</Tag>
          : <Tag className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600">Staff</Tag>;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) =>
        r.is_active !== false
          ? <Tag className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-600" icon={<CheckCircleOutlined />}>Active</Tag>
          : <Tag className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-600" icon={<CloseCircleOutlined />}>Inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} style={GRADIENT_BTN} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button danger size="small" icon={<DeleteOutlined />} onClick={() => {
              setSelectedStaff(r);
              setShowDeleteModal(true);
            }} className="rounded-xl" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<TeamOutlined />}
        badge="Staff Management"
        title="Staff"
        accent="Management"
        subtitle="Manage your staff members and riders"
        actions={
          <Input
            placeholder="Search by name or username..."
            prefix={<SearchOutlined className="text-white/60" />}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: 300 }}
            allowClear
            className="h-11! rounded-xl! border-white/20! bg-white/10! px-4! text-white! placeholder:text-white/60! hover:border-orange-300!"
          />
        }
      />

      <FilterBar title="Filters" subtitle="Filter staff members by position">
        <Select
          placeholder="Filter by position"
          value={positionFilter}
          onChange={(v) => { setPositionFilter(v); setCurrentPage(1); }}
          allowClear
          style={{ width: 160 }}
          onClear={() => setPositionFilter(null)}
          className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
        >
          <Select.Option value="Staff">Staff</Select.Option>
          <Select.Option value="Rider">Rider</Select.Option>
        </Select>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
          className="h-11! rounded-xl! border-[#EA580C]! px-4! text-[#EA580C]! hover:bg-[#FFF1E6]! hover:border-[#F97316]!"
        >
          Refresh
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { addForm.resetFields(); setShowAddModal(true); }}
          className="h-11! rounded-xl! border-none! bg-linear-to-br! from-[#EA580C]! via-[#F97316]! to-amber! px-4! text-white! shadow-[0_4px_15px_rgba(234,88,12,0.35)]!"
        >
          Add Staff
        </Button>
      </FilterBar>

      <SectionCard
        icon={<TeamOutlined />}
        title="Staff Members"
        subtitle="View and manage all staff and rider accounts"
        extra={<CountPill>{total} total</CountPill>}
      >
        {isLoading ? (
          <Loading full text="Loading staff members..." />
        ) : (
        <Table
          columns={columns}
          dataSource={staffList}
          rowKey="id"
          loading={false}
          pagination={pagination}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<TeamOutlined />}
                title="No staff members found"
                description="Try adjusting your search or filter"
              />
            ),
          }}
        />
        )}
      </SectionCard>

      {/* Add Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <PlusOutlined className="mr-2 text-[#EA580C]" />
            <span className="font-bold text-[#451A03]">Add Staff Member</span>
          </span>
        }
        open={showAddModal}
        onCancel={() => { setShowAddModal(false); addForm.resetFields(); }}
        footer={null}
        width={600}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>First Name</span>} name="firstname" rules={[{ required: true, message: "First name is required" }]}>
                <Input placeholder="First name" className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>Middle Name</span>} name="middlename">
                <Input placeholder="Middle name" className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>Last Name</span>} name="lastname" rules={[{ required: true, message: "Last name is required" }]}>
                <Input placeholder="Last name" className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Username</span>} name="username" rules={[{ required: true, message: "Username is required" }]}>
                <Input placeholder="Enter username" prefix={<IdcardOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Password</span>} name="password">
                <Input.Password placeholder="Default: default123" prefix={<KeyOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Email</span>} name="email">
                <Input placeholder="Enter email" prefix={<MailOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Phone</span>} name="phone">
                <Input placeholder="Enter phone number" prefix={<PhoneOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={FIELD_LABEL}>Address</span>} name="address">
            <Input placeholder="Enter address" prefix={<HomeOutlined style={{ color: MUTED }} />} className="rounded-xl" />
          </Form.Item>
<Form.Item label={<span style={FIELD_LABEL}>Position</span>} name="position" rules={[{ required: true, message: "Position is required" }]} initialValue="Staff">
          <Select className="rounded-xl">
            <Select.Option value="Staff">Staff</Select.Option>
            <Select.Option value="Rider">Rider</Select.Option>
          </Select>
        </Form.Item>
        <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-3">
          <p className="text-sm text-[#EA580C]">
            <InfoCircleOutlined className="mr-1" /> New staff will be set as active by default. Default password is "default123".
          </p>
        </div>
        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button onClick={() => { setShowAddModal(false); addForm.resetFields(); }} className="rounded-xl">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={addMutation.isPending} className="rounded-xl" style={GRADIENT_BTN}>Add Staff</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

      {/* Edit Modal */}
      <Modal
        title={
          <span>
            <EditOutlined className="mr-2 text-[#EA580C]" />
            <span className="font-bold text-[#451A03]">Edit Staff Member</span>
          </span>
        }
        open={showEditModal}
        onCancel={() => { setShowEditModal(false); setEditingStaff(null); editForm.resetFields(); }}
        footer={null}
        width={600}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>First Name</span>} name="firstname" rules={[{ required: true, message: "First name is required" }]}>
                <Input placeholder="First name" className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>Middle Name</span>} name="middlename">
                <Input placeholder="Middle name" className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={FIELD_LABEL}>Last Name</span>} name="lastname" rules={[{ required: true, message: "Last name is required" }]}>
                <Input placeholder="Last name" className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Username</span>} name="username">
                <Input prefix={<IdcardOutlined style={{ color: MUTED }} />} disabled className="rounded-xl" />
              </Form.Item>
              <span className="-mt-3 block text-xs" style={{ color: MUTED }}>Username cannot be changed</span>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>New Password</span>} name="password">
                <Input.Password placeholder="Leave blank to keep current" prefix={<KeyOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Email</span>} name="email">
                <Input placeholder="Enter email" prefix={<MailOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Phone</span>} name="phone">
                <Input placeholder="Enter phone number" prefix={<PhoneOutlined style={{ color: MUTED }} />} className="rounded-xl" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={FIELD_LABEL}>Address</span>} name="address">
            <Input placeholder="Enter address" prefix={<HomeOutlined style={{ color: MUTED }} />} className="rounded-xl" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Position</span>} name="position" rules={[{ required: true, message: "Position is required" }]}>
                <Select className="rounded-xl">
                  <Select.Option value="Staff">Staff</Select.Option>
                  <Select.Option value="Rider">Rider</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={FIELD_LABEL}>Status</span>} name="is_active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => { setShowEditModal(false); setEditingStaff(null); editForm.resetFields(); }} className="rounded-xl">Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending} className="rounded-xl" style={GRADIENT_BTN}>Update Staff</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title={
          <span>
            <DeleteOutlined className="mr-2 text-[#EA580C]" />
            <span className="font-bold text-[#451A03]">Confirm Delete</span>
          </span>
        }
        open={showDeleteModal}
        onCancel={() => { setShowDeleteModal(false); setSelectedStaff(null); }}
        onOk={() => deleteMutation.mutate(selectedStaff?.id)}
        okText="Delete"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
        cancelText="Cancel"
        width={420}
        className="rounded-2xl"
      >
        <div className="py-4 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: RED_SOFT, border: `1px solid ${RED}30` }}
          >
            <DeleteOutlined className="text-2xl text-red-500" />
          </div>
          <p className="mb-2 text-lg font-semibold" style={{ color: TEXT }}>
            Are you sure you want to delete this staff member?
          </p>
          {selectedStaff && (
            <div className="rounded-xl border border-orange-100 bg-[#FFF1E6] p-3 text-left">
              <p><UserOutlined className="mr-2 text-[#EA580C]" /><strong>{selectedStaff.firstname} {selectedStaff.lastname}</strong></p>
              <p className="text-sm text-stone-500"><IdcardOutlined className="mr-2" />{selectedStaff.username}</p>
              <Tag
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-600"
              >
                {getPosition(selectedStaff)}
              </Tag>
            </div>
          )}
          {selectedStaff?.is_active !== false ? (
            <p className="mt-3 text-sm text-red-600"><InfoCircleOutlined className="mr-1" /> This action cannot be undone. Consider disabling instead.</p>
          ) : (
            <p className="mt-3 text-sm text-red-600"><InfoCircleOutlined className="mr-1" /> This staff member is already inactive. This will permanently remove them.</p>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}

export default Staff;
