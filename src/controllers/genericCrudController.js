const { Op } = require('sequelize');

module.exports = (Model, searchFields = [], defaultIncludes = [], hasSlug = false) => {
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
        await item.destroy();
        return res.json({ message: 'Eliminado con éxito' });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
  };
};
