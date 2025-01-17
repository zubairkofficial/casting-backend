import { where } from 'sequelize';
import { Model } from '../models/index.js';

export class ModelController {
  // Create a new model
  async create(req, res) {
    try {
      const {
        comcardNo,
        image,
        nameEng,
        nameKor,
        national,
        stage,
        additionalPic,
        download,
      } = req.body;

      // Input validation
      if (!comcardNo || !nameEng || !nameKor) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'ComcardNo, nameEng, and nameKor are required fields'
        });
      }

      // Check if model with same comcardNo already exists
      const existingModel = await Model.findOne({ where: { comcardNo } });
      if (existingModel) {
        return res.status(409).json({
          error: 'Duplicate Error',
          details: 'A model with this comcardNo already exists'
        });
      }

      const model = await Model.create({
        comcardNo,
        image,
        nameEng,
        nameKor,
        national,
        stage,
        additionalPic,
        download,
        createdBy: req.user.id
      });

      res.status(201).json(model);
    } catch (error) {
      console.error('Error creating model:', error);
      
      // Handle different types of errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(e => e.message)
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: 'Duplicate Error',
          details: 'A model with these unique fields already exists'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        details: 'Failed to create model'
      });
    }
  }

  // Get all models
  async getAll(req, res) {
    const id = req.user.id;
    try {
      const models = await Model.findAll({where: {createdBy: id}});
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: 'Failed to fetch models', details: error.message });
    }
  }

  // Get a single model by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const model = await Model.findByPk(id);

      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      res.json(model);
    } catch (error) {
      console.error('Error fetching model:', error);
      res.status(500).json({ error: 'Failed to fetch model', details: error.message });
    }
  }

  // Update a model
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const model = await Model.findByPk(id);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      await model.update(updateData);
      
      res.json(model);
    } catch (error) {
      console.error('Error updating model:', error);
      res.status(500).json({ error: 'Failed to update model', details: error.message });
    }
  }

  // Delete a model
  async delete(req, res) {
    try {
      const { id } = req.params;
      const model = await Model.findByPk(id);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      await model.destroy();
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting model:', error);
      res.status(500).json({ error: 'Failed to delete model', details: error.message });
    }
  }
}
