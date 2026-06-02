/**
 * Página de Ativação de Dispositivo
 * GET /api/ativar?code=S7K9P4X2
 *
 * Formulário para o usuário cadastrar suas credenciais Xtream/M3U
 * e ativar o dispositivo no servidor
 */

import { getDevice, isValidCode } from '../lib/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { code } = req.query;
    const codeUpper = String(code || '').toUpperCase();

    // Se não tem código, mostra form para digitar
    if (!codeUpper || !isValidCode(codeUpper)) {
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(getFormHTML(null));
    }

    // Valida se código existe no banco
    const device = await getDevice(codeUpper);
    if (!device) {
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(
        getFormHTML(null, 'Código não encontrado. Verifique e tente novamente.')
      );
    }

    // Se já ativado, mostra mensagem
    if (device.activated) {
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(
        getFormHTML(codeUpper, null, 'Dispositivo já ativado')
      );
    }

    // Mostra formulário para cadastrar credenciais
    return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(getFormHTML(codeUpper));
  } catch (error) {
    console.error('[api/ativar]', error);
    return res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(
      getFormHTML(null, 'Erro no servidor. Tente novamente mais tarde.')
    );
  }
}

function getFormHTML(code = null, errorMsg = null, successMsg = null) {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STVBR - Ativar Dispositivo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #999;
      font-weight: 500;
      letter-spacing: 1px;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .alert-error {
      background: #fee;
      color: #c33;
      border-left: 4px solid #c33;
    }
    .alert-success {
      background: #efe;
      color: #3c3;
      border-left: 4px solid #3c3;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
      font-size: 14px;
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .form-group input::placeholder {
      color: #aaa;
    }
    .help-text {
      font-size: 12px;
      color: #999;
      margin-top: 6px;
    }
    .form-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
    }
    .form-section:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .code-display {
      background: #f5f5f5;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .code-label {
      font-size: 12px;
      color: #999;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .code-value {
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 4px;
    }
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 28px;
    }
    button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5568d3;
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      box-shadow: none;
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      flex: 0;
    }
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    .form-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      border-bottom: 2px solid #eee;
    }
    .form-tab {
      padding: 12px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-weight: 600;
      color: #999;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 14px;
      transition: all 0.2s;
    }
    .form-tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    .form-tab:hover {
      color: #667eea;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .info-box {
      background: #f8f9ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #555;
    }
    .info-box strong {
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">STVBR</div>
      <div class="subtitle">MEDIA PLAYER</div>
    </div>

    ${errorMsg ? \`<div class="alert alert-error">\${errorMsg}</div>\` : ''}
    ${successMsg ? \`<div class="alert alert-success">\${successMsg}</div>\` : ''}

    ${
      !code
        ? \`
    <div class="form-section">
      <form id="codeForm">
        <div class="form-group">
          <label for="code">Código do Dispositivo</label>
          <input
            type="text"
            id="code"
            name="code"
            placeholder="Ex: S7K9P4X2"
            maxlength="8"
            style="font-family: 'Monaco', monospace; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;"
            required
          >
          <div class="help-text">Você recebeu este código ao abrir o app STVBR pela primeira vez</div>
        </div>
        <button type="submit" class="btn-primary">Continuar</button>
      </form>
    </div>

    <script>
      document.getElementById('codeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('code').value.toUpperCase();
        window.location.href = '?code=' + code;
      });
    </script>
    \`
        : \`
    <div class="code-display">
      <div class="code-label">Seu Código</div>
      <div class="code-value">\${code}</div>
    </div>

    ${
      successMsg
        ? \`<div class="info-box"><strong>✓ Sucesso!</strong> Seu dispositivo foi ativado. Volte ao app STVBR para continuar.</div>\`
        : \`
    <div class="form-tabs">
      <button class="form-tab active" data-tab="xtream">Xtream</button>
      <button class="form-tab" data-tab="m3u">M3U</button>
    </div>

    <form id="activateForm">
      <input type="hidden" name="code" value="\${code}">

      <!-- XTREAM TAB -->
      <div id="xtream" class="tab-content active">
        <div class="form-section">
          <div class="section-title">Credenciais Xtream</div>

          <div class="form-group">
            <label for="xtream_name">Nome da Lista</label>
            <input type="text" id="xtream_name" name="xtream_name" placeholder="Ex: Minha Lista" required>
          </div>

          <div class="form-group">
            <label for="xtream_host">Servidor</label>
            <input type="url" id="xtream_host" name="xtream_host" placeholder="Ex: http://iptv.provider.com" required>
            <div class="help-text">Incluir http:// ou https://</div>
          </div>

          <div class="form-group">
            <label for="xtream_username">Usuário</label>
            <input type="text" id="xtream_username" name="xtream_username" required>
          </div>

          <div class="form-group">
            <label for="xtream_password">Senha</label>
            <input type="password" id="xtream_password" name="xtream_password" required>
          </div>
        </div>
      </div>

      <!-- M3U TAB -->
      <div id="m3u" class="tab-content">
        <div class="form-section">
          <div class="section-title">Arquivo M3U</div>

          <div class="form-group">
            <label for="m3u_name">Nome da Lista</label>
            <input type="text" id="m3u_name" name="m3u_name" placeholder="Ex: Minha Lista M3U" required>
          </div>

          <div class="form-group">
            <label for="m3u_url">URL do Arquivo M3U</label>
            <input type="url" id="m3u_url" name="m3u_url" placeholder="Ex: http://example.com/lista.m3u" required>
          </div>

          <div class="form-group">
            <label for="m3u_epg">URL do EPG (opcional)</label>
            <input type="url" id="m3u_epg" name="m3u_epg" placeholder="Ex: http://example.com/epg.xml">
            <div class="help-text">Guia eletrônica de programação para exibir horários</div>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary">Ativar Dispositivo</button>
        <button type="button" class="btn-secondary" onclick="window.location.href='?'">Voltar</button>
      </div>
    </form>

    <script>
      // Tabs
      document.querySelectorAll('.form-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;
          document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tabName).classList.add('active');
        });
      });

      // Form submit
      document.getElementById('activateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.querySelector('input[name="code"]').value;
        const activeTab = document.querySelector('.form-tab.active').dataset.tab;

        let payload;
        if (activeTab === 'xtream') {
          payload = {
            kind: 'xtream',
            name: document.getElementById('xtream_name').value,
            credentials: {
              host: document.getElementById('xtream_host').value,
              username: document.getElementById('xtream_username').value,
              password: document.getElementById('xtream_password').value,
            }
          };
        } else {
          payload = {
            kind: 'm3u',
            name: document.getElementById('m3u_name').value,
            credentials: {
              url: document.getElementById('m3u_url').value,
              epgUrl: document.getElementById('m3u_epg').value || null,
            }
          };
        }

        try {
          const btn = document.querySelector('.btn-primary');
          btn.disabled = true;
          btn.textContent = 'Ativando...';

          const response = await fetch(\`${baseUrl}/api/devices/\${code}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const data = await response.json();
            alert('Erro: ' + (data.error || 'Falha na ativação'));
            btn.disabled = false;
            btn.textContent = 'Ativar Dispositivo';
            return;
          }

          // Sucesso!
          window.location.href = '?code=' + code + '&success=true';
        } catch (error) {
          alert('Erro: ' + error.message);
          btn.disabled = false;
          btn.textContent = 'Ativar Dispositivo';
        }
      });
    </script>
    \`
        }
    \`
    }
  </div>
</body>
</html>
  `;
}
