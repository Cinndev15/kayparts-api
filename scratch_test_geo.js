const fs = require('fs');
const path = require('path');

const geoPath = path.join(__dirname, 'database/data/colombia_geo.json');
console.log('__dirname:', __dirname);
console.log('geoPath:', geoPath);
console.log('exists:', fs.existsSync(geoPath));

const controllerGeoPath = path.join(__dirname, 'src/controllers', '../../database/data/colombia_geo.json');
console.log('controllerGeoPath:', controllerGeoPath);
console.log('controllerGeoPath exists:', fs.existsSync(controllerGeoPath));

try {
  const data = JSON.parse(fs.readFileSync(controllerGeoPath, 'utf8'));
  console.log('Data length:', data.length);
  if (data.length > 0) {
    console.log('Sample:', data[0]);
  }
} catch (err) {
  console.error(err);
}
