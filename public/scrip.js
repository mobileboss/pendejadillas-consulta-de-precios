document.getElementById("consultar").addEventListener("click", () => {
  const producto = document.getElementById("producto").value;
  const resultado = document.getElementById("resultado");

  if (!producto) {
    resultado.innerHTML = "<p>Por favor, ingrese un producto.</p>";
    return;
  }

  fetch("http://localhost:3000/consulta", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ producto }),
  })
    .then((response) => response.json())
    .then((data) => {
      resultado.innerHTML = `
        <h2>Resultado</h2>
        <p>${data.respuesta}</p>
        <img src="${data.imagen}" alt="${producto}">
      `;
    })
    .catch((error) => {
      console.error("Error:", error);
      resultado.innerHTML = "<p>No se pudo obtener la información. Inténtelo de nuevo.</p>";
    });
});
