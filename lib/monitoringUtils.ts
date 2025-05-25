import { logger } from './logger'; // Import logger

const DISCORD_WEBHOOK_URL = process.env.DISCORD_SCORING_FAILED_WEBHOOK_URL;

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // Hex color code (e.g., 0xFF0000 for red)
  fields?: DiscordEmbedField[];
  timestamp?: string; // ISO8601 timestamp
  footer?: {
    text: string;
  };
}

interface DiscordWebhookPayload {
  content?: string; // Basic message content
  embeds?: DiscordEmbed[];
  username?: string; // Override webhook's default username
  avatar_url?: string; // Override webhook's default avatar
}

export async function sendDiscordAlert(title: string, description: string, fields?: DiscordEmbedField[], color: number = 0xFF0000 /* Red by default */) {
  if (!DISCORD_WEBHOOK_URL) {
    logger.warn('DiscordAlertSkipped', { title }, "Discord webhook URL not configured. Alert not sent.");
    return;
  }

  const payload: DiscordWebhookPayload = {
    username: "Loopie Scoring Monitor",
    embeds: [
      {
        title: `🚨 ${title}`,
        description: description,
        color: color,
        fields: fields || [],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Loopie Interview Scoring System"
        }
      }
    ]
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error('DiscordAlertError', { title, status: response.status, statusText: response.statusText, responseBody: responseText }, `Error sending Discord alert`);
    } else {
      logger.info('DiscordAlertSent', { title });
    }
  } catch (error: any) {
    logger.error('DiscordAlertFetchFail', { title }, "Failed to send Discord alert due to fetch error.", error);
  }
} 