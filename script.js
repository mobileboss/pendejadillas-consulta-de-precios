document.getElementById('searchButton').addEventListener('click', async () => {
  const productName = document.getElementById('productName').value.trim();

  if (!productName) {
    alert("Por favor, ingresa el nombre de un producto.");
    return;
  }

  // Llamada al servidor para obtener el precio del producto
  const response = await fetch('http://localhost:3000/get-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productName })
  });

  const data = await response.json();

  // Mostrar el precio del producto y productos similares
  if (data.message) {
    document.getElementById('priceMessage').textContent = data.message;

    const similarProductsList = document.getElementById('similarProductsList');
    similarProductsList.innerHTML = '';
    
    data.similarProducts.forEach(product => {
      const li = document.createElement('li');
      li.textContent = `${product.productName}: ${product.price}`;
      similarProductsList.appendChild(li);
    });
  }

  // Llamada a OpenAI para obtener los consejos de venta
  const salesTipsResponse = await fetch('http://localhost:3000/ask-openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      question: "¿Cómo puedo vender más rápido este producto?", 
      productName: productName 
    })
  });

  const salesTipsData = await salesTipsResponse.json();
  
  document.getElementById('tipsMessage').textContent = salesTipsData.message;
});
