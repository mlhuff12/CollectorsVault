variable "name" {
  description = "Key Vault name"
  type        = string
}

variable "location" {
  description = "Key Vault location"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group where the vault will reside"
  type        = string
}

variable "tenant_id" {
  description = "Tenant ID for the Key Vault"
  type        = string
}

variable "sku_name" {
  description = "SKU for Key Vault (standard or premium)"
  type        = string
  default     = "standard"
}

variable "purge_protection_enabled" {
  description = "Enable purge protection"
  type        = bool
  default     = false
}

variable "soft_delete_enabled" {
  description = "Enable soft delete"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Retention days for soft delete"
  type        = number
  default     = 7
}
