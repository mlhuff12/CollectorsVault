// outputs.tf - values exposed after apply

output "resource_group_name" {
  value = module.resource_group.name
}

output "resource_group_location" {
  value = module.resource_group.location
}

output "key_vault_uri" {
  value = module.key_vault.vault_uri
}

output "sql_server_name" {
  value = module.sql.server_name
}

output "sql_database_name" {
  value = module.sql.database_name
}

output "app_service_default_hostname" {
  value = module.app.app_service_default_hostname
}
