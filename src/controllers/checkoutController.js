const crypto = require('crypto');
const { sequelize, Order, OrderItem, Product, Tax } = require('../models');

exports.process = async (req, res) => {
  const { items, customer_name, customer_email, customer_phone, shipping_address, payment_method } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ message: 'Los items son requeridos.' });
  }

  if (!customer_name || !customer_email) {
    return res.status(422).json({ message: 'El nombre y correo del cliente son requeridos.' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      let totalAmount = 0;
      let taxAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        if (!item.product_id || !item.quantity) {
          throw new Error('Cada item debe tener product_id y quantity.');
        }

        const product = await Product.findByPk(item.product_id, {
          include: [{ model: Tax, as: 'taxes', where: { is_active: true }, required: false }],
          transaction: t
        });

        if (!product) {
          throw new Error(`Producto no encontrado ID: ${item.product_id}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`No hay suficiente stock para el producto: ${product.name}`);
        }

        const unitPrice = parseFloat(product.price);
        const quantity = parseInt(item.quantity);

        // Calculate Taxes
        const itemTaxRate = (product.taxes || []).reduce((sum, tax) => sum + parseFloat(tax.rate), 0);
        const itemTaxAmount = (unitPrice * (itemTaxRate / 100)) * quantity;
        const itemSubtotal = (unitPrice * quantity) + itemTaxAmount;

        totalAmount += itemSubtotal;
        taxAmount += itemTaxAmount;

        orderItemsData.push({
          product_id: product.id,
          product_name: product.name,
          quantity: quantity,
          unit_price: unitPrice,
          tax_rate: itemTaxRate,
          subtotal: itemSubtotal,
        });
      }

      // Generate random order number matching KAY-XXXXXXXX
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      const orderNumber = `KAY-${randomPart}`;

      // Create Order
      const order = await Order.create({
        user_id: req.user ? req.user.id : null, // Set if authenticated
        order_number: orderNumber,
        total_amount: totalAmount.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        shipping_cost: '0.00',
        status: 'pending',
        customer_name,
        customer_email,
        shipping_address,
        payment_method,
      }, { transaction: t });

      // Create Order Items
      for (const itemData of orderItemsData) {
        itemData.order_id = order.id;
        await OrderItem.create(itemData, { transaction: t });
      }

      // Load items for the response
      const orderWithItems = await Order.findByPk(order.id, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: t
      });

      let payment_link_url = null;

      if (payment_method === 'card') {
        const apiKey = process.env.BOLD_API_KEY;
        if (!apiKey) {
          throw new Error('La integración de pagos no está configurada correctamente.');
        }

        // Bold requires taxes specifically formatted
        const boldTaxes = [];
        if (taxAmount > 0) {
          // Simplification: we put all calculated tax in a single VAT block
          // For a real integration, we might want to pass taxes per item, but bold accepts transaction total taxes.
          boldTaxes.push({
            type: "VAT",
            base: Math.round((totalAmount - taxAmount) * 100) / 100, // Two decimals max base
            value: Math.round(taxAmount * 100) / 100
          });
        }

        const boldPayload = {
          amount_type: "CLOSE",
          amount: {
            currency: "COP",
            total_amount: Math.round(totalAmount), // Bold expects integer or float, documentation says example: 10000
            tip_amount: 0
          },
          reference: orderNumber,
          description: `Pedido ${orderNumber} en KAYPARTS`,
          callback_url: `https://kayparts.co/`, // Redirigir al inicio por ahora (o a una ruta /success en web)
          payer_email: customer_email
        };

        if (boldTaxes.length > 0) {
           boldPayload.amount.taxes = boldTaxes;
        }

        const fetch = (await import('node-fetch')).default;

        const boldRes = await fetch('https://integrations.api.bold.co/online/link/v1', {
          method: 'POST',
          headers: {
            'Authorization': `x-api-key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(boldPayload)
        });

        if (!boldRes.ok) {
          const errData = await boldRes.text();
          console.error("Error Bold API:", errData);
          throw new Error('No se pudo generar el enlace de pago con Bold.');
        }

        const boldData = await boldRes.json();
        if (boldData && boldData.payload && boldData.payload.url) {
           payment_link_url = boldData.payload.url;
        } else {
           throw new Error('La pasarela de pago devolvió una respuesta inválida.');
        }
      }

      return {
        message: 'Orden creada exitosamente',
        order: orderWithItems,
        payment_link_url: payment_link_url
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Checkout Error:", error);
    return res.status(422).json({
      message: 'Error al procesar el checkout: ' + error.message
    });
  }
};
