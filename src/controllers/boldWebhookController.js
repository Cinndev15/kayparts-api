const { sequelize, Order, OrderItem, Product } = require('../models');

exports.handle = async (req, res) => {
  const payload = req.body;
  console.log('Bold Webhook Received:', payload);

  const reference = payload.reference;
  const status = payload.status;

  if (!reference || !status) {
    return res.status(400).json({ message: 'Payload inválido' });
  }

  try {
    const order = await Order.findOne({
      where: { order_number: reference },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      console.warn(`Webhook received for unknown order: ${reference}`);
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // Prevent processing already finalized orders
    if (['paid', 'failed', 'cancelled'].includes(order.status)) {
      return res.json({ message: 'Orden ya fue procesada anteriormente' });
    }

    await sequelize.transaction(async (t) => {
      const upperStatus = status.toUpperCase();

      if (upperStatus === 'APPROVED') {
        order.status = 'paid';
        order.bold_transaction_id = payload.id || null;
        order.payment_method = payload.payment_method_type || null;
        await order.save({ transaction: t });

        // Decrease stock
        for (const item of order.items) {
          if (item.product_id) {
            const product = await Product.findByPk(item.product_id, { transaction: t });
            if (product) {
              product.stock = Math.max(0, product.stock - item.quantity);
              await product.save({ transaction: t });
            }
          }
        }
      } else if (['REJECTED', 'FAILED', 'DECLINED'].includes(upperStatus)) {
        order.status = 'failed';
        order.bold_transaction_id = payload.id || null;
        await order.save({ transaction: t });
      }
    });

    return res.json({ message: 'Webhook procesado correctamente' });
  } catch (error) {
    console.error('Error processing Bold Webhook:', error);
    return res.status(500).json({ message: 'Error interno' });
  }
};
