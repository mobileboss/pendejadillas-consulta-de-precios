const path = require('path');
const { google } = require('googleapis');
const Fuse = require('fuse.js'); // Para búsqueda difusa
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Configuración del servidor
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Variables globales
const CREDENTIALS_PATH = path.join(__dirname, 'pendejadillas-64b51618122f.json');
const OPENAI_API_KEY = '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';
const SPREADSHEET_ID = '1XP0wJvNCTf2uaCAoFHPZUPKnVbpj2M2ooX9eKbJZAqU';
const RANGE = "'lista De precios'!A2:C";
const DEFAULT_IMAGE = 'https://via.placeholder.com/150'; // Imagen de respaldo

// Autenticación con Google Sheets
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return auth.getClient();
}

// Validar URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Obtener productos de Google Sheets
async function getPricesFromSheet() {
  try {
    const authClient = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    console.log('Intentando obtener datos de Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    console.log('Datos obtenidos de Google Sheets:', response.data);
    const rows = response.data.values;
    const products = [];

    if (rows.length) {
      rows.forEach((row) => {
        const productName = row[0]?.toLowerCase() || '';
        const price = row[1] || 'Precio no disponible';
        const imageUrl = isValidUrl(row[2]) ? row[2] : DEFAULT_IMAGE; // Validar URL
        products.push({ productName, price, imageUrl });
      });
    } else {
      console.log('No se encontraron productos en la hoja de Google Sheets.');
    }

    return products;
  } catch (error) {
    console.error('Error al obtener los precios desde Google Sheets:', error);
    throw new Error('Error al obtener los precios desde Google Sheets');
  }
}

// Ruta para obtener precios y productos similares
app.post('/get-price', async (req, res) => {
  const productName = req.body.productName.toLowerCase();

  try {
    const products = await getPricesFromSheet();

    // Búsqueda difusa
    const fuse = new Fuse(products, {
      keys: ['productName'],
      threshold: 0.3,
    });

    const results = fuse.search(productName);
    const similarProducts = results.slice(0, 3).map((result) => result.item);

    // Buscar el producto principal
    const mainProduct = similarProducts.find((product) => product.productName === productName);

    if (mainProduct) {
      res.json({
        message: `El precio de ${mainProduct.productName} es ${mainProduct.price}.`,
        similarProducts: similarProducts,
        imageUrl: mainProduct.imageUrl || DEFAULT_IMAGE,
      });
    } else {
      res.json({
        message: "Lo siento, no pude encontrar ese producto.",
        similarProducts: [],
        imageUrl: DEFAULT_IMAGE,
      });
    }
  } catch (error) {
    console.error('Error al obtener los precios de Google Sheets:', error);
    res.status(500).json({ message: 'Error al obtener los precios desde Google Sheets.' });
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
