import jwt from "jsonwebtoken";

export function generateAppJwt(appId: string, privateKeyBase64: string): string {
  const privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf-8");
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: appId },
    privateKey,
    { algorithm: "RS256" }
  );
}

export async function getInstallationToken(
  appJwt: string,
  installationId: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

export async function createGitHubIssue(opts: {
  token: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}): Promise<{ number: number; html_url: string }> {
  const response = await fetch(
    `https://api.github.com/repos/${opts.repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: opts.title,
        body: opts.body,
        labels: opts.labels,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create issue: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
