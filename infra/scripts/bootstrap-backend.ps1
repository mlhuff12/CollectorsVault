<#
.SYNOPSIS
Ensure that the backend resource group, storage account and container exist.
This script can be run unconditionally; it does not modify anything if the
items already exist.

It uses the Azure CLI (az) which is available in the GitHub Actions
`azure/CLI` step.  You may also run it locally if you have `az` installed
and are logged in.

Parameters are expected to be provided via environment variables:
  $env:TF_STATE_RG
  $env:TF_STATE_SA
  $env:TF_STATE_CONTAINER
#>

param()

function Ensure-Rg {
    param($name, $location = 'eastus')
    $rg = az group show --name $name --query "name" -o tsv 2>$null
    if (-not $rg) {
        Write-Host "Creating resource group $name..."
        az group create --name $name --location $location | Out-Null
    } else {
        Write-Host "Resource group $name already exists."
    }
}

function Ensure-Sa {
    param($rg, $name, $sku = 'Standard_LRS')
    $sa = az storage account show --name $name --resource-group $rg --query "name" -o tsv 2>$null
    if (-not $sa) {
        Write-Host "Creating storage account $name in $rg..."
        az storage account create --name $name --resource-group $rg --sku $sku --kind StorageV2 | Out-Null
    } else {
        Write-Host "Storage account $name already exists."
    }
}

function Ensure-Container {
    param($rg, $sa, $container)
    $key = az storage account keys list --resource-group $rg --account-name $sa --query "[0].value" -o tsv
    $exists = az storage container exists --name $container --account-name $sa --account-key $key --query "exists" -o tsv
    if ($exists -ne 'true') {
        Write-Host "Creating blob container $container..."
        az storage container create --name $container --account-name $sa --account-key $key | Out-Null
    } else {
        Write-Host "Blob container $container already exists."
    }
}

# allow skipping bootstrap when development is not ready
if ($env:SKIP_BACKEND_BOOTSTRAP -eq 'true') {
    Write-Host "Skipping backend bootstrap (SKIP_BACKEND_BOOTSTRAP=true)."
    exit 0
}

# also respect RUN_INFRA flag
if ($env:RUN_INFRA -ne 'true') {
    Write-Host "RUN_INFRA is not true; skipping backend bootstrap."
    exit 0
}

if (-not $env:TF_STATE_RG -or -not $env:TF_STATE_SA -or -not $env:TF_STATE_CONTAINER) {
    Write-Error "Environment variables TF_STATE_RG, TF_STATE_SA and TF_STATE_CONTAINER must be defined."
    exit 1
}

Ensure-Rg -name $env:TF_STATE_RG
Ensure-Sa -rg $env:TF_STATE_RG -name $env:TF_STATE_SA
Ensure-Container -rg $env:TF_STATE_RG -sa $env:TF_STATE_SA -container $env:TF_STATE_CONTAINER
