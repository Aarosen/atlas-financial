import {
  initializeEcosystem,
  addIntegration,
  connectIntegration,
  disconnectIntegration,
  syncIntegration,
  exportData,
  getAvailableIntegrations,
  getExportableDataTypes,
  getEcosystemStatus,
} from '../ecosystemEngine';

describe('Ecosystem Engine', () => {
  describe('initializeEcosystem', () => {
    it('should create ecosystem config', () => {
      const config = initializeEcosystem();
      expect(config.integrations.length).toBe(0);
      expect(config.dataPortabilityEnabled).toBe(true);
    });
  });

  describe('addIntegration', () => {
    it('should add integration', () => {
      let config = initializeEcosystem();
      config = addIntegration(config, {
        id: 'plaid',
        name: 'Plaid',
        type: 'bank',
        status: 'disconnected',
        lastSync: 0,
        dataTypes: ['transactions'],
      });
      expect(config.integrations.length).toBe(1);
      expect(config.integrations[0].id).toBe('plaid');
    });
  });

  describe('connectIntegration', () => {
    it('should connect integration', () => {
      let config = initializeEcosystem();
      config = addIntegration(config, {
        id: 'plaid',
        name: 'Plaid',
        type: 'bank',
        status: 'disconnected',
        lastSync: 0,
        dataTypes: ['transactions'],
      });
      config = connectIntegration(config, 'plaid');
      expect(config.integrations[0].status).toBe('connected');
      expect(config.integrations[0].lastSync).toBeGreaterThan(0);
    });
  });

  describe('disconnectIntegration', () => {
    it('should disconnect integration', () => {
      let config = initializeEcosystem();
      config = addIntegration(config, {
        id: 'plaid',
        name: 'Plaid',
        type: 'bank',
        status: 'connected',
        lastSync: Date.now(),
        dataTypes: ['transactions'],
      });
      config = disconnectIntegration(config, 'plaid');
      expect(config.integrations[0].status).toBe('disconnected');
    });
  });

  describe('syncIntegration', () => {
    it('should sync integration', () => {
      let config = initializeEcosystem();
      config = addIntegration(config, {
        id: 'plaid',
        name: 'Plaid',
        type: 'bank',
        status: 'connected',
        lastSync: 0,
        dataTypes: ['transactions'],
      });
      const before = config.integrations[0].lastSync;
      config = syncIntegration(config, 'plaid');
      expect(config.integrations[0].lastSync).toBeGreaterThan(before);
    });
  });

  describe('exportData', () => {
    it('should create data export', () => {
      const config = initializeEcosystem();
      const dataExport = exportData(config, 'json', ['profile', 'financial_data']);
      expect(dataExport.format).toBe('json');
      expect(dataExport.dataTypes.length).toBe(2);
      expect(dataExport.downloadUrl).toContain('export');
    });

    it('should set expiration date', () => {
      const config = initializeEcosystem();
      const dataExport = exportData(config, 'csv', ['profile']);
      expect(dataExport.expiresAt).toBeGreaterThan(dataExport.createdAt);
    });
  });

  describe('getAvailableIntegrations', () => {
    it('should return available integrations', () => {
      const integrations = getAvailableIntegrations();
      expect(integrations.length).toBeGreaterThan(0);
      expect(integrations.some(i => i.type === 'bank')).toBe(true);
    });
  });

  describe('getExportableDataTypes', () => {
    it('should return exportable data types', () => {
      const dataTypes = getExportableDataTypes();
      expect(dataTypes.length).toBeGreaterThan(0);
      expect(dataTypes).toContain('profile');
      expect(dataTypes).toContain('financial_data');
    });
  });

  describe('getEcosystemStatus', () => {
    it('should provide ecosystem status', () => {
      const config = initializeEcosystem();
      const status = getEcosystemStatus(config);
      expect(status).toContain('Ecosystem');
      expect(status.toLowerCase()).toContain('data portability');
    });
  });
});
