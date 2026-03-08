resource "azurerm_app_service_plan" "this" {
  name                = var.plan_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku {
    tier = var.sku_tier
    size = var.sku_size
  }
}

resource "azurerm_app_service" "this" {
  name                = var.app_name
  location            = var.location
  resource_group_name = var.resource_group_name
  app_service_plan_id = azurerm_app_service_plan.this.id
  site_config {
    dotnet_framework_version = var.dotnet_version
  }
  app_settings = var.app_settings
}
