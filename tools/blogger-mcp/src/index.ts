import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const API = "https://www.googleapis.com/blogger/v3";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

async function accessToken() {
  if (process.env.BLOGGER_ACCESS_TOKEN) return process.env.BLOGGER_ACCESS_TOKEN;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Blogger authentication. Set BLOGGER_ACCESS_TOKEN or Google OAuth refresh credentials.");
  }
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error(`Google OAuth refresh failed: ${response.status} ${await response.text()}`);
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function blogger(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Blogger API failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function defaultBlogId(value?: string) {
  const id = value || process.env.BLOGGER_BLOG_ID;
  if (!id) throw new Error("blogId is required. Set BLOGGER_BLOG_ID or pass blogId.");
  return id;
}

async function resolveBlogId(blogId?: string) {
  if (blogId) return blogId;
  if (process.env.BLOGGER_BLOG_ID) return process.env.BLOGGER_BLOG_ID;
  const url = process.env.BLOGGER_BLOG_URL;
  if (!url) throw new Error("Set BLOGGER_BLOG_ID or BLOGGER_BLOG_URL.");
  const data = await blogger(`/blogs/byurl?url=${encodeURIComponent(url)}`);
  return String(data.id);
}

async function themeBridge(path: string, init: RequestInit = {}) {
  const base = process.env.THEME_BRIDGE_URL;
  if (!base) {
    throw new Error("Theme XML is not available through Blogger API v3. Configure THEME_BRIDGE_URL for the IRKOP Theme Bridge.");
  }
  const response = await fetch(base.replace(/\/$/, "") + path, {
    ...init,
    headers: {
      authorization: process.env.THEME_BRIDGE_TOKEN ? `Bearer ${process.env.THEME_BRIDGE_TOKEN}` : "",
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Theme Bridge failed: ${response.status} ${await response.text()}`);
  return response.json();
}

const server = new McpServer({ name: "irkop-blogger-mcp", version: "0.1.0" });

server.registerTool("blogger_get_blog", {
  description: "Get Blogger blog metadata. Uses the configured default blog when blogId is omitted.",
  inputSchema: z.object({ blogId: z.string().optional() })
}, async ({ blogId }) => {
  const id = await resolveBlogId(blogId);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}`));
});

server.registerTool("blogger_list_posts", {
  description: "List Blogger posts, including draft/live status when authorized.",
  inputSchema: z.object({
    blogId: z.string().optional(),
    maxResults: z.number().int().min(1).max(500).optional(),
    status: z.enum(["live", "draft", "scheduled"]).optional(),
    fetchBodies: z.boolean().optional()
  })
}, async ({ blogId, maxResults = 20, status, fetchBodies = false }) => {
  const id = await resolveBlogId(blogId);
  const query = new URLSearchParams({ maxResults: String(maxResults), fetchBodies: String(fetchBodies) });
  if (status) query.set("status", status);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts?${query}`));
});

server.registerTool("blogger_get_post", {
  description: "Get one Blogger post by ID.",
  inputSchema: z.object({ blogId: z.string().optional(), postId: z.string() })
}, async ({ blogId, postId }) => {
  const id = defaultBlogId(blogId);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts/${encodeURIComponent(postId)}?view=ADMIN`));
});

server.registerTool("blogger_get_post_by_path", {
  description: "Get a post by Blogger URL path, for example /2026/08/example.html.",
  inputSchema: z.object({ blogId: z.string().optional(), path: z.string() })
}, async ({ blogId, path }) => {
  const id = defaultBlogId(blogId);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts/bypath?path=${encodeURIComponent(path)}&view=ADMIN`));
});

server.registerTool("blogger_create_post", {
  description: "Create a Blogger post. Use isDraft=true to create safely without publishing.",
  inputSchema: z.object({
    blogId: z.string().optional(),
    title: z.string().min(1),
    content: z.string().min(1),
    labels: z.array(z.string()).optional(),
    isDraft: z.boolean().default(true)
  })
}, async ({ blogId, title, content, labels, isDraft }) => {
  const id = defaultBlogId(blogId);
  const query = new URLSearchParams({ isDraft: String(isDraft) });
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts?${query}`, {
    method: "POST",
    body: JSON.stringify({ title, content, labels })
  }));
});

server.registerTool("blogger_update_post", {
  description: "Update an existing Blogger post.",
  inputSchema: z.object({
    blogId: z.string().optional(),
    postId: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    labels: z.array(z.string()).optional()
  })
}, async ({ blogId, postId, title, content, labels }) => {
  const id = defaultBlogId(blogId);
  const body: Record<string, unknown> = {};
  if (title !== undefined) body.title = title;
  if (content !== undefined) body.content = content;
  if (labels !== undefined) body.labels = labels;
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  }));
});

server.registerTool("blogger_publish_post", {
  description: "Publish an existing draft Blogger post.",
  inputSchema: z.object({ blogId: z.string().optional(), postId: z.string() })
}, async ({ blogId, postId }) => {
  const id = defaultBlogId(blogId);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/posts/${encodeURIComponent(postId)}/publish`, { method: "POST" }));
});

server.registerTool("blogger_list_pages", {
  description: "List Blogger static pages.",
  inputSchema: z.object({ blogId: z.string().optional(), fetchBodies: z.boolean().default(false) })
}, async ({ blogId, fetchBodies }) => {
  const id = defaultBlogId(blogId);
  return text(await blogger(`/blogs/${encodeURIComponent(id)}/pages?fetchBodies=${fetchBodies}&view=ADMIN`));
});

server.registerTool("irkop_theme_validate", {
  description: "Validate basic Blogger Theme XML structure before deployment.",
  inputSchema: z.object({ xml: z.string().min(1) })
}, async ({ xml }) => {
  const skinCount = (xml.match(/<b:skin\b/g) || []).length;
  const hasHtml = /<html\b/.test(xml);
  const hasBloggerNamespace = /xmlns:b=/.test(xml);
  const errors: string[] = [];
  if (skinCount !== 1) errors.push(`Theme must contain exactly one <b:skin>; found ${skinCount}.`);
  if (!hasHtml) errors.push("Missing <html> root.");
  if (!hasBloggerNamespace) errors.push("Missing Blogger xmlns:b namespace.");
  return text({ valid: errors.length === 0, skinCount, errors });
});

server.registerTool("irkop_theme_get", {
  description: "Get the active Blogger theme through the optional IRKOP Theme Bridge. Blogger API v3 itself does not expose Theme XML.",
  inputSchema: z.object({ blogUrl: z.string().url().optional() })
}, async ({ blogUrl }) => text(await themeBridge("/theme", { method: "POST", body: JSON.stringify({ blogUrl }) })));

server.registerTool("irkop_theme_update", {
  description: "Update Blogger Theme XML through the optional IRKOP Theme Bridge. This is intentionally separate because Blogger API v3 does not expose Theme XML upload.",
  inputSchema: z.object({
    blogUrl: z.string().url().optional(),
    xml: z.string().min(1),
    createBackup: z.boolean().default(true)
  })
}, async ({ blogUrl, xml, createBackup }) => {
  const validation = { skinCount: (xml.match(/<b:skin\b/g) || []).length };
  if (validation.skinCount !== 1) throw new Error(`Refusing theme update: expected exactly one <b:skin>, found ${validation.skinCount}.`);
  return text(await themeBridge("/theme", {
    method: "PUT",
    body: JSON.stringify({ blogUrl, xml, createBackup })
  }));
});

serveStdio(() => server);
