output "server_name" {
  value = azurerm_sql_server.this.name
}

output "database_name" {
  value = azurerm_sql_database.this.name
}
