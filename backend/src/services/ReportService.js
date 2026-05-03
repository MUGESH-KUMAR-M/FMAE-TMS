const Report = require('../models/Report');
const logger = require('../utils/logger');

class ReportService {
  static async getDashboardStats() {
    try {
      const stats = await Report.getDashboardStats();
      logger.info('Dashboard statistics retrieved');
      return stats;
    } catch (error) {
      logger.error('Failed to get dashboard stats', { error: error.message });
      throw error;
    }
  }

  static async getAssetStatusReport() {
    try {
      const report = await Report.getAssetStatusReport();
      logger.info('Asset status report retrieved');
      return report;
    } catch (error) {
      logger.error('Failed to get asset status report', { error: error.message });
      throw error;
    }
  }

  static async getTaskStatusReport() {
    try {
      const report = await Report.getTaskStatusReport();
      logger.info('Task status report retrieved');
      return report;
    } catch (error) {
      logger.error('Failed to get task status report', { error: error.message });
      throw error;
    }
  }

  static async getTaskPriorityReport() {
    try {
      const report = await Report.getTaskPriorityReport();
      logger.info('Task priority report retrieved');
      return report;
    } catch (error) {
      logger.error('Failed to get task priority report', { error: error.message });
      throw error;
    }
  }

  static async getMaintenanceReport(startDate, endDate) {
    try {
      const report = await Report.getMaintenanceReport(startDate, endDate);
      logger.info('Maintenance report retrieved', { startDate, endDate });
      return report;
    } catch (error) {
      logger.error('Failed to get maintenance report', { error: error.message });
      throw error;
    }
  }

  static async getAssetsByCategory() {
    try {
      const report = await Report.getAssetsByCategory();
      logger.info('Assets by category report retrieved');
      return report;
    } catch (error) {
      logger.error('Failed to get assets by category report', { error: error.message });
      throw error;
    }
  }

  static async getUserWorkload() {
    try {
      const report = await Report.getUserWorkload();
      logger.info('User workload report retrieved');
      return report;
    } catch (error) {
      logger.error('Failed to get user workload report', { error: error.message });
      throw error;
    }
  }
}

module.exports = ReportService;
