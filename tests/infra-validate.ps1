<#
Simple validation script to run `terraform init` and `terraform validate` against the infra
configuration. This can be used as a unit test in CI to catch syntax errors or missing
variables.

Usage:
  powershell -File tests\infra-validate.ps1

The script will create a temporary copy of the `infra` directory so it can be run repeatedly
without mutating the working copy.
#>

param()

$tempDir = New-TemporaryFile | % { $_.FullName }
Remove-Item $tempDir
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying infra configuration to $tempDir"
Copy-Item -Recurse -Path "infra\*" -Destination $tempDir

Push-Location $tempDir

# provide dummy values for required variables so validate succeeds
$env:TF_VAR_resource_group_name = "test-rg"
$env:TF_VAR_location = "eastus"
$env:TF_VAR_key_vault_name = "test-kv"
$env:TF_VAR_sql_server_name = "test-sql"
$env:TF_VAR_sql_database_name = "test-db"
$env:TF_VAR_app_service_plan_name = "test-plan"
$env:TF_VAR_app_service_name = "test-app"

Write-Host "Initializing terraform"
terraform init -backend=false | Out-Null

Write-Host "Validating configuration"
terraform validate

$exit = $LASTEXITCODE

Pop-Location
Remove-Item -Recurse -Force $tempDir

exit $exit
