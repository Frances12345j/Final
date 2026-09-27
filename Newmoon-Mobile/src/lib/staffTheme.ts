export const COLORS = {
  PRIMARY: '#EA580C',
  PRIMARY_BRIGHT: '#F97316',
  PRIMARY_DARK: '#C2410C',
  AMBER: '#F59E0B',
  AMBER_LIGHT: '#FDE68A',
  DEEP_BROWN: '#451A03',
  CHARCOAL: '#171717',
  CHARCOAL_LIGHT: '#292524',
  WARM_CREAM: '#FFF7ED',
  SOFT_WHITE: '#FFFBF5',
  WHITE: '#FFFFFF',
  ALERT_RED: '#DC2626',
  ALERT_RED_LIGHT: '#FEE2E2',
  GREEN: '#16A34A',
  GREEN_LIGHT: '#DCFCE7',
  PRIMARY_RED: '#EA580C',
  PRIMARY_NAVY: '#451A03',
  ACCENT_LIGHT: '#FFF7ED',
  ACCENT_WARM: '#FFF1E6',
  BG_PAGE: '#FFF7ED',
  CARD_BG: '#FFFFFF',
  CARD_BORDER: '#F5EDE0',
  TEXT_PRIMARY: '#1C1917',
  TEXT_SECONDARY: '#78716C',
  TEXT_MUTED: '#A8A29E',
  TEXT_WHITE: '#FFFFFF',
  INPUT_BG: '#FFFBF5',
  INPUT_BORDER: '#E7E5E4',
  DIVIDER: '#F5EDE0',
  STATUS_APPROVED_BG: '#DCFCE7',
  STATUS_APPROVED_TEXT: '#16A34A',
  STATUS_PENDING_BG: '#FEF3C7',
  STATUS_PENDING_TEXT: '#D97706',
  STATUS_REJECTED_BG: '#FEE2E2',
  STATUS_REJECTED_TEXT: '#DC2626',
  STATUS_INFO_BG: '#FFF7ED',
  STATUS_INFO_TEXT: '#EA580C',
  SHADOW: '#451A03',
};

export const GRADIENT = {
  PRIMARY: ['#EA580C', '#C2410C'] as const,
  HEADER: ['#171717', '#292524', '#451A03'] as const,
  ORANGE: ['#EA580C', '#F97316'] as const,
  AMBER: ['#F59E0B', '#F97316'] as const,
  SALES_HERO: ['#EA580C', '#C2410C', '#451A03'] as const,
};

export const CARD = {
  backgroundColor: COLORS.CARD_BG,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.CARD_BORDER,
  shadowColor: COLORS.SHADOW,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

export const CARD_COMPACT = {
  ...CARD,
  padding: 12,
} as const;

export function getStatusColors(status: string) {
  switch (status) {
    case 'pending':
      return { bg: COLORS.STATUS_PENDING_BG, text: COLORS.STATUS_PENDING_TEXT, label: 'Pending' };
    case 'approved':
      return { bg: COLORS.STATUS_APPROVED_BG, text: COLORS.STATUS_APPROVED_TEXT, label: 'Approved' };
    case 'rejected':
      return { bg: COLORS.STATUS_REJECTED_BG, text: COLORS.STATUS_REJECTED_TEXT, label: 'Rejected' };
    default:
      return { bg: COLORS.INPUT_BG, text: COLORS.TEXT_SECONDARY, label: status };
  }
}
