# Infrastructure Deployment Guide 📦

> ⚠️ **Notice for developers:** The infrastructure pipeline is currently turned *off* while the
> project is in early development. All jobs will be skipped unless `RUN_INFRA` is explicitly set
> to `true` or you manually invoke the destroy workflow. This guide documents the full setup so you
> can enable and run it when the time is right.
>
> (See the **Controlling pipeline execution** section below for details.)

This document outlines the structure of the infrastructure-as-code project and describes how to deploy and manage
resources both locally and via GitHub Actions. It includes configuration details, workflow explanations, and
procedures for rollback and destruction.

## Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Configuration Variables](#configuration-variables)
4. [Local Usage](#local-usage)
5. [CI/CD Behavior](#cicd-behavior)
   * [Bootstrapping the Backend](#bootstrapping-the-backend)
   * [Plan and Apply](#plan-and-apply)
   * [Destroy (tear‑down)](#destroy-tear-down)
   * [Rolling Back to a Previous Configuration](#rolling-back-to-a-previous-configuration)
6. [Extending the Configuration](#extending-the-configuration)
7. [Sensitive Data](#sensitive-data)

## Overview

The repository now includes an `infra` directory containing Terraform configuration. The design goals are:

1. Declarative resource definition using Terraform.
2. Idempotent operations – running the scripts multiple times only creates missing resources.
3. Secrets and configuration supplied through GitHub repository secrets/variables.
4. Automatic execution on merges to the `main` branch via a GitHub Actions workflow.

## Directory layout

```
/infra
  ├── main.tf              # root configuration invoking modules
  ├── variables.tf         # input variable definitions
  ├── outputs.tf           # values exposed after apply
  ├── README.md            # human-friendly overview
  ├── modules/             # re-usable components (rg, key vault, sql, app service)
  │    ├── resource_group/
  │    ├── key_vault/
  │    ├── sql/
  │    └── app_service/
  └── scripts/
       ├── deploy.ps1      # wrapper to run terraform locally
       └── bootstrap-backend.ps1  # create backend RG/SA/container if missing
```

The workflow lives in `.github/workflows/infra.yml` and is triggered on pushes to `main`.

## Prerequisites

* **Terraform 1.0+** installed locally or available in CI runner (the workflow uses `hashicorp/setup-terraform`).
* **GitHub secrets and variables** configured. The workflow and Terraform require the following values; note that the `TF_STATE_*` entries are simply names for an existing backend—they are **not created** by this project and don’t require any credentials beyond the name.  **Best practice is to host the backend storage account and container in a dedicated resource group** (separate from the application RG) so that deleting or destroying the app group never interferes with your state store.

## Configuration Variables

The following table lists every secret or variable consumed by the infrastructure.  Values marked
"secret" should be stored in GitHub Secrets; others may be set as repository Variables or via
environment variables when running locally.

  | Name | Description | Type | Example/Notes |
  |------|-------------|------|---------------|
  | `AZURE_CLIENT_ID` | Service principal client ID | secret | used in azure/login action (OIDC) |
  | `AZURE_TENANT_ID` | Azure tenant ID | secret |   |
  | `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | secret |   |
  | `TF_STATE_RG` | Resource group for Terraform backend state (existing RG name) | secret | backend resources must be provisioned outside this project; typically a dedicated RG separate from the app resources |
  | `TF_STATE_SA` | Storage account for backend state (existing account name) | secret | same as above; required by `terraform init` but not managed here |
  | `TF_STATE_CONTAINER` | Blob container name for state | secret | default `tfstate`; container also must already exist |
  | `SQL_ADMIN_LOGIN` | SQL server administrator login | secret | used by SQL module |
  | `SQL_ADMIN_PASSWORD` | SQL server administrator password | secret | marked sensitive |
  | `resource_group_name` | Name of the primary resource group | variable | default `collectorsvault-rg` |
  | `location` | Azure region for resources | variable | default `eastus` |
  | `key_vault_name` | Azure Key Vault name | variable | default `collectorsvault-kv` |
  | `sql_server_name` | Azure SQL server name | variable | default `collectorsvault-sqlsrv` |
  | `sql_database_name` | SQL database name | variable | default `collectorsvault-db` |
  | `app_service_plan_name` | App Service plan name | variable | default `collectorsvault-plan` |
  | `app_service_name` | App Service name | variable | default `collectorsvault-app` |
  | `RUN_TF_APPLY` | Flag to enable `terraform apply` step (value `true` to run) | variable | optional |

> All non-sensitive variables may also be set via environment variables in the workflow or
> local shell; sensitive values should be stored as GitHub secrets.  Defaults are provided for
> many names so you usually only need to override the backend and SQL credentials.

* You can adapt the provider and backend for AWS, GCP, or another provider if desired; adjust the workflow accordingly.

> You can adapt the provider and backend for AWS, GCP, or another provider if desired; adjust the workflow
> accordingly.

## Local Usage

1. Install Terraform and ensure you have logged in with the appropriate Azure credentials.
2. Set the backend variables in your session:

```powershell
$env:TF_STATE_RG = "my-state-rg"
$env:TF_STATE_SA = "mystatestorage"
$env:TF_STATE_CONTAINER = "tfstate"
```

3. (Optional) bootstrap the backend locally if the state storage does not yet exist. You can run the
   provided PowerShell helper to create the RG/account/container using the same `TF_STATE_*`
   environment variables:

   ```powershell
   cd infra/scripts
   ./bootstrap-backend.ps1
   ```

4. (Optional) you may disable all infrastructure operations locally by ensuring the
   `RUN_INFRA` variable is not set to `true` (e.g. `SET RUN_INFRA=false`); both the bootstrap and deploy
   scripts will exit immediately.

5. Run the main helper script:

```powershell
cd infra
scripts\deploy.ps1           # applies configuration
scripts\deploy.ps1 -PlanOnly  # just show plan
```

6. **Unit testing** – execute the helper under `tests/`:  

```powershell
powershell -File tests\infra-validate.ps1
```

This script copies the configuration to a temporary folder, sets dummy variables and runs
`terraform validate`, providing a quick integrity check before deploying.

The script initializes the backend if necessary and applies the configuration.

> **Review the plan locally:**
>
> * Run `scripts\deploy.ps1 -PlanOnly` or directly use `terraform plan -out=tfplan.out`.
> * Inspect the plan output in the console or with `terraform show tfplan.out`.
> * Make sure the actions (create/change/destroy) match your expectations before applying.

Terraform will create resources only if they do not already exist (its operations are idempotent).  In the current setup the configuration includes:

* **resource group** – this is declared in the module and will be created by Terraform if it doesn’t already exist. You don’t need to pre‑provision it.
* Azure Key Vault for storing application secrets
* SQL Server + Database for the API
* App Service plan and App Service hosting the C# API

## CI/CD Behavior

The `infra.yml` workflow handles continuous delivery of the infrastructure. It consists of three
logical phases:

### 1. Bootstrapping the backend

1. Check out the repository.
2. Log in to Azure using secrets stored in GitHub.
3. Run a PowerShell step that executes `infra/scripts/bootstrap-backend.ps1` with the
   `TF_STATE_*` secrets as environment variables. This ensures the state RG, storage account, and blob container
   exist before Terraform attempts to use them; it runs even when `RUN_TF_APPLY` is false.

> **Controlling pipeline execution** – the `terraform` job only runs when the repository
> variable `RUN_INFRA` is set to `true`. Leave it unset or set it to any other value to
> bypass infrastructure actions entirely.

> **Skipping bootstrap** – if you are early in development and don’t yet want the backend
> resources created, set a repository variable named `SKIP_BACKEND_BOOTSTRAP`
> to `true`. The pipeline will skip the bootstrap step and the script will exit immediately.

### 2. Plan and apply

4. Initialize the Terraform backend using the same secret values.
5. Run `terraform plan` to surface changes.
6. On `main` branch pushes (and when `RUN_TF_APPLY` is `true`) run `terraform apply -auto-approve` to enact changes.

### 3. Destroy (tear‑down)

A separate workflow (`.github/workflows/infra-destroy.yml`) is available for tearing down all managed
resources. It can be triggered manually (via **Actions → Infrastructure Destroy → Run workflow**). The
steps mirror the main pipeline except the final step executes `terraform destroy -auto-approve`, which
uses the state in the backend to remove everything defined by the configuration.

To perform a **destroy**:

1. Ensure the backend RG/storage account/container still exists (the bootstrap step handles this).
2. Trigger the **Infrastructure Destroy** workflow from the GitHub UI or via the REST API.
3. Terraform will destroy the resource group created by the `resource_group` module along with its
   contents (Key Vault, SQL, App Service, etc.) and update the state accordingly.

> **Note:** destroying the resources does _not_ automatically delete the backend storage account or
> container; you may clean those up manually if you no longer need them.

### Rolling back to a previous configuration

A rollback is not the same as a destroy – it means returning the infrastructure to a prior state that
corresponds to an earlier version of the Terraform configuration. To roll back:

1. **Check out the desired commit** (e.g. `git checkout <commit>` or revert the PR) so the `.tf` files
   reflect the earlier version.
2. **(Optional) restore older state** if you keep backups of the backend blob; configure the backend to
   point at that snapshot or manually pull it locally with `terraform state pull` and `terraform state
   push`.
3. Run the normal pipeline (or perform locally):
   ```powershell
   cd infra
   terraform init -reconfigure \
       -backend-config="resource_group_name=$env:TF_STATE_RG" \
       -backend-config="storage_account_name=$env:TF_STATE_SA" \
       -backend-config="container_name=$env:TF_STATE_CONTAINER"
   terraform plan   # observe resources that will be removed/changed
   terraform apply -auto-approve
   ```
   or create a pull request with the reverted configuration and merge it (with `RUN_TF_APPLY=true`).

4. After the apply completes, the infrastructure should match the older configuration.

> **Tip:** keeping periodic backups of the state blob (copy to another account, use `terraform state pull`)
> makes step 2 easier and protects you from accidental state corruption.

The preceding `terraform plan` step runs on every push, including PRs.

> **Review the plan in a pull request:**
>
> 1. Open or update a PR containing `.tf` changes.
> 2. Navigate to the **Checks** tab of the PR and click the `infrastructure` workflow run.
> 3. Examine the console log – the `terraform plan` output shows exactly what will happen if the PR is merged.
> 4. If the plan looks safe, merge; if not, modify the configuration and repeat.

Deployments only happen when PRs are merged to `main`. No changes are applied on feature branches.

> **Disable automatic apply**
>
> You can prevent the workflow from performing an `apply` even after a merge by defining a
> repository variable named `RUN_TF_APPLY` and setting it to a value other than
> `true` (or leaving it unset). The workflow condition now reads:
>
> ```yaml
> if: github.ref == 'refs/heads/main' && vars.RUN_TF_APPLY == 'true'
> ```
>
> When you’re ready to run the apply step, set `RUN_TF_APPLY` as a repository variable in
> GitHub Actions settings. This allows you to merge PRs and review plans
> without immediately creating/altering infrastructure.

## Extending the Configuration

This project is already broken into modules under `infra/modules` (resource group, key vault, SQL, app
service). Modularization makes it easy to reuse, parameterize, or even share pieces with other projects.

* **To add a resource** create a new module folder with `main.tf`, `variables.tf`, and `outputs.tf`, then
  call it from the root `main.tf` passing any needed variables.
* **Parameterize** by adding variables in the root `variables.tf` and passing them through to modules;
  avoid hard‑coding values directly in modules when they may differ between environments.
* **Update variables** or add new ones in `variables.tf` and populate them via GitHub workflow or local
  environment variables as appropriate.
* **Expose outputs** in `outputs.tf` so downstream consumers (scripts or other modules) can read
  resource identifiers.

When making changes, test locally (`terraform plan`) and review the plan in the workflow run before
merging.  The modular structure keeps the root file slim and the planning output easier to interpret.

## Sensitive Data

Never hard‑code credentials or secrets in the `.tf` files. Use variables sourced from GitHub secrets or an
external secrets manager. GitHub Actions masks secrets in logs to prevent exposure.

---

This guide and the scaffolded files provide a starting point; adapt according to the exact cloud services the
CollectorsVault application requires (e.g. App Service, SQL Database, etc.).
