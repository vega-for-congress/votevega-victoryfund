/**
 * Cloudflare Worker: Telegram -> GitHub Issue Bot
 *
 * Receives Telegram messages from authorized staffers, creates GitHub issues
 * that trigger the aider-issue-to-pr workflow.
 *
 * Security:
 *   1. Webhook secret token verified on every request (only Telegram can call this)
 *   2. Allowlist of Telegram user IDs (only authorized staffers can create issues)
 *
 * Setup:
 *   1. Create a Telegram bot via @BotFather -> get the bot token
 *   2. Deploy this worker
 *   3. Register the webhook:
 *      curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
 *        -H "Content-Type: application/json" \
 *        -d '{"url":"https://telegram-issue-bot.<your-subdomain>.workers.dev/webhook",
 *             "secret_token":"<WEBHOOK_SECRET>"}'
 *   4. Set secrets via wrangler:
 *      wrangler secret put TELEGRAM_BOT_TOKEN
 *      wrangler secret put TELEGRAM_WEBHOOK_SECRET
 *      wrangler secret put GITHUB_TOKEN
 */

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;           // e.g. "vega-for-congress/votevega-website"
  ALLOWED_TELEGRAM_USER_IDS: string; // comma-separated, e.g. "123456789,987654321"
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
    };
    text?: string;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('ok');
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  // 1. Verify webhook secret (ensures only Telegram can call this)
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }

  // 2. Parse the Telegram update
  const update: TelegramUpdate = await request.json();
  const message = update.message;

  if (!message?.text) {
    return new Response('ok'); // Ignore non-text messages silently
  }

  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text.trim();

  // 3. Check user allowlist
  const allowedIds = env.ALLOWED_TELEGRAM_USER_IDS.split(',').map(id => parseInt(id.trim(), 10));
  if (!allowedIds.includes(userId)) {
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      'Sorry, you are not authorized to create issues. Contact the campaign webmaster.'
    );
    return new Response('ok');
  }

  // 4. Handle commands
  if (text === '/start') {
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      'VoteVega Website Bot\n\n' +
      'Send me a message describing a website change and I will create a GitHub issue that triggers an automatic fix.\n\n' +
      'Examples:\n' +
      '- "Update the donate link to actblue.com/votevega"\n' +
      '- "Add a new policy page about housing"\n' +
      '- "Fix the broken image on the homepage"\n\n' +
      'Commands:\n' +
      '/start - Show this help\n' +
      '/status - Check bot status'
    );
    return new Response('ok');
  }

  if (text === '/status') {
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `Bot is running.\nRepo: ${env.GITHUB_REPO}\nYour user ID: ${userId}`
    );
    return new Response('ok');
  }

  // Ignore other slash commands
  if (text.startsWith('/')) {
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      'Unknown command. Send /start for help.'
    );
    return new Response('ok');
  }

  // 5. Create GitHub issue from message
  const { title, body } = parseIssueFromMessage(text, message.from.first_name);

  try {
    const issue = await createGitHubIssue(env.GITHUB_TOKEN, env.GITHUB_REPO, title, body);

    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `Issue #${issue.number} created. The AI bot will generate a fix shortly.\n\n${issue.html_url}`
    );
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    await sendTelegramMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      'Failed to create the issue. Please try again or contact the webmaster.'
    );
  }

  return new Response('ok');
}

/**
 * Parse a chat message into an issue title and body.
 * If the message is short (<=80 chars), use it as-is for the title.
 * If longer, extract the first sentence as the title and the rest as the body.
 */
function parseIssueFromMessage(
  text: string,
  senderName: string
): { title: string; body: string } {
  const maxTitleLength = 80;
  let title: string;
  let body: string;

  if (text.length <= maxTitleLength) {
    title = text;
    body = '';
  } else {
    // Try to split at first sentence boundary
    const sentenceEnd = text.search(/[.!?\n]/);
    if (sentenceEnd > 0 && sentenceEnd <= maxTitleLength) {
      title = text.substring(0, sentenceEnd + 1).trim();
      body = text.substring(sentenceEnd + 1).trim();
    } else {
      // Truncate at word boundary
      const truncated = text.substring(0, maxTitleLength);
      const lastSpace = truncated.lastIndexOf(' ');
      title = truncated.substring(0, lastSpace > 0 ? lastSpace : maxTitleLength);
      body = text.substring(title.length).trim();
    }
  }

  // Add metadata to body
  const footer = `\n\n---\n_Submitted via Telegram by ${senderName}_`;
  body = body + footer;

  return { title, body };
}

/**
 * Create a GitHub issue via the REST API.
 */
async function createGitHubIssue(
  token: string,
  repo: string,
  title: string,
  body: string
): Promise<{ number: number; html_url: string }> {
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'votevega-telegram-bot',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Send a message back to the Telegram chat.
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}
