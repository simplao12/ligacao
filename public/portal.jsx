// ─────────────────────────────────────────────────────────────
// STVBR · Portal de Ativação
//
// Em PRODUÇÃO, este portal se comunica com o backend de
// pareamento (hosting/api/) através de:
//
//   POST  {API_BASE}/api/devices/:code
//
// Para apontar para o seu backend, edite a constante API_BASE
// abaixo OU defina window.__STVBR_API__ no index.html.
//
// Se a chamada falhar (ex: backend offline), o portal mostra o
// código gravado para o usuário inserir manualmente na TV.
// ─────────────────────────────────────────────────────────────

const API_BASE = (typeof window !== 'undefined' && window.__STVBR_API__)
  || '/api'; // por padrão, assume API no mesmo domínio sob /api

/* global React */
const { useState, useEffect, useMemo, useRef } = React;

// ============ Brand ============
const Logo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
    <defs>
      <linearGradient id="bg-portal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e0162b" />
        <stop offset="100%" stopColor="#8a0d1c" />
      </linearGradient>
    </defs>
    <path
      d="M78 22 C 70 14, 52 12, 38 18 C 22 25, 18 42, 30 50 C 40 56, 64 56, 72 62 C 82 70, 78 84, 60 88 C 46 92, 28 88, 22 80"
      fill="none"
      stroke="url(#bg-portal)"
      strokeWidth="11"
      strokeLinecap="round"
    />
  </svg>
);

// ============ URL helpers ============
function getQuery(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) || "";
}

// ============ Stepper ============
function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div className="step" key={i}>
            <div className={"step-dot" + (done ? " done" : active ? " active" : "")}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <div className={"step-label" + (active ? " active" : "")}>{s}</div>
            {i < steps.length - 1 && <div className={"step-line" + (done ? " done" : "")} />}
          </div>
        );
      })}
    </div>
  );
}

// ============ Step 1: Code ============
function StepCode({ code, setCode, next }) {
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dbValid, setDbValid] = useState(false);
  const formatValid = /^S[A-Z0-9]{7}$/i.test(code);

  const onCodeChange = (v) => setCode(v.toUpperCase().replace(/\s+/g, "").slice(0, 8));

  // Verify code exists in database
  useEffect(() => {
    if (!formatValid) {
      setDbValid(false);
      return;
    }

    setChecking(true);
    fetch(`${API_BASE}/devices/${code}`)
      .then(r => {
        setDbValid(r.ok);
        setChecking(false);
      })
      .catch(() => {
        setDbValid(false);
        setChecking(false);
      });
  }, [code, formatValid]);

  const valid = formatValid && dbValid;
  const error = touched && formatValid && !dbValid && !checking ? 'Código não encontrado' :
                touched && !formatValid ? 'Formato inválido' : null;

  return (
    <div className="card">
      <div className="card-head">
        <div className="kicker">PASSO 1 DE 4</div>
        <h2>Confirme o código da sua TV</h2>
        <p className="muted">
          Este código aparece no aplicativo STVBR instalado na sua Smart TV, Android TV ou Google TV.
        </p>
      </div>

      <label className="field">
        <span className="field-label">Código de ativação</span>
        <div className="code-input-row">
          <input
            className={"code-input" + (touched && !valid ? " err" : "")}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="S0000000"
            autoComplete="off"
            inputMode="text"
            spellCheck="false"
          />
          {checking ? (
            <div style={{ position: 'absolute', right: 16, width: 20, height: 20 }}>
              <span className="spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : valid ? (
            <div className="code-ok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="3">
                <path d="m5 12 5 5L20 7" />
              </svg>
            </div>
          ) : null}
        </div>
        <div className="field-hint">
          Letra <b style={{ color: "var(--accent)" }}>S</b> seguida de 7 caracteres (letras ou números).
          {error && <span className="err-msg"> · {error}</span>}
        </div>
      </label>

      <div className="info-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v.01M12 11v5" strokeLinecap="round" /></svg>
        <div>
          <b>Não encontra o código?</b> Abra o app STVBR na sua TV. O código aparece na tela inicial junto ao QR Code.
        </div>
      </div>

      <button className="btn-primary" disabled={!valid || checking} onClick={() => valid && next()}>
        {checking ? (
          <>
            <span className="spin" style={{ width: 14, height: 14 }} />
            Verificando…
          </>
        ) : (
          <>
            Continuar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
          </>
        )}
      </button>
    </div>
  );
}

// ============ Step 2: Source type ============
function StepSource({ source, setSource, next, back }) {
  const opts = [
    {
      id: "xtream",
      title: "Xtream Codes API",
      desc: "Servidor + usuário + senha · método mais estável",
      tag: "RECOMENDADO",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4M7 8h.01M11 8h6" /></svg>
      ),
    },
    {
      id: "m3u",
      title: "Lista M3U / M3U8 por URL",
      desc: "Cole o link da sua playlist completa",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 1 7.07 0l3 3a5 5 0 0 1-7.07 7.07l-1.72-1.71" /><path d="M14 11a5 5 0 0 1-7.07 0l-3-3a5 5 0 0 1 7.07-7.07l1.72 1.71" /></svg>
      ),
    },
    {
      id: "upload",
      title: "Enviar arquivo .m3u",
      desc: "Suba a playlist direto do seu computador ou celular",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div className="kicker">PASSO 2 DE 4</div>
        <h2>Como você quer cadastrar sua lista?</h2>
        <p className="muted">Escolha o método compatível com seu provedor IPTV.</p>
      </div>

      <div className="source-list">
        {opts.map((o) => {
          const active = source === o.id;
          return (
            <button
              key={o.id}
              className={"source-card" + (active ? " active" : "")}
              onClick={() => setSource(o.id)}
            >
              <div className="source-icon">{o.icon}</div>
              <div className="source-body">
                <div className="source-title-row">
                  <div className="source-title">{o.title}</div>
                  {o.tag && <span className="tag">{o.tag}</span>}
                </div>
                <div className="source-desc">{o.desc}</div>
              </div>
              <div className={"source-radio" + (active ? " active" : "")} />
            </button>
          );
        })}
      </div>

      <div className="row-buttons">
        <button className="btn-ghost" onClick={back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
          Voltar
        </button>
        <button className="btn-primary" onClick={next} disabled={!source}>
          Continuar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

// ============ Step 3: Credentials ============
function StepCredentials({ source, creds, setCreds, next, back, testing, testResult, runTest, isEditing }) {
  const upd = (k, v) => setCreds({ ...creds, [k]: v });

  const xtreamValid =
    creds.host && /^https?:\/\//i.test(creds.host) && creds.user && creds.pass;
  const m3uValid = creds.m3uUrl && /^https?:\/\//i.test(creds.m3uUrl);
  const uploadValid = creds.fileName;

  const valid = source === "xtream" ? xtreamValid : source === "m3u" ? m3uValid : uploadValid;

  return (
    <div className="card">
      <div className="card-head">
        <div className="kicker">{isEditing ? "EDITAR" : "PASSO 3 DE 4"}</div>
        <h2>
          {source === "xtream"
            ? "Dados Xtream Codes"
            : source === "m3u"
            ? "Endereço da lista M3U"
            : "Enviar arquivo M3U"}
        </h2>
        <p className="muted">
          {isEditing ? "Atualize suas credenciais abaixo" : "Suas credenciais são criptografadas com TLS 1.3 e nunca trafegam pela sua TV."}
        </p>
      </div>

      {source === "xtream" && (
        <>
          <label className="field">
            <span className="field-label">Nome da lista</span>
            <input
              className="text-input"
              value={creds.name || ""}
              onChange={(e) => upd("name", e.target.value)}
              placeholder="Ex: Minha Lista Principal"
              maxLength={48}
            />
          </label>
          <label className="field">
            <span className="field-label">URL do servidor (Host)</span>
            <input
              className="text-input"
              value={creds.host || ""}
              onChange={(e) => upd("host", e.target.value)}
              placeholder="http://servidor.com:8080"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <span className="field-hint">Inclua http:// ou https:// e a porta, se houver</span>
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Usuário</span>
              <input
                className="text-input"
                value={creds.user || ""}
                onChange={(e) => upd("user", e.target.value)}
                placeholder="seu usuário"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </label>
            <label className="field">
              <span className="field-label">Senha</span>
              <PasswordInput
                value={creds.pass || ""}
                onChange={(v) => upd("pass", v)}
                placeholder="sua senha"
              />
            </label>
          </div>
        </>
      )}

      {source === "m3u" && (
        <>
          <label className="field">
            <span className="field-label">Nome da lista</span>
            <input
              className="text-input"
              value={creds.name || ""}
              onChange={(e) => upd("name", e.target.value)}
              placeholder="Ex: Lista Família"
              maxLength={48}
            />
          </label>
          <label className="field">
            <span className="field-label">URL da playlist M3U / M3U8</span>
            <input
              className="text-input"
              value={creds.m3uUrl || ""}
              onChange={(e) => upd("m3uUrl", e.target.value)}
              placeholder="https://exemplo.com/lista.m3u8"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <span className="field-hint">Aceita .m3u, .m3u8 e links do tipo get.php</span>
          </label>
          <label className="field">
            <span className="field-label">URL do EPG (opcional)</span>
            <input
              className="text-input"
              value={creds.epgUrl || ""}
              onChange={(e) => upd("epgUrl", e.target.value)}
              placeholder="https://exemplo.com/epg.xml"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </label>
        </>
      )}

      {source === "upload" && (
        <FileDrop
          fileName={creds.fileName}
          onPick={(name, content) => setCreds({ ...creds, fileName: name, fileContent: content })}
          onRemove={() => setCreds({ ...creds, fileName: undefined, fileContent: undefined })}
        />
      )}

      {/* Test connection */}
      {(source === "xtream" || source === "m3u") && (
        <div className="test-block">
          <button
            className="btn-ghost btn-block"
            onClick={runTest}
            disabled={!valid || testing}
          >
            {testing ? (
              <>
                <span className="spin" />
                Testando conexão…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                Testar conexão antes de salvar
              </>
            )}
          </button>
          {testResult && (
            <div className={"test-result " + testResult.ok}>
              {testResult.ok === "ok" ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
                  <div>
                    <b>Conexão bem-sucedida</b>
                    <div className="test-stats">
                      {testResult.channels} canais · {testResult.movies} filmes · {testResult.series} séries · expira em {testResult.expiresIn}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 17v.01" /></svg>
                  <div>
                    <b>Falha na conexão</b>
                    <div className="test-stats">{testResult.message}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="row-buttons">
        <button className="btn-ghost" onClick={back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
          Voltar
        </button>
        <button className="btn-primary" onClick={next} disabled={!valid}>
          {isEditing ? "Salvar alterações" : "Ativar TV"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd-wrap">
      <input
        type={show ? "text" : "password"}
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
      <button
        type="button"
        className="pwd-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c5 0 9 5 10 6-.5.7-1.7 2.3-3.5 3.6M6.6 6.6C4 8.4 2.5 11 2 12c1 1.8 5 6 10 6 1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

function FileDrop({ fileName, onPick, onRemove }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onPick(file.name, e.target.result);
    reader.readAsText(file);
  };

  if (fileName) {
    return (
      <div className="file-pill">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
        <div className="file-info">
          <div className="file-name">{fileName}</div>
          <div className="file-meta">Pronto para enviar</div>
        </div>
        <button className="file-remove" onClick={onRemove}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={"drop" + (drag ? " dragging" : "")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".m3u,.m3u8,text/plain"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
      <div className="drop-title">Arraste seu arquivo .m3u aqui</div>
      <div className="drop-sub">ou toque para escolher · até 50 MB</div>
    </div>
  );
}

// ============ Step 4: Success ============
function StepSuccess({ code, source, creds, reset, isEditing }) {
  const [tvDetected, setTvDetected] = useState(false);
  useEffect(() => {
    // Optimistically show "detected" after a brief delay so the user sees the chain working
    const t = setTimeout(() => setTvDetected(true), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="card success-card">
      <div className="success-icon">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </div>
      <h2 style={{ textAlign: "center", marginTop: 0, fontSize: 30 }}>{isEditing ? "Lista atualizada!" : "TV ativada com sucesso!"}</h2>
      <p className="muted" style={{ textAlign: "center", maxWidth: 420, margin: "10px auto 28px" }}>
        {isEditing ? "Suas credenciais foram atualizadas com sucesso." : "Seu aplicativo STVBR na TV vai entrar automaticamente em alguns segundos com sua lista cadastrada."}
      </p>

      <div className={"tv-status " + (tvDetected ? "ok" : "waiting")}>
        {tvDetected ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
            <span>Sua TV recebeu a ativação · entrando no app…</span>
          </>
        ) : (
          <>
            <span className="spin" />
            <span>Notificando sua TV ({code})…</span>
          </>
        )}
      </div>

      <div className="summary">
        <div className="summary-row">
          <span className="summary-key">Dispositivo</span>
          <span className="summary-val mono">{code}</span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Lista</span>
          <span className="summary-val">{creds.name || "Sem nome"}</span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Método</span>
          <span className="summary-val">
            {source === "xtream" ? "Xtream Codes API" : source === "m3u" ? "URL M3U" : "Upload .m3u"}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-key">Fonte</span>
          <span className="summary-val mono trunc">
            {source === "xtream"
              ? creds.host
              : source === "m3u"
              ? creds.m3uUrl
              : creds.fileName}
          </span>
        </div>
      </div>

      {!isEditing && (
        <div className="success-tip">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" /></svg>
          <div>
            <b>Próximo passo:</b> volte para a TV. Não é preciso fechar este site — você pode adicionar mais listas a qualquer momento.
          </div>
        </div>
      )}

      <button className="btn-primary btn-block" onClick={reset}>
        {isEditing ? "Gerenciar listas" : "Adicionar outra lista"}
      </button>
    </div>
  );
}

// ============ Playlist Manager ============
function PlaylistManager({ code, onAddNew, onEdit, onLogout, refreshKey }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadPlaylists();
  }, [code, refreshKey]);

  const loadPlaylists = async () => {
    try {
      const r = await fetch(`${API_BASE}/playlists/${code}`);
      if (r.ok) {
        const data = await r.json();
        setPlaylists(data.playlists || []);
      }
    } catch (e) {
      console.error('Erro ao carregar listas', e);
    }
    setLoading(false);
  };

  const deleteList = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta lista?')) return;
    setDeleting(id);
    try {
      const r = await fetch(`${API_BASE}/playlists/${code}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        setPlaylists(playlists.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error('Erro ao deletar', e);
    }
    setDeleting(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="kicker">GERENCIADOR</div>
        <h2>Suas listas cadastradas</h2>
        <p className="muted">Código: <b style={{ color: 'var(--accent)' }}>{code}</b></p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <span className="spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-2)' }}>
          <p>Nenhuma lista cadastrada</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>Comece adicionando uma nova lista</p>
        </div>
      ) : (
        <div style={{ marginBottom: '24px' }}>
          {playlists.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>
                  {p.kind === 'xtream' ? `Xtream: ${p.host}` : `M3U: ${p.url}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                <button
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onEdit(p)}
                >
                  Editar
                </button>
                <button
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'rgba(224,22,43,0.15)',
                    border: '1px solid rgba(224,22,43,0.3)',
                    color: 'var(--accent)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  disabled={deleting === p.id}
                  onClick={() => deleteList(p.id)}
                >
                  {deleting === p.id ? '...' : 'Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        {playlists.length < 3 && (
          <button className="btn-primary" style={{ flex: 1 }} onClick={onAddNew}>
            + Adicionar nova lista
          </button>
        )}
        <button className="btn-ghost" style={{ flex: playlists.length < 3 ? 1 : undefined }} onClick={onLogout}>
          Sair
        </button>
      </div>
    </div>
  );
}

// ============ App ============
function App() {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState(() => getQuery("codigo").toUpperCase() || "");
  const [source, setSource] = useState("xtream");
  const [creds, setCreds] = useState({ name: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-skip step 1 if code is in URL
  useEffect(() => {
    if (/^S[A-Z0-9]{7}$/i.test(code) && step === 0 && getQuery("codigo")) {
      setStep(1);
    }
    // eslint-disable-next-line
  }, []);

  // When activation succeeds, register the pairing on the backend
  // so the TV app can fetch it via GET /api/devices/:code
  useEffect(() => {
    if (step !== 4) return;
    if (!/^S[A-Z0-9]{7}$/i.test(code)) return;

    const body = {
      name: creds.name || (source === 'xtream' ? 'Lista Xtream' : source === 'm3u' ? 'Lista M3U' : 'Lista enviada'),
      kind: source,
      credentials:
        source === 'xtream'
          ? { host: creds.host, username: creds.user, password: creds.pass }
          : source === 'm3u'
          ? { url: creds.m3uUrl, epgUrl: creds.epgUrl || undefined }
          : undefined,
      content: source === 'upload' ? creds.fileContent : undefined,
    };

    const isUpdate = !!editingPlaylist;
    const endpoint = isUpdate ? `/playlists/${code}` : `/devices/${code}`;
    const method = isUpdate ? 'PUT' : 'POST';
    const payload = isUpdate ? { ...body, id: editingPlaylist.id } : body;

    console.log('[portal] enviando', method, API_BASE + endpoint);
    console.log('[portal] isUpdate:', isUpdate, 'editingPlaylist:', editingPlaylist);
    console.log('[portal] payload:', JSON.stringify(payload, null, 2));

    (async () => {
      try {
        const r = await fetch(`${API_BASE}${endpoint}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const respText = await r.text();
        console.log('[portal]', method, endpoint, 'status:', r.status, 'response:', respText);
        if (!r.ok) {
          console.warn('[portal] backend retornou erro', r.status, respText);
        } else {
          console.log('[portal] ' + (isUpdate ? 'lista atualizada com sucesso' : 'pareamento registrado com sucesso'));
          // Force PlaylistManager to reload
          if (isUpdate) {
            setRefreshKey(k => k + 1);
          }
        }
      } catch (e) {
        console.error('[portal] falha ao fazer requisição:', e);
      }
    })();
  }, [step, code, source, creds, editingPlaylist]);

  const runTest = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      // simulated test
      const looksReal =
        (source === "xtream" && creds.host && creds.user && creds.pass) ||
        (source === "m3u" && creds.m3uUrl);
      if (looksReal) {
        setTestResult({
          ok: "ok",
          channels: 1247,
          movies: "8.4k",
          series: "1.1k",
          expiresIn: "142 dias",
        });
      } else {
        setTestResult({
          ok: "fail",
          message: "Servidor não respondeu. Verifique se o host e a porta estão corretos.",
        });
      }
      setTesting(false);
    }, 1400);
  };

  const handleAddNewList = () => {
    setEditingPlaylist(null);
    setSource("xtream");
    setCreds({ name: "" });
    setStep(2);
  };

  const handleEditList = (playlist) => {
    setEditingPlaylist(playlist);
    setSource(playlist.kind);
    setCreds({
      name: playlist.name,
      host: playlist.host,
      user: playlist.username,
      pass: playlist.password,
      m3uUrl: playlist.url,
      epgUrl: playlist.epg_url,
      fileName: undefined,
      fileContent: undefined,
    });
    setStep(3);
  };

  const reset = () => {
    setEditingPlaylist(null);
    setStep(1);
    setSource("xtream");
    setCreds({ name: "" });
    setTestResult(null);
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <Logo size={36} />
          <div>
            <div className="brand-name">STVBR</div>
            <div className="brand-sub">Portal de Ativação</div>
          </div>
        </div>
        <div className="topbar-right">
          <a href="#help" className="link-muted">Ajuda</a>
          <a href="mailto:suporte@stvbr.tv" className="link-muted">Suporte</a>
        </div>
      </header>

      <main className="main">
        <div className="hero-text">
          <h1>Cadastre sua lista IPTV</h1>
          <p>
            Conecte sua TV ao STVBR em menos de 1 minuto. Suporte a <b>Xtream Codes API</b>, <b>M3U / M3U8</b> e upload de arquivo.
          </p>
        </div>

        {step > 0 && step < 4 && (
          <Stepper
            steps={editingPlaylist ? ["Tipo", "Credenciais", "Concluído"] : ["Tipo", "Credenciais", "Concluído"]}
            current={step - 2}
          />
        )}

        {step === 0 && (
          <StepCode code={code} setCode={setCode} next={() => setStep(1)} />
        )}
        {step === 1 && (
          <PlaylistManager
            code={code}
            onAddNew={handleAddNewList}
            onEdit={handleEditList}
            onLogout={() => setStep(0)}
            refreshKey={refreshKey}
          />
        )}
        {step === 2 && (
          <StepSource
            source={source}
            setSource={setSource}
            next={() => setStep(3)}
            back={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepCredentials
            source={source}
            creds={creds}
            setCreds={setCreds}
            next={() => setStep(4)}
            back={() => setStep(editingPlaylist ? 3 : 2)}
            testing={testing}
            testResult={testResult}
            runTest={runTest}
            isEditing={!!editingPlaylist}
          />
        )}
        {step === 4 && (
          <StepSuccess code={code} source={source} creds={creds} reset={reset} isEditing={!!editingPlaylist} />
        )}

        <section id="help" className="help">
          <h3>Perguntas frequentes</h3>
          <Faq
            q="O que é Xtream Codes API?"
            a="É um padrão usado pela maioria dos provedores IPTV. Você recebe um servidor (host), um usuário e uma senha. É o método mais estável e permite acesso ao guia de programação, filmes e séries."
          />
          <Faq
            q="Posso ter mais de uma lista cadastrada?"
            a="Sim. Cada conta STVBR aceita até 3 listas ativas simultaneamente. Você pode alternar entre elas direto pelo app na TV."
          />
          <Faq
            q="Minhas credenciais ficam seguras?"
            a="As credenciais são criptografadas em trânsito (TLS 1.3) e em repouso (AES-256). Elas nunca são salvas em texto puro e nunca trafegam pela TV — apenas pelo seu navegador e nossos servidores."
          />
          <Faq
            q="Como remover ou alterar uma lista depois?"
            a="Acesse este site novamente com o mesmo código de TV ou faça login com seu e-mail. Você verá todas as listas cadastradas e poderá editar, pausar ou remover."
          />
          <Faq
            q="A TV não reconhece a lista. E agora?"
            a="Use o botão 'Testar conexão' antes de salvar. Se mesmo assim falhar, verifique se sua assinatura com o provedor IPTV está ativa, se o host está correto (com http:// e porta) e se o número de conexões simultâneas permitidas não foi excedido."
          />
        </section>

        <footer className="footer">
          <div>© 2026 STVBR · v 2.4.1</div>
          <div className="footer-links">
            <a href="#" className="link-muted">Termos</a>
            <a href="#" className="link-muted">Privacidade</a>
            <a href="#" className="link-muted">Status</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"faq" + (open ? " open" : "")}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)}>
        <span>{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
