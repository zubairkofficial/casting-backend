import { Model } from '../models/index.js';

export class ModelController {
  // Create a new model
  async create(req, res) {
    try {
      const {
        comcardId,
        image,
        nameEng,
        nameKor,
        national,
        stage,
        additionalPic,
       
        download,
        comcardPhotoURL
      } = req.body;

      const model = await Model.create({
        comcardNo: comcardId,
        image,
        nameEng,
        nameKor,
        national,
        stage,
        additionalPic,
        download,
        comcardPhotoURL
      });

      res.status(201).json(model);
    } catch (error) {
      console.error('Error creating model:', error);
      res.status(500).json({ error: 'Failed to create model', details: error.message });
    }
  }

  // Get all models
  async getAll(req, res) {
    try {
      const models = await Model.findAll();
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
