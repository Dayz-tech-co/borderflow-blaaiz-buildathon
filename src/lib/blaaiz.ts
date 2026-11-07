/** Server-only future integration boundary. Never import this module into client components. */
import "server-only";

const baseUrl = process.env.BLAAIZ_API_BASE_URL ?? "https://api-dev.blaaiz.com";

export interface BlaaizService {
  getAccessToken(scopes: string[]): Promise<string>;
  // Live payout methods are intentionally not exposed until credentials and payload mapping are validated.
}

export class BlaaizApiService implements BlaaizService {
  async getAccessToken(scopes: string[]): Promise<string> {
    const clientId = process.env.BLAAIZ_CLIENT_ID;
    const clientSecret = process.env.BLAAIZ_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Blaaiz server credentials are not configured.");

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes.join(" "),
    });
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Blaaiz authentication failed (${response.status}).`);
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("Blaaiz authentication returned no access token.");
    return data.access_token;
  }
}
