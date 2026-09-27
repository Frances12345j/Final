import { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";
import { DEFAULT_PAGE_SIZE, useServerPagination } from "../components/Pagination";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const formatDate = (value) => {
  if (!value) return "-";
  const date = dayjs(value);
  return date.isValid() ? date.format("MMM DD, YYYY HH:mm") : "-";
};

const getFullName = (person) => {
  if (!person) return "-";
  return [person.firstname, person.middlename, person.lastname]
    .filter(Boolean)
    .join(" ") || person.username || "-";
};

const getProcessedAt = (record) => {
  if (record.status === "approved") return formatDate(record.approved_at);
  if (record.status === "rejected") return formatDate(record.rejected_at);
  return "-";
};

const getProcessedBy = (record) => {
  if (record.status === "approved") return getFullName(record.approver);
  if (record.status === "rejected") return getFullName(record.rejecter);
  return "-";
};

const getStatusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status || "Unknown";
};

const getStatusTag = (status) => {
  const statusConfig = {
    pending: {
      color: "#D97706",
      background: "rgba(245,158,11,0.15)",
      icon: <ClockCircleOutlined />,
      label: "Pending",
    },
    approved: {
      color: "#16A34A",
      background: "rgba(22,163,74,0.12)",
      icon: <CheckCircleOutlined />,
      label: "Approved",
    },
    rejected: {
      color: "#DC2626",
      background: "rgba(220,38,38,0.12)",
      icon: <CloseCircleOutlined />,
      label: "Rejected",
    },
  };

  const config = statusConfig[status] || {
    color: "#78716C",
    background: "rgba(120,113,108,0.12)",
    icon: null,
    label: status || "Unknown",
  };

  return (
    <Tag
      className="rounded-full px-3 py-1"
      style={{ background: config.background, color: config.color, border: "none", fontWeight: 600 }}
      icon={config.icon}
    >
      {config.label}
    </Tag>
  );
};

const escapeCsvValue = (value) => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
};

const PullOutReport = () => {
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [branches, setBranches] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPullOut, setSelectedPullOut] = useState(null);
  const [exporting, setExporting] = useState(false);

  const startDate = dateRange[0]?.format("YYYY-MM-DD");
  const endDate = dateRange[1]?.format("YYYY-MM-DD");
  const normalizedSearch = searchText.trim();

  const getReportParams = (includeExport = false) => ({
    start_date: startDate,
    end_date: endDate,
    branch_id: selectedBranch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    search: normalizedSearch || undefined,
    ...(includeExport ? { export: true } : {}),
  });

  const {
    data: pullOutData,
    raw,
    total,
    isLoading,
    pagination,
    setCurrentPage,
    refetch,
    isError,
    error,
  } = useServerPagination({
    queryKey: [
      "pullOutReport",
      startDate,
      endDate,
      selectedBranch,
      selectedStatus,
      normalizedSearch,
    ],
    url: "/reports/PullOut",
    params: getReportParams(),
    pageSize: DEFAULT_PAGE_SIZE,
    label: "pull-outs",
  });

  const summary = raw?.summary || {};
  const summaryCards = [
    {
      label: "Total Pull Outs",
      value: summary.total_requests ?? total ?? 0,
      icon: <SwapOutlined />,
      iconClass: "bg-orange-500/15 text-orange-400",
    },
    {
      label: "Pending",
      value: summary.pending ?? 0,
      icon: <ClockCircleOutlined />,
      iconClass: "bg-amber-500/15 text-amber-400",
      valueClass: "text-amber-300",
    },
    {
      label: "Approved",
      value: summary.approved ?? 0,
      icon: <CheckCircleOutlined />,
      iconClass: "bg-green-500/15 text-green-400",
      valueClass: "text-green-300",
    },
    {
      label: "Rejected",
      value: summary.rejected ?? 0,
      icon: <CloseCircleOutlined />,
      iconClass: "bg-red-500/15 text-red-400",
      valueClass: "text-red-300",
    },
  ];

  useEffect(() => {
    let active = true;

    api
      .get("/branches")
      .then((response) => {
        if (!active) return;
        setBranches(
          Array.isArray(response.data)
            ? response.data
            : response.data?.data || []
        );
      })
      .catch(() => {
        if (active) message.error("Failed to load branches");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isError) message.error("Failed to load Pull Out Report");
  }, [isError, error]);

  const handleDateRangeChange = (values) => {
    if (!values) return;
    setDateRange(values);
    setCurrentPage(1);
  };

  const handleBranchChange = (value) => {
    setSelectedBranch(value || null);
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setCurrentPage(1);
  };

  const showDetailModal = (record) => {
    setSelectedPullOut(record);
    setDetailModalVisible(true);
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await api.get("/reports/PullOut", {
        params: getReportParams(true),
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const headers = [
        "Date",
        "Staff",
        "SKU",
        "Branch",
        "Quantity",
        "Reason",
        "Notes",
        "Status",
        "Requested At",
        "Processed At",
        "Admin Notes",
        "Processed By",
      ];
      const dataRows = rows.map((record) => [
        formatDate(record.created_at),
        getFullName(record.user),
        record.product?.sku || "-",
        record.branch?.name || "-",
        record.quantity ?? "",
        record.reason || "-",
        record.notes || "-",
        getStatusLabel(record.status),
        formatDate(record.pulled_out_at),
        getProcessedAt(record),
        record.admin_notes || "-",
        getProcessedBy(record),
      ]);
      const csvContent = [headers, ...dataRows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");
      const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pullout_report_${dayjs().format("YYYY-MM-DD")}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error("Failed to export Pull Out Report");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => formatDate(date),
    },
    {
      title: "Staff",
      key: "staff",
      render: (_, record) => (
        <div>
          <Text strong>{getFullName(record.user)}</Text>
          <div className="text-xs text-stone-500">ID: {record.user?.id || "-"}</div>
        </div>
      ),
    },
    {
      title: "SKU",
      key: "sku",
      render: (_, record) => record.product?.sku || "-",
    },
    {
      title: "Branch",
      key: "branch",
      render: (_, record) => record.branch?.name || "-",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      render: (quantity) => <Text strong>{quantity ?? "-"}</Text>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason) => reason || <Text type="secondary">-</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Requested At",
      dataIndex: "pulled_out_at",
      key: "pulled_out_at",
      render: (date) => formatDate(date),
    },
    {
      title: "Processed At",
      key: "processed_at",
      render: (_, record) => getProcessedAt(record),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => showDetailModal(record)}>
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
          <SwapOutlined />
        </div>

        <div className="relative z-10 px-8 py-7">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              <SwapOutlined />
              Pull Out Report
            </span>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mb-1 text-2xl font-bold text-white">
                Pull Out <span className="text-orange-400">Report</span>
              </h1>
              <p className="text-sm text-white/60">Inventory Pull Out requests recorded by staff</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
                className="h-11 rounded-xl! border-stone-200! px-5 font-medium text-stone-700 hover:border-orange-300! hover:text-orange-600"
              >
                Export CSV
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
                className="h-11 rounded-xl border-none bg-linear-to-r from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20!"
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white/50">{card.label}</p>
                  <p className={`text-lg font-bold leading-tight text-white ${card.valueClass || ""}`}>
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <SearchOutlined />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Filters</h2>
            <p className="text-xs text-stone-500">Narrow down the Pull Out report</p>
          </div>
        </div>

        <Space wrap>
          <Text strong>Date Range:</Text>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
            className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
          />
          <Text strong>Branch:</Text>
          <Select
            style={{ width: 200 }}
            placeholder="All Branches"
            allowClear
            value={selectedBranch}
            onChange={handleBranchChange}
            className="h-11! rounded-xl!"
            popupClassName="!rounded-xl"
          >
            {branches.map((branch) => (
              <Select.Option key={branch.id} value={branch.id}>
                {branch.name}
              </Select.Option>
            ))}
          </Select>
          <Text strong>Status:</Text>
          <Select
            style={{ width: 150 }}
            value={selectedStatus}
            onChange={handleStatusChange}
            className="h-11! rounded-xl!"
            popupClassName="!rounded-xl"
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="approved">Approved</Select.Option>
            <Select.Option value="rejected">Rejected</Select.Option>
          </Select>
          <Input
            placeholder="Search staff, product, SKU, branch, reason, or notes"
            prefix={<SearchOutlined className="text-orange-400" />}
            style={{ width: 320 }}
            value={searchText}
            onChange={handleSearchChange}
            allowClear
            className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
          />
        </Space>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <FileTextOutlined />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Pull Out Requests</h2>
              <p className="text-xs text-stone-500">{total} total records</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <Table
            columns={columns}
            dataSource={pullOutData}
            rowKey="id"
            loading={isLoading}
            pagination={pagination}
            scroll={{ x: 1400 }}
          />
        </div>
      </div>

      <Modal
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <FileTextOutlined />
            </div>
            <span className="font-bold text-stone-900">Pull Out Details</span>
          </div>
        }
      >
        {selectedPullOut && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Staff">{getFullName(selectedPullOut.user)}</Descriptions.Item>
            <Descriptions.Item label="Staff ID">{selectedPullOut.user?.id || "-"}</Descriptions.Item>
            <Descriptions.Item label="SKU">{selectedPullOut.product?.sku || "-"}</Descriptions.Item>
            <Descriptions.Item label="Branch">{selectedPullOut.branch?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Quantity">{selectedPullOut.quantity ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Reason">{selectedPullOut.reason || "-"}</Descriptions.Item>
            <Descriptions.Item label="Status">{getStatusTag(selectedPullOut.status)}</Descriptions.Item>
            <Descriptions.Item label="Requested At">{formatDate(selectedPullOut.pulled_out_at)}</Descriptions.Item>
            <Descriptions.Item label="Processed At">{getProcessedAt(selectedPullOut)}</Descriptions.Item>
            <Descriptions.Item label="Processed By">{getProcessedBy(selectedPullOut)}</Descriptions.Item>
            <Descriptions.Item label="Notes">{selectedPullOut.notes || "-"}</Descriptions.Item>
            <Descriptions.Item label="Admin Notes" span={2}>
              {selectedPullOut.admin_notes || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PullOutReport;
