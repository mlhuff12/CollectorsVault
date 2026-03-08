// main.tf - core resources for CollectorsVault

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = var.state_resource_group
    storage_account_name = var.state_storage_account
    container_name       = var.state_container
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

# Example resources are now defined in reusable modules

module "resource_group" {
  source   = "./modules/resource_group"
  name     = var.resource_group_name
  location = var.location
}

module "key_vault" {
  source              = "./modules/key_vault"
  name                = var.key_vault_name
  location            = module.resource_group.location
  resource_group_name = module.resource_group.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
}

module "sql" {
  source              = "./modules/sql"
  server_name         = var.sql_server_name
  database_name       = var.sql_database_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  admin_login         = var.sql_admin_login
  admin_password      = var.sql_admin_password
}

module "app" {
  source              = "./modules/app_service"
  plan_name           = var.app_service_plan_name
  app_name            = var.app_service_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  sku_tier            = "Free"
  sku_size            = "F1"
  dotnet_version      = "v8.0"
  app_settings        = { "WEBSITE_RUN_FROM_PACKAGE" = "1" }
}
