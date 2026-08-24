import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TreePine, Shield, Sword, Eye, Sparkles, Flame, Check, X, CalendarOff, Plus } from "lucide-react";

// Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const LOGO_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%230a0906' width='400' height='400'/%3E%3Ctext x='50%' y='50%' font-size='60' font-weight='bold' fill='%23d4af37' text-anchor='middle' dominant-baseline='middle'%3EMANEE%3C/text%3E%3C/svg%3E";

const STATUS = {
  present: { label: "มา", Icon: Check, color: "#5fd889", bg: "#1e3a26", border: "#3f8f5a" },
  leave: { label: "ลา", Icon: CalendarOff, color: "#e0b45c", bg: "#3a2f14", border: "#8f6f2f" },
  absent: { label: "ขาด", Icon: X, color: "#e07070", bg: "#3a1e1e", border: "#8f3f3f" },
};

const ROLES = [
  { key: "jungle", th: "ป่า", en: "Jungle", Icon: TreePine, color: "#6fbf73" },
  { key: "offlane", th: "ออฟ", en: "Offlaner", Icon: Shield, color: "#5b9bd5" },
  { key: "carry", th: "แครี่", en: "Carry", Icon: Sword, color: "#e6c65c" },
  { key: "roam", th: "โรม", en: "Roamer", Icon: Eye, color: "#c17fd0" },
  { key: "mage", th: "เมจ", en: "Mage", Icon: Sparkles, color: "#e07070" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtThaiDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function Ribbon({ children, color = "#d4af37", small }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: small ? "4px 14px 4px 10px" : "6px 20px 6px 14px",
        fontSize: small ? 12 : 14,
        fontWeight: 600,
        color: "#0e0c07",
        background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const [players, setPlayers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("jungle");
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("checkin");
  const [justToggled, setJustToggled] = useState(null);

  // Load players
  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.from("players").select("*");
        if (err) throw err;
        setPlayers(data || []);
      } catch (e) {
        setError("โหลดผู้เล่นไม่สำเร็จ: " + e.message);
      }
    })();
  }, []);

  // Load checkins
  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase.from("checkins").select("*");
        if (err) throw err;
        setCheckins(data || []);
      } catch (e) {
        setError("โหลดเช็คอินไม่สำเร็จ: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addPlayer = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const { data, error: err } = await supabase
        .from("players")
        .insert([{ name, role: newRole }])
        .select();
      if (err) throw err;
      setPlayers([...players, ...data]);
      setNewName("");
    } catch (e) {
      setError("เพิ่มผู้เล่นไม่สำเร็จ: " + e.message);
    }
  };

  const setStatus = async (playerId, status) => {
    try {
      setSaveState("saving");
      const existing = checkins.find((c) => c.player_id === playerId && c.check_date === selectedDate);
      
      if (existing && existing.status === status) {
        // ลบถ้ากดซ้ำ
        const { error: err } = await supabase.from("checkins").delete().eq("id", existing.id);
        if (err) throw err;
        setCheckins(checkins.filter((c) => c.id !== existing.id));
      } else if (existing) {
        // อัพเดตสถานะ
        const { error: err } = await supabase
          .from("checkins")
          .update({ status })
          .eq("id", existing.id);
        if (err) throw err;
        setCheckins(checkins.map((c) => (c.id === existing.id ? { ...c, status } : c)));
      } else {
        // สร้างใหม่
        const { data, error: err } = await supabase
          .from("checkins")
          .insert([{ player_id: playerId, check_date: selectedDate, status }])
          .select();
        if (err) throw err;
        setCheckins([...checkins, ...data]);
      }
      
      setSaveState("saved");
      setJustToggled(playerId);
      setTimeout(() => {
        setJustToggled(null);
        setSaveState("idle");
      }, 350);
    } catch (e) {
      setError("บันทึกไม่สำเร็จ: " + e.message);
      setSaveState("idle");
    }
  };

  const markAll = async (status) => {
    try {
      setSaveState("saving");
      
      // ลบเช็คอินเก่าของวันนี้
      await supabase.from("checkins").delete().eq("check_date", selectedDate);
      
      // เพิ่มใหม่
      const newCheckins = players.map((p) => ({
        player_id: p.id,
        check_date: selectedDate,
        status,
      }));
      
      const { data, error: err } = await supabase.from("checkins").insert(newCheckins).select();
      if (err) throw err;
      setCheckins(checkins.filter((c) => c.check_date !== selectedDate).concat(data));
      
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      setError("บันทึกไม่สำเร็จ: " + e.message);
      setSaveState("idle");
    }
  };

  const dayCheckins = useMemo(() => {
    const result = {};
    checkins
      .filter((c) => c.check_date === selectedDate)
      .forEach((c) => {
        result[c.player_id] = c.status;
      });
    return result;
  }, [checkins, selectedDate]);

  const streaks = useMemo(() => {
    const result = {};
    players.forEach((p) => {
      const dates = checkins
        .filter((c) => c.player_id === p.id)
        .map((c) => c.check_date)
        .sort()
        .reverse();
      
      let streak = 0;
      for (const d of dates) {
        const c = checkins.find((x) => x.player_id === p.id && x.check_date === d);
        if (c?.status === "present") streak++;
        else if (c?.status === "leave") continue;
        else break;
      }
      result[p.id] = streak;
    });
    return result;
  }, [players, checkins]);

  const roleStats = useMemo(() => {
    return ROLES.map((role) => {
      const rolePlayer = players.filter((p) => p.role === role.key);
      const presentToday = rolePlayer.filter((p) => dayCheckins[p.id] === "present").length;
      const leaveToday = rolePlayer.filter((p) => dayCheckins[p.id] === "leave").length;
      const absentToday = rolePlayer.filter((p) => dayCheckins[p.id] === "absent").length;
      
      let totalPresent = 0, countedDays = 0;
      rolePlayer.forEach((p) => {
        const playerCheckins = checkins.filter((c) => c.player_id === p.id);
        playerCheckins.forEach((c) => {
          if (c.status === "present" || c.status === "absent") {
            countedDays++;
            if (c.status === "present") totalPresent++;
          }
        });
      });
      
      const rate = countedDays > 0 ? Math.round((totalPresent / countedDays) * 100) : 0;
      return { role: role.key, label: role.th, en: role.en, totalSlots: rolePlayer.length, presentToday, leaveToday, absentToday, rate, color: role.color };
    });
  }, [players, checkins, dayCheckins]);

  const trend = useMemo(() => {
    const dates = [...new Set(checkins.map((c) => c.check_date))].sort().slice(-14);
    return dates.map((date) => {
      const dayData = checkins.filter((c) => c.check_date === date);
      const present = dayData.filter((c) => c.status === "present").length;
      const leave = dayData.filter((c) => c.status === "leave").length;
      const absent = dayData.filter((c) => c.status === "absent").length;
      return { date, dateLabel: fmtThaiDate(date), present, leave, absent };
    });
  }, [checkins]);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingText}>กำลังโหลด...</div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const dayValues = Object.values(dayCheckins);
  const presentCount = dayValues.filter((v) => v === "present").length;
  const leaveCount = dayValues.filter((v) => v === "leave").length;
  const absentCount = dayValues.filter((v) => v === "absent").length;

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button, input, select { font-family: 'Kanit', sans-serif; cursor: pointer; }
        @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
        .pop { animation: pop 0.3s ease; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.headerTitle}>MANEE</div>
            <div style={styles.headerSub}>ระบบเช็คอินทีม eSports</div>
          </div>
        </div>
      </header>

      <nav style={styles.tabBar}>
        {[
          { key: "checkin", label: "เช็คอินวันนี้" },
          { key: "stats", label: "สถิติ" },
          { key: "roster", label: "รายชื่อผู้เล่น" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === t.key ? styles.tabBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        {activeTab === "checkin" && (
          <section>
            <div style={styles.dateRow}>
              <label style={styles.dateLabel}>วันที่</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
              <div style={{ flex: 1 }} />
              <button onClick={() => markAll("present")} style={styles.smallBtn}>มาทั้งหมด</button>
              <button onClick={() => markAll("leave")} style={styles.smallBtnLeave}>ลาทั้งหมด</button>
              <button onClick={() => markAll("absent")} style={styles.smallBtnGhost}>ขาดทั้งหมด</button>
            </div>
            <div style={styles.hintRow}>แตะปุ่มเพื่อเลือกสถานะของแต่ละคนได้เลย มา/ลา/ขาด</div>

            <div className="stat-grid" style={styles.statGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNum}>{totalPlayers}</div>
                <div style={styles.statLbl}>ผู้เล่นทั้งหมด</div>
              </div>
              <div style={{ ...styles.statCard, borderColor: STATUS.present.border }}>
                <div style={{ ...styles.statNum, color: STATUS.present.color }}>{presentCount}</div>
                <div style={styles.statLbl}>มาวันนี้</div>
              </div>
              <div style={{ ...styles.statCard, borderColor: STATUS.leave.border }}>
                <div style={{ ...styles.statNum, color: STATUS.leave.color }}>{leaveCount}</div>
                <div style={styles.statLbl}>ลาวันนี้</div>
              </div>
              <div style={{ ...styles.statCard, borderColor: STATUS.absent.border }}>
                <div style={{ ...styles.statNum, color: STATUS.absent.color }}>{absentCount}</div>
                <div style={styles.statLbl}>ขาดวันนี้</div>
              </div>
            </div>

            {ROLES.map((role) => {
              const rolePlayer = players.filter((p) => p.role === role.key);
              if (rolePlayer.length === 0) return null;
              const rs = roleStats.find((r) => r.role === role.key);
              return (
                <div key={role.key} style={styles.roleBlock}>
                  <div style={styles.roleHeader}>
                    <Ribbon color={role.color}>
                      <role.Icon size={14} strokeWidth={2.5} />
                      {role.th}
                    </Ribbon>
                    <span style={styles.roleEn}>{role.en}</span>
                    <div style={{ flex: 1 }} />
                    {rs && (
                      <span style={styles.roleMiniStats}>
                        <span style={{ color: STATUS.present.color }}>มา {rs.presentToday}</span>
                        <span style={{ color: STATUS.leave.color }}>ลา {rs.leaveToday}</span>
                        <span style={{ color: STATUS.absent.color }}>ขาด {rs.absentToday}</span>
                      </span>
                    )}
                  </div>
                  <div style={styles.playerRows}>
                    {rolePlayer.map((p) => {
                      const status = dayCheckins[p.id];
                      const streak = streaks[p.id] || 0;
                      return (
                        <div key={p.id} className={justToggled === p.id ? "pop" : ""} style={styles.playerRow}>
                          <span style={styles.playerName}>
                            {p.name}
                            {streak >= 2 && (
                              <span style={styles.streakBadge}>
                                <Flame size={11} strokeWidth={2.5} />
                                {streak}
                              </span>
                            )}
                          </span>
                          <div style={styles.statusSeg}>
                            {Object.entries(STATUS).map(([key, cfg]) => {
                              const active = status === key;
                              const Icon = cfg.Icon;
                              return (
                                <button
                                  key={key}
                                  onClick={() => setStatus(p.id, key)}
                                  style={{
                                    ...styles.segBtn,
                                    background: active ? cfg.bg : "transparent",
                                    borderColor: active ? cfg.border : "#2a2418",
                                    color: active ? cfg.color : "#6b5f3d",
                                  }}
                                >
                                  <Icon size={13} strokeWidth={active ? 3 : 2.5} />
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {players.length === 0 && (
              <div style={styles.emptyState}>ยังไม่มีผู้เล่น ไปแท็บ "รายชื่อผู้เล่น" เพื่อเพิ่ม</div>
            )}
          </section>
        )}

        {activeTab === "stats" && (
          <section>
            <h2 style={styles.sectionTitle}>อัตราการมาเช็คอินต่อสาย</h2>
            <div style={styles.chartCard}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={roleStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2418" />
                  <XAxis dataKey="label" tick={{ fill: "#c9a84a", fontFamily: "Kanit", fontSize: 13 }} />
                  <YAxis tick={{ fill: "#8a7c52", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#1a1610", border: "1px solid #4a3d15", borderRadius: 8 }} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {roleStats.map((rs, i) => (
                      <Cell key={i} fill={rs.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h2 style={styles.sectionTitle}>แนวโน้มการเช็คอิน (14 วันล่าสุด)</h2>
            <div style={styles.chartCard}>
              {trend.length === 0 ? (
                <div style={styles.emptyState}>ยังไม่มีข้อมูล</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2418" />
                    <XAxis dataKey="dateLabel" tick={{ fill: "#8a7c52", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#8a7c52", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1610", border: "1px solid #4a3d15", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontFamily: "Kanit", fontSize: 12 }} />
                    <Line type="monotone" dataKey="present" name="มา" stroke={STATUS.present.color} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="leave" name="ลา" stroke={STATUS.leave.color} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="absent" name="ขาด" stroke={STATUS.absent.color} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <h2 style={styles.sectionTitle}>สรุปรายสาย</h2>
            <div style={styles.summaryTable}>
              {roleStats.map((rs) => (
                <div key={rs.role} style={styles.summaryRow}>
                  <Ribbon color={rs.color} small>{rs.label}</Ribbon>
                  <span style={styles.summaryEn}>{rs.en}</span>
                  <span style={styles.summaryCount}>{rs.totalSlots} คน</span>
                  <span style={{ ...styles.summaryLeave, color: STATUS.leave.color }}>ลา {rs.leaveToday}</span>
                  <span style={styles.summaryRate}>{rs.rate}% มาสม่ำเสมอ</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "roster" && (
          <section>
            <h2 style={styles.sectionTitle}>เพิ่มผู้เล่น</h2>
            <div style={styles.addForm}>
              <input
                placeholder="ชื่อผู้เล่น"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPlayer(); }}
                style={styles.textInput}
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={styles.select}>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.th} · {r.en}</option>
                ))}
              </select>
              <button onClick={addPlayer} style={styles.addBtn}>
                <Plus size={15} strokeWidth={3} /> เพิ่ม
              </button>
            </div>

            <h2 style={styles.sectionTitle}>รายชื่อทั้งหมด ({players.length})</h2>
            {ROLES.map((role) => {
              const rolePlayer = players.filter((p) => p.role === role.key);
              if (rolePlayer.length === 0) return null;
              return (
           
