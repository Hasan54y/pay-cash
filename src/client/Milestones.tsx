interface PaymentLike { status: string; paidAt: string | null; createdAt: string; }

const TIERS = [
  { name: "Starter", min: 0 },
  { name: "Bronze", min: 100 },
  { name: "Silver", min: 500 },
  { name: "Gold", min: 1000 },
  { name: "Platinum", min: 5000 },
  { name: "Diamond", min: 10000 },
  { name: "Elite", min: 50000 },
];

function tierIndexFor(revenue: number) {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (revenue >= TIERS[i].min) idx = i;
  return idx;
}

function computeStreak(payments: PaymentLike[]) {
  const paidDays = new Set(
    payments.filter(p => p.status === "paid" && p.paidAt).map(p => new Date(p.paidAt as string).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  if (!paidDays.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (paidDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-3 4.5-3 8a3 3 0 006 0c0-1-.5-2-1-2.5.8.2 3 1.7 3 5.5a5 5 0 01-10 0c0-4.5 3.5-6 5-11z" /></svg>
  );
}

export function MilestonesCard({ payments, totalRevenue }: { payments: PaymentLike[]; totalRevenue: number }) {
  const idx = tierIndexFor(totalRevenue);
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const progress = next ? Math.min(100, ((totalRevenue - current.min) / (next.min - current.min)) * 100) : 100;
  const streak = computeStreak(payments);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="milestone-head">
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Milestone</p>
          <p className="milestone-tier"><span>{current.name}</span> tier</p>
        </div>
        {streak > 0 && <span className="streak-pill"><FlameIcon /> {streak} day{streak === 1 ? "" : "s"} streak</span>}
      </div>
      <div className="milestone-track"><div className="milestone-fill" style={{ width: `${progress}%` }} /></div>
      <p className="milestone-caption">
        {next
          ? `$${(next.min - totalRevenue).toFixed(2)} more to reach ${next.name}`
          : "You've reached the highest tier"}
      </p>
      <div className="milestone-badges">
        {TIERS.map((t, i) => (
          <div key={t.name} className={`milestone-badge ${i <= idx ? "unlocked" : "locked"}`} title={`${t.name} · $${t.min.toLocaleString()}+`}>
            {i <= idx ? "✓" : i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
