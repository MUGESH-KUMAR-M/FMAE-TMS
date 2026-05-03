const Task = require('../models/Task');
const logger = require('../utils/logger');

class TaskService {
  static async createTask(taskData) {
    try {
      const task = await Task.create(taskData);
      logger.info('Task created successfully', { taskId: task.id });
      return task;
    } catch (error) {
      logger.error('Failed to create task', { error: error.message });
      throw error;
    }
  }

  static async getTask(id) {
    try {
      const task = await Task.findById(id);
      if (!task) {
        throw new Error('Task not found');
      }
      return task;
    } catch (error) {
      logger.error('Failed to get task', { error: error.message });
      throw error;
    }
  }

  static async getAllTasks(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const tasks = await Task.findAll(limit, offset, filters);
      const count = await Task.count(filters);

      return {
        tasks,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get tasks', { error: error.message });
      throw error;
    }
  }

  static async updateTask(id, taskData) {
    try {
      const task = await Task.update(id, taskData);
      logger.info('Task updated successfully', { taskId: id });
      return task;
    } catch (error) {
      logger.error('Failed to update task', { error: error.message });
      throw error;
    }
  }

  static async deleteTask(id) {
    try {
      const task = await Task.delete(id);
      logger.info('Task deleted successfully', { taskId: id });
      return task;
    } catch (error) {
      logger.error('Failed to delete task', { error: error.message });
      throw error;
    }
  }

  static async getTasksByStatus(status) {
    try {
      const result = await Task.findAll(1000, 0, { status });
      return result;
    } catch (error) {
      logger.error('Failed to get tasks by status', { error: error.message });
      throw error;
    }
  }

  static async getTasksByAssignee(userId) {
    try {
      const result = await Task.findAll(1000, 0, { assigned_to: userId });
      return result;
    } catch (error) {
      logger.error('Failed to get tasks by assignee', { error: error.message });
      throw error;
    }
  }
}

module.exports = TaskService;
