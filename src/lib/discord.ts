// Outbound Discord webhook integration. Posts to DISCORD_WEBHOOK_URL when set;
// no-ops in dev. All failures are swallowed to avoid blocking critical paths.

type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

export async function postDiscord(content: string, embeds?: DiscordEmbed[]): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, embeds, username: "ProBoost.gg" }),
    });
  } catch {
    // best-effort
  }
}

export function colorFor(kind: "success" | "warning" | "info" | "danger"): number {
  return {
    success: 0x22c55e,
    warning: 0xf59e0b,
    info: 0x3b82f6,
    danger: 0xef4444,
  }[kind];
}
