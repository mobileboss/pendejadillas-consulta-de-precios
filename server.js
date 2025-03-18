const express = require("express");
const multer = require("multer");
const path = require("path");
const { google } = require("googleapis");
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

// 🔥 **Endpoint para obtener precio (Búsqueda por código de barras o nombre)**
app.post("/get-price", async (req, res) => {
    try {
        console.log("📩 Datos recibidos en el servidor:", req.body);

        const { productName, productCode } = req.body;

        if (!productName && !productCode) {
            return res.status(400).json({ message: "Debes proporcionar el nombre o el código del producto." });
        }
        console.log(`🔎 Buscando producto con código: ${productCode}`);

        const authClient = await authenticate();
        const sheets = google.sheets({ version: "v4", auth: authClient });

        const { data } = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Productos!A2:H", // Ahora hasta la columna H para incluir código de barras
        });

        console.log("📋 Datos obtenidos de Google Sheets:", data.values);

        const rows = data.values || [];
        let producto = null;

        // Normaliza el código enviado desde el cliente
        let productCodeNormalizado = productCode ? productCode.trim().toLowerCase() : "";
        const productNameNormalizado = productName ? productName.trim().toLowerCase() : "";

        console.log(`🔎 Código recibido para búsqueda: "${productCodeNormalizado}"`);

        for (const row of rows) {
            const [nombre, precio, imageUrl, promocion, , , , codigoBarras] = row; // Columna H (índice 7)

            // **Saltar filas que no tienen código de barras**
            if (!codigoBarras || codigoBarras.trim() === "") {
                console.log("⚠️ Saltando fila sin código de barras:", row);
                continue;
            }

            const codigoBarrasNormalizado = codigoBarras.trim().toLowerCase();

            console.log(`📊 Comparando: Código Escaneado "${productCodeNormalizado}" vs Código de Barras "${codigoBarrasNormalizado}"`);

            if (
                (productName && nombre.trim().toLowerCase() === productNameNormalizado) ||
                (productCode && codigoBarrasNormalizado === productCodeNormalizado)
            ) {
                producto = { nombre, precio, imageUrl, promocion };
                break;
            }
        }

        if (!producto) {
            console.log("❌ Producto no encontrado.");
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        
        console.log("✅ Producto encontrado:", producto);
console.log("📤 Enviando respuesta al cliente:", {
    message: `✅ Producto encontrado: ${producto.nombre}`,
    productName: producto.nombre,
    price: producto.precio,
    imageUrl: producto.imageUrl,
    promotion: producto.promocion || "Sin promoción",
});

// ✅ SE AGREGA `res.json(...)` PARA ENVIAR LA RESPUESTA ANTES DEL `catch`
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

// Ruta principal que devuelve index.html (frontend)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
