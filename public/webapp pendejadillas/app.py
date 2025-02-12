from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

from flask_cors import CORS

# Inicializa Flask y habilita CORS
app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas


app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

# Carga la base de datos de productos
productos = pd.read_csv("productos.csv")

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



