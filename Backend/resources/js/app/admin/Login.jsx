import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert, Typography } from "antd";
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { api } from "@/config/api";
import { seedAuthenticatedHistory } from "@/ProtectedRoute";
import logo from "@/assets/logooos.jpg";

const { Title, Text } = Typography;

function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/admin/login", {
        username: values.username,
        password: values.password,
      });

      const { token, user, role } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", role || user?.role || "");
      localStorage.setItem("isLoggedIn", "true");

      const redirectTo =
        (role || user?.role) === "admin" ? "/dashboard" : "/staff-dashboard";

      navigate(redirectTo, { replace: true });
      seedAuthenticatedHistory(redirectTo);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to connect to backend. Check API URL and server.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="nm-dark"
      style={{
        minHeight: "100vh",
        background: "#FFF7ED",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(234, 88, 12, 0.07)",
          top: -180,
          right: -150,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(217, 119, 6, 0.06)",
          bottom: -140,
          left: -120,
        }}
      />

      {/* Main Login Container */}
      <div
        style={{
          width: "100%",
          maxWidth: 1050,
          minHeight: 620,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "#FFFFFF",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 25px 70px rgba(67, 20, 7, 0.18)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* =========================================
                  LEFT BRAND PANEL
       ========================================= */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 100%)",
            minHeight: 620,
          }}
        >
          {/* Full Logo Image */}
          <img
            src={logo}
            alt="New Moon Lechon Manok & Liempo House"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </div>

        {/* =========================================
            RIGHT LOGIN PANEL
        ========================================= */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "65px 65px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Login Heading */}
          <div style={{ marginBottom: 35 }}>
            <Text
              style={{
                color: "#EA580C",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              ADMIN PORTAL
            </Text>

            <Title
              style={{
                margin: "10px 0 7px",
                color: "#292524",
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              Welcome back 👋
            </Title>

            <Text
              style={{
                color: "#78716C",
                fontSize: 15,
              }}
            >
              Sign in to continue to your NewMoon account.
            </Text>

            {/* Accent */}
            <div
              style={{
                width: 50,
                height: 4,
                borderRadius: 10,
                background: "linear-gradient(90deg, #EA580C, #F97316)",
                marginTop: 18,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError("")}
              style={{
                marginBottom: 24,
                borderRadius: 12,
              }}
            />
          )}

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            requiredMark={false}
            size="large"
          >
            {/* Username */}
            <Form.Item
              name="username"
              label={
                <span
                  style={{
                    color: "#292524",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Username
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please enter your username",
                },
              ]}
              style={{ marginBottom: 22 }}
            >
              <Input
                prefix={
                  <UserOutlined
                    style={{
                      color: "#A8A29E",
                      fontSize: 18,
                    }}
                  />
                }
                placeholder="Enter your username"
                autoFocus
                style={{
                  height: 54,
                  borderRadius: 14,
                  background: "#FFF7ED",
                  border: "1px solid rgba(234,88,12,0.10)",
                  fontSize: 15,
                  color: "#292524",
                }}
              />
            </Form.Item>

            {/* Password */}
            <Form.Item
              name="password"
              label={
                <span
                  style={{
                    color: "#292524",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Password
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please enter your password",
                },
              ]}
              style={{ marginBottom: 10 }}
            >
              <Input.Password
                prefix={
                  <LockOutlined
                    style={{
                      color: "#A8A29E",
                      fontSize: 18,
                    }}
                  />
                }
                placeholder="Enter your password"
                iconRender={(visible) =>
                  visible ? (
                    <EyeTwoTone />
                  ) : (
                    <EyeInvisibleOutlined
                      style={{ color: "#A8A29E" }}
                    />
                  )
                }
                style={{
                  height: 54,
                  borderRadius: 14,
                  background: "#FFF7ED",
                  border: "1px solid rgba(234,88,12,0.10)",
                  fontSize: 15,
                  color: "#292524",
                }}
              />
            </Form.Item>

            {/* Sign In */}
            <Form.Item style={{ marginBottom: 0, marginTop: 25 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={!loading ? <ArrowRightOutlined /> : null}
                iconPlacement="end"
                style={{
                  height: 56,
                  borderRadius: 15,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #EA580C 0%, #F97316 100%)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: 0.4,
                  boxShadow:
                    "0 10px 30px rgba(234, 88, 12, 0.25)",
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          {/* Footer */}
          <div
            style={{
              marginTop: 35,
              paddingTop: 22,
              borderTop: "1px solid rgba(234,88,12,0.10)",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                color: "#A8A29E",
                fontSize: 11,
                letterSpacing: 1.5,
              }}
            >
              NEWMOON • LECHON MANOK & LIEMPO
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;