const { PurchaseOrder, PurchaseOrderItem, PurchaseOrderSequence, Supplier, Product, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const transporter = require('../config/mail');

// Helper to calculate item totals
const calcItemTotals = (item) => {
  const qty = parseFloat(item.quantity);
  const unitPrice = parseFloat(item.unit_price);
  const taxRate = parseFloat(item.tax_rate !== undefined ? item.tax_rate : 19);
  const baseAmount = qty * unitPrice;
  const taxAmount = parseFloat((baseAmount * taxRate / 100).toFixed(2));
  const subtotal = parseFloat((baseAmount + taxAmount).toFixed(2));
  return { tax_amount: taxAmount, subtotal };
};

exports.index = async (req, res) => {
  try {
    const { search, status, supplier_id, page = 1, per_page = 20 } = req.query;
    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (supplier_id) where.supplier_id = supplier_id;
    if (search) {
      where[Op.or] = [
        { po_number: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'razon_social', 'email', 'nit_or_cedula'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      limit,
      offset,
      order: [['id', 'DESC']],
      distinct: true,
    });

    return res.json({
      data: rows,
      meta: { current_page: parseInt(page), per_page: limit, total: count, last_page: Math.ceil(count / limit) }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.show = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      ]
    });
    if (!po) return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    return res.json({ data: po });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  const { supplier_id, expected_delivery_date, notes, terms, items } = req.body;

  if (!supplier_id) return res.status(422).json({ message: 'El campo supplier_id es obligatorio.' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ message: 'La orden de compra debe incluir al menos un ítem.' });
  }

  try {
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json({ message: 'El proveedor especificado no existe.' });

    const result = await sequelize.transaction(async (t) => {
      // Fetch active sequence
      const sequence = await PurchaseOrderSequence.findOne({
        where: { is_active: true },
        transaction: t,
        lock: t.LOCK.UPDATE, // Prevent race conditions
      });

      if (!sequence) {
        throw new Error('No hay ninguna secuencia de orden de compra activa. Por favor configure una en el sistema.');
      }

      if (sequence.current_number >= sequence.end_number) {
        throw new Error(`La secuencia "${sequence.name}" ha alcanzado su límite de numeración (${sequence.end_number}). Por favor configure una nueva secuencia.`);
      }

      // Increment sequence
      sequence.current_number += 1;
      await sequence.save({ transaction: t });

      const po_number = `${sequence.prefix}-${String(sequence.current_number).padStart(3, '0')}`;

      let totalSubtotal = 0;
      let totalTaxAmount = 0;
      let totalAmount = 0;

      // Pre-calculate all item totals
      const calculatedItems = items.map(item => {
        const { tax_amount, subtotal } = calcItemTotals(item);
        const baseAmount = parseFloat(item.quantity) * parseFloat(item.unit_price);
        totalSubtotal += parseFloat(baseAmount.toFixed(2));
        totalTaxAmount += tax_amount;
        totalAmount += subtotal;
        return { ...item, tax_amount, subtotal };
      });

      const po = await PurchaseOrder.create({
        po_number,
        sequence_id: sequence.id,
        supplier_id,
        expected_delivery_date: expected_delivery_date || null,
        subtotal: totalSubtotal.toFixed(2),
        tax_amount: totalTaxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        notes: notes || null,
        terms: terms || null,
        status: 'draft',
        created_by: req.user ? req.user.id : null,
      }, { transaction: t });

      for (const item of calculatedItems) {
        await PurchaseOrderItem.create({
          purchase_order_id: po.id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'Unidad',
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 19,
          tax_amount: item.tax_amount,
          subtotal: item.subtotal,
        }, { transaction: t });
      }

      return po;
    });

    const finalPo = await PurchaseOrder.findByPk(result.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items' },
      ]
    });

    return res.status(201).json({ message: 'Orden de compra creada exitosamente.', data: finalPo });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }]
    });
    if (!po) return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    if (po.status !== 'draft') {
      return res.status(422).json({ message: 'Solo se pueden editar órdenes de compra en estado "draft".' });
    }

    const { supplier_id, expected_delivery_date, notes, terms, items } = req.body;

    await sequelize.transaction(async (t) => {
      const updateData = {};
      if (supplier_id) updateData.supplier_id = supplier_id;
      if (expected_delivery_date !== undefined) updateData.expected_delivery_date = expected_delivery_date;
      if (notes !== undefined) updateData.notes = notes;
      if (terms !== undefined) updateData.terms = terms;
      if (req.user) updateData.updated_by = req.user.id;

      if (items && Array.isArray(items) && items.length > 0) {
        // Replace all items
        await PurchaseOrderItem.destroy({ where: { purchase_order_id: po.id }, transaction: t });

        let totalSubtotal = 0;
        let totalTaxAmount = 0;
        let totalAmount = 0;

        for (const item of items) {
          const { tax_amount, subtotal } = calcItemTotals(item);
          const baseAmount = parseFloat(item.quantity) * parseFloat(item.unit_price);
          totalSubtotal += parseFloat(baseAmount.toFixed(2));
          totalTaxAmount += tax_amount;
          totalAmount += subtotal;

          await PurchaseOrderItem.create({
            purchase_order_id: po.id,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'Unidad',
            unit_price: item.unit_price,
            tax_rate: item.tax_rate || 19,
            tax_amount,
            subtotal,
          }, { transaction: t });
        }

        updateData.subtotal = totalSubtotal.toFixed(2);
        updateData.tax_amount = totalTaxAmount.toFixed(2);
        updateData.total_amount = totalAmount.toFixed(2);
      }

      await po.update(updateData, { transaction: t });
    });

    const updatedPo = await PurchaseOrder.findByPk(po.id, {
      include: [{ model: Supplier, as: 'supplier' }, { model: PurchaseOrderItem, as: 'items' }]
    });
    return res.json({ data: updatedPo });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    if (!['draft', 'cancelled'].includes(po.status)) {
      return res.status(422).json({ message: 'Solo se pueden eliminar órdenes de compra en estado "draft" o "cancelled".' });
    }
    await PurchaseOrderItem.destroy({ where: { purchase_order_id: po.id } });
    await po.destroy();
    return res.json({ message: 'Orden de compra eliminada exitosamente.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.send = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!po) return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    if (po.status === 'cancelled') {
      return res.status(422).json({ message: 'No se puede enviar una orden de compra cancelada.' });
    }
    if (!po.supplier.email) {
      return res.status(422).json({ message: 'El proveedor no tiene un correo electrónico registrado.' });
    }

    // Build items table rows
    const itemRows = po.items.map((item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">${idx + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${parseFloat(item.quantity)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.unit || 'Unidad'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">$${parseFloat(item.unit_price).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${parseFloat(item.tax_rate)}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">$${parseFloat(item.tax_amount).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${parseFloat(item.subtotal).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
      </tr>
    `).join('');

    const issueDate = new Date(po.issue_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const deliveryDate = po.expected_delivery_date
      ? new Date(po.expected_delivery_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Por confirmar';

    const htmlEmail = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:750px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#c0392b;padding:30px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:2px;">KAYPARTS</h1>
      <p style="color:#ffcdd2;margin:8px 0 0;font-size:14px;letter-spacing:1px;">ORDEN DE COMPRA</p>
    </div>

    <!-- OC Info Banner -->
    <div style="background:#2c3e50;padding:20px 40px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <p style="color:#95a5a6;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Número de OC</p>
        <p style="color:#ffffff;margin:4px 0 0;font-size:20px;font-weight:700;">${po.po_number}</p>
      </div>
      <div>
        <p style="color:#95a5a6;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Fecha de Emisión</p>
        <p style="color:#ffffff;margin:4px 0 0;font-size:15px;">${issueDate}</p>
      </div>
      <div>
        <p style="color:#95a5a6;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Entrega Esperada</p>
        <p style="color:#ffffff;margin:4px 0 0;font-size:15px;">${deliveryDate}</p>
      </div>
    </div>

    <!-- Parties Info -->
    <div style="padding:30px 40px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        <p style="color:#95a5a6;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Comprador</p>
        <p style="margin:0;font-weight:700;font-size:15px;color:#2c3e50;">KAYPARTS S.A.S.</p>
        <p style="margin:4px 0;color:#555;font-size:13px;">NIT: 901.234.567-8</p>
        <p style="margin:4px 0;color:#555;font-size:13px;">compras@kayparts.co</p>
      </div>
      <div>
        <p style="color:#95a5a6;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Proveedor</p>
        <p style="margin:0;font-weight:700;font-size:15px;color:#2c3e50;">${po.supplier.razon_social}</p>
        <p style="margin:4px 0;color:#555;font-size:13px;">${po.supplier.identification_type || 'NIT'}: ${po.supplier.nit_or_cedula}</p>
        ${po.supplier.email ? `<p style="margin:4px 0;color:#555;font-size:13px;">${po.supplier.email}</p>` : ''}
        ${po.supplier.phone ? `<p style="margin:4px 0;color:#555;font-size:13px;">Tel: ${po.supplier.phone}</p>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <div style="padding:0 40px 30px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#c0392b;">
            <th style="padding:12px;color:#fff;text-align:left;font-weight:600;">#</th>
            <th style="padding:12px;color:#fff;text-align:left;font-weight:600;">Descripción</th>
            <th style="padding:12px;color:#fff;text-align:center;font-weight:600;">Cant.</th>
            <th style="padding:12px;color:#fff;text-align:center;font-weight:600;">Unidad</th>
            <th style="padding:12px;color:#fff;text-align:right;font-weight:600;">Vlr. Unit.</th>
            <th style="padding:12px;color:#fff;text-align:center;font-weight:600;">IVA %</th>
            <th style="padding:12px;color:#fff;text-align:right;font-weight:600;">IVA $</th>
            <th style="padding:12px;color:#fff;text-align:right;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top:20px;text-align:right;">
        <table style="margin-left:auto;font-size:14px;">
          <tr>
            <td style="padding:6px 20px 6px 0;color:#555;">Subtotal (sin IVA):</td>
            <td style="padding:6px 0;font-weight:600;color:#2c3e50;">$${parseFloat(po.subtotal).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
          </tr>
          <tr>
            <td style="padding:6px 20px 6px 0;color:#555;">Total IVA:</td>
            <td style="padding:6px 0;font-weight:600;color:#2c3e50;">$${parseFloat(po.tax_amount).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
          </tr>
          <tr style="border-top:2px solid #c0392b;">
            <td style="padding:10px 20px 6px 0;font-size:16px;font-weight:700;color:#c0392b;">TOTAL:</td>
            <td style="padding:10px 0 6px;font-size:18px;font-weight:700;color:#c0392b;">$${parseFloat(po.total_amount).toLocaleString('es-CO', {minimumFractionDigits:2})}</td>
          </tr>
        </table>
      </div>
    </div>

    ${po.terms ? `
    <!-- Terms -->
    <div style="padding:20px 40px;background:#f8f9fa;border-top:1px solid #eee;">
      <p style="color:#95a5a6;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Condiciones / Términos</p>
      <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${po.terms}</p>
    </div>
    ` : ''}

    ${po.notes ? `
    <!-- Notes -->
    <div style="padding:20px 40px;background:#fffbee;border-top:1px solid #eee;">
      <p style="color:#95a5a6;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Observaciones</p>
      <p style="margin:0;color:#555;font-size:13px;line-height:1.6;">${po.notes}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="background:#2c3e50;padding:20px 40px;text-align:center;">
      <p style="color:#7f8c8d;margin:0;font-size:12px;">Este correo fue generado automáticamente por el sistema de KAYPARTS.</p>
      <p style="color:#7f8c8d;margin:6px 0 0;font-size:12px;">© ${new Date().getFullYear()} CINNDEV S.A.S. — Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `"KAYPARTS Compras" <compras@kayparts.co>`,
      to: po.supplier.email,
      cc: 'compras@kayparts.co',
      subject: `Orden de Compra ${po.po_number} — KAYPARTS`,
      html: htmlEmail,
    };

    await transporter.sendMail(mailOptions);

    // Update status to sent
    po.status = 'sent';
    po.sent_at = new Date();
    if (req.user) po.updated_by = req.user.id;
    await po.save();

    return res.json({ message: `Orden de compra ${po.po_number} enviada exitosamente a ${po.supplier.email}.`, data: po });
  } catch (error) {
    console.error('Error sending purchase order email:', error);
    return res.status(500).json({ error: error.message });
  }
};
