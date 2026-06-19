exports.serveLanding = (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api`;
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kayparts REST API</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0b0c10;
      --card-bg: rgba(25, 27, 31, 0.6);
      --border-color: rgba(255, 255, 255, 0.08);
      --accent-red: #e63946;
      --text-main: #f8f9fa;
      --text-muted: #8d8f94;
      --green-glow: #06d6a0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 3rem 1.5rem;
      overflow-x: hidden;
    }

    /* System Status Badge */
    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(6, 214, 160, 0.1);
      border: 1px solid rgba(6, 214, 160, 0.25);
      padding: 0.4rem 1rem;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--green-glow);
      margin-bottom: 2rem;
      box-shadow: 0 0 15px rgba(6, 214, 160, 0.1);
      animation: pulse 2s infinite ease-in-out;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--green-glow);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--green-glow);
    }

    /* Logo & Headings */
    .logo-container {
      text-align: center;
      margin-bottom: 3.5rem;
    }

    .logo {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -1.5px;
      margin-bottom: 0.5rem;
    }

    .logo span.white {
      color: #ffffff;
    }

    .logo span.red {
      color: var(--accent-red);
      text-shadow: 0 0 20px rgba(230, 57, 70, 0.35);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* Info Grid cards */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      width: 100%;
      max-width: 1000px;
      margin-bottom: 4rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.75rem;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
    }

    .card:hover {
      transform: translateY(-5px);
      border-color: rgba(230, 57, 70, 0.4);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--accent-red);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 1.15rem;
      font-weight: 500;
      color: var(--text-main);
      word-break: break-all;
    }

    /* Table Container */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      width: 100%;
      max-width: 1000px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border-color);
    }

    .table-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .format-tag {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th, td {
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      font-size: 0.9rem;
    }

    tr:last-child td {
      border-bottom: none;
    }

    /* Badges & Colors */
    .method-get {
      color: #06d6a0;
      font-weight: 700;
      font-style: italic;
    }

    .method-post {
      color: #3a86c8;
      font-weight: 700;
      font-style: italic;
    }

    .endpoint-path {
      color: var(--accent-red);
      font-family: monospace;
      font-size: 0.95rem;
    }

    .badge {
      font-size: 0.7rem;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .badge-public {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }

    .badge-token {
      background: rgba(255, 183, 3, 0.1);
      color: #ffb703;
      border: 1px solid rgba(ffb703, 0.2);
      display: inline-block;
      text-align: center;
    }

    .doc-link {
      display: block;
      text-align: center;
      margin-top: 2.5rem;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s;
    }

    .doc-link:hover {
      color: var(--text-main);
      text-decoration: underline;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.65; }
    }

    @media (max-width: 768px) {
      body {
        padding: 2rem 1rem;
      }
      th, td {
        padding: 1rem;
      }
      .logo {
        font-size: 2.25rem;
      }
    }
  </style>
</head>
<body>

  <div class="status-badge">
    <div class="status-dot"></div>
    System Operational
  </div>

  <div class="logo-container">
    <h1 class="logo"><span class="white">KAY</span><span class="red">PARTS</span></h1>
    <p class="subtitle">Professional REST API</p>
  </div>

  <div class="info-grid">
    <div class="card">
      <h3 class="card-title">Base URL</h3>
      <p class="card-value">${baseUrl}</p>
    </div>
    <div class="card">
      <h3 class="card-title">Version</h3>
      <p class="card-value">2.1 (Latest)</p>
    </div>
    <div class="card">
      <h3 class="card-title">Authentication</h3>
      <p class="card-value">Sanctum / Bearer Token</p>
    </div>
  </div>

  <div class="table-container">
    <div class="table-header">
      <h2>Main Core Endpoints</h2>
      <span class="format-tag">Format: JSON</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th>Security</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="method-post">POST</span></td>
          <td><span class="endpoint-path">/api/login</span></td>
          <td>Authenticates user and returns access token.</td>
          <td><span class="badge badge-public">PUBLIC</span></td>
        </tr>
        <tr>
          <td><span class="method-get">GET</span></td>
          <td><span class="endpoint-path">/api/user</span></td>
          <td>Retrieves the current authenticated user profile.</td>
          <td><span class="badge badge-token">TOKEN REQ</span></td>
        </tr>
        <tr>
          <td><span class="method-post">POST</span></td>
          <td><span class="endpoint-path">/api/logout</span></td>
          <td>Revokes the current access token.</td>
          <td><span class="badge badge-token">TOKEN REQ</span></td>
        </tr>
        <tr>
          <td><span class="method-get">GET</span></td>
          <td><span class="endpoint-path">/api/categories</span></td>
          <td>List all existing categories.</td>
          <td><span class="badge badge-token">TOKEN REQ</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <a href="/api-docs" class="doc-link">Explore Interactive Swagger API Docs →</a>

</body>
</html>
  `;
  res.send(html);
};
