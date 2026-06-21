async function testBoldLink() {
  const payload = {
    items: [
      { product_id: 4, quantity: 1 } // Using valid product ID
    ],
    customer_name: "Usuario Pruebas",
    customer_email: "prueba@kayparts.co",
    customer_phone: "3000000000",
    shipping_address: "Calle de prueba 123",
    payment_method: "card"
  };

  const res = await fetch('http://localhost:8000/api/checkout/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}

testBoldLink().catch(console.error);
