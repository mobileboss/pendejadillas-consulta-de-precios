from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# Carga la base de datos de productos
try:
    productos = pd.read_csv("productos.csv", encoding="utf-8")
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
            return jsonify({"respuesta": "Producto no encontrado.", "similarProducts": []})

        respuesta = resultado.iloc[0]
        return jsonify({
            "respuesta": f"El precio de {respuesta['Nombre del Producto']} es ${respuesta['Precio']}.",
            "imagen": respuesta["URL Imagen"],
            "similarProducts": []
        })

    except Exception as e:
        print(f"❌ Error en /consulta: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
