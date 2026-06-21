const { DispatchTracking, Dispatch } = require('../models');

exports.index = async (req, res) => {
  try {
    const { dispatchId } = req.params;
    const tracking = await DispatchTracking.findAll({
      where: { dispatch_id: dispatchId },
      order: [['created_at', 'ASC']]
    });
    return res.json({ data: tracking });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const { dispatchId } = req.params;
    const { status, description, location } = req.body;

    if (!status) {
      return res.status(422).json({ message: 'El campo status es obligatorio.' });
    }

    const dispatch = await Dispatch.findByPk(dispatchId);
    if (!dispatch) {
      return res.status(404).json({ message: 'El despacho especificado no existe.' });
    }

    const tracking = await DispatchTracking.create({
      dispatch_id: dispatchId,
      status,
      description,
      location
    });

    // Update parent dispatch status
    await dispatch.update({ status });

    return res.status(201).json({ data: tracking });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const tracking = await DispatchTracking.findByPk(id);
    if (!tracking) {
      return res.status(404).json({ message: 'Hito de seguimiento no encontrado' });
    }
    await tracking.destroy();
    return res.json({ message: 'Hito de seguimiento eliminado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
