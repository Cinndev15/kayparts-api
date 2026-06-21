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
