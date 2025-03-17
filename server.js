const express = require("express");
const multer = require("multer");
const path = require("path");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;
const serverUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuración de almacenamiento de imágenes
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage }).array("images", 3);

// Configuración de Google Sheets
const SPREADSHEET_ID = "1rLH1BqVhuetmlUcvWJEZwLUTUXtxbGkL6_vY7CdECQ8";


async function authenticate() {
    if (!process.env.GOOGLE_CREDENTIALS_JSON) {
        throw new Error("❌ ERROR: GOOGLE_CREDENTIALS_JSON no está definido en las variables de entorno.");
    }

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return auth.getClient();
}




// Endpoint para obtener precio (Búsqueda por nombre o código SKU)
app.post("/get-price", async (req, res) => {
    try {
        const { productName, productCode } = req.body;

        if (!productName && !productCode) {
            return res.status(400).json({ message: "Debes proporcionar el nombre o el código del producto." });
        }

        const authClient = await authenticate();
        const sheets = google.sheets({ version: "v4", auth: authClient });

        const { data } = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Productos!A2:F",
        });

        const rows = data.values || [];
        let producto = null;

        // 🔹 Normalizar el código que se recibe en la solicitud (el escaneado o ingresado manualmente)
        let productCodeNormalizado = productCode ? productCode.replace("SKU-", "").trim().toLowerCase() : "";
        const productNameNormalizado = productName ? productName.trim().toLowerCase() : "";

        for (const row of rows) {
            const [nombre, precio, imageUrl, promocion, codigoBarras, sku] = row;

            // 🔹 Normalizar el SKU de la hoja de Google eliminando "SKU-" antes de comparar
            const skuNormalizado = sku ? sku.replace("SKU-", "").trim().toLowerCase() : "";

            if (
                (productName && nombre.trim().toLowerCase() === productNameNormalizado) ||
                (productCode && skuNormalizado === productCodeNormalizado)
            ) {
                producto = { nombre, precio, imageUrl, promocion };
                break;
            }
        }

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.json({
            message: `✅ Producto encontrado: ${producto.nombre}`,
            productName: producto.nombre,
            price: producto.precio,
            imageUrl: producto.imageUrl,
            promotion: producto.promocion || "Sin promoción",
        });

    } catch (error) {
        console.error("❌ Error en /get-price:", error);
        res.status(500).json({ message: "Error al obtener precio." });
    }
});


// Endpoint para registrar venta
app.post("/register-sale", upload, async (req, res) => {
    try {
        const { vendedorId, locationId, items } = req.body;

        if (!vendedorId || !locationId || !items) {
            return res.status(400).json({ message: "Datos incompletos en la solicitud" });
        }

        const productos = JSON.parse(items);
        const fechaVenta = new Date().toISOString();
        const imageUrls = (req.files || []).map(file => `${serverUrl}/uploads/${file.filename}`);

        const authClient = await authenticate();
        const sheets = google.sheets({ version: "v4", auth: authClient });

        const values = productos.map(item => [
            fechaVenta,
            vendedorId,
            locationId,
            item.productName,
            item.quantity,
            item.price,
            item.quantity * item.price,
            imageUrls.length ? imageUrls.join(", ") : "Sin imagen"
        ]);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Ventas!A:H",
            valueInputOption: "USER_ENTERED",
            requestBody: { values }
        });

        res.json({ message: "Venta registrada con éxito", success: true, imageUrls });

    } catch (error) {
        console.error("❌ Error al registrar la venta:", error);
        res.status(500).json({ message: "Error al registrar la venta." });
    }
});

// Endpoint para registrar inventario por escaneo
app.post("/register-inventory", async (req, res) => {
    try {
        const { vendedorId, locationId, productCode, quantity } = req.body;

        if (!vendedorId || !locationId || !productCode || !quantity) {
            return res.status(400).json({ message: "Datos incompletos para registrar inventario" });
        }

        const authClient = await authenticate();
        const sheets = google.sheets({ version: "v4", auth: authClient });

        const { data } = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Productos!A2:F",
        });

        const rows = data.values || [];
        let producto = null;

        for (const row of rows) {
            const [nombre, precio, imageUrl, promocion, codigoBarras, sku] = row;
            if (sku === productCode) {
                producto = { nombre, precio };
                break;
            }
        }

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado en catálogo" });
        }

        const fechaRegistro = new Date().toISOString();

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Inventarios!A:F",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [fechaRegistro, vendedorId, locationId, producto.nombre, productCode, quantity]
                ]
            }
        });

        res.json({ message: "Inventario registrado correctamente", product: producto.nombre });

    } catch (error) {
        console.error("❌ Error en /register-inventory:", error);
        res.status(500).json({ message: "Error al registrar inventario." });
    }
});
// Ruta principal que devuelve index.html (frontend)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
