export const tokens = {
  color: {
    bgApp: "#ffffff",
    bgSurface: "#ffffff",
    textPrimary: "#111827",
    textSecondary: "#374151",
    textMuted: "#6b7280",
    borderSubtle: "#e5e7eb",
    borderStrong: "#d1d5db",
    accent: "#2563eb",
    accentMuted: "#eff6ff",
    accentText: "#1d4ed8",
    danger: "#dc2626",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    pill: "999px",
  },
  space: {
    xs: "6px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
  },
  fontSize: {
    sm: "12px",
    md: "14px",
    lg: "15px",
    xl: "24px",
  },
  shadow: {
    focus: "0 0 0 3px rgba(37, 99, 235, 0.18)",
    popup: "0 12px 24px rgba(15, 23, 42, 0.08)",
    action: "0 10px 18px rgba(37, 99, 235, 0.2)",
  },
} as const;

export const appTheme = {
  tokens,
};

export type AppTheme = typeof appTheme;
