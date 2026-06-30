const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

module.exports = (Model, searchFields = [], defaultIncludes = [], hasSlug = false, uploadSubfolder = null) => {
  return {
    index: async (req, res) => {
      try {
        const { search, page = 1, per_page = 20 } = req.query;
        const limit = parseInt(per_page);
        const offset = (parseInt(page) - 1) * limit;

        const where = {};
        if (search && searchFields.length > 0) {
          where[Op.or] = searchFields.map(field => ({
            [field]: { [Op.like]: `%${search}%` }
          }));
        }

        const { rows, count } = await Model.findAndCountAll({
          where,
          include: defaultIncludes,
          limit,
          offset,
          order: [['id', 'DESC']],
          distinct: true
        });

        return res.json({
          data: rows,
          meta: {
            current_page: parseInt(page),
            per_page: limit,
            total: count,
            last_page: Math.ceil(count / limit)
          }
        });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    },

    show: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id, { include: defaultIncludes });
        if (!item) {
          return res.status(404).json({ message: 'Recurso no encontrado' });
        }
        return res.json({ data: item });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    },

    store: async (req, res) => {
      try {
        const data = { ...req.body };
        if (hasSlug && data.name && !data.slug) {
          data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        }
        if (req.file && uploadSubfolder) {
          data.image_path = `${uploadSubfolder}/${req.file.filename}`;
        }
        if (req.user) {
          data.created_by = req.user.id;
        }
        const item = await Model.create(data);
        return res.status(201).json({ data: item });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    },

    update: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ message: 'Recurso no encontrado' });
        }
        const data = { ...req.body };
        if (hasSlug && data.name && data.name !== item.name) {
          data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        }
        if (req.file && uploadSubfolder) {
          // Delete old file if it exists to clean up disk space
          if (item.image_path) {
            const oldPath = path.join(__dirname, '../../public/uploads', item.image_path);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
          data.image_path = `${uploadSubfolder}/${req.file.filename}`;
        }
        if (req.user) {
          data.updated_by = req.user.id;
        }
        await item.update(data);
        return res.json({ data: item });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    },

    destroy: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) {
          return res.status(404).json({ message: 'Recurso no encontrado' });
        }
        // Delete image file if it exists
        if (item.image_path) {
          const oldPath = path.join(__dirname, '../../public/uploads', item.image_path);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        await item.destroy();
        return res.json({ message: 'Eliminado con éxito' });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
  };
};
