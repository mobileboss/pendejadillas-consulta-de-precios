import barcode
from barcode.writer import ImageWriter
import csv
import os

# Carpeta donde se guardarán las imágenes de códigos
output_folder = "barcodes"
os.makedirs(output_folder, exist_ok=True)

# Lista de SKUs (puedes cambiarla o leerla desde un archivo de texto/Excel)
skus = [f"SKU-{i}" for i in range(1, 501)]  # Genera SKU-1, SKU-2, ..., SKU-500

# Archivo CSV donde guardaremos la relación SKU - Nombre de archivo
csv_file = "sku_codigos_barras.csv"

with open(csv_file, mode="w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["SKU", "Archivo"])

    for sku in skus:
        code39 = barcode.get_barcode_class("code39")
        barcode_instance = code39(sku, writer=ImageWriter())

        filename = os.path.join(output_folder, f"{sku}.png")
        barcode_instance.save(filename[:-4])  # Guarda como PNG sin duplicar la extensión
        
        # Guardamos en el CSV
        writer.writerow([sku, filename])

print(f"✅ Códigos de barras generados y guardados en '{output_folder}'")
print(f"✅ Lista de códigos guardada en '{csv_file}'")
