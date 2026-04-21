import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  blue: "#2563eb",
  blueLight: "#3b82f6",
  blueMuted: "rgba(37,99,235,0.12)",
  green: "#10b981",
  greenMuted: "rgba(16,185,129,0.12)",
  amber: "#f59e0b",
  amberMuted: "rgba(245,158,11,0.12)",
  red: "#ef4444",
  redMuted: "rgba(239,68,68,0.12)",
  purple: "#8b5cf6",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  bg: "#0d1117",
  surface: "#131b26",
  surfaceAlt: "#0f1924",
  border: "rgba(255,255,255,0.07)",
};

// ── Static data ───────────────────────────────────────────────────────────────

const volumeData = [
  { month: "Jan", contracts: 4 },
  { month: "Feb", contracts: 6 },
  { month: "Mar", contracts: 8 },
  { month: "Apr", contracts: 5 },
  { month: "May", contracts: 9 },
  { month: "Jun", contracts: 12 },
];

const valueData = [
  { month: "Jan", value: 2.8 },
  { month: "Feb", value: 3.1 },
  { month: "Mar", value: 3.4 },
  { month: "Apr", value: 3.2 },
  { month: "May", value: 3.8 },
  { month: "Jun", value: 4.2 },
];

const statusData = [
  { name: "Active", value: 47, color: C.blue },
  { name: "Negotiation", value: 19, color: C.purple },
  { name: "Expiring", value: 13, color: C.amber },
  { name: "Draft", value: 11, color: C.slate600 },
  { name: "Expired", value: 10, color: C.red },
];

const riskData = [
  { category: "Compliance", score: 72, color: C.red },
  { category: "Payment", score: 55, color: C.amber },
  { category: "Delivery", score: 38, color: C.amber },
  { category: "IP / Data", score: 20, color: C.blue },
  { category: "Force Maj.", score: 9, color: C.green },
];

const vendors = [
  {
    name: "Apex Corp",
    value: "$480K",
    health: 94,
    expires: "Oct 2026",
    warn: false,
  },
  {
    name: "Meridian Group",
    value: "$240K",
    health: 88,
    expires: "May 2025",
    warn: false,
  },
  {
    name: "NovaTech",
    value: "$195K",
    health: 62,
    expires: "Jun 2025",
    warn: true,
  },
  {
    name: "CloudBase",
    value: "$95K",
    health: 57,
    expires: "Jul 2025",
    warn: true,
  },
  {
    name: "DataSync",
    value: "$78K",
    health: 31,
    expires: "Aug 2025",
    warn: true,
  },
  {
    name: "Relo Partners",
    value: "$62K",
    health: 44,
    expires: "Aug 2025",
    warn: true,
  },
];

const alerts = [
  {
    level: "critical" as const,
    title: "Apex Corp SLA breach risk",
    desc: "Penalty clause triggers in 8 days · $120K exposure",
  },
  {
    level: "warning" as const,
    title: "3 contracts expiring without renewal",
    desc: "CloudBase, DataSync, Relo Partners · Jul–Aug window",
  },
  {
    level: "warning" as const,
    title: "Missing signature — NovaTech MSA",
    desc: "Countersignature overdue by 14 days",
  },
  {
    level: "info" as const,
    title: "Auto-renewal window opens in 30d",
    desc: "Meridian Group · $240K annual · review recommended",
  },
];

const timeline = [
  {
    status: "done",
    label: "Apex Corp — contract signed",
    meta: "Apr 03 · $480K · 18-month term",
  },
  {
    status: "done",
    label: "NovaTech MSA — review complete",
    meta: "Apr 18 · Pending countersignature",
  },
  {
    status: "active",
    label: "CloudBase renewal — in negotiation",
    meta: "Now · $95K/yr · pricing dispute on Tier 2",
  },
  {
    status: "warn",
    label: "Apex SLA review deadline",
    meta: "Apr 29 · 8 days away · action required",
  },
  {
    status: "future",
    label: "Meridian Group auto-renewal window",
    meta: "May 21 · $240K · review before opt-out",
  },
  {
    status: "future",
    label: "Q3 contract audit",
    meta: "Jul 01 · 8 contracts in scope",
  },
];

const recommendations = [
  {
    n: "01",
    title: "Renegotiate CloudBase Tier 2 pricing before renewal",
    sub: "Market benchmarks suggest 15–22% savings are achievable. Current pricing is 18% above median for comparable SaaS agreements.",
  },
  {
    n: "02",
    title: "Resolve NovaTech countersignature within 3 business days",
    sub: "Unsigned MSA creates liability gap. Clause 9.2 voids dispute resolution protections until fully executed.",
  },
  {
    n: "03",
    title: "Evaluate DataSync vendor health — consider backup supplier",
    sub: "Health score 31 (down from 68 in Q1). Late deliverables on 3 of 4 milestones this quarter. Dependency risk is high.",
  },
  {
    n: "04",
    title: "Add GDPR Art. 28 DPA addendum to 4 flagged contracts",
    sub: "Compliance team should prioritize before Q3 audit. Apex, Meridian, NovaTech, and Relo Partners are all missing current DPAs.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthColor(score: number) {
  if (score >= 75) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

function healthBg(score: number) {
  if (score >= 75) return C.greenMuted;
  if (score >= 50) return C.amberMuted;
  return C.redMuted;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const monoStyle = {
  fontFamily: "'IBM Plex Mono', 'Fira Mono', monospace",
  fontSize: 11,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        ...monoStyle,
        color: C.slate400,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 600,
        mb: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaDir,
  accentColor,
}: {
  label: string;
  value: string;
  delta: string;
  deltaDir: "up" | "down" | "warn";
  accentColor: string;
}) {
  const deltaColor =
    deltaDir === "up" ? C.green : deltaDir === "down" ? C.red : C.amber;
  const DeltaIcon =
    deltaDir === "up"
      ? TrendingUpIcon
      : deltaDir === "down"
        ? TrendingDownIcon
        : WarningAmberIcon;

  return (
    <Paper
      sx={{
        bgcolor: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${accentColor}`,
        borderRadius: 2,
        p: 2,
        flex: 1,
        minWidth: 0,
      }}
      elevation={0}
    >
      <Typography
        sx={{
          ...monoStyle,
          color: C.slate400,
          mb: 0.75,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}
      >
        {value}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ mt: 0.75 }}
      >
        <DeltaIcon sx={{ fontSize: 13, color: deltaColor }} />
        <Typography sx={{ ...monoStyle, color: deltaColor }}>
          {delta}
        </Typography>
      </Stack>
    </Paper>
  );
}

function ExpandCard({
  title,
  dotColor,
  children,
  expandHeight = 400,
}: {
  title: string;
  dotColor: string;
  children: React.ReactNode;
  expandHeight?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Paper
        sx={{
          bgcolor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          p: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        elevation={0}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <SectionLabel>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: dotColor,
                flexShrink: 0,
              }}
            />
            {title}
          </SectionLabel>
          <Tooltip title="Expand">
            <IconButton
              size="small"
              onClick={() => setOpen(true)}
              sx={{ color: C.slate600 }}
            >
              <OpenInFullIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ flex: 1 }}>{children}</Box>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <SectionLabel>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: dotColor,
                flexShrink: 0,
              }}
            />
            {title}
          </SectionLabel>
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{ color: C.slate400 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: expandHeight }}>{children}</Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AlertItem({ level, title, desc }: (typeof alerts)[0]) {
  const cfg = {
    critical: {
      bg: "rgba(127,29,29,0.18)",
      border: "rgba(127,29,29,0.4)",
      icon: (
        <ErrorOutlineIcon
          sx={{ fontSize: 16, color: C.red, flexShrink: 0, mt: "2px" }}
        />
      ),
    },
    warning: {
      bg: "rgba(120,53,15,0.18)",
      border: "rgba(120,53,15,0.4)",
      icon: (
        <WarningAmberIcon
          sx={{ fontSize: 16, color: C.amber, flexShrink: 0, mt: "2px" }}
        />
      ),
    },
    info: {
      bg: "rgba(30,58,95,0.3)",
      border: "rgba(30,58,95,0.5)",
      icon: (
        <InfoOutlinedIcon
          sx={{ fontSize: 16, color: C.blueLight, flexShrink: 0, mt: "2px" }}
        />
      ),
    },
  }[level];

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        bgcolor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 1.5,
        p: 1.25,
      }}
    >
      {cfg.icon}
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0" }}>
          {title}
        </Typography>
        <Typography sx={{ ...monoStyle, color: C.slate600, mt: 0.25 }}>
          {desc}
        </Typography>
      </Box>
    </Stack>
  );
}

function TimelineDot({ status }: { status: string }) {
  const cfg: Record<
    string,
    { bg: string; border: string; color: string; label: string }
  > = {
    done: { bg: "#064e3b", border: C.green, color: "#4ade80", label: "✓" },
    active: { bg: "#1e3a5f", border: C.blue, color: "#60a5fa", label: "●" },
    warn: { bg: "#451a03", border: C.amber, color: "#fbbf24", label: "!" },
    future: {
      bg: C.slate800,
      border: C.slate700,
      color: C.slate400,
      label: "○",
    },
  };
  const c = cfg[status] ?? cfg.future;
  return (
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        bgcolor: c.bg,
        border: `2px solid ${c.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        mt: "3px",
        fontSize: 8,
        color: c.color,
        fontWeight: 700,
      }}
    >
      {c.label}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics({
  projectId,
}: {
  projectId: string | undefined;
}) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { sm: "100%", md: "1700px" },
        bgcolor: C.bg,
        borderRadius: 3,
        p: 3,
        fontFamily: "'Syne', 'Inter', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 3, pb: 2, borderBottom: `1px solid ${C.border}` }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
              color: "#f1f5f9",
              letterSpacing: "0.02em",
            }}
          >
            Contract Intelligence
          </Typography>
          <Typography sx={{ ...monoStyle, color: C.slate600, mt: 0.5 }}>
            LUCERNA · FY2025 · 47 active contracts · last sync 4 min ago
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          <Chip
            label="LIVE"
            size="small"
            sx={{
              bgcolor: "rgba(10,31,13,0.9)",
              color: "#4ade80",
              border: "1px solid rgba(22,163,74,0.3)",
              ...monoStyle,
              height: 22,
            }}
          />
          <Chip
            label="3 ALERTS"
            size="small"
            sx={{
              bgcolor: "rgba(45,31,10,0.9)",
              color: "#fbbf24",
              border: "1px solid rgba(217,119,6,0.3)",
              ...monoStyle,
              height: 22,
            }}
          />
          <Chip
            label="Q2 2025"
            size="small"
            sx={{
              bgcolor: "rgba(30,58,95,0.4)",
              color: "#60a5fa",
              border: "1px solid rgba(37,99,235,0.3)",
              ...monoStyle,
              height: 22,
            }}
          />
        </Stack>
      </Stack>

      {/* ── KPIs ── */}
      <Stack direction="row" spacing={1.25} sx={{ mb: 2 }}>
        <KpiCard
          label="Total Value"
          value="$4.2M"
          delta="12% vs last quarter"
          deltaDir="up"
          accentColor={C.blue}
        />
        <KpiCard
          label="Expiring 90d"
          value="11"
          delta="3 need action"
          deltaDir="warn"
          accentColor={C.amber}
        />
        <KpiCard
          label="Compliance Rate"
          value="94%"
          delta="2pp this month"
          deltaDir="up"
          accentColor={C.green}
        />
        <KpiCard
          label="At-Risk Value"
          value="$380K"
          delta="flagged by AI"
          deltaDir="down"
          accentColor={C.red}
        />
      </Stack>

      {/* ── Row 1: Volume + Value trend ── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        sx={{ mb: 1.25 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExpandCard title="Contract volume by month" dotColor={C.blue}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={volumeData}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="month"
                  tick={{
                    fill: C.slate600,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                />
                <YAxis
                  tick={{
                    fill: C.slate600,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: C.slate300 }}
                  itemStyle={{ color: C.blueLight }}
                />
                <Bar
                  dataKey="contracts"
                  fill={C.blue}
                  radius={[3, 3, 0, 0]}
                  opacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          </ExpandCard>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExpandCard title="Contract value trend" dotColor={C.green}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart
                data={valueData}
                margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="month"
                  tick={{
                    fill: C.slate600,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                />
                <YAxis
                  tick={{
                    fill: C.slate600,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                  tickFormatter={(v) => `$${v}M`}
                  domain={[2, 5]}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: C.slate300 }}
                  formatter={(v: number) => [`$${v}M`, "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={C.green}
                  strokeWidth={2}
                  fill="url(#greenGrad)"
                  dot={{ r: 3, fill: C.green }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ExpandCard>
        </Box>
      </Stack>

      {/* ── Row 2: Alerts | Risk | Donut ── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        sx={{ mb: 1.25 }}
      >
        {/* Alerts */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <ExpandCard
            title="Alerts & risk flags"
            dotColor={C.amber}
            expandHeight={360}
          >
            <Stack spacing={0.875}>
              {alerts.map((a, i) => (
                <AlertItem key={i} {...a} />
              ))}
            </Stack>
          </ExpandCard>
        </Box>

        {/* Risk bars */}
        <Box sx={{ flex: 1.5, minWidth: 0 }}>
          <ExpandCard title="Risk by category" dotColor={C.red}>
            <Stack spacing={1}>
              {riskData.map((r) => (
                <Stack
                  key={r.category}
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                >
                  <Typography
                    sx={{
                      ...monoStyle,
                      color: C.slate400,
                      width: 80,
                      flexShrink: 0,
                    }}
                  >
                    {r.category}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      bgcolor: C.slate800,
                      borderRadius: 1,
                      height: 6,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${r.score}%`,
                        height: "100%",
                        bgcolor: r.color,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      ...monoStyle,
                      color: C.slate600,
                      width: 28,
                      textAlign: "right",
                    }}
                  >
                    {r.score}%
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Box
              sx={{
                mt: 1.5,
                bgcolor: "rgba(13,24,38,0.8)",
                border: `1px solid rgba(30,58,95,0.35)`,
                borderLeft: `3px solid ${C.blue}`,
                borderRadius: 1.5,
                p: 1.25,
              }}
            >
              <Typography
                sx={{ ...monoStyle, color: C.slate400, lineHeight: 1.7 }}
              >
                <Box
                  component="span"
                  sx={{ color: C.blueLight, fontWeight: 500 }}
                >
                  AI:{" "}
                </Box>
                Compliance risk elevated. 4 contracts reference GDPR Art. 28
                without a current DPA. Recommend audit before Q3.
              </Typography>
            </Box>
          </ExpandCard>
        </Box>

        {/* Donut */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExpandCard title="Status mix" dotColor={C.blue}>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={54}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((s, i) => (
                    <Cell key={i} fill={s.color} opacity={0.9} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 10px",
                mt: 0.5,
              }}
            >
              {statusData.map((s) => (
                <Stack
                  key={s.name}
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "2px",
                      bgcolor: s.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ ...monoStyle, color: C.slate600 }}>
                    {s.name} {s.value}%
                  </Typography>
                </Stack>
              ))}
            </Box>
          </ExpandCard>
        </Box>
      </Stack>

      {/* ── Row 3: Timeline | Vendor table ── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        sx={{ mb: 1.25 }}
      >
        {/* Timeline */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExpandCard
            title="Milestone timeline — Q2/Q3"
            dotColor={C.green}
            expandHeight={400}
          >
            <Stack spacing={0}>
              {timeline.map((t, i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    position: "relative",
                    pb: i < timeline.length - 1 ? 1.75 : 0,
                  }}
                >
                  {i < timeline.length - 1 && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 7,
                        top: 20,
                        bottom: 0,
                        width: 1,
                        bgcolor: C.slate800,
                      }}
                    />
                  )}
                  <TimelineDot status={t.status} />
                  <Box>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0" }}
                    >
                      {t.label}
                    </Typography>
                    <Typography
                      sx={{ ...monoStyle, color: C.slate600, mt: 0.25 }}
                    >
                      {t.meta}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </ExpandCard>
        </Box>

        {/* Vendor table */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExpandCard
            title="Top vendors by contract value"
            dotColor={C.blue}
            expandHeight={350}
          >
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "collapse" }}
            >
              <Box component="thead">
                <Box component="tr">
                  {["Vendor", "Value", "Health", "Expires"].map((h) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{
                        ...monoStyle,
                        color: C.slate600,
                        textAlign: "left",
                        pb: 1,
                        pr: 1.5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {vendors.map((v) => (
                  <Box component="tr" key={v.name}>
                    <Box
                      component="td"
                      sx={{
                        py: 0.875,
                        pr: 1.5,
                        fontSize: 12,
                        color: C.slate300,
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      {v.name}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        py: 0.875,
                        pr: 1.5,
                        ...monoStyle,
                        color: C.slate300,
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      {v.value}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        py: 0.875,
                        pr: 1.5,
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 0.875,
                          py: 0.25,
                          borderRadius: "3px",
                          bgcolor: healthBg(v.health),
                          color: healthColor(v.health),
                          ...monoStyle,
                          fontWeight: 600,
                        }}
                      >
                        {v.health}
                      </Box>
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        py: 0.875,
                        ...monoStyle,
                        color: v.warn ? C.amber : C.slate600,
                        borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      }}
                    >
                      {v.expires}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </ExpandCard>
        </Box>
      </Stack>

      {/* ── AI Recommendations ── */}
      <Paper
        sx={{
          bgcolor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          p: 2,
        }}
        elevation={0}
      >
        <SectionLabel>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: C.blue,
              flexShrink: 0,
            }}
          />
          AI analysis &amp; recommendations
        </SectionLabel>

        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {recommendations.map((r) => (
            <Stack key={r.n} direction="row" spacing={1.25}>
              <Typography
                sx={{
                  ...monoStyle,
                  color: C.blue,
                  fontWeight: 600,
                  flexShrink: 0,
                  mt: "2px",
                  width: 20,
                }}
              >
                {r.n}
              </Typography>
              <Box>
                <Typography
                  sx={{ fontSize: 12, fontWeight: 500, color: C.slate300 }}
                >
                  {r.title}
                </Typography>
                <Typography sx={{ ...monoStyle, color: C.slate600, mt: 0.375 }}>
                  {r.sub}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ borderColor: C.border, mb: 2 }} />

        <Box
          sx={{
            bgcolor: "rgba(13,24,38,0.8)",
            border: `1px solid rgba(30,58,95,0.35)`,
            borderLeft: `3px solid ${C.blue}`,
            borderRadius: 1.5,
            p: 1.5,
          }}
        >
          <Typography sx={{ ...monoStyle, color: C.slate400, lineHeight: 1.7 }}>
            <Box component="span" sx={{ color: C.blueLight, fontWeight: 600 }}>
              AI summary:{" "}
            </Box>
            Portfolio health is improving (+12% value, +2pp compliance) but
            near-term risk is concentrated. 3 vendors account for 89% of flagged
            exposure. Prioritizing the Apex SLA review and CloudBase renewal
            negotiation this week would reduce at-risk value by ~$200K. Q3 looks
            manageable if actions above are completed before June 30.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
