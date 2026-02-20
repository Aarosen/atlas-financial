/**
 * Ecosystem Engine
 * Requirements 32-33: Integrations, data portability
 */

export interface Integration {
  id: string;
  name: string;
  type: 'bank' | 'investment' | 'budgeting' | 'analytics';
  status: 'connected' | 'disconnected' | 'pending';
  lastSync: number;
  dataTypes: string[];
}

export interface DataExport {
  exportId: string;
  format: 'json' | 'csv' | 'pdf';
  dataTypes: string[];
  createdAt: number;
  expiresAt: number;
  downloadUrl: string;
}

export interface IntegrationConfig {
  integrations: Integration[];
  dataPortabilityEnabled: boolean;
  lastExport?: DataExport;
}

export function initializeEcosystem(): IntegrationConfig {
  return {
    integrations: [],
    dataPortabilityEnabled: true,
    lastExport: undefined,
  };
}

export function addIntegration(
  config: IntegrationConfig,
  integration: Integration
): IntegrationConfig {
  config.integrations.push(integration);
  return config;
}

export function connectIntegration(config: IntegrationConfig, integrationId: string): IntegrationConfig {
  const integration = config.integrations.find(i => i.id === integrationId);
  if (integration) {
    integration.status = 'connected';
    integration.lastSync = Date.now();
  }
  return config;
}

export function disconnectIntegration(config: IntegrationConfig, integrationId: string): IntegrationConfig {
  const integration = config.integrations.find(i => i.id === integrationId);
  if (integration) {
    integration.status = 'disconnected';
  }
  return config;
}

export function syncIntegration(config: IntegrationConfig, integrationId: string): IntegrationConfig {
  const integration = config.integrations.find(i => i.id === integrationId);
  if (integration && integration.status === 'connected') {
    integration.lastSync = Date.now();
  }
  return config;
}

export function exportData(
  config: IntegrationConfig,
  format: 'json' | 'csv' | 'pdf',
  dataTypes: string[]
): DataExport {
  const exportId = `export_${Date.now()}`;
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const dataExport: DataExport = {
    exportId,
    format,
    dataTypes,
    createdAt: Date.now(),
    expiresAt,
    downloadUrl: `/api/exports/${exportId}`,
  };

  config.lastExport = dataExport;
  return dataExport;
}

export function getAvailableIntegrations(): Integration[] {
  return [
    {
      id: 'plaid',
      name: 'Plaid',
      type: 'bank',
      status: 'disconnected',
      lastSync: 0,
      dataTypes: ['transactions', 'accounts', 'balances'],
    },
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'investment',
      status: 'disconnected',
      lastSync: 0,
      dataTypes: ['investments', 'portfolio'],
    },
    {
      id: 'mint',
      name: 'Mint',
      type: 'budgeting',
      status: 'disconnected',
      lastSync: 0,
      dataTypes: ['budgets', 'spending'],
    },
  ];
}

export function getExportableDataTypes(): string[] {
  return [
    'profile',
    'financial_data',
    'transactions',
    'goals',
    'habits',
    'insights',
    'recommendations',
    'learning_history',
  ];
}

export function getEcosystemStatus(config: IntegrationConfig): string {
  const connected = config.integrations.filter(i => i.status === 'connected').length;
  const total = config.integrations.length;
  return `Ecosystem: ${connected}/${total} integrations connected. Data portability: ${config.dataPortabilityEnabled ? 'enabled' : 'disabled'}`;
}
