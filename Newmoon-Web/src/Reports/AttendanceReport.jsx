import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Statistic,
  Tag,
  Progress,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";
import { clientPagination, serverPagination } from "../components/Pagination";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const formatTime = (time) => {
  if (!time) return "-";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  const date = new Date(time);
  if (isNaN(date.getTime())) return time;
  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const AttendanceReport = () => {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);

  // Fetch staff list from the correct endpoint
  const fetchStaffList = async () => {
    try {
      // Use the StaffController index which returns paginated { data: [...] }
      const res = await api.get("/staff", { params: { per_page: 100 } });
      const staffData = res.data?.data || [];
      setStaffList(Array.isArray(staffData) ? staffData : []);
    } catch (err) {
      console.warn("Could not load staff list", err);
      setStaffList([]); // fallback to empty array
    }
  };

  const fetchAttendanceReport = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange[0].format("YYYY-MM-DD"),
        end_date: dateRange[1].format("YYYY-MM-DD"),
        page: page,
        per_page: pagination.pageSize,
      };
      if (selectedStaff) {
        params.user_id = selectedStaff;
      }
      const res = await api.get("/reports/attendance", { params });
      const data = res.data || {};
      
      setAttendanceData(data.data || []);
      setSummary(data.summary || null);
      if (data.pagination) {
        setPagination({
          current: data.pagination.current_page,
          pageSize: data.pagination.per_page,
          total: data.pagination.total,
        });
      }
    } catch (err) {
      console.error("[AttendanceReport] Error:", err);
      // Optionally show a notification to the user
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchAttendanceReport(1);
  }, []);

  useEffect(() => {
    fetchAttendanceReport(1);
  }, [dateRange, selectedStaff]);

  const handleTableChange = (pagination) => {
    fetchAttendanceReport(pagination.current);
  };

  const handleExport = () => {
    const csvContent = [
      ["Date", "Staff", "Position", "Time In", "Time Out", "Duration (hrs)", "Status"],
      ...attendanceData.map(row => [
        dayjs(row.date).format("YYYY-MM-DD"),
        row.staff_name,
        row.position,
        row.time_in || "-",
        row.time_out || "-",
        row.duration !== null && row.duration !== undefined ? row.duration : "-",
        row.status,
      ]),
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Staff",
      dataIndex: "staff_name",
      key: "staff_name",
      sorter: (a, b) => a.staff_name.localeCompare(b.staff_name),
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.position}</Text>
        </div>
      ),
    },
    {
      title: "Time In",
      dataIndex: "time_in",
      key: "time_in",
      render: (time) => formatTime(time),
    },
    {
      title: "Time Out",
      dataIndex: "time_out",
      key: "time_out",
      render: (time) => formatTime(time),
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      sorter: (a, b) => parseFloat(a.duration || 0) - parseFloat(b.duration || 0),
      render: (duration) => (
        <Text strong>{duration !== null && duration !== undefined ? `${duration} hrs` : "-"}</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Present", value: "present" },
        { text: "Late", value: "late" },
        { text: "Absent", value: "absent" },
        { text: "Completed", value: "completed" },
        { text: "Completed Late", value: "completed_late" },
        { text: "Incomplete", value: "incomplete" },
      ],
      render: (status) => {
        const config = {
          present: { color: "green", icon: <CheckCircleOutlined /> },
          late: { color: "orange", icon: <ClockCircleOutlined /> },
          absent: { color: "red", icon: <CloseCircleOutlined /> },
          completed: { color: "green", icon: <CheckCircleOutlined /> },
          completed_late: { color: "orange", icon: <ClockCircleOutlined /> },
          incomplete: { color: "default", icon: <ClockCircleOutlined /> },
        };
        const { color, icon } = config[status] || config.absent;
        const label = status === "completed_late" ? "Completed (Late)" : status.charAt(0).toUpperCase() + status.slice(1);
        return <Tag color={color} icon={icon}>{label}</Tag>;
      },
    },
  ];

  const staffSummaryColumns = [
    {
      title: "Staff",
      dataIndex: "staff_name",
      key: "staff_name",
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Days Present",
      dataIndex: "days_present",
      key: "days_present",
      align: "center",
    },
    {
      title: "Days Late",
      dataIndex: "days_late",
      key: "days_late",
      align: "center",
      render: (days) => (days > 0 ? <Text type="warning">{days}</Text> : days),
    },
    {
      title: "Days Absent",
      dataIndex: "days_absent",
      key: "days_absent",
      align: "center",
      render: (days) => (days > 0 ? <Text type="danger">{days}</Text> : days),
    },
    {
      title: "Total Hours",
      dataIndex: "total_hours",
      key: "total_hours",
      render: (hours) => hours !== null && hours !== undefined ? `${hours.toFixed(1)} hrs` : "-",
    },
    {
      title: "Attendance Rate",
      dataIndex: "attendance_rate",
      key: "attendance_rate",
      render: (rate) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 90 ? "success" : rate >= 70 ? "normal" : "exception"}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* Hero Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />

        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
          <ClockCircleOutlined />
        </div>

        <div className="relative z-10 px-6 py-7 sm:px-8">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              <CalendarOutlined />
              HR Analytics
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Attendance <span className="text-orange-400">Report</span>
              </h1>
              <p className="text-white/60 text-sm">Staff attendance summaries and patterns</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="h-11! rounded-xl! border-stone-200! px-5! font-medium! text-stone-700! hover:border-orange-300! hover:text-orange-600!"
              >
                Export CSV
              </Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => fetchAttendanceReport(1)}
                loading={loading}
                className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20!"
              >
                Generate Report
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <Statistic
                    title={<span className="text-white/50 text-xs font-medium">Total Days</span>}
                    value={summary.total_days || 0}
                    valueStyle={{ color: "#D97706", fontSize: 18, fontWeight: 700 }}
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
                    <CalendarOutlined className="text-orange-400 text-base" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <Statistic
                    title={<span className="text-white/50 text-xs font-medium">Total Present</span>}
                    value={summary.total_present || 0}
                    valueStyle={{ color: "#EA580C", fontSize: 18, fontWeight: 700 }}
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
                    <CheckCircleOutlined className="text-green-400 text-base" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <Statistic
                    title={<span className="text-white/50 text-xs font-medium">Total Late</span>}
                    value={summary.total_late || 0}
                    valueStyle={{ color: "#D97706", fontSize: 18, fontWeight: 700 }}
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
                    <ClockCircleOutlined className="text-amber-400 text-base" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <Statistic
                    title={<span className="text-white/50 text-xs font-medium">Attendance Rate</span>}
                    value={summary.attendance_rate || 0}
                    suffix="%"
                    valueStyle={{
                      color: (summary.attendance_rate || 0) >= 90 ? "#EA580C" : "#ff4d4f",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
                    <UserOutlined className="text-orange-400 text-base" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <CalendarOutlined />
          </div>
          <h3 className="text-base font-bold text-stone-900">Filters</h3>
        </div>
        <Space wrap align="center">
          <span className="text-sm font-semibold text-stone-700">Date Range:</span>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="YYYY-MM-DD"
            allowClear={false}
            className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
          />
          <span className="text-sm font-semibold text-stone-700 ml-2">Staff:</span>
          <Select
            style={{ width: 200 }}
            placeholder="All Staff"
            allowClear
            value={selectedStaff}
            onChange={setSelectedStaff}
            className="h-11! rounded-xl!"
            popupClassName="rounded-xl!"
          >
            {Array.isArray(staffList) && staffList.map((staff) => (
              <Select.Option key={staff.id} value={staff.id}>
                {staff.firstname} {staff.lastname}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </div>

      {/* Staff Summary */}
      {summary && summary.staff_summary && summary.staff_summary.length > 0 && (
        <div className="mb-6 rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <CheckCircleOutlined />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Staff Attendance Summary</h3>
                <p className="text-xs text-stone-500">{summary.staff_summary.length} staff total</p>
              </div>
            </div>
            <Tag className="rounded-full border-none bg-linear-to-br from-[#EA580C] to-amber px-3 py-1 text-sm font-semibold text-white">
              {summary.staff_summary.length} staff
            </Tag>
          </div>
          <div className="p-4">
            <Table
              columns={staffSummaryColumns}
              dataSource={summary.staff_summary}
              rowKey="staff_id"
              loading={loading}
              pagination={clientPagination({ label: "staff" })}
              scroll={{ x: true }}
            />
          </div>
        </div>
      )}

      {/* Detailed Attendance Records */}
      <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <FileTextOutlined />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Attendance Details</h3>
              <p className="text-xs text-stone-500">{pagination.total} total records</p>
            </div>
          </div>
          <Tag className="rounded-full border-none bg-linear-to-br from-[#EA580C] to-amber px-3 py-1 text-sm font-semibold text-white">
            {pagination.total} records
          </Tag>
        </div>
        <div className="p-4">
          <Table
            columns={columns}
            dataSource={attendanceData}
            rowKey="id"
            loading={loading}
            pagination={serverPagination(pagination, { label: "records" })}
            onChange={handleTableChange}
            scroll={{ x: true }}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;