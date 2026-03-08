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

Push-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

$vars = @{
    state_resource_group  = $env:TF_STATE_RG
    state_storage_account = $env:TF_STATE_SA
    state_container       = $env:TF_STATE_CONTAINER
}

if ($PlanOnly) {
    terraform init -backend-config="resource_group_name=$($vars.state_resource_group)" `
                   -backend-config="storage_account_name=$($vars.state_storage_account)" `
                   -backend-config="container_name=$($vars.state_container)"
    terraform plan
} else {
    terraform init -backend-config="resource_group_name=$($vars.state_resource_group)" `
                   -backend-config="storage_account_name=$($vars.state_storage_account)" `
                   -backend-config="container_name=$($vars.state_container)"
    terraform apply -auto-approve
}

Pop-Location
