import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerProcessor,
  signDPA,
  getProcessors,
  recordProcessingActivity,
  getProcessingActivities,
  clearDPAData,
  type DataProcessor,
  type ProcessingActivity,
} from '../dpaManagement';

describe('Data Processing Agreements (T2.4)', () => {
  beforeEach(() => {
    clearDPAData();
  });

  afterEach(() => {
    clearDPAData();
  });

  describe('registerProcessor', () => {
    it('registers a data processor', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage', 'backup'],
        dataCategories: ['financial_data', 'user_profile'],
        countries: ['US'],
        active: true,
      });

      expect(processor.id).toBeTruthy();
      expect(processor.name).toBe('AWS');
      expect(processor.type).toBe('processor');
    });

    it('registers a sub-processor', () => {
      const processor = registerProcessor({
        name: 'Stripe',
        type: 'sub_processor',
        address: '510 Townsend Street, San Francisco, CA 94103',
        contactEmail: 'legal@stripe.com',
        purposes: ['payment_processing'],
        dataCategories: ['payment_data'],
        countries: ['US'],
        active: true,
      });

      expect(processor.type).toBe('sub_processor');
    });

    it('generates unique processor IDs', () => {
      const processor1 = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const processor2 = registerProcessor({
        name: 'Google Cloud',
        type: 'processor',
        address: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
        contactEmail: 'dpa@google.com',
        purposes: ['analytics'],
        dataCategories: ['usage_data'],
        countries: ['US'],
        active: true,
      });

      expect(processor1.id).not.toBe(processor2.id);
    });
  });

  describe('signDPA', () => {
    it('signs DPA with processor', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const signed = signDPA(processor.id);

      expect(signed?.dpaSignedAt).toBeTruthy();
      expect(signed?.dpaSignedAt).toBeLessThanOrEqual(Date.now());
    });

    it('returns null for non-existent processor', () => {
      const signed = signDPA('non_existent');

      expect(signed).toBeNull();
    });
  });

  describe('getProcessors', () => {
    it('returns all registered processors', () => {
      registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      registerProcessor({
        name: 'Google Cloud',
        type: 'processor',
        address: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
        contactEmail: 'dpa@google.com',
        purposes: ['analytics'],
        dataCategories: ['usage_data'],
        countries: ['US'],
        active: true,
      });

      const processors = getProcessors();

      expect(processors).toHaveLength(2);
      expect(processors.some(p => p.name === 'AWS')).toBe(true);
      expect(processors.some(p => p.name === 'Google Cloud')).toBe(true);
    });

    it('returns empty array when no processors', () => {
      const processors = getProcessors();

      expect(processors).toEqual([]);
    });
  });

  describe('recordProcessingActivity', () => {
    it('records processing activity', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const activity = recordProcessingActivity({
        description: 'Encrypted backup of financial data',
        processorId: processor.id,
        dataCategories: ['financial_data'],
        purposes: ['backup'],
        legalBasis: 'Legitimate interest',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      expect(activity.id).toBeTruthy();
      expect(activity.description).toBe('Encrypted backup of financial data');
      expect(activity.processorId).toBe(processor.id);
    });

    it('generates unique activity IDs', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const activity1 = recordProcessingActivity({
        description: 'Backup',
        processorId: processor.id,
        dataCategories: ['financial_data'],
        purposes: ['backup'],
        legalBasis: 'Legitimate interest',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      const activity2 = recordProcessingActivity({
        description: 'Analytics',
        processorId: processor.id,
        dataCategories: ['usage_data'],
        purposes: ['analytics'],
        legalBasis: 'Consent',
        retentionPeriod: '1 year',
        startDate: Date.now(),
      });

      expect(activity1.id).not.toBe(activity2.id);
    });
  });

  describe('getProcessingActivities', () => {
    it('returns all processing activities', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      recordProcessingActivity({
        description: 'Backup',
        processorId: processor.id,
        dataCategories: ['financial_data'],
        purposes: ['backup'],
        legalBasis: 'Legitimate interest',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      recordProcessingActivity({
        description: 'Analytics',
        processorId: processor.id,
        dataCategories: ['usage_data'],
        purposes: ['analytics'],
        legalBasis: 'Consent',
        retentionPeriod: '1 year',
        startDate: Date.now(),
      });

      const activities = getProcessingActivities();

      expect(activities).toHaveLength(2);
      expect(activities.some(a => a.description === 'Backup')).toBe(true);
      expect(activities.some(a => a.description === 'Analytics')).toBe(true);
    });

    it('returns empty array when no activities', () => {
      const activities = getProcessingActivities();

      expect(activities).toEqual([]);
    });
  });

  describe('T2.4 Integration Tests', () => {
    it('complete DPA workflow', () => {
      // 1. Register processor
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage', 'backup'],
        dataCategories: ['financial_data', 'user_profile'],
        countries: ['US'],
        active: true,
      });

      expect(processor.dpaSignedAt).toBeUndefined();

      // 2. Record processing activities
      const activity1 = recordProcessingActivity({
        description: 'Encrypted backup of financial data',
        processorId: processor.id,
        dataCategories: ['financial_data'],
        purposes: ['backup'],
        legalBasis: 'Legitimate interest',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      const activity2 = recordProcessingActivity({
        description: 'User profile storage',
        processorId: processor.id,
        dataCategories: ['user_profile'],
        purposes: ['data_storage'],
        legalBasis: 'Contract',
        retentionPeriod: 'Until account deletion',
        startDate: Date.now(),
      });

      // 3. Sign DPA
      const signed = signDPA(processor.id);
      expect(signed?.dpaSignedAt).toBeTruthy();

      // 4. Verify all data
      const processors = getProcessors();
      expect(processors).toHaveLength(1);
      expect(processors[0].dpaSignedAt).toBeTruthy();

      const activities = getProcessingActivities();
      expect(activities).toHaveLength(2);
      expect(activities.every(a => a.processorId === processor.id)).toBe(true);
    });

    it('manages multiple processors', () => {
      // Register multiple processors
      const aws = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const stripe = registerProcessor({
        name: 'Stripe',
        type: 'sub_processor',
        address: '510 Townsend Street, San Francisco, CA 94103',
        contactEmail: 'legal@stripe.com',
        purposes: ['payment_processing'],
        dataCategories: ['payment_data'],
        countries: ['US'],
        active: true,
      });

      const sendgrid = registerProcessor({
        name: 'SendGrid',
        type: 'sub_processor',
        address: '1801 California Street, Denver, CO 80202',
        contactEmail: 'legal@sendgrid.com',
        purposes: ['email_delivery'],
        dataCategories: ['email_address'],
        countries: ['US'],
        active: true,
      });

      // Record activities for each
      recordProcessingActivity({
        description: 'Data storage',
        processorId: aws.id,
        dataCategories: ['financial_data'],
        purposes: ['data_storage'],
        legalBasis: 'Contract',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      recordProcessingActivity({
        description: 'Payment processing',
        processorId: stripe.id,
        dataCategories: ['payment_data'],
        purposes: ['payment_processing'],
        legalBasis: 'Contract',
        retentionPeriod: '7 years',
        startDate: Date.now(),
      });

      recordProcessingActivity({
        description: 'Email delivery',
        processorId: sendgrid.id,
        dataCategories: ['email_address'],
        purposes: ['email_delivery'],
        legalBasis: 'Consent',
        retentionPeriod: '1 year',
        startDate: Date.now(),
      });

      // Sign DPAs
      signDPA(aws.id);
      signDPA(stripe.id);
      signDPA(sendgrid.id);

      // Verify
      const processors = getProcessors();
      expect(processors).toHaveLength(3);
      expect(processors.every(p => p.dpaSignedAt)).toBe(true);

      const activities = getProcessingActivities();
      expect(activities).toHaveLength(3);
    });

    it('tracks processor types', () => {
      const processor = registerProcessor({
        name: 'AWS',
        type: 'processor',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        contactEmail: 'dpa@aws.amazon.com',
        purposes: ['data_storage'],
        dataCategories: ['financial_data'],
        countries: ['US'],
        active: true,
      });

      const subProcessor = registerProcessor({
        name: 'Stripe',
        type: 'sub_processor',
        address: '510 Townsend Street, San Francisco, CA 94103',
        contactEmail: 'legal@stripe.com',
        purposes: ['payment_processing'],
        dataCategories: ['payment_data'],
        countries: ['US'],
        active: true,
      });

      const processors = getProcessors();

      const mainProcessors = processors.filter(p => p.type === 'processor');
      const subProcessors = processors.filter(p => p.type === 'sub_processor');

      expect(mainProcessors).toHaveLength(1);
      expect(subProcessors).toHaveLength(1);
      expect(mainProcessors[0].name).toBe('AWS');
      expect(subProcessors[0].name).toBe('Stripe');
    });
  });
});
