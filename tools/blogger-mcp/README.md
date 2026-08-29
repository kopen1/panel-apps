# IRKOP Blogger MCP Connector

MCP connector for the IRKOP ecosystem and Google Blogger API v3.

## What works now

- Get blog metadata
- List posts
- Get posts by ID or URL path
- Create draft/live posts
- Update posts
- Publish drafts
- List static pages
- Validate Blogger Theme XML

The Blogger API v3 officially exposes blog, post, page, comment and related resources, but not Blogger Theme XML upload/update. Therefore theme operations are implemented through an optional **IRKOP Theme Bridge**, rather than pretending the official API supports them. citeturn1search0turn1search1turn1search8

## Authentication

Preferred production configuration:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
BLOGGER_BLOG_ID=
```

The connector refreshes a Google OAuth access token automatically.

For temporary development:

```
BLOGGER_ACCESS_TOKEN=
```

Never commit secrets.

## IRKOP Theme Bridge

Set:

```
THEME_BRIDGE_URL=https://your-bridge.example
THEME_BRIDGE_TOKEN=
```

Expected endpoints:

- `POST /theme` — return active theme
- `PUT /theme` — receive `{ blogUrl, xml, createBackup }`

The bridge is deliberately isolated because direct theme management is outside the documented Blogger API v3 resource model.

## Run

```bash
cd tools/blogger-mcp
npm install
cp .env.example .env
npm run dev
```

## MCP tools

- `blogger_get_blog`
- `blogger_list_posts`
- `blogger_get_post`
- `blogger_get_post_by_path`
- `blogger_create_post`
- `blogger_update_post`
- `blogger_publish_post`
- `blogger_list_pages`
- `irkop_theme_validate`
- `irkop_theme_get`
- `irkop_theme_update`

## Next IRKOP phase

1. Add remote Streamable HTTP transport.
2. Add Google OAuth authorization flow for the connector.
3. Build the Theme Bridge with authenticated browser/session automation only if a supported Blogger theme endpoint is unavailable.
4. Connect the MCP service to the IRKOP Panel so content, SEO and project publishing are managed from one ecosystem.

The MCP server is based on the official TypeScript MCP SDK. citeturn0search0turn0search5
