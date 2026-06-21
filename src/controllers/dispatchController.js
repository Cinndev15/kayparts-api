const { Dispatch, Order, Carrier, DispatchTracking } = require('../models');
const { Op } = require('sequelize');

exports.index = async (req, res) => {
  try {
    const { search, status, page = 1, per_page = 20 } = req.query;
    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { tracking_number: { [Op.like]: `%${search}%` } },
        { responsible_person: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Dispatch.findAndCountAll({
      where,
      include: [
        { model: Carrier, as: 'carrier' },
        { model: Order, as: 'order' },
        { model: DispatchTracking, as: 'trackingHistory' }
      ],
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
};

exports.show = async (req, res) => {
  try {
    const dispatch = await Dispatch.findByPk(req.params.id, {
      include: [
        { model: Carrier, as: 'carrier' },
        { model: Order, as: 'order' },
        { model: DispatchTracking, as: 'trackingHistory' }
      ]
    });
    if (!dispatch) {
      return res.status(404).json({ message: 'Despacho no encontrado' });
    }
    return res.json({ data: dispatch });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const { order_id, carrier_id, tracking_number, responsible_person, status, dispatch_date, notes } = req.body;

    if (!order_id || !carrier_id || !tracking_number || !responsible_person) {
      return res.status(422).json({ message: 'Los campos order_id, carrier_id, tracking_number y responsible_person son obligatorios.' });
    }

    // Verify order exists
    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({ message: 'La orden especificada no existe.' });
    }

    // Verify carrier exists
    const carrier = await Carrier.findByPk(carrier_id);
    if (!carrier) {
      return res.status(404).json({ message: 'La transportadora especificada no existe.' });
    }

    const currentStatus = status || 'recibido';

    const dispatch = await Dispatch.create({
      order_id,
      carrier_id,
      tracking_number,
      responsible_person,
      status: currentStatus,
      dispatch_date: dispatch_date || new Date(),
      notes
    });

    // Create initial tracking record
    await DispatchTracking.create({
      dispatch_id: dispatch.id,
      status: currentStatus,
      description: 'El despacho ha sido creado e ingresado al sistema.',
      location: 'Bodega Principal'
    });

    return res.status(201).json({ data: dispatch });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const dispatch = await Dispatch.findByPk(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ message: 'Despacho no encontrado' });
    }

    const { order_id, carrier_id, tracking_number, responsible_person, status, dispatch_date, notes } = req.body;

    if (order_id) {
      const order = await Order.findByPk(order_id);
      if (!order) {
        return res.status(404).json({ message: 'La orden especificada no existe.' });
      }
    }

    if (carrier_id) {
      const carrier = await Carrier.findByPk(carrier_id);
      if (!carrier) {
        return res.status(404).json({ message: 'La transportadora especificada no existe.' });
      }
    }

    const oldStatus = dispatch.status;

    await dispatch.update({
      order_id: order_id || dispatch.order_id,
      carrier_id: carrier_id || dispatch.carrier_id,
      tracking_number: tracking_number || dispatch.tracking_number,
      responsible_person: responsible_person || dispatch.responsible_person,
      status: status || dispatch.status,
      dispatch_date: dispatch_date || dispatch.dispatch_date,
      notes: notes !== undefined ? notes : dispatch.notes
    });

    // If status changed, create a new tracking milestone
    if (status && status !== oldStatus) {
      await DispatchTracking.create({
        dispatch_id: dispatch.id,
        status,
        description: `El estado del despacho ha sido cambiado a: ${status}.`,
        location: 'Tránsito'
      });
    }

    return res.json({ data: dispatch });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const dispatch = await Dispatch.findByPk(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ message: 'Despacho no encontrado' });
    }
    await dispatch.destroy();
    return res.json({ message: 'Despacho eliminado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
