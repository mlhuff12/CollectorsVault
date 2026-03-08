// variables.tf - input definitions

variable "location" {
  description = "Azure region to deploy resources into"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Name of the primary resource group"
  type        = string
  default     = "collectorsvault-rg"
}


variable "key_vault_name" {
  description = "Name of the Azure Key Vault"
  type        = string
  default     = "collectorsvault-kv"
}

variable "sql_server_name" {
  description = "Name of the Azure SQL server"
  type        = string
  default     = "collectorsvault-sqlsrv"
}

variable "sql_database_name" {
  description = "Name of the SQL database"
  type        = string
  default     = "collectorsvault-db"
}

variable "app_service_plan_name" {
  description = "Name of the App Service plan"
  type        = string
  default     = "collectorsvault-plan"
}

variable "app_service_name" {
  description = "Name of the App Service"
  type        = string
  default     = "collectorsvault-app"
}

# backend state configuration
variable "state_resource_group" {
  description = "Resource group holding the Terraform backend state"
  type        = string
}

variable "state_storage_account" {
  description = "Storage account used for the Terraform backend state"
  type        = string
}

variable "state_container" {
  description = "Blob container in the backend storage account"
  type        = string
  default     = "tfstate"
}

# credentials for SQL server (avoid hardcoding in repo)
variable "sql_admin_login" {
  description = "Administrator login for SQL server"
  type        = string
  sensitive   = true
}

variable "sql_admin_password" {
  description = "Administrator password for SQL server"
  type        = string
  sensitive   = true
}
