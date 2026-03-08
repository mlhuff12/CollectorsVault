# Infrastructure as Code (IaC) for CollectorsVault

This directory contains a Terraform-based infrastructure project intended to provision cloud resources needed by the
CollectorsVault solution. Everything in this folder is designed to be executed from GitHub Actions after changes are
merged to the `main` branch.

## Goals

* Maintain infrastructure configuration declaratively using Terraform.
* Use GitHub repository secrets and variables for any sensitive or environment-specific data.
* Only create or modify resources when they do not already exist (Terraform is idempotent).
* Provide a simple CLI wrapper to initialize and apply the configuration locally if desired.

## Requirements

* Terraform 1.0+ installed locally or available in CI runner.
* A service principal or credentials for the target cloud provider (stored in GitHub secrets).
* GitHub Actions enabled for the repository.

For a full explanation of how the project is structured, all available variables, workflow details,
rollback/destroy procedures, and usage tips, see the [Infrastructure Deployment Guide](../docs/infrastructure-setup.md).

## Typical Workflow

1. Developer updates `.tf` files and commits changes.
2. A pull request is opened and reviewed.
3. When the PR is merged to `main`, the `infra` workflow runs automatically.
4. The workflow initializes Terraform, runs `terraform plan` and `terraform apply` with `-auto-approve`.
5. Resources are created/updated only if they are missing or drifted from configuration.

> Terraform tracks state inside a remote backend (Azure Storage, S3, etc.) configured in `backend.tf`.

## Local Development

To run locally, copy the two example secret files and fill in your real values:

```powershell
cp infra/local.auto.tfvars.example  infra/local.auto.tfvars    # Terraform variables (SQL credentials)
cp infra/local.backend.tfvars.example infra/local.backend.tfvars  # Backend storage config
```

Edit both files, replacing each `REPLACE_WITH_*` placeholder with your actual value.  Both files are
git-ignored so they will never be committed.

Then run the deploy helper — it picks up `local.backend.tfvars` automatically:

```powershell
cd infra
$env:RUN_INFRA = "true"
scripts\deploy.ps1 -Environment "dev"
```

In CI, GitHub Secrets supply the same values instead of these files (see the
[Infrastructure Deployment Guide](../docs/infrastructure-setup.md) for details).

### Control flags

* `RUN_INFRA` – set this variable to `true` (either in your shell or as a repository/workflow variable) to enable
  both the bootstrap and deploy scripts. When unset or not `true` the scripts exit immediately, allowing you to
  work on other code without touching the infrastructure.
* `SKIP_BACKEND_BOOTSTRAP` – set to `true` if you want to run the pipeline but skip creating the backend RG/SA/container.

The GitHub workflow also respects `RUN_INFRA` at the job level, so you can disable the entire CI run by leaving
that flag unset.
