// ─────────────────────────────────────────────────────────────
// Health check — Vercel Serverless Function
// GET /api/health
// ─────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

export default async function handler(_req) {
  return new Response(
    JSON.stringify({
      ok: true,
      timestamp: Date.now(),
      service: 'stvbr-api',
      version: '2.4.2',
      env: process.env.VERCEL_ENV || 'dev',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
