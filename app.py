from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import difflib  # Para buscar nombres similares
import sys  # Importamos sys para forzar la impresión de logs

# Función para forzar la impresión de logs en tiempo real
def log(message):
    print(message)
    sys.stdout.flush()  # 🔥 Esto hace que Render imprima el mensaje inmediatamente

app = Flask(__name__)
CORS(app, supports_credentials=True)

# ✅ Verificar si el archivo productos.csv está en el servidor
if os.path.exists("productos.csv"):
    log("✅ El archivo productos.csv está en el servidor.")
else:
    log("❌ ERROR: El archivo productos.csv NO está en el servidor.")

# ✅ Cargar la base de datos de productos correctamente
try:
    productos = pd.read_csv("productos.csv", encoding="utf-8")
    productos.columns = productos.columns.str.strip()  # 🔥 Elimina espacios extra en los nombres de columna
    log("📌 Columnas detectadas en el CSV: " + str(productos.columns.tolist()))
except Exception as e:
    log(f"❌ ERROR al cargar productos.csv: {e}")
    productos = pd.DataFrame(columns=["Nombre del Producto", "Precio", "URL Imagen", "Promocion"])

@app.route("/", methods=["GET"])
def home():
    return jsonify({"mensaje": "API funcionando correctamente. Usa /consulta para obtener precios y promociones."})

@app.route("/consulta", methods=["POST"])
def consulta():
    try:
        data = request.get_json()
        if not data or "producto" not in data:
            return jsonify({"error": "El parámetro 'producto' es obligatorio"}), 400

        producto = data["producto"].strip().lower()

        # Filtra el producto exacto
        resultado = productos[productos["Nombre del Producto"].str.lower() == producto]

        if resultado.empty:
            # Si no se encuentra exactamente, buscar productos similares
            nombres_productos = productos["Nombre del Producto"].str.lower().tolist()
            similares = difflib.get_close_matches(producto, nombres_productos, n=3, cutoff=0.3)

            productos_similares = productos[productos["Nombre del Producto"].str.lower().isin(similares)]

            return jsonify({
                "respuesta": "Producto no encontrado.",
                "imagen": "",
                "similarProducts": productos_similares.to_dict(orient="records"),
                "promocion": "No hay promociones disponibles."
            })

        respuesta = resultado.iloc[0]
        
        # 🔥 Depurar para verificar la promoción
        log("📌 Producto encontrado: " + str(respuesta.to_dict()))
        log("📌 Valor de 'Promocion': " + str(respuesta["Promocion"]))

        # Obtener productos similares
        similares = difflib.get_close_matches(producto, productos["Nombre del Producto"].str.lower().tolist(), n=3, cutoff=0.3)
        productos_similares = productos[productos["Nombre del Producto"].str.lower().isin(similares)]

        # Obtener promoción del producto
        promocion = respuesta["Promocion"] if pd.notna(respuesta["Promocion"]) else "No hay promociones disponibles."

        return jsonify({
            "respuesta": f"El precio de {respuesta['Nombre del Producto']} es ${respuesta['Precio']}.",
            "imagen": respuesta["URL Imagen"],
            "similarProducts": productos_similares.to_dict(orient="records"),
            "promocion": promocion
        })

    except Exception as e:
        log(f"❌ Error en /consulta: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
