document.addEventListener("DOMContentLoaded", function() {
    console.log("📌 DOM Cargado correctamente");

    document.getElementById('searchButton').addEventListener('click', async () => {
        const productName = document.getElementById('productName').value.trim();
        if (!productName) {
            alert("Por favor, ingresa el nombre de un producto.");
            return;
        }

        try {
            const response = await fetch("https://pendejadillas-consulta-de-precios.onrender.com/consulta", {

                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ producto: productName })
            });

            const data = await response.json();
            console.log("📌 Respuesta de la API:", data);

            if (!response.ok) {
                document.getElementById('priceMessage').textContent = "Error: " + (data.error || "No se pudo obtener la información.");
                return;
            }

            // ✅ Mostrar el precio
            document.getElementById('priceMessage').textContent = data.respuesta;

            // ✅ Mostrar la imagen del producto
            const imgElement = document.getElementById('productImage');
            if (data.imagen) {
                imgElement.src = data.imagen;
                imgElement.style.display = "block";
            } else {
                imgElement.style.display = "none";
            }

            // ✅ Mostrar productos similares correctamente
            const similarProductsContainer = document.getElementById('similarProductsContainer');
            const similarProductsList = document.getElementById('similarProductsList');
            similarProductsList.innerHTML = '';

            if (data.similarProducts && data.similarProducts.length > 0) {
                similarProductsContainer.classList.remove('hidden');
                data.similarProducts.forEach(product => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${product["Nombre del Producto"]}</strong>: $${product["Precio"]}`;
                    similarProductsList.appendChild(li);
                });
            } else {
                similarProductsContainer.classList.add('hidden');
            }

        } catch (error) {
            console.error("❌ Error al conectar con el servidor:", error);
            document.getElementById('priceMessage').textContent = "Error al conectar con el servidor.";
        }
    });

});  // 🔥 Este `});` debe estar aquí al final del archivo
