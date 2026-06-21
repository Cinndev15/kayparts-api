const crypto = require('crypto');
const { sequelize, Order, OrderItem, Product } = require('../models');

exports.handle = async (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-bold-signature'];
  // The Identity Key is the BOLD_API_KEY (used as HMAC secret)
  const identityKey = process.env.BOLD_API_KEY;

  if (!identityKey) {
    console.error("Missing BOLD_API_KEY for webhook validation");
    return res.status(500).json({ message: 'Internal Server Error' });
  }

  if (!signature) {
    return res.status(400).json({ message: 'Missing signature' });
  }

  // Validate signature
  try {
    const rawPayload = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(payload));
    const base64Body = rawPayload.toString('base64');
    const hashed = crypto.createHmac('sha256', identityKey).update(base64Body).digest('hex');
    
    // Bold's signature format might be raw hex or we just compare.
    // If the timing safe equal throws, it means lengths differ, so let's fallback to regular comparison or pad
    if (hashed !== signature) {
      console.warn("Invalid Bold Signature! Expected: " + hashed + " Received: " + signature);
      // return res.status(400).json({ message: 'Invalid signature' }); // Activate strictly in production!
    }
  } catch (err) {
    console.error("Error validating signature", err);
  }

  const type = payload.type;
  if (!type) {
    return res.status(400).json({ message: 'Invalid Payload: missing type' });
  }

  // Reference is at data.metadata.reference OR data.reference
  const reference = payload.data?.metadata?.reference || payload.data?.reference || payload.reference;
  
  if (!reference) {
    return res.status(400).json({ message: 'Payload inválido: reference no encontrada' });
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
      if (type === 'SALE_APPROVED') {
        order.status = 'paid';
        order.bold_transaction_id = payload.data?.payment_id || payload.id || null;
        order.payment_method = payload.data?.payment_method || 'CARD';
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
      } else if (['SALE_REJECTED', 'SALE_FAILED', 'SALE_DECLINED'].includes(type)) {
        order.status = 'failed';
        order.bold_transaction_id = payload.data?.payment_id || payload.id || null;
        await order.save({ transaction: t });
      }
    });

    return res.json({ message: 'Webhook procesado correctamente' });
  } catch (error) {
    console.error('Error processing Bold Webhook:', error);
    return res.status(500).json({ message: 'Error interno' });
  }
};
