const { Order, OrderItem, Product } = require('../models');

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.index = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'paid', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(422).json({ message: 'Estado de pedido no válido.' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    await order.update({ status });
    return res.status(200).json({ message: 'Estado del pedido actualizado correctamente.', data: order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
