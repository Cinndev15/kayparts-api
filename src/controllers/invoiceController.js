const { Invoice, InvoiceItem, InvoicingResolution, Order, OrderItem, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

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
        { invoice_number: { [Op.like]: `%${search}%` } },
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Order, as: 'order' },
        { model: InvoicingResolution, as: 'resolution' }
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
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Order, as: 'order' },
        { model: InvoicingResolution, as: 'resolution' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada.' });
    }
    return res.json({ data: invoice });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(422).json({ message: 'El campo order_id es obligatorio.' });
  }

  try {
    const order = await Order.findByPk(order_id, {
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ message: 'La orden especificada no existe.' });
    }

    // Verify if already invoiced
    const existingInvoice = await Invoice.findOne({ where: { order_id } });
    if (existingInvoice) {
      return res.status(422).json({ message: `Esta orden ya fue facturada bajo la factura Nro: ${existingInvoice.invoice_number}` });
    }

    // Fetch active DIAN resolution
    const resolution = await InvoicingResolution.findOne({
      where: { is_active: true }
    });

    if (!resolution) {
      return res.status(422).json({ message: 'No hay ninguna resolución de facturación DIAN activa registrada en el sistema.' });
    }

    if (resolution.current_number >= resolution.end_number) {
      return res.status(422).json({ message: 'La resolución de facturación activa ha alcanzado su límite de numeración.' });
    }

    // Generate invoice inside database transaction
    const result = await sequelize.transaction(async (t) => {
      // Increment resolution number
      resolution.current_number += 1;
      await resolution.save({ transaction: t });

      const invoiceNumber = `${resolution.prefix}-${resolution.current_number}`;

      // Calculate subtotal and tax amounts
      const totalAmount = parseFloat(order.total_amount);
      const taxAmount = parseFloat(order.tax_amount);
      const subtotal = totalAmount - taxAmount;

      const invoice = await Invoice.create({
        order_id: order.id,
        resolution_id: resolution.id,
        invoice_number: invoiceNumber,
        issue_date: new Date(),
        payment_method: order.payment_method || 'Otros',
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_nit_or_cedula: order.customer_phone || null, // Assuming phone or other doc is stored. Can also be updated.
        subtotal: subtotal.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        status: 'issued',
        created_by: req.user ? req.user.id : null,
      }, { transaction: t });

      // Create invoice items snapshots
      for (const item of order.items) {
        const itemSubtotal = parseFloat(item.subtotal);
        const itemTaxRate = parseFloat(item.tax_rate);
        const itemTaxAmount = itemSubtotal * (itemTaxRate / 100);
        const itemBasePrice = itemSubtotal - itemTaxAmount;
        
        await InvoiceItem.create({
          invoice_id: invoice.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          subtotal: item.subtotal
        }, { transaction: t });
      }

      return invoice;
    });

    // Return invoice details
    const finalInvoice = await Invoice.findByPk(result.id, {
      include: [{ model: InvoiceItem, as: 'items' }]
    });

    return res.status(201).json({
      message: 'Factura creada exitosamente en base a la resolución de la DIAN.',
      data: finalInvoice
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada.' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(422).json({ message: 'Esta factura ya se encuentra anulada.' });
    }

    invoice.status = 'cancelled';
    if (req.user) {
      invoice.updated_by = req.user.id;
    }
    await invoice.save();

    return res.json({ message: 'Factura anulada con éxito.', data: invoice });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
