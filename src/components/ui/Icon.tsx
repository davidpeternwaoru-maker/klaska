import type { CSSProperties } from "react";

// Stroke-only line icons, 1.6px, currentColor, 20×20 viewBox.
// Ported from the Klaska prototype so the visual language is identical.
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 9.2 10 3.5l7 5.7V16a1 1 0 0 1-1 1h-3.5v-4.6h-5V17H4a1 1 0 0 1-1-1z" />,
  attendance: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 7.5h14M6.5 3v3M13.5 3v3" />
      <path d="M7 12.2l1.6 1.6 3.6-3.6" />
    </>
  ),
  fees: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="2" />
      <circle cx="10" cy="10" r="2.2" />
      <path d="M5.5 10h.01M14.5 10h.01" />
    </>
  ),
  reports: (
    <>
      <rect x="4" y="2.5" width="12" height="15" rx="2" />
      <path d="M7 6h6M7 9h6M7 12h4" />
    </>
  ),
  finance: <path d="M3 16V8m4 8V5m4 11V10m4 6V3" />,
  students: (
    <>
      <circle cx="7" cy="7.5" r="2.6" />
      <path d="M3 16c.6-2.4 2.3-3.7 4-3.7s3.4 1.3 4 3.7" />
      <circle cx="13.5" cy="6" r="2" />
      <path d="M12 12.5c.3-.2.9-.4 1.5-.4 1.4 0 2.7 1 3.2 3" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </>
  ),
  bell: (
    <>
      <path d="M4.5 14.5h11l-1.3-1.6V9.2c0-2.4-1.9-4.4-4.2-4.4S5.8 6.8 5.8 9.2v3.7L4.5 14.5z" />
      <path d="M8.4 16.6c.3.8 1 1.3 1.6 1.3s1.3-.5 1.6-1.3" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5" />
      <path d="M17 17l-4.3-4.3" />
    </>
  ),
  plus: <path d="M10 4v12M4 10h12" />,
  minus: <path d="M4 10h12" />,
  check: <path d="M4 10.4l3.6 3.6L16 5" />,
  chevD: <path d="M5 7l5 5 5-5" />,
  arrowR: <path d="M4 10h12M11 5l5 5-5 5" />,
  arrowU: <path d="M10 16V4M5 9l5-5 5 5" />,
  arrowD: <path d="M10 4v12M5 11l5 5 5-5" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="2.5" y="5" width="15" height="11" rx="2" />
      <path d="M14 10.5h2.5" />
      <path d="M2.5 8h13" />
    </>
  ),
  sparkle: (
    <>
      <path d="M10 3v4M10 13v4M3 10h4M13 10h4" />
      <path d="M5.5 5.5l1.5 1.5M13 13l1.5 1.5M5.5 14.5L7 13M13 7l1.5-1.5" />
    </>
  ),
  trend: (
    <>
      <path d="M3 14l4-4 3 3 5-6" />
      <path d="M11 7h4v4" />
    </>
  ),
  badge: (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M7 11.5L6 17l4-2 4 2-1-5.5" />
    </>
  ),
  ai: (
    <>
      <path d="M10 2.5l1.7 3.9 3.9 1.6-3.9 1.6L10 13.5 8.3 9.6 4.4 8l3.9-1.6z" />
      <path d="M15.5 13l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" />
    </>
  ),
  shield: (
    <>
      <path d="M10 2.8l5.5 2v4.2c0 3.3-2.3 6-5.5 7.2-3.2-1.2-5.5-3.9-5.5-7.2V4.8z" />
      <path d="M7.6 10l1.6 1.6 3.2-3.4" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="7.5" cy="6" rx="4.5" ry="2.2" />
      <path d="M3 6v4c0 1.2 2 2.2 4.5 2.2S12 11.2 12 10V6" />
      <ellipse cx="13" cy="13" rx="4" ry="2" />
      <path d="M9 13v2c0 1.1 1.8 2 4 2s4-.9 4-2v-2" />
    </>
  ),
  arrowUp: <path d="M10 16V4M5 9l5-5 5 5" />,
  target: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="3.2" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v14l1.5-1.2L8 17l1.5-1.2L11 17l1.5-1.2L14 17l1-1V3l-1 1-1.5-1L11 4 9.5 3 8 4 6.5 3z" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </>
  ),
  cloud: <path d="M6 15h8a3 3 0 0 0 .4-6 4.5 4.5 0 0 0-8.7-1.2A3.4 3.4 0 0 0 6 15z" />,
  cloudOff: (
    <>
      <path d="M6 15h8a3 3 0 0 0 1.8-5.4M5.5 7.8A3.4 3.4 0 0 0 6 15" />
      <path d="M3 3l14 14" />
    </>
  ),
  refresh: (
    <>
      <path d="M16 6a6 6 0 1 0 1.4 4" />
      <path d="M16.5 3v3.2H13.3" />
    </>
  ),
  logout: (
    <>
      <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <path d="M11 7l3 3-3 3M14 10H7" />
    </>
  ),
  phone: <path d="M5.5 3.5h3l1 3-1.5 1.5a8 8 0 0 0 4 4l1.5-1.5 3 1v3a1 1 0 0 1-1 1A11 11 0 0 1 4.5 4.5a1 1 0 0 1 1-1z" />,
  nfc: (
    <>
      <path d="M4.5 4.5C7.5 6 9 8 9 10s-1.5 4-4.5 5.5" />
      <path d="M8.5 4.5C11.5 6 13 8 13 10s-1.5 4-4.5 5.5" />
      <path d="M12.5 4.5c3 1.5 4.5 3.5 4.5 5.5s-1.5 4-4.5 5.5" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="2" />
      <path d="M2.5 8.5h15" />
      <path d="M5.5 12h3" />
    </>
  ),
  alert: (
    <>
      <path d="M10 4l7 12H3z" />
      <path d="M10 9v3.5M10 14.5h.01" />
    </>
  ),
  percent: (
    <>
      <path d="M5 15L15 5" />
      <circle cx="6.5" cy="6.5" r="1.8" />
      <circle cx="13.5" cy="13.5" r="1.8" />
    </>
  ),
  download: <path d="M10 3v10M5 8.5l5 5 5-5M3.5 17h13" />,
  edit: <path d="M13 3.5l3.5 3.5L8 15.5 4 16.5l1-4z" />,
  trash: <path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 7.5h14M6.5 3v3M13.5 3v3" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5C4 3.7 4.7 3 5.5 3H16v12H5.5C4.7 15 4 15.7 4 16.5z" />
      <path d="M4 16.5C4 15.7 4.7 15 5.5 15H16v2H5.5C4.7 17 4 16.3 4 16.5z" />
    </>
  ),
  layers: (
    <>
      <path d="M10 3l7 3.5-7 3.5-7-3.5z" />
      <path d="M3 10.5l7 3.5 7-3.5M3 14l7 3.5 7-3.5" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="10" r="1" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="15" cy="10" r="1" />
    </>
  ),
  filter: <path d="M3 5h14M5.5 10h9M8.5 15h3" />,
  chevR: <path d="M7 5l5 5-5 5" />,
  x: <path d="M5 5l10 10M15 5L5 15" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  style,
  className,
}: {
  name: IconName | string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden
    >
      {PATHS[name] ?? <circle cx="10" cy="10" r="6" />}
    </svg>
  );
}

// Klaska logomark — vector, no asset dependency.
export function KLogo({ size = 26, white = false }: { size?: number; white?: boolean }) {
  const fill = white ? "#fff" : "#1B5E20";
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" style={{ display: "block", flex: "0 0 auto" }}>
      <rect x="221" y="166" width="180" height="692" rx="6" fill={fill} />
      <rect x="200" y="380" width="640" height="180" rx="6" fill={fill} transform="rotate(-32 520 470)" />
      <rect x="200" y="464" width="640" height="180" rx="6" fill={fill} transform="rotate(32 520 554)" />
      <circle cx="345" cy="512" r="118" fill="#F57F17" />
    </svg>
  );
}
