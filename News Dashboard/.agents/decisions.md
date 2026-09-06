# Decision log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-09-01 | Build a personal, Korean-publisher-only dashboard first. | Keep the MVP focused; public release is deferred. |
| 2026-09-01 | Use eight tabs; default to domestic stocks. | Supports the user's monitoring priorities. |
| 2026-09-01 | Refresh news six times daily in KST, initially targeted at 06:00–21:00 every three hours. | Avoid overnight work while retaining regular monitoring; exact minute superseded on 2026-09-06. |
| 2026-09-01 | Keep market data at latest daily close. | Avoid real-time data cost and complexity. |
| 2026-09-01 | Use cards for five ranked articles and a table for the other fifteen. | Preserves focus while reducing AI-summary calls. |
| 2026-09-01 | Use browser-local read and theme state. | Avoid account and sync infrastructure. |
| 2026-09-01 | Target free tiers and preserve content when AI summaries fail. | Keep the personal MVP free and resilient. |
| 2026-09-06 | Protect the deployed dashboard with Cloudflare Access using the owner's Cloudflare identity, without building application accounts or login UI. | Keeps licensed personal-use data access-controlled without adding account infrastructure. |
| 2026-09-06 | Run news refreshes at 06:07, 09:07, 12:07, 15:07, 18:07, and 21:07 KST. | Supersedes the exact-minute portion of the 2026-09-01 schedule decision to reduce top-of-hour CI delay/drop risk. |
