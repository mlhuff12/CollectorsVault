resource "azurerm_sql_server" "this" {
  name                         = var.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = var.version
  administrator_login          = var.admin_login
  administrator_login_password = var.admin_password
}

resource "azurerm_sql_database" "this" {
  name                = var.database_name
  resource_group_name = var.resource_group_name
  location            = var.location
  server_name         = azurerm_sql_server.this.name
  sku_name            = var.database_sku
}
