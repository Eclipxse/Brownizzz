"use client";

import {
  ArrowRight,
  AudioLines,
  Brain,
  ChevronRight,
  CirclePlay,
  Crown,
  Disc3,
  Gauge,
  Headphones,
  Loader2,
  LockKeyhole,
  LogOut,
  MessagesSquare,
  Music2,
  Radio,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Ticket,
  Wand2,
} from "lucide-react";
import gsap from "gsap";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Guild = {
  id: string;
  name: string;
  icon: string | null;
};

type MeResponse = {
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  guilds: Guild[];
};

type Channel = {
  id: string;
  name: string;
  type: number;
};

type Role = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

type AiPersona = "default" | "genz-girl" | "professional" | "sassy";

type GuildConfig = {
  guildId: string;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  logChannelId: string | null;
  ticketCategoryId: string | null;
  supportRoleId: string | null;
  verifiedRoleId: string | null;
  autoRoleId: string | null;
  tempVoiceJoinChannelId: string | null;
  tempVoiceCategoryId: string | null;
  birthdayChannelId: string | null;
  levelingEnabled: boolean;
  levelUpChannelId: string | null;
  aiResponderEnabled: boolean;
  aiResponderChannelId: string | null;
  aiResponderPrompt: string | null;
  aiResponderPersona: AiPersona;
  accentColor: number;
  updatedAt: string | null;
};

type GuildPayload = {
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
};

type TabKey = "overview" | "ai" | "welcome" | "support" | "levels" | "music";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Gauge }> = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "ai", label: "AI", icon: Brain },
  { key: "welcome", label: "Welcome", icon: Sparkles },
  { key: "support", label: "Support", icon: Ticket },
  { key: "levels", label: "Levels", icon: Crown },
  { key: "music", label: "Music", icon: Music2 }
];

const colorOptions = [
  { label: "Cyan", value: 0x38dff8 },
  { label: "Lime", value: 0xa7f950 },
  { label: "Coral", value: 0xff5d7d },
  { label: "Amber", value: 0xffbf47 },
  { label: "Violet", value: 0x8d7aff }
];

const personaOptions: Array<{ key: AiPersona; label: string }> = [
  { key: "genz-girl", label: "Gen Z" },
  { key: "sassy", label: "Sassy" },
  { key: "default", label: "Chill" },
  { key: "professional", label: "Clean" }
];

const loginModules: Array<{
  key: string;
  label: string;
  command: string;
  title: string;
  description: string;
  accent: string;
  icon: typeof Gauge;
  stats: Array<{ label: string; value: string }>;
  events: string[];
}> = [
  {
    key: "ai",
    label: "AI",
    command: "/ai setup",
    title: "Persona engine",
    description: "Channel-locked replies with a custom voice, fast Groq routing, and admin controls.",
    accent: "#38dff8",
    icon: Brain,
    stats: [
      { label: "Latency", value: "Fast" },
      { label: "Scope", value: "1 channel" },
      { label: "Mode", value: "Gen Z" }
    ],
    events: ["Synced AI channel", "Loaded persona prompt", "Ready for /ai ask"]
  },
  {
    key: "music",
    label: "Music",
    command: "/music play",
    title: "Music deck",
    description: "Lavalink playback, queue actions, loop modes, and clean controls for voice sessions.",
    accent: "#a7f950",
    icon: Disc3,
    stats: [
      { label: "Engine", value: "Lava" },
      { label: "Volume", value: "80%" },
      { label: "Queue", value: "Live" }
    ],
    events: ["Joined voice", "Resolved track", "Buttons armed"]
  },
  {
    key: "tickets",
    label: "Tickets",
    command: "/ticket-panel",
    title: "Support cockpit",
    description: "Private category routing, staff roles, claim flow, lock flow, and transcript actions.",
    accent: "#ffbf47",
    icon: Ticket,
    stats: [
      { label: "Panel", value: "Ready" },
      { label: "Staff", value: "Role" },
      { label: "Flow", value: "Modal" }
    ],
    events: ["Category mapped", "Support role checked", "Ticket panel ready"]
  },
  {
    key: "levels",
    label: "Levels",
    command: "/leveling enable",
    title: "XP systems",
    description: "Rank tracking, leaderboard storage, announcement channels, and growth signals.",
    accent: "#ff5d7d",
    icon: Crown,
    stats: [
      { label: "Storage", value: "SQL" },
      { label: "Cooldown", value: "60s" },
      { label: "Ranks", value: "Live" }
    ],
    events: ["XP table online", "Rank cards enabled", "Level channel synced"]
  }
];

function hexColor(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function channelPrefix(type: number) {
  if (type === 4) return "Category";
  if (type === 2) return "Voice";
  if (type === 13) return "Stage";
  if (type === 15) return "Forum";
  return "Text";
}

function displayChannel(channels: Channel[], channelId: string | null | undefined) {
  if (!channelId) return "Not set";
  const channel = channels.find((item) => item.id === channelId);
  return channel ? `#${channel.name}` : "Missing channel";
}

function displayRole(roles: Role[], roleId: string | null | undefined) {
  if (!roleId) return "Not set";
  const role = roles.find((item) => item.id === roleId);
  return role ? role.name : "Missing role";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function textChannels(channels: Channel[]) {
  return channels.filter((channel) => [0, 5, 15].includes(channel.type));
}

function categoryChannels(channels: Channel[]) {
  return channels.filter((channel) => channel.type === 4);
}

function voiceChannels(channels: Channel[]) {
  return channels.filter((channel) => [2, 13].includes(channel.type));
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange
}: {
  label: string;
  value: string | null | undefined;
  options: Array<{ id: string; name: string; type?: number }>;
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.type === undefined ? option.name : `${channelPrefix(option.type)} - ${option.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button className={`switch ${checked ? "on" : ""}`} type="button" aria-label={label} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function LoginScreen({ error }: { error: string | null }) {
  const authRootRef = useRef<HTMLElement | null>(null);
  const [activeKey, setActiveKey] = useState(loginModules[0].key);
  const active = loginModules.find((module) => module.key === activeKey) ?? loginModules[0];
  const ActiveIcon = active.icon;
  const previewLines =
    active.key === "music"
      ? ["Queued blue by yung kai", "Loop off, volume 80%, queue synced"]
      : active.key === "tickets"
        ? ["Ticket opened from modal", "Support role notified privately"]
        : active.key === "levels"
          ? ["Raven reached level 12", "Leaderboard updated in Supabase"]
          : ["Raven asked for setup help", "Browniezzz replied in Gen Z mode"];

  useEffect(() => {
    const root = authRootRef.current;
    if (!root) return;

    const hoverTargets: HTMLElement[] = [];
    const removeListeners: Array<() => void> = [];

    const ctx = gsap.context(() => {
      gsap.set(
        [
          ".auth-frame",
          ".auth-login-card > *",
          ".workbench-hero",
          ".module-switch",
          ".command-console",
          ".live-module-panel",
          ".auth-dock"
        ],
        { willChange: "transform, opacity" }
      );

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline
        .from(".auth-frame", { opacity: 0, y: 26, scale: 0.985, duration: 0.72 })
        .from(".auth-brand-mark", { opacity: 0, y: -10, rotate: -7, scale: 0.8, duration: 0.42 }, "-=0.36")
        .from(".auth-login-card > *", { opacity: 0, x: -22, stagger: 0.055, duration: 0.48 }, "-=0.26")
        .from(".workbench-hero", { opacity: 0, y: -18, rotate: -0.7, duration: 0.55 }, "-=0.38")
        .from(".module-switch", { opacity: 0, y: 18, stagger: 0.045, duration: 0.38 }, "-=0.22")
        .from([".command-console", ".live-module-panel", ".auth-dock"], { opacity: 0, y: 24, stagger: 0.075, duration: 0.52 }, "-=0.2");

      hoverTargets.push(
        ...gsap.utils.toArray<HTMLElement>(".auth-connect-button, .module-switch, .dock-control, .auth-proof-grid span")
      );

      gsap.to(".dock-meter span", {
        scaleY: 1.7,
        transformOrigin: "bottom",
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.08, from: "center" },
        ease: "sine.inOut"
      });
    }, root);

    hoverTargets.forEach((target) => {
      const onEnter = () => {
        gsap.to(target, { y: -4, x: -4, scale: 1.015, duration: 0.18, ease: "power2.out" });
      };
      const onLeave = () => {
        gsap.to(target, { y: 0, x: 0, scale: 1, duration: 0.42, ease: "elastic.out(1, 0.55)" });
      };

      target.addEventListener("mouseenter", onEnter);
      target.addEventListener("mouseleave", onLeave);

      removeListeners.push(() => {
        target.removeEventListener("mouseenter", onEnter);
        target.removeEventListener("mouseleave", onLeave);
      });
    });

    const onPointerMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      gsap.to(".workbench-hero", { x: x * 9, y: y * 5, rotate: x * 0.4, duration: 0.65, ease: "power3.out" });
      gsap.to(".auth-wide-banner", { x: x * -9, y: y * -4, rotate: x * -0.3, duration: 0.75, ease: "power3.out" });
      gsap.to(".preview-deck", { x: x * 7, y: y * 4, duration: 0.68, ease: "power3.out" });
      gsap.to(".auth-brand-mark", { x: x * 5, y: y * 4, rotate: x * 5, duration: 0.7, ease: "power3.out" });
    };

    root.addEventListener("pointermove", onPointerMove);

    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      removeListeners.forEach((remove) => remove());
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    const root = authRootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [".workbench-hero", ".command-console", ".live-module-panel"],
        { y: 12, rotate: -0.35, scale: 0.992 },
        { y: 0, rotate: 0, scale: 1, duration: 0.36, ease: "back.out(1.45)" }
      );

      gsap.fromTo(
        ".event-line",
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, stagger: 0.04, duration: 0.28, ease: "power2.out" }
      );

      gsap.fromTo(
        ".preview-chat-line",
        { opacity: 0, x: 14 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.3, ease: "power2.out" }
      );
    }, root);

    return () => ctx.revert();
  }, [activeKey]);

  return (
    <main
      className="auth-shell"
      ref={authRootRef}
      style={{ "--auth-accent": active.accent } as CSSProperties & Record<"--auth-accent", string>}
    >
      <section className="auth-frame">
        <header className="auth-topbar">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <img src="/brand/brownie-icon.png" alt="" />
            </span>
            <span>
              <strong>Browniezzz</strong>
              <small>Discord operations dashboard</small>
            </span>
          </div>

          <div className="auth-top-status">
            <span className="dot" />
            <span>OAuth ready</span>
          </div>
        </header>

        <div className="auth-grid">
          <aside className="auth-login-card">
            <span className="auth-eyebrow">Browniezzz OS</span>
            <h1>Browniezzz command center.</h1>
            <p>
              Discord login, server-level access, live bot config, premium controls, and settings saved directly to Supabase.
            </p>

            {error ? <div className="notice">{error}</div> : null}

            <a className="auth-connect-button" href="/api/auth/login">
              <LockKeyhole size={18} />
              Connect Discord
              <ArrowRight size={18} />
            </a>

            <div className="auth-proof-grid">
              <span>
                <Shield size={15} />
                Admin gated
              </span>
              <span>
                <Settings2 size={15} />
                Live config
              </span>
              <span>
                <Radio size={15} />
                Bot synced
              </span>
            </div>

            <img className="auth-wide-banner" src="/brand/brownie-welcome.png" alt="" />
          </aside>

          <section className="auth-workbench">
            <div className="workbench-hero">
              <div>
                <span className="auth-eyebrow">Live control preview</span>
                <h2>{active.title}</h2>
              </div>
              <span className="command-pill">
                <Terminal size={14} />
                {active.command}
              </span>
            </div>

            <div className="module-switcher">
              {loginModules.map((module) => {
                const ModuleIcon = module.icon;
                return (
                  <button
                    className={`module-switch ${module.key === active.key ? "active" : ""}`}
                    key={module.key}
                    type="button"
                    onClick={() => setActiveKey(module.key)}
                  >
                    <ModuleIcon size={17} />
                    {module.label}
                  </button>
                );
              })}
            </div>

            <div className="control-surface">
              <div className="command-console">
                <div className="console-topline">
                  <span className="window-dot cyan" />
                  <span className="window-dot amber" />
                  <span className="window-dot coral" />
                  <strong>server-session</strong>
                </div>

                <div className="console-command">
                  <span>raven@browniezzz</span>
                  <strong>{active.command}</strong>
                </div>

                <div className="event-timeline">
                  {active.events.map((event) => (
                    <div className="event-line" key={event}>
                      <span />
                      {event}
                    </div>
                  ))}
                </div>

                <div className="console-discord-card">
                  <div className="discord-user-dot">B</div>
                  <div>
                    <strong>Browniezzz</strong>
                    <p>{active.key === "music" ? "Now playing with queue buttons armed." : "Configuration saved and ready for this server."}</p>
                  </div>
                </div>
              </div>

              <div className="live-module-panel">
                <div className="module-panel-head">
                  <span className="live-module-icon">
                    {active.key === "ai" ? <img src="/brand/brownie-icon.png" alt="" /> : <ActiveIcon size={22} />}
                  </span>
                  <div>
                    <strong>{active.title}</strong>
                    <small>{active.description}</small>
                  </div>
                </div>

                <div className="module-stat-grid">
                  {active.stats.map((stat) => (
                    <div className="module-stat" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="preview-deck">
                  <div className="preview-message">
                    <MessagesSquare size={16} />
                    <span>auto reply channel</span>
                    <strong>#chat</strong>
                  </div>
                  <div className="preview-chat-stack">
                    {previewLines.map((line, index) => (
                      <div className={`preview-chat-line ${index === 1 ? "bot" : ""}`} key={line}>
                        <span>{index === 1 ? "B" : "R"}</span>
                        <p>{line}</p>
                      </div>
                    ))}
                  </div>
                  <div className="preview-sliders">
                    <span style={{ width: "72%" }} />
                    <span style={{ width: "48%" }} />
                    <span style={{ width: "86%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-dock">
              <div className="dock-control active">
                <CirclePlay size={17} />
                Queue
              </div>
              <div className="dock-control">
                <AudioLines size={17} />
                Filters
              </div>
              <div className="dock-control">
                <SlidersHorizontal size={17} />
                Setup
              </div>
              <div className="dock-meter">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-state">
      <div className="brand-mark">
        <span className="brand-logo">
          <Loader2 size={22} className="spin" />
        </span>
        <div>
          <strong>Browniezzz</strong>
          <p className="muted">Syncing Discord and Supabase</p>
        </div>
      </div>
    </main>
  );
}

export function DashboardApp() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [payload, setPayload] = useState<GuildPayload | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGuild = useMemo(
    () => me?.guilds.find((guild) => guild.id === selectedGuildId) ?? null,
    [me?.guilds, selectedGuildId]
  );

  const config = payload?.config ?? null;
  const channels = payload?.channels ?? [];
  const roles = payload?.roles ?? [];

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/me", { cache: "no-store" });
    if (response.status === 401) {
      setMe(null);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setError("Dashboard env is not ready yet. Check Discord OAuth and bot token values.");
      setLoading(false);
      return;
    }

    const nextMe = (await response.json()) as MeResponse;
    setMe(nextMe);
    setSelectedGuildId((current) => current || nextMe.guilds[0]?.id || "");
    setLoading(false);
  }, []);

  const loadGuild = useCallback(async (guildId: string) => {
    if (!guildId) return;
    setConfigLoading(true);
    setError(null);

    const response = await fetch(`/api/guilds/${guildId}/config`, { cache: "no-store" });
    if (!response.ok) {
      setError("Could not load that server. Check bot permissions and Discord OAuth access.");
      setConfigLoading(false);
      return;
    }

    const nextPayload = (await response.json()) as GuildPayload;
    setPayload(nextPayload);
    setDirty(false);
    setConfigLoading(false);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (selectedGuildId) void loadGuild(selectedGuildId);
  }, [loadGuild, selectedGuildId]);

  function updateConfig<K extends keyof GuildConfig>(key: K, value: GuildConfig[K]) {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        config: {
          ...current.config,
          [key]: value
        }
      };
    });
    setDirty(true);
  }

  async function saveConfig() {
    if (!selectedGuildId || !config) return;
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/guilds/${selectedGuildId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      setError("Save failed. Check Supabase connection and bot access.");
      setSaving(false);
      return;
    }

    const nextPayload = (await response.json()) as { config: GuildConfig };
    setPayload((current) => (current ? { ...current, config: nextPayload.config } : current));
    setDirty(false);
    setSaving(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) return <LoadingScreen />;
  if (!me) {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const authFailed = params.get("auth") === "failed";
    return <LoginScreen error={authFailed ? "Discord login failed. Check the redirect URI and OAuth secret." : error} />;
  }

  if (me.guilds.length === 0) {
    return (
      <main className="empty-state">
        <section className="login-panel">
          <div className="brand-mark">
            <span className="brand-logo">
              <Server size={22} />
            </span>
            <div>
              <strong>No servers found</strong>
              <p className="muted">Invite the bot and give your Discord account Manage Server permission.</p>
            </div>
          </div>
          <button className="ghost-button" type="button" onClick={logout}>
            <LogOut size={17} />
            Logout
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="dashboard-grid">
        <aside className="sidebar">
          <div className="brand">
          <div className="brand-mark">
            <span className="brand-logo">
              <img src="/brand/brownie-icon.png" alt="" />
            </span>
            <div>
              <h1>Browniezzz</h1>
                <p>Premium bot dashboard</p>
              </div>
            </div>
          </div>

          <div className="server-strip">
            {me.guilds.map((guild) => (
              <button
                className={`server-button ${guild.id === selectedGuildId ? "active" : ""}`}
                key={guild.id}
                type="button"
                onClick={() => setSelectedGuildId(guild.id)}
              >
                {guild.icon ? (
                  <img className="server-avatar" src={guild.icon} alt="" />
                ) : (
                  <span className="guild-initial">{initials(guild.name)}</span>
                )}
                <span>
                  <span className="server-name">{guild.name}</span>
                  <span className="server-meta muted">Connected</span>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>

          <nav className="nav">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-button ${tab === item.key ? "active" : ""}`}
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                >
                  <Icon size={18} />
                  {item.label}
                  {item.key === "ai" && config?.aiResponderEnabled ? <span className="dot" /> : null}
                </button>
              );
            })}
          </nav>

          <div className="user-bar">
            <div className="user-mini">
              {me.user.avatar ? <img className="user-avatar" src={me.user.avatar} alt="" /> : <span className="guild-initial">U</span>}
              <div>
                <strong>{me.user.username}</strong>
                <span className="tiny">Discord admin</span>
              </div>
            </div>
            <button className="icon-button" type="button" aria-label="Logout" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <section className="main">
          <header className="topbar">
            <div className="top-title">
              <h2>{selectedGuild?.name ?? "Server"}</h2>
              <p>
                {dirty ? "Unsaved changes" : "Synced"} 
                {config?.updatedAt ? ` - ${new Date(config.updatedAt).toLocaleString()}` : ""}
              </p>
            </div>

            <div className="top-actions">
              <select
                className="select mobile-server-select"
                value={selectedGuildId}
                onChange={(event) => setSelectedGuildId(event.target.value)}
              >
                {me.guilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>
              <button className="ghost-button" type="button" onClick={() => loadGuild(selectedGuildId)} disabled={configLoading}>
                <RefreshCw size={17} />
                Refresh
              </button>
              <button className="primary-button" type="button" onClick={saveConfig} disabled={!dirty || saving || !config}>
                {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                {dirty ? "Save" : "Saved"}
              </button>
            </div>
          </header>

          {error ? <div className="notice">{error}</div> : null}

          <div className="content-grid">
            <section className="module-stage">
              {configLoading || !config ? (
                <section className="panel">
                  <div className="brand-mark">
                    <Loader2 size={20} className="spin" />
                    <strong>Loading server controls</strong>
                  </div>
                </section>
              ) : (
                <ModuleView
                  tab={tab}
                  config={config}
                  channels={channels}
                  roles={roles}
                  updateConfig={updateConfig}
                />
              )}
            </section>

            {config ? (
              <PreviewRail
                config={config}
                channels={channels}
                roles={roles}
                guildName={selectedGuild?.name ?? "your server"}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ModuleView({
  tab,
  config,
  channels,
  roles,
  updateConfig
}: {
  tab: TabKey;
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
  updateConfig: <K extends keyof GuildConfig>(key: K, value: GuildConfig[K]) => void;
}) {
  if (tab === "overview") {
    const enabledCount = [
      config.aiResponderEnabled,
      Boolean(config.welcomeChannelId),
      Boolean(config.ticketCategoryId),
      config.levelingEnabled,
      Boolean(config.tempVoiceJoinChannelId)
    ].filter(Boolean).length;

    return (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Pulse</h3>
              <p className="muted">Live server setup in one scan.</p>
            </div>
            <span className="kbd">{enabledCount}/5 systems</span>
          </div>

          <div className="metric-grid">
            <div className="metric">
              <span>AI Channel</span>
              <strong>{config.aiResponderEnabled ? "On" : "Off"}</strong>
              <small className="muted">{displayChannel(channels, config.aiResponderChannelId)}</small>
            </div>
            <div className="metric">
              <span>Welcome</span>
              <strong>{config.welcomeChannelId ? "Ready" : "Unset"}</strong>
              <small className="muted">{displayChannel(channels, config.welcomeChannelId)}</small>
            </div>
            <div className="metric">
              <span>Tickets</span>
              <strong>{config.ticketCategoryId ? "Ready" : "Unset"}</strong>
              <small className="muted">{displayRole(roles, config.supportRoleId)}</small>
            </div>
            <div className="metric">
              <span>Levels</span>
              <strong>{config.levelingEnabled ? "On" : "Off"}</strong>
              <small className="muted">{displayChannel(channels, config.levelUpChannelId)}</small>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Quick switches</h3>
              <p className="muted">Flip high-traffic systems without leaving overview.</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <span className="field-label">AI auto reply</span>
              <Toggle
                checked={config.aiResponderEnabled}
                label="Toggle AI auto reply"
                onChange={(value) => updateConfig("aiResponderEnabled", value)}
              />
            </div>
            <div className="field">
              <span className="field-label">Leveling</span>
              <Toggle
                checked={config.levelingEnabled}
                label="Toggle leveling"
                onChange={(value) => updateConfig("levelingEnabled", value)}
              />
            </div>
            <SelectField
              label="Log channel"
              value={config.logChannelId}
              options={textChannels(channels)}
              placeholder="No log channel"
              onChange={(value) => updateConfig("logChannelId", value)}
            />
            <SelectField
              label="Accent"
              value={String(config.accentColor)}
              options={colorOptions.map((item) => ({ id: String(item.value), name: item.label }))}
              placeholder="Pick color"
              onChange={(value) => updateConfig("accentColor", Number(value ?? 0x38dff8))}
            />
          </div>
        </section>
      </>
    );
  }

  if (tab === "ai") {
    return (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>AI auto responder</h3>
              <p className="muted">The bot only auto-replies in the selected channel.</p>
            </div>
            <Toggle
              checked={config.aiResponderEnabled}
              label="Toggle AI auto responder"
              onChange={(value) => updateConfig("aiResponderEnabled", value)}
            />
          </div>

          <div className="form-grid">
            <SelectField
              label="AI channel"
              value={config.aiResponderChannelId}
              options={textChannels(channels)}
              placeholder="Pick auto-reply channel"
              onChange={(value) => updateConfig("aiResponderChannelId", value)}
            />
            <div className="field">
              <span className="field-label">Persona</span>
              <div className="segmented">
                {personaOptions.map((persona) => (
                  <button
                    className={`pill-button ${config.aiResponderPersona === persona.key ? "active" : ""}`}
                    key={persona.key}
                    type="button"
                    onClick={() => updateConfig("aiResponderPersona", persona.key)}
                  >
                    {persona.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="form-grid single">
            <label className="field">
              <span className="field-label">Custom behavior</span>
              <textarea
                className="textarea"
                value={config.aiResponderPrompt ?? ""}
                onChange={(event) => updateConfig("aiResponderPrompt", event.target.value)}
              />
            </label>
          </div>
        </section>
      </>
    );
  }

  if (tab === "welcome") {
    return (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Welcome and roles</h3>
              <p className="muted">Member entry, autorole, verification, birthday pings.</p>
            </div>
            <Wand2 size={21} />
          </div>

          <div className="form-grid">
            <SelectField
              label="Welcome channel"
              value={config.welcomeChannelId}
              options={textChannels(channels)}
              placeholder="No welcome channel"
              onChange={(value) => updateConfig("welcomeChannelId", value)}
            />
            <SelectField
              label="Autorole"
              value={config.autoRoleId}
              options={roles}
              placeholder="No autorole"
              onChange={(value) => updateConfig("autoRoleId", value)}
            />
            <SelectField
              label="Verified role"
              value={config.verifiedRoleId}
              options={roles}
              placeholder="No verified role"
              onChange={(value) => updateConfig("verifiedRoleId", value)}
            />
            <SelectField
              label="Birthday channel"
              value={config.birthdayChannelId}
              options={textChannels(channels)}
              placeholder="No birthday channel"
              onChange={(value) => updateConfig("birthdayChannelId", value)}
            />
          </div>
        </section>

        <section className="panel">
          <label className="field">
            <span className="field-label">Welcome message</span>
            <textarea
              className="textarea"
              value={config.welcomeMessage ?? ""}
              onChange={(event) => updateConfig("welcomeMessage", event.target.value)}
            />
          </label>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Embed color</h3>
              <p className="muted">Used across setup panels and premium embeds.</p>
            </div>
          </div>
          <div className="color-row">
            {colorOptions.map((color) => (
              <button
                className={`color-button ${config.accentColor === color.value ? "active" : ""}`}
                key={color.value}
                type="button"
                aria-label={color.label}
                onClick={() => updateConfig("accentColor", color.value)}
              >
                <span style={{ background: hexColor(color.value) }} />
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (tab === "support") {
    return (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Ticket desk</h3>
              <p className="muted">Private ticket category and staff controls.</p>
            </div>
            <Ticket size={21} />
          </div>

          <div className="form-grid">
            <SelectField
              label="Ticket category"
              value={config.ticketCategoryId}
              options={categoryChannels(channels)}
              placeholder="No ticket category"
              onChange={(value) => updateConfig("ticketCategoryId", value)}
            />
            <SelectField
              label="Support role"
              value={config.supportRoleId}
              options={roles}
              placeholder="No support role"
              onChange={(value) => updateConfig("supportRoleId", value)}
            />
            <SelectField
              label="Temp VC join"
              value={config.tempVoiceJoinChannelId}
              options={voiceChannels(channels)}
              placeholder="No join-to-create VC"
              onChange={(value) => updateConfig("tempVoiceJoinChannelId", value)}
            />
            <SelectField
              label="Temp VC category"
              value={config.tempVoiceCategoryId}
              options={categoryChannels(channels)}
              placeholder="No temp VC category"
              onChange={(value) => updateConfig("tempVoiceCategoryId", value)}
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Moderation path</h3>
              <p className="muted">Staff events, mod cases, and action logs.</p>
            </div>
            <Shield size={21} />
          </div>
          <SelectField
            label="Log channel"
            value={config.logChannelId}
            options={textChannels(channels)}
            placeholder="No log channel"
            onChange={(value) => updateConfig("logChannelId", value)}
          />
        </section>
      </>
    );
  }

  if (tab === "levels") {
    return (
      <>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Leveling</h3>
              <p className="muted">XP progression and level-up announcements.</p>
            </div>
            <Toggle
              checked={config.levelingEnabled}
              label="Toggle leveling"
              onChange={(value) => updateConfig("levelingEnabled", value)}
            />
          </div>

          <div className="form-grid">
            <SelectField
              label="Level-up channel"
              value={config.levelUpChannelId}
              options={textChannels(channels)}
              placeholder="Same channel as message"
              onChange={(value) => updateConfig("levelUpChannelId", value)}
            />
            <SelectField
              label="Reward role anchor"
              value={config.verifiedRoleId}
              options={roles}
              placeholder="No anchor role"
              onChange={(value) => updateConfig("verifiedRoleId", value)}
            />
          </div>
        </section>

        <section className="panel">
          <div className="metric-grid">
            <div className="metric">
              <span>XP cooldown</span>
              <strong>60s</strong>
              <small className="muted">Bot default</small>
            </div>
            <div className="metric">
              <span>Leaderboard</span>
              <strong>/top</strong>
              <small className="muted">Global command</small>
            </div>
            <div className="metric">
              <span>Rank card</span>
              <strong>/rank</strong>
              <small className="muted">User progress</small>
            </div>
            <div className="metric">
              <span>Storage</span>
              <strong>SQL</strong>
              <small className="muted">Supabase</small>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Music deck</h3>
            <p className="muted">Lavalink status and premium playback defaults.</p>
          </div>
          <Headphones size={21} />
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Playback</span>
            <strong>Live</strong>
            <small className="muted">Queue buttons active</small>
          </div>
          <div className="metric">
            <span>Volume</span>
            <strong>80%</strong>
            <small className="muted">Bot default</small>
          </div>
          <div className="metric">
            <span>Search</span>
            <strong>YTM</strong>
            <small className="muted">YouTube Music</small>
          </div>
          <div className="metric">
            <span>Engine</span>
            <strong>Lava</strong>
            <small className="muted">Node connected</small>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>DJ controls</h3>
            <p className="muted">Use support role as trusted control access.</p>
          </div>
          <Music2 size={21} />
        </div>
        <SelectField
          label="DJ role"
          value={config.supportRoleId}
          options={roles}
          placeholder="No DJ role"
          onChange={(value) => updateConfig("supportRoleId", value)}
        />
      </section>
    </>
  );
}

function PreviewRail({
  config,
  channels,
  roles,
  guildName
}: {
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
  guildName: string;
}) {
  const welcome = (config.welcomeMessage ?? "")
    .replaceAll("{user}", "@Raven")
    .replaceAll("{server}", guildName)
    .replaceAll("{count}", "247");

  return (
    <aside className="preview-stack">
      <section className="preview-panel brand-preview-panel">
        <img className="brand-preview-image" src="/brand/brownie-welcome.png" alt="" />
      </section>

      <section className="preview-panel">
        <h3>Embed preview</h3>
        <div
          className="discord-preview"
          style={{ "--preview-accent": hexColor(config.accentColor) } as CSSProperties & Record<"--preview-accent", string>}
        >
          <strong>Browniezzz</strong>
          <p>{welcome || "Welcome @Raven to your server."}</p>
        </div>
      </section>

      <section className="preview-panel">
        <h3>Active routes</h3>
        <div className="activity-feed">
          <div className="activity-item">
            <span>AI</span>
            <strong>{config.aiResponderEnabled ? displayChannel(channels, config.aiResponderChannelId) : "Off"}</strong>
          </div>
          <div className="activity-item">
            <span>Welcome</span>
            <strong>{displayChannel(channels, config.welcomeChannelId)}</strong>
          </div>
          <div className="activity-item">
            <span>Staff</span>
            <strong>{displayRole(roles, config.supportRoleId)}</strong>
          </div>
          <div className="activity-item">
            <span>Temp VC</span>
            <strong>{displayChannel(channels, config.tempVoiceJoinChannelId)}</strong>
          </div>
        </div>
      </section>

      <section className="preview-panel">
        <h3>Command stack</h3>
        <div className="button-row">
          <span className="kbd">/setup</span>
          <span className="kbd">/ai</span>
          <span className="kbd">/music</span>
          <span className="kbd">/ticket-panel</span>
        </div>
      </section>
    </aside>
  );
}
