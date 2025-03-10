const { google } = require("googleapis");
const dropboxV2Api = require('dropbox-v2-api');
const fs = require('fs');
const path = require('path');

// Credenciales de Google Sheets (ya debes tenerlo)
const credentials = require("./pendejadillas-64b51618122f.json");

// ID y nombre de la hoja
const SPREADSHEET_ID = "1rLH1BqVhuetmlUcvWJEZwLUTUXtxbGkL6_vY7CdECQ8";
const SHEET_NAME = "Productos";

// Configuración Dropbox
const DROPBOX_ACCESS_TOKEN = "AQUI_VA_TU_ACCESS_TOKEN";  // Coloca el token aquí
const DROPBOX_FOLDER_PATH = "/CodigosBarras"; // Cambia si usaste otro nombre de carpeta

const dropbox = dropboxV2Api.authenticate({ token: DROPBOX_ACCESS_TOKEN });

// Autenticación Google Sheets
async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
}

// Obtener links públicos de Dropbox
function getDropboxLinks() {
    return new Promise((resolve, reject) => {
        dropbox({
            resource: 'files/list_folder',
            parameters: { path: DROPBOX_FOLDER_PATH }
        }, (err, result) => {
            if (err) return reject(err);

            const linksPromises = result.entries.map(file => {
                return new Promise((resolveLink, rejectLink) => {
                    dropbox({
                        resource: 'sharing/create_shared_link_with_settings',
                        parameters: { path: `${DROPBOX_FOLDER_PATH}/${file.name}` }
                    }, (err, linkResult) => {
                        if (err && err.error?.shared_link_already_exists) {
                            dropbox({
                                resource: 'sharing/list_shared_links',
                                parameters: { path: `${DROPBOX_FOLDER_PATH}/${file.name}` }
                            }, (err, listResult) => {
                                if (err) return rejectLink(err);
                                resolveLink({
                                    sku: path.basename(file.name, '.png'),
                                    link: listResult.links[0].url.replace("?dl=0", "?raw=1")
                                });
                            });
                        } else if (linkResult) {
                            resolveLink({
                                sku: path.basename(file.name, '.png'),
                                link: linkResult.url.replace("?dl=0", "?raw=1")
                            });
                        } else {
                            rejectLink(err);
                        }
                    });
                });
            });

            Promise.all(linksPromises).then(resolve).catch(reject);
        });
    });
}

// Subir links a Google Sheets
async function updateSheet(links) {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:E`
    });

    const rows = response.data.values || [];
    const skuRowMap = {};
    rows.forEach((row, index) => {
        const sku = row[0]?.trim();
        if (sku) {
            skuRowMap[sku] = index + 1;
        }
    });

    for (const { sku, link } of links) {
        const rowNumber = skuRowMap[sku];
        if (rowNumber) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!E${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [[link]] }
            });
            console.log(`✅ Link actualizado para SKU: ${sku}`);
        } else {
            console.warn(`⚠️ No se encontró fila para SKU: ${sku}`);
        }
    }

    console.log("✅ Actualización completada.");
}

// Ejecución principal
(async () => {
    try {
        const links = await getDropboxLinks();
        await updateSheet(links);
    } catch (error) {
        console.error("❌ Error:", error);
    }
})();
