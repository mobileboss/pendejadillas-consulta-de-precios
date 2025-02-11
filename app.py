from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import difflib  # Para buscar nombres similares

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Asegura que CORS funcione correctamente

# Carga la base de datos de productos
try:
    productos = pd.read_csv("productos.csv", encoding="utf-8")  # Agrega encoding para evitar problemas con caracteres especiales
    if productos.empty:
        print("⚠️ Advertencia: El archivo productos.csv está vacío.")
except Exception as e:
    print(f"❌ Error al cargar productos.csv: {e}")
    productos = pd.DataFrame(columns=["Nombre del Producto", "Precio", "URL Imagen"])

@app.route("/", methods=["GET"])
def home():
    return jsonify({"mensaje": "API funcionando correctamente. Usa /consulta para obtener precios."})

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
            similares = difflib.get_close_matches(producto, nombres_productos, n=3, cutoff=0.3)  # Busca hasta 3 similares

            productos_similares = []
            for nombre in similares:
                similar_data = productos[productos["Nombre del Producto"].str.lower() == nombre].iloc[0]
                productos_similares.append({
                    "productName": similar_data["Nombre del Producto"],
                    "price": f"${similar_data['Precio']}",
                    "image": similar_data["URL Imagen"]
                })

            return jsonify({
                "respuesta": "Producto no encontrado.",
                "imagen": "",
                "similarProducts": productos_similares
            })

        respuesta = resultado.iloc[0]
        return jsonify({
            "respuesta": f"El precio de {respuesta['Nombre del Producto']} es ${respuesta['Precio']}.",
            "imagen": respuesta["URL Imagen"],
            "similarProducts": []  # Si encontró el producto exacto, no devuelve similares
        })

    except Exception as e:
        print(f"❌ Error en /consulta: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
