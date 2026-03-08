variable "plan_name" {
  description = "App service plan name"
  type        = string
}

variable "app_name" {
  description = "App service name"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for the app service"
  type        = string
}

variable "location" {
  description = "Location for the app service"
  type        = string
}

variable "sku_name" {
  description = "SKU name for the service plan (e.g. F1, B1, S1)"
  type        = string
  default     = "F1"
}

variable "dotnet_version" {
  description = "The .NET runtime version to use"
  type        = string
  default     = "v8.0"
}

variable "app_settings" {
  description = "Map of app settings"
  type        = map(string)
  default     = {}
}
