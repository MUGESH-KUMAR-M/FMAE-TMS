const Asset = require('../models/Asset');
const logger = require('../utils/logger');

class AssetService {
  static async createAsset(assetData) {
    try {
      const asset = await Asset.create(assetData);
      logger.info('Asset created successfully', { assetId: asset.id });
      return asset;
    } catch (error) {
      logger.error('Failed to create asset', { error: error.message });
      throw error;
    }
  }

  static async getAsset(id) {
    try {
      const asset = await Asset.findById(id);
      if (!asset) {
        throw new Error('Asset not found');
      }
      return asset;
    } catch (error) {
      logger.error('Failed to get asset', { error: error.message });
      throw error;
    }
  }

  static async getAllAssets(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const assets = await Asset.findAll(limit, offset, filters);
      const count = await Asset.count(filters);

      return {
        assets,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get assets', { error: error.message });
      throw error;
    }
  }

  static async updateAsset(id, assetData) {
    try {
      const asset = await Asset.update(id, assetData);
      logger.info('Asset updated successfully', { assetId: id });
      return asset;
    } catch (error) {
      logger.error('Failed to update asset', { error: error.message });
      throw error;
    }
  }

  static async deleteAsset(id) {
    try {
      const asset = await Asset.delete(id);
      logger.info('Asset deleted successfully', { assetId: id });
      return asset;
    } catch (error) {
      logger.error('Failed to delete asset', { error: error.message });
      throw error;
    }
  }

  static async getAssetsByCategory(category) {
    try {
      const assets = await Asset.findAll(1000, 0, { category });
      return assets;
    } catch (error) {
      logger.error('Failed to get assets by category', { error: error.message });
      throw error;
    }
  }

  static async getAssetsByLocation(location) {
    try {
      const assets = await Asset.findAll(1000, 0, { location });
      return assets;
    } catch (error) {
      logger.error('Failed to get assets by location', { error: error.message });
      throw error;
    }
  }
}

module.exports = AssetService;
