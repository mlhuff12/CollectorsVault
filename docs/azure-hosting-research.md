# Azure Hosting Research for Collectors Vault

This document summarizes research into Azure services that could be used to host the Collectors Vault application, with a focus on always-free (or near-free) tiers.

---

## Overview: Recommended Architecture

The current application consists of:
- **Frontend:** React + TypeScript
- **Backend:** ASP.NET Core Web API (.NET 8)
- **Database:** SQLite → moving to Azure SQL

A cost-effective, always-free Azure architecture for this lightly-used app would be:

| Role | Recommended Azure Service | Always Free? |
|------|--------------------------|--------------|
| Frontend (React) hosting | Azure Static Web Apps (Free tier) | ✅ Yes |
| Backend (ASP.NET Core API) hosting | Azure App Service (F1 Free tier) | ✅ Yes |
| Database (SQL Server) | Azure SQL Database (Free offer) | ✅ Yes (with limits) |
| Image / file storage | Azure Blob Storage (LRS Free tier) | ✅ Yes (with limits) |
| Serverless / background jobs | Azure Functions (Consumption plan) | ✅ Yes (with limits) |
| Queuing | Azure Service Bus (Basic tier) | ⚠️ Near-free (~$0.01/month) |
| Secrets management | Azure Key Vault | ⚠️ 12-month free trial only |

> **Important:** Azure does **not** automatically stop your app when free quotas are exceeded for most services — charges simply begin accruing. Set up [Azure Cost Management budget alerts](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets) to avoid surprise charges.

---

## 1. Azure Static Web Apps — Frontend Hosting

**Best fit for:** React (TypeScript) client app

### Always Free?

✅ **Yes — permanently free** on the Free tier.

### Free Tier Limits

| Limit | Value |
|-------|-------|
| Apps per subscription | 10 |
| Bandwidth per month | 100 GB |
| Storage per app environment | 250 MB |
| Total storage (all environments) | 500 MB |
| Custom domains per app | 2 |
| Staging environments | 3 |
| Max files per environment | 15,000 |
| Max HTTP request size | 30 MB |
| SLA | None |
| SSL certificates | ✅ Included (even on custom domains) |
| Global CDN | ✅ Included |
| CI/CD (GitHub / Azure DevOps) | ✅ Included |

### What You Get for Free

- Automatic builds and deployments from GitHub on every push.
- Global CDN for fast worldwide content delivery.
- Free SSL/TLS certificates including on custom domains.
- Up to 3 staging environments for pull request previews.
- Integrated managed Azure Functions for simple API backends (though the ASP.NET Core API should use App Service instead).
- Support for React, Angular, Vue, Next.js (static export), Blazor, and more.

### When You Would Need to Upgrade

Upgrade to Standard (~$9/month) if you need:
- SLA guarantees (99.95% uptime).
- More than 2 custom domains.
- Custom authentication providers (e.g., custom OpenID Connect).
- Private endpoint / VNet integration.
- More than 500 MB total storage.
- Bandwidth exceeding 100 GB/month (app is suspended if exceeded on Free tier).

### Resources

- [Azure Static Web Apps overview](https://learn.microsoft.com/en-us/azure/static-web-apps/overview)
- [Hosting plans (Free vs. Standard)](https://learn.microsoft.com/en-us/azure/static-web-apps/plans)
- [Quotas in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)
- [Deploy a React app to Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-react)
- [Pricing page](https://azure.microsoft.com/en-us/pricing/details/app-service/static/)

---

## 2. Azure App Service — Backend (ASP.NET Core API) Hosting

**Best fit for:** ASP.NET Core Web API (.NET 8)

### Always Free?

✅ **Yes — permanently free** on the F1 (Free) tier.

### Free Tier Limits

| Limit | Value |
|-------|-------|
| Apps per subscription | 10 |
| CPU time per day | 60 minutes |
| Memory per app | 1 GB |
| Disk storage | 1 GB |
| Custom domains | ❌ Not supported (`.azurewebsites.net` only) |
| SSL for custom domains | ❌ Not supported |
| Deployment slots | ❌ None |
| Auto-scaling | ❌ None (1 shared instance) |
| SLA | None |

> **CPU quota:** If your app uses all 60 CPU minutes in a day, it is suspended until midnight UTC. For a lightly-used personal app this is unlikely to be an issue, but keep it in mind.

### Supported Runtimes

- .NET (all recent LTS versions including .NET 8)
- Node.js, Python, Java, PHP, Ruby

### What You Get for Free

- Easy deploy from Visual Studio, GitHub Actions, or Azure CLI.
- Swagger UI accessible at the deployed URL.
- Application logs viewable in the Azure portal.
- HTTPS on the `.azurewebsites.net` domain at no cost.

### Consideration: App Service vs. Azure Container Apps

For a simple ASP.NET Core API, **App Service F1** is the simplest path. If the app is later containerized, **Azure Container Apps** (Consumption plan) is an alternative with its own always-free allocation:

| Metric | Free Allocation |
|--------|----------------|
| vCPU-seconds | 180,000/month |
| GiB-seconds | 360,000/month |
| Requests | 2,000,000/month |

Container Apps scale to zero, so idle time incurs no charges.

### When You Would Need to Upgrade

Upgrade to at least Basic B1 (~$13/month) if you need:
- Custom domain with SSL.
- More than 60 CPU minutes/day reliably.
- Deployment slots (staging/production swap).
- Reliable uptime SLA.

### Resources

- [Azure App Service overview](https://learn.microsoft.com/en-us/azure/app-service/overview)
- [App Service hosting plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [App Service pricing (F1 Free tier)](https://azure.microsoft.com/en-us/pricing/details/app-service/windows/)
- [Deploy ASP.NET Core to Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-dotnetcore)
- [Azure Container Apps pricing (alternative)](https://azure.microsoft.com/en-us/pricing/details/container-apps/)

---

## 3. Azure SQL Database — Relational Database

**Best fit for:** Replacing the current SQLite database with a managed SQL Server-compatible database.

### Always Free?

✅ **Yes — permanently free** within monthly quotas (one free database per subscription).

### Free Offer Limits

| Limit | Value |
|-------|-------|
| Free databases per subscription | 1 |
| vCore-seconds per month | 100,000 (up to 10 free DBs = 1,000,000) |
| Data storage | 32 GB |
| Backup storage | 32 GB |
| Service tier | General Purpose (Serverless) |
| Compute tier | Serverless (auto-pause/resume) |
| SLA | None |

> **Auto-pause behavior:** When the free monthly vCore quota is reached, the database pauses automatically and resumes at the start of the next calendar month. You can optionally allow the database to continue running on a paid basis when the quota is exceeded.

### What You Get for Free

- Full SQL Server compatibility (T-SQL, stored procedures, etc.).
- 32 GB of data storage — plenty for a personal collection app.
- Automatic backups included.
- Connection via standard SQL Server connection strings.
- Can use Entity Framework Core migrations to manage the schema.

### Migration Path from SQLite

The app currently uses SQLite with EF Core. Migrating to Azure SQL requires:
1. Change the EF Core provider from `Microsoft.EntityFrameworkCore.Sqlite` to `Microsoft.EntityFrameworkCore.SqlServer`.
2. Update the connection string in `appsettings.json` (store it in Azure Key Vault or App Service configuration, **not** in source control).
3. Re-run `dotnet ef migrations add InitialSqlServer` if the schema differs.

### When You Would Need to Upgrade

The free tier is paused when the 100,000 vCore-second monthly quota is reached. For a lightly-used personal app this is unlikely to be an issue. Upgrade to a paid tier if:
- You need guaranteed uptime (no auto-pause).
- Your query volume requires more than ~33 vCore-seconds/day on average.
- You require a production SLA.

### Resources

- [Azure SQL Database free offer overview](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql)
- [Free offer FAQ](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer-faq?view=azuresql)
- [Azure SQL Database pricing](https://azure.microsoft.com/en-us/pricing/details/azure-sql-database/single/)
- [EF Core with Azure SQL](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/)

---

## 4. Azure Blob Storage — Image / File Storage

**Best fit for:** Storing small cover art images for books, movies, and games.

### Always Free?

✅ **Yes — permanently free** within monthly quotas.

### Free Tier Limits (Locally Redundant Storage — LRS)

| Limit | Value |
|-------|-------|
| Storage capacity | 5 GB |
| Read operations | 20,000 per month |
| Write operations | 10,000 per month |
| Data transfer (egress) | 100 GB/month (subscription-wide) |
| Redundancy | LRS (single region) |

### What You Get for Free

- Object storage for binary files (images, thumbnails, documents).
- Publicly accessible blob URLs for serving images directly to the browser.
- Static website hosting (can serve a single-page app if not using Static Web Apps).
- Access via Azure SDKs, REST API, or `BlobServiceClient` in .NET.
- SAS (Shared Access Signature) tokens for time-limited or permission-scoped access.

### Recommended Use for Collectors Vault

Store cover art images uploaded by the user:
- Blob container: `covers`
- Naming convention: `covers/{collectionType}/{itemId}.jpg`
- Retrieve image URLs directly from blob storage and store the URL in the SQL database rather than storing binary data.

### When You Would Need to Upgrade

For a personal collection app, 5 GB and 20,000 reads/month is very generous. You would need to upgrade if:
- Total images exceed 5 GB (unlikely for a personal app).
- Read operations exceed 20,000/month (unlikely for a small user base).
- You need geo-redundancy or higher durability (GRS/RAGRS).

### Resources

- [Azure Blob Storage overview](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction)
- [Azure Storage pricing (free tier)](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/)
- [Azure free services list](https://azure.microsoft.com/en-us/pricing/free-services/)
- [.NET SDK: BlobServiceClient](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-dotnet)

---

## 5. Azure Functions — Serverless / Background Jobs

**Best fit for:** Event-driven tasks, background processing, scheduled jobs (e.g., syncing metadata, sending notifications, processing queue messages).

### Always Free?

✅ **Yes — permanently free** within monthly quotas (Consumption plan).

### Free Tier Limits

| Limit | Value |
|-------|-------|
| Executions per month | 1,000,000 |
| Resource consumption | 400,000 GB-seconds per month |
| Execution timeout | 5 minutes (default), up to 10 minutes |
| Supported languages | C#, JavaScript/TypeScript, Python, Java, PowerShell |
| SLA | None |

> **Note:** Azure Functions requires a backing Storage Account (for state/triggers). This storage account consumption counts against the Blob Storage free tier limits above.

### What You Get for Free

- 1 million function executions/month is extremely generous for a personal app.
- HTTP triggers, Timer triggers (cron), Queue triggers (Service Bus / Storage Queue), Blob triggers.
- Durable Functions for multi-step orchestration workflows.
- Cold start latency on the Consumption plan (first request after idle may be 1–3 seconds slower).

### Potential Use Cases for Collectors Vault

- **Scheduled metadata refresh:** Nightly function to re-fetch book/movie/game covers from external APIs and update Blob Storage.
- **Queue consumer:** Process queued image upload or notification tasks asynchronously.
- **Webhook receiver:** Handle webhooks from external services.

### When You Would Need to Upgrade

The free quota is very unlikely to be exceeded for a personal app. Upgrade to Premium or Dedicated plan only if:
- Cold starts are unacceptable (Premium plan has pre-warmed instances).
- VNet integration is required.
- Execution timeout exceeds 10 minutes.

### Resources

- [Azure Functions overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview)
- [Azure Functions pricing](https://azure.microsoft.com/en-us/pricing/details/functions/)
- [Azure Functions consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan)
- [Create your first C# function](https://learn.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-csharp)

---

## 6. Azure Service Bus — Message Queuing

**Best fit for:** Asynchronous message passing between components (e.g., queuing image processing jobs, decoupling the API from background workers).

### Always Free?

⚠️ **No — not truly free, but very cheap.**

Azure Service Bus has no always-free tier. The **Basic tier** is pay-as-you-go at **$0.05 per million operations** with no base monthly charge:

| Tier | Base charge | Per million ops | Features |
|------|-------------|-----------------|----------|
| Basic | $0.00/month | $0.05 | Queues only, 256 KB messages |
| Standard | $10.00/month | Volume pricing | Queues + Topics, sessions, transactions |
| Premium | ~$0.928/hr | — | Dedicated resources, 1–100 MB messages |

For a lightly-used personal app processing only a few hundred messages per month, your monthly cost on the Basic tier would be essentially **$0.00–$0.01/month**.

### Basic Tier Limitations

- **Queues only** — no Topics or Subscriptions.
- Max message size: **256 KB**.
- No message sessions, transactions, or auto-forwarding.
- Max message TTL: 14 days.
- Max namespace: 1,000 queues.

### Alternative: Azure Storage Queue (Always Free)

Azure **Storage Queue** is included within the Blob Storage free tier (covered above) and supports basic FIFO queuing with no extra cost. It is simpler than Service Bus and suitable for lightweight scenarios:

| Feature | Storage Queue | Service Bus Basic |
|---------|--------------|-------------------|
| Cost | Free (part of storage) | ~$0.05/million ops |
| Max message size | 64 KB | 256 KB |
| Message TTL | 7 days | 14 days |
| Topics/Subscriptions | ❌ | ❌ (Basic) |
| At-least-once delivery | ✅ | ✅ |
| Dead-letter queue | ❌ | ✅ |

**Recommendation:** Start with **Azure Storage Queue** (free) for simple background task queuing. Graduate to **Service Bus** if you need dead-lettering, longer TTL, or eventual topic/subscription fan-out.

### Resources

- [Azure Service Bus overview](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview)
- [Service Bus pricing](https://azure.microsoft.com/en-us/pricing/details/service-bus/)
- [Service Bus vs. Storage Queue comparison](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-azure-and-service-bus-queues-compared-contrasted)
- [Azure Storage Queue overview](https://learn.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction)

---

## 7. Azure Key Vault — Secrets Management

**Best fit for:** Storing database connection strings, API keys, and other secrets outside of source code and application configuration files.

### Always Free?

⚠️ **No — Key Vault is not in the always-free tier.** It is included in the **12-month free trial** period, after which standard pay-as-you-go rates apply.

### Pricing (post-trial)

| Operation type | Price |
|----------------|-------|
| Secrets operations (Get, Set, List, Delete) | $0.03 per 10,000 transactions |
| Certificate operations | $3.00 per certificate renewal |
| HSM-backed keys | $1.00/key/month |
| Software-protected keys | $0.03 per 10,000 transactions |

For a personal app making only a few hundred reads per day, monthly cost is typically **$0.01–$0.10**.

### What You Get

- Centralized, audited storage for secrets, keys, and certificates.
- Secrets accessible via the Azure SDK (`SecretClient`) or via App Service's built-in **Key Vault references** feature (no code changes needed — just reference `@Microsoft.KeyVault(SecretUri=...)` in App Service environment variables).
- Role-based access control (RBAC) to restrict who/what can read secrets.

### Key Best Practices for Collectors Vault

1. **Never** commit connection strings or API keys to source control.
2. Store the Azure SQL connection string, Blob Storage connection string, and any external API keys (e.g., Google Books API key) in Key Vault.
3. Use the [App Service Key Vault reference](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) pattern — App Service fetches the secret at startup with no code changes.
4. Enable the App Service or Function App's **managed identity** to authenticate to Key Vault without storing any credentials.

### Near-Free Approach: App Service Configuration

For a personal project on the free tier where Key Vault cost is a concern, you can store secrets directly in **App Service Application Settings** (environment variables in the Azure portal). These are:
- Encrypted at rest by Azure.
- Not committed to source code.
- Free of charge.

This is an acceptable approach for a personal app. Use Key Vault when the app needs to share secrets across multiple services or when audit logging of secret access is important.

### Resources

- [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Key Vault pricing](https://azure.microsoft.com/en-us/pricing/details/key-vault/)
- [Key Vault service limits](https://learn.microsoft.com/en-us/azure/key-vault/general/service-limits)
- [App Service Key Vault references](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
- [Managed identity for App Service](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity)

---

## 8. Azure Monitor / Application Insights — Observability

**Best fit for:** Monitoring API health, tracking errors, logging telemetry.

### Always Free?

⚠️ **Partially free.** Application Insights offers a permanently free data ingestion quota of **5 GB per month**. Data is retained for **90 days** for free.

| Metric | Free Allocation |
|--------|----------------|
| Data ingestion | 5 GB/month |
| Data retention | 90 days |
| Alerts (metric-based) | ✅ Free |
| Availability tests | 1 test free |

For a lightly-used personal app, 5 GB/month is more than sufficient — typical telemetry for a small app is a few MB/month.

### Resources

- [Application Insights overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)

---

## Summary: Complete Free Architecture for Collectors Vault

```
┌─────────────────────────────────────────────────────────────────┐
│                      Collectors Vault on Azure                  │
│                                                                 │
│  ┌─────────────────────┐    ┌────────────────────────────────┐  │
│  │ Azure Static Web    │    │ Azure App Service (F1 Free)    │  │
│  │ Apps (Free tier)    │───▶│ ASP.NET Core Web API (.NET 8)  │  │
│  │ React + TypeScript  │    │ azurewebsites.net              │  │
│  └─────────────────────┘    └────────────────────────────────┘  │
│                                         │                       │
│                              ┌──────────┼──────────┐           │
│                              ▼          ▼          ▼           │
│                    ┌──────────────┐ ┌────────┐ ┌──────────┐   │
│                    │ Azure SQL DB │ │  Blob  │ │  Azure   │   │
│                    │ (Free offer) │ │Storage │ │Functions │   │
│                    │ 32 GB / mo   │ │ 5 GB   │ │1M exec/mo│   │
│                    └──────────────┘ └────────┘ └──────────┘   │
│                                                     │          │
│                                         ┌───────────┘          │
│                                         ▼                      │
│                                  ┌─────────────┐              │
│                                  │  Storage    │              │
│                                  │  Queue      │              │
│                                  │  (free)     │              │
│                                  └─────────────┘              │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────┐   │
│  │ Azure Key Vault │    │ Azure Monitor / App Insights     │   │
│  │ (12-mo free,    │    │ 5 GB free / month                │   │
│  │ then ~$0.05/mo) │    └─────────────────────────────────┘   │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Monthly Cost Estimate (Steady State, Lightly Used)

| Service | Expected monthly cost |
|---------|-----------------------|
| Azure Static Web Apps | **$0.00** |
| Azure App Service (F1) | **$0.00** |
| Azure SQL Database (free offer) | **$0.00** |
| Azure Blob Storage | **$0.00** |
| Azure Functions (Consumption) | **$0.00** |
| Azure Storage Queue | **$0.00** |
| Azure Key Vault | **~$0.01–$0.10** (after 12-month trial) |
| Azure Monitor / App Insights | **$0.00** |
| **Total** | **~$0.00–$0.10/month** |

> **Note:** This estimate assumes usage stays within the free tier limits. Always configure [Azure Cost Management budget alerts](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets) to receive a notification if any service starts incurring charges.

---

## Monitoring Usage and Setting Up Alerts

Staying within Azure's free tier limits requires actively watching how much of each quota you have consumed. This section explains how to view current usage for each service and how to set up alerts that notify you before limits are exceeded or costs begin.

---

### Viewing Current Usage

#### Central View: Subscription → Usage + Quotas

The quickest way to see all service quotas in one place:

1. In the [Azure portal](https://portal.azure.com/), open **Subscriptions** and select your subscription.
2. In the left menu under **Settings**, click **Usage + quotas**.
3. Use the **Provider** and **Location** dropdowns to filter by service type (e.g., `Microsoft.Web` for App Service, `Microsoft.Sql` for SQL Database, `Microsoft.Storage` for Blob Storage).
4. The list shows your current usage and the limit for each resource.

Alternatively, search for **"Quotas"** in the portal search bar to open the dedicated Azure Quotas hub, which provides a centralized view across all subscriptions and resource providers.

- [Quotas overview – Microsoft Learn](https://learn.microsoft.com/en-us/azure/quotas/quotas-overview)
- [View quotas in the Azure portal – Microsoft Learn](https://learn.microsoft.com/en-us/azure/quotas/view-quotas)
- [Check resource usage against limits – Microsoft Learn](https://learn.microsoft.com/en-us/azure/networking/check-usage-against-limits)

---

#### Per-Service Usage: Where to Look

**Azure App Service (F1 — CPU Quota)**

The most critical limit on the free tier is 60 CPU minutes/day.

1. Open your App Service in the portal.
2. In the left menu under **Monitoring**, click **Quotas**.
3. The **CPU (Short)**, **CPU (Day)**, **Memory**, **Bandwidth**, and **File System** usage bars are shown, each with a current value and daily/5-minute cap.
4. When CPU (Day) reaches its limit, the app is automatically suspended until UTC midnight.

- [Monitor an App Service app – Microsoft Learn](https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor)

---

**Azure SQL Database (Free Offer — vCore Seconds)**

1. Open your SQL Database in the portal.
2. In the left menu under **Monitoring**, click **Metrics**.
3. Select the metric `vCores` or review the **SQL Database free offer usage** in the database's **Overview** blade — a progress bar shows how many of the 100,000 free vCore-seconds have been consumed this month.
4. Alternatively, run this T-SQL query to view current consumption:
   ```sql
   SELECT * FROM sys.dm_db_resource_stats;
   ```

- [Azure SQL Database free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql)

---

**Azure Blob Storage (Capacity and Operation Counts)**

1. Open your Storage Account in the portal.
2. In the left menu under **Monitoring**, click **Metrics**.
3. Add the following metrics to the chart:
   - `Used Capacity` — total bytes stored (free limit: 5 GB).
   - `Transactions` — total operations (free limits: 20,000 reads, 10,000 writes/month).
4. Set the **Time range** to "Last 30 days" and **Granularity** to "1 month" for a clear monthly total.

- [Monitor Azure Blob Storage – Microsoft Learn](https://learn.microsoft.com/en-us/azure/storage/blobs/monitor-blob-storage)

---

**Azure Functions (Execution Count)**

1. Open your Function App in the portal.
2. In the left menu under **Monitoring**, click **Metrics**.
3. Add the metric `Function Execution Count` to see the total executions for the current period.
4. Alternatively, open **Application Insights** (if linked) and query:
   ```kusto
   requests
   | summarize count() by bin(timestamp, 1d)
   | order by timestamp desc
   ```

- [Monitor Azure Functions – Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-functions/monitor-functions)

---

**Azure Cost Management: Overall Spend**

This is the most important view — it shows actual and forecasted charges across all services.

1. Search for **Cost Management** in the portal.
2. Click **Cost analysis**.
3. Set the scope to your subscription or resource group (e.g., `collectors-vault-rg`).
4. Use the **Accumulated costs** view to see spend so far this month alongside a forecast.
5. Drill down by **Service name** to see which resource is generating cost.

- [Start analyzing costs – Microsoft Learn](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-acm-cost-analysis)

---

### Setting Up Alerts

#### 1. Azure Cost Management Budget Alert (Recommended First Step)

This alert fires when your total Azure spend reaches a dollar threshold. It is the most important safety net for the free tier.

**Steps:**

1. In the portal, open **Cost Management + Billing** → **Cost Management** → **Budgets**.
2. Click **+ Add**.
3. Configure the budget:
   - **Scope:** Your subscription (or the `collectors-vault-rg` resource group for tighter scope).
   - **Name:** e.g., `collectors-vault-monthly`
   - **Reset period:** Monthly
   - **Amount:** `$1` (catches any unexpected charges immediately)
4. On the **Set alerts** step, add two thresholds:
   - `80%` of budget (= $0.80) → **Alert type: Actual** → add your email address.
   - `100%` of budget (= $1.00) → **Alert type: Actual** → add your email address.
5. Click **Create**.

> **Note:** Budget alerts are evaluated every 24 hours and do **not** automatically stop resources. They only send notifications.

- [Tutorial: Create and manage budgets – Microsoft Learn](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
- [Monitor usage and spending with cost alerts – Microsoft Learn](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending)

---

#### 2. Azure Monitor Metric Alert — App Service CPU Quota

Receive an email before the daily 60-minute CPU cap is hit.

**Steps:**

1. Open your App Service → **Monitoring** → **Alerts**.
2. Click **+ Create** → **Alert rule**.
3. Under **Condition**, click **Add condition** and search for `CPU Percentage`.
4. Set **Threshold type:** Static, **Operator:** Greater than, **Threshold value:** `80` (80% CPU, giving you a warning before suspension).
5. Set the **Aggregation type:** Average, **Period:** 5 minutes.
6. Under **Actions**, click **Add action group** → create a new group with your email as the notification target.
7. Give the alert a name (e.g., `app-service-cpu-high`) and click **Create**.

- [Create a metric alert for an Azure resource – Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/tutorial-metric-alert)

---

#### 3. Azure Monitor Metric Alert — Blob Storage Capacity

Receive an email before the 5 GB free storage limit is approached.

**Steps:**

1. Open your Storage Account → **Monitoring** → **Alerts**.
2. Click **+ Create** → **Alert rule**.
3. Under **Condition**, search for `Used Capacity`.
4. Set **Threshold value:** `4294967296` (4 GB in bytes = 4 × 1,073,741,824 — 80% of the 5 GB free limit).
5. Set **Aggregation type:** Average, **Period:** 1 hour.
6. Attach your email via an action group (or reuse the one created above).
7. Name the alert (e.g., `blob-storage-capacity-warning`) and click **Create**.

---

#### 4. Azure Monitor Metric Alert — Azure Functions Execution Count

Receive a warning when function executions approach the 1 million/month free limit.

**Steps:**

1. Open your Function App → **Monitoring** → **Alerts**.
2. Click **+ Create** → **Alert rule**.
3. Under **Condition**, search for `Function Execution Count`.
4. Set **Threshold value:** `800000` (800K executions — 80% of the 1M free limit) with **Aggregation:** Total and the longest available **Period** (Azure Monitor supports up to 6 hours for this metric; for a monthly cumulative view use **Cost Management** or **Application Insights** instead).
5. Attach your action group and name the alert (e.g., `functions-execution-warning`).

> **Tip:** For a true monthly execution count, check the **Function App → Monitoring → Metrics** blade and set the time range manually to "Last 30 days" to get a cumulative view. Azure Monitor metric alerts work on rolling windows (max ~6 hours to 1 day), so they are best used for catching sudden spikes rather than monthly totals.

---

#### 5. Azure SQL Database — Monitor for Auto-Pause Risk

Azure SQL's free tier auto-pauses the database when 100,000 vCore-seconds/month are consumed. You can create an alert to warn you before this happens.

**Steps:**

1. Open your Azure SQL Database → **Monitoring** → **Alerts**.
2. Click **+ Create** → **Alert rule**.
3. Under **Condition**, search for `CPU percentage`.
4. Set **Threshold value:** `75` (75% sustained CPU) as a proxy for heavy vCore consumption.
5. Attach your action group and name the alert (e.g., `sql-high-cpu-warning`).

> For a direct vCore-second consumption alert, you can also set up an **Azure Monitor scheduled query alert** using a Log Analytics workspace to query `sys.dm_db_resource_stats` periodically, though this is more advanced.

- [Monitor Azure SQL Database – Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-sql-database-azure-monitor?view=azuresql)

---

### Quick Reference: Where to Find Usage for Each Service

| Service | Usage location in Azure portal |
|---------|-------------------------------|
| App Service CPU quota | App Service → Monitoring → **Quotas** |
| Azure SQL vCore usage | SQL Database → Overview (free offer progress bar) or → Monitoring → **Metrics** |
| Blob Storage capacity | Storage Account → Monitoring → **Metrics** → `Used Capacity` |
| Blob Storage operations | Storage Account → Monitoring → **Metrics** → `Transactions` |
| Azure Functions executions | Function App → Monitoring → **Metrics** → `Function Execution Count` |
| Overall spend (all services) | **Cost Management** → Cost analysis |
| All quota limits by subscription | **Subscriptions** → Usage + quotas |

---

## Potential Gotchas and Recommendations

### 1. Free Tier Does Not Hard-Stop Usage
Azure does not automatically shut down your services when free quotas are exceeded — charges begin immediately. Set a **$1/month budget alert** in Azure Cost Management as a safety net.

### 2. App Service F1 CPU Quota
The 60 CPU-minutes/day limit is sufficient for a personal app. If the app is ever under unexpectedly heavy load (e.g., repeated Swagger testing), it will be suspended until midnight UTC. Monitor CPU usage in the App Service metrics blade.

### 3. Azure SQL Auto-Pause
The free SQL Database pauses when the monthly vCore quota is used. For light usage this is unlikely to trigger, but if it does, the database resumes at the beginning of the next calendar month.

### 4. No Custom Domain on App Service F1
The backend API will only be accessible on `<appname>.azurewebsites.net`. Custom domains require the B1 tier ($13/month). For a personal app the subdomain is acceptable.

### 5. Cold Starts on Azure Functions
The Consumption plan may have cold starts of 1–3 seconds after idle periods. For background jobs (queue processing, scheduled tasks) this is fine. For API requests that need low latency, consider using App Service for the main API.

### 6. Key Vault Not Always Free
Key Vault is included in the 12-month free trial but is not an always-free service. For a personal app, the cost post-trial is negligible (~$0.01–$0.10/month), but if cost is a concern, storing secrets in App Service Application Settings is a free alternative.

### 7. Static Web Apps Bandwidth Limit
The free tier allows 100 GB/month. If this is exceeded, the app is suspended (not just throttled). This would require hundreds of thousands of page loads per month, which is unlikely for a personal app.

---

## Getting Started Checklist

- [ ] Create a free Azure account at [azure.microsoft.com/free](https://azure.microsoft.com/en-us/free/)
- [ ] Create a Resource Group (e.g., `collectors-vault-rg`) to organize all services
- [ ] Deploy the React client to **Azure Static Web Apps** (connect to GitHub for automatic CI/CD)
- [ ] Deploy the ASP.NET Core API to **Azure App Service** (F1 tier)
- [ ] Create an **Azure SQL Database** (free offer) and update EF Core provider
- [ ] Create a **Storage Account** and a `covers` Blob container for images
- [ ] Store all connection strings and API keys in **App Service Application Settings** (or Key Vault)
- [ ] Set up a **$1/month budget alert** in Azure Cost Management (Cost Management → Budgets → + Add)
- [ ] Set up an **App Service CPU alert** (App Service → Monitoring → Alerts → CPU Percentage > 80%)
- [ ] Set up a **Blob Storage capacity alert** (Storage Account → Monitoring → Alerts → Used Capacity > 4 GB)
- [ ] Set up an **Azure Functions execution alert** (Function App → Monitoring → Alerts → Execution Count > 800,000)
- [ ] Optionally enable **Application Insights** for telemetry (free up to 5 GB/month)
- [ ] Bookmark the **Cost Management → Cost analysis** page to check monthly spend at a glance

---

*Research conducted: March 2026. Azure pricing and free tier limits are subject to change. Always verify against the current [Azure pricing page](https://azure.microsoft.com/en-us/pricing/) and [Azure free services page](https://azure.microsoft.com/en-us/pricing/free-services/) before deploying.*
