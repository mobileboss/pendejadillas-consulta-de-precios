document.addEventListener("DOMContentLoaded", () => {
    const searchButton = document.getElementById("searchPrice");
    const addToSaleButton = document.getElementById("addToSale");
    const registerSaleButton = document.getElementById("registerSale");
    const newSearchButton = document.getElementById("newSearch");
    const scanInventoryCameraButton = document.getElementById("scanInventoryCamera");
    const productImagesInput = document.getElementById("productImages");
    const imagePreviewContainer = document.getElementById("imagePreview");
    const barcodeScannerInput = document.getElementById("barcodeScannerInput");
    const locationSelect = document.getElementById("location");
    const confirmLocationButton = document.getElementById("confirmLocation");
    const locationSelection = document.getElementById("locationSelection");
    const mainApp = document.getElementById("mainApp");
    const scanPriceCameraButton = document.getElementById("scanPriceCamera");
    const stopCameraButton = document.getElementById("stopCamera");

    let selectedLocation = "";
    let cart = [];
    let imageFiles = [];

    // Evento para confirmar la ubicación
    if (confirmLocationButton) {
        confirmLocationButton.addEventListener("click", () => {
            selectedLocation = locationSelect.value;
            if (selectedLocation) {
                // Oculta la selección de ubicación
                locationSelection.classList.add("hidden");
                // Muestra la aplicación principal
                mainApp.classList.remove("hidden");
                alert(`Ubicación seleccionada: ${selectedLocation}`);
            } else {
                alert("Por favor, selecciona una ubicación.");
            }
        });
    }

    // Evento para cambiar la ubicación seleccionada
    if (locationSelect) {
        locationSelect.addEventListener("change", () => {
            selectedLocation = locationSelect.value;
        });
    }

    // Función para buscar un producto por nombre o SKU
    async function buscarProducto(query, type = "name") {
    const body = type === "name"
        ? { productName: query }
        : { productCode: query };

    console.log("Datos enviados al servidor:", body);

    try {
        const response = await fetch("/get-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error al buscar producto:", error);
        throw error;
    }
}

    // Evento para buscar por nombre
    if (searchButton) {
        searchButton.addEventListener("click", async () => {
            const productName = document.getElementById("productName").value.trim();
            if (productName) {
                try {
                    const data = await buscarProducto(productName, "name");
                    document.getElementById("result").innerHTML = `
                        <p>${data.message}</p>
                        <img src="${data.imageUrl}" alt="Producto" class="w-32 h-32 object-cover">
                        <p>${data.promotion}</p>
                        <p>Precio: $${data.price}</p>
                    `;
                    
                    document.getElementById("result").dataset.productName = data.productName;
                    document.getElementById("result").dataset.price = data.price;
                } catch (error) {
                    console.error("Error al buscar producto:", error);
                    alert("Error al buscar producto. Verifica el nombre e intenta nuevamente.");
                }
            }
        });
    }

    // Evento para el scanner físico
    if (barcodeScannerInput) {
        barcodeScannerInput.addEventListener("change", async (event) => {
            const scannedCode = event.target.value.trim();
            if (scannedCode) {
                try {
                    const data = await buscarProducto(scannedCode, "code"); // Buscar por SKU
                    document.getElementById("result").innerHTML = `
                        <p>${data.message}</p>
                        <img src="${data.imageUrl}" alt="Producto" class="w-32 h-32 object-cover">
                        <p>${data.promotion}</p>
                        <p>Precio: $${data.price}</p>
                    `;
                    console.log("🔍 Respuesta de la API:", data); // 📌 Verifica lo que responde la API
                    document.getElementById("result").dataset.productName = data.productName;
                    document.getElementById("result").dataset.price = data.price;
                } catch (error) {
                    console.error("Error al buscar producto:", error);
                    alert("Error al buscar producto. Verifica el SKU e intenta nuevamente.");
                }
            }
            barcodeScannerInput.value = ""; // Limpia el campo después de escanear
        });
    }

    // Función para actualizar el carrito
    function updateCart() {
        const cartDiv = document.getElementById("cart");
        cartDiv.innerHTML = cart.map((item, index) => `
            <p>${item.productName} - ${item.quantity} x $${item.price} = $${item.quantity * item.price}
            <button onclick="removeFromCart(${index})" class="text-red-500">❌</button></p>
        `).join("");
    }

    // Función para eliminar un producto del carrito
    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        updateCart();
    };

    // Evento para agregar producto a la venta
    addToSaleButton.addEventListener("click", () => {
        const productName = document.getElementById("result").dataset.productName;
        const quantity = parseInt(document.getElementById("quantity").value);
        const price = parseFloat(document.getElementById("result").dataset.price);

        if (!productName || isNaN(quantity) || quantity <= 0 || isNaN(price)) {
            alert("Debes ingresar un producto, cantidad válida y precio.");
            return;
        }

        cart.push({ productName, quantity, price });
        updateCart();
    });

    // Evento para subir imágenes del producto
    productImagesInput.addEventListener("change", (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 3) {
            alert("Solo puedes subir un máximo de 3 imágenes.");
            productImagesInput.value = "";
            return;
        }
        imageFiles = files;
        imagePreviewContainer.innerHTML = "";
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgElement = document.createElement("img");
                imgElement.src = e.target.result;
                imgElement.classList.add("w-24", "h-24", "object-cover", "rounded-lg");
                imagePreviewContainer.appendChild(imgElement);
            };
            reader.readAsDataURL(file);
        });
    });

    // Evento para nueva búsqueda
    if (newSearchButton) {
        newSearchButton.addEventListener("click", () => {
            resetBusqueda();
        });
    }

    // Función para resetear la búsqueda
    function resetBusqueda() {
        document.getElementById("productName").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("result").innerHTML = "";
        productImagesInput.value = "";
        imageFiles = [];
        imagePreviewContainer.innerHTML = "";
    }

    // Evento para registrar la venta
    registerSaleButton.addEventListener("click", async () => {
        if (cart.length === 0) {
            alert("No hay productos en la venta.");
            return;
        }

        const formData = new FormData();
        formData.append("vendedorId", "user123");
        formData.append("locationId", selectedLocation);
        formData.append("items", JSON.stringify(cart));

        imageFiles.forEach(file => formData.append("images", file));

        try {
            const response = await fetch("/register-sale", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                alert("❌ Error al registrar la venta.");
                return;
            }

            const result = await response.json();
            alert("✅ Venta registrada con éxito.");
            resetFormulario();
        } catch (error) {
            console.error("❌ Error al registrar venta:", error);
            alert("❌ Error al registrar la venta.");
        }
    });

    // Función para resetear el formulario
    function resetFormulario() {
        resetBusqueda();
        cart = [];
        updateCart();
    }

    // Configuración de la cámara para escanear códigos de barras
    // Configuración de la cámara para escanear códigos de barras
if (scanPriceCameraButton) {
    scanPriceCameraButton.addEventListener("click", () => {
        document.getElementById("cameraScanner").classList.remove("hidden");
        iniciarCamara();
    });
}

if (stopCameraButton) {
    stopCameraButton.addEventListener("click", detenerCamara);
}

function iniciarCamara() {
    console.log("🚀 Iniciando escaneo de código de barras...");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
            console.log("✅ Permiso de cámara concedido.");

            const cameraElement = document.getElementById("cameraPreview");
            if (!cameraElement) {
                console.error("❌ No se encontró el elemento cameraPreview.");
                return;
            }

            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: cameraElement,
                    constraints: { facingMode: "environment" }
                },
                decoder: {
                    readers: ["code_128_reader", "ean_reader", "ean_13_reader", "upc_reader", "code_39_reader"]
                },
                locate: true,
                numOfWorkers: 0 // Desactiva Web Workers temporalmente
            }, function (err) {
                if (err) {
                    console.error("Error al iniciar la cámara:", err);
                    alert("No se pudo iniciar la cámara. Verifica los permisos.");
                    return;
                }

                console.log("📸 Cámara iniciada correctamente.");
                Quagga.start();

                // Configura el evento de detección correctamente antes de iniciar Quagga
                Quagga.onDetected((data) => {
                    if (!data || !data.codeResult || !data.codeResult.code) {
                        console.warn("⚠️ No se detectó un código válido.");
                        return;
                    }

                    const scannedCode = data.codeResult.code.trim();
                    console.log("📸 Código detectado:", scannedCode);

                    buscarProducto(scannedCode, "code");
                    detenerCamara();
                });
            });
        })
        .catch(err => {
            console.error("❌ Permiso de cámara denegado:", err);
            alert("Debes permitir el acceso a la cámara para escanear códigos de barras.");
        });
}

function detenerCamara() {
    console.log("🛑 Deteniendo cámara...");
    Quagga.stop();
    document.getElementById("cameraScanner").classList.add("hidden");
}
