const AVATAR_COLORS = ["#FE4438", "#FFC400", "#0A84FF", "#8B5CF6"];

// Kept in sync with the server's avatarColor() in src/server/index.ts
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name, img, seed, size = 56 }: { name: string; img?: string | null; seed: string; size?: number }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  if (img) {
    return <img src={img} alt="" width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: avatarColor(seed),
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: size * 0.42, fontFamily: "var(--font-sans)" }}>
        {initial}
      </span>
    </div>
  );
}
