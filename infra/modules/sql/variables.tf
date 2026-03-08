variable "server_name" {
  description = "SQL server name"
  type        = string
}

variable "database_name" {
  description = "SQL database name"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for SQL resources"
  type        = string
}

variable "location" {
  description = "Location for SQL server"
  type        = string
}

variable "version" {
  description = "SQL server version"
  type        = string
  default     = "12.0"
}

variable "admin_login" {
  description = "Administrator login"
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "Administrator password"
  type        = string
  sensitive   = true
}

variable "database_sku" {
  description = "SKU name for the database"
  type        = string
  default     = "S0"
}
