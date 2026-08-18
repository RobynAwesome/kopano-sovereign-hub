@description('Azure region. Keep South Africa North as the default sovereign runtime location.')
param location string = 'southafricanorth'

@description('Environment name used in resource names and app settings.')
param envName string = 'prod'

@description('App Service plan SKU. B1 is the low-cost production-capable default; scale deliberately after telemetry exists.')
param skuName string = 'B1'

@description('Comma-separated browser origins permitted to call the RTCP gateway.')
param allowedOrigins string = 'https://kopanolabs.com,https://www.kopanolabs.com'

var suffix = uniqueString(subscription().subscriptionId, resourceGroup().id, envName)
var planName = 'asp-kopano-rtcp-${envName}-${suffix}'
var webAppName = 'app-kopano-rtcp-${envName}-${suffix}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true
  }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
        {
          name: 'KOPANO_ALLOWED_ORIGINS'
          value: allowedOrigins
        }
        {
          name: 'WEBSITE_HTTPLOGGING_RETENTION_DAYS'
          value: '7'
        }
      ]
    }
  }
}

output webAppName string = app.name
output webAppHost string = app.properties.defaultHostName
output gatewayBaseUrl string = 'https://${app.properties.defaultHostName}'
output managedIdentityPrincipalId string = app.identity.principalId
output region string = location
output sku string = skuName
