const fs = require('fs');
const path = require('path');

const loadGeoData = () => {
  const geoPath = path.join(__dirname, '../../database/data/colombia_geo.json');
  if (!fs.existsSync(geoPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  } catch (error) {
    console.error('Error reading geo data:', error);
    return [];
  }
};

exports.departments = (req, res) => {
  const data = loadGeoData();
  const departments = data.map(item => ({
    id: item.id,
    name: item.department,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return res.json(departments);
};

exports.cities = (req, res) => {
  const departmentId = parseInt(req.query.department_id);
  if (!departmentId) {
    return res.status(422).json({
      message: 'The department id field is required.',
      errors: { department_id: ['The department id field is required.'] }
    });
  }

  const data = loadGeoData();
  const department = data.find(item => item.id === departmentId);

  if (!department) {
    return res.json([]);
  }

  const cities = [...department.cities].sort();

  return res.json({
    department: department.department,
    cities: cities,
  });
};
