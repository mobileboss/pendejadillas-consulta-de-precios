from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

# Inicializa Flask y habilita CORS
app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

# Carga la base de datos de productos
try:
    productos = pd.read_csv("productos.csv")
except Exception as e:
    print(f"Error al cargar productos.csv: {e}")
    productos = pd.DataFrame(columns=["Nombre del Producto", "Precio", "URL Imagen"])

# Ruta de prueba para verificar que la API está funcionando
@app.route("/", methods=["GET"])
def home():
    return "API funcionando correctamente. Usa /consulta para obtener precios."

@app.route("/consulta", methods=["POST"])
def consulta():
    data = request.get_json()
    print(f"Datos recibidos: {data}")  # Verifica los datos enviados desde el frontend
    
    producto = data.get("producto", "").lower()
    resultado = productos[productos["Nombre del Producto"].str.lower() == producto]
    
    if resultado.empty:
        print("Producto no encontrado")
        return jsonify({"respuesta": "Producto no encontrado.", "imagen": ""})
    
    respuesta = resultado.iloc[0]
    print(f"Producto encontrado: {respuesta}")
    return jsonify({
        "respuesta": f"El precio de {respuesta['Nombre del Producto']} es ${respuesta['Precio']}.",
        "imagen": respuesta["URL Imagen"]
    })

# Ejecuta la aplicación en el puerto asignado por Render
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render asigna un puerto automáticamente
    app.run(host="0.0.0.0", port=port)
