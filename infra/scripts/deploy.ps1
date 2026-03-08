<#
.SYNOPSIS
Helper script to run Terraform operations from Windows PowerShell.
#>
param(
    [string]$Environment = "dev",
    [switch]$PlanOnly
)

# only run if RUN_INFRA is set to true
if ($env:RUN_INFRA -ne 'true') {
    Write-Host "RUN_INFRA is not true; skipping infrastructure deployment."
    exit 0
}

# Change to the infra root directory (parent of this script's directory) so
# Terraform can find the .tf files regardless of where the caller is.
$infraDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location -Path $infraDir

# Determine backend config.
# Locally: copy local.backend.tfvars.example to local.backend.tfvars and fill in values.
# In CI: set TF_STATE_RG, TF_STATE_SA, and TF_STATE_CONTAINER environment variables.
$localBackend = Join-Path $infraDir "local.backend.tfvars"
if (Test-Path $localBackend) {
    Write-Host "Using backend config from local.backend.tfvars"
    $backendArgs = @("-backend-config=local.backend.tfvars")
} else {
    $backendArgs = @(
        "-backend-config=resource_group_name=$($env:TF_STATE_RG)",
        "-backend-config=storage_account_name=$($env:TF_STATE_SA)",
        "-backend-config=container_name=$($env:TF_STATE_CONTAINER)"
    )
}

if ($PlanOnly) {
    terraform init @backendArgs
    terraform plan
} else {
    terraform init @backendArgs
    terraform apply -auto-approve
}

Pop-Location
