const crypto = require('crypto');

async function testWebhook() {
  const secret = 'zFaxCenwk9ASdVwb78H7KA';

  const payload = {
    id: "e4f8c1b9-3d02-4a7c-8e51-f672a9b3d0e4",
    type: "SALE_APPROVED",
    data: {
      payment_id: "F8A5D6B7G2H1",
      payment_method: "CARD",
      metadata: {
        reference: "KAY-A5D81F44" // Known order from previous testing
      }
    }
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  console.log("Testing Webhook Endpoint...");
  console.log("Payload:", payloadString);
  console.log("Signature:", signature);

  const res = await fetch('http://localhost:8000/api/webhooks/bold', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bold-signature': signature
    },
    body: payloadString
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testWebhook().catch(console.error);
