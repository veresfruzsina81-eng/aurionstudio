// netlify/functions/aurion-chat.js

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const SYSTEM_PROMPT = `
Te az Aurion Studio AI asszisztense vagy.

- Mindig magyarul válaszolsz.
- Csak az Aurion Studio szolgáltatásairól beszélsz: egyedi weboldal, webshop fejlesztés, AI chat integráció, WordPress / WooCommerce megoldások.
- Ha a felhasználó más témáról kérdez (politika, magánélet, programozás általában, stb.), udvariasan visszatereld a beszélgetést az Aurion Studio szolgáltatásaira.
- A hangnemed pozitív, profi, marketinges, de nem tolakodó.
- Válaszaid legyenek 3–6 mondatos, jól tagolt, könnyen olvasható szövegek.
- Gyakran javasold, hogy a részleteket az oldal kapcsolat szekcióján keresztül beszéljék meg az Aurion Studioval.
`;

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: 'Method Not Allowed',
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Hiányzó OPENAI_API_KEY environment variable');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'AI motor nincs bekötve (hiányzó API key).',
        }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // ÚJ: a frontend "message" és "count" mezőt küld
    const userMessage = (body.message || '').toString().trim();
    const count = Number(body.count ?? 0);

    if (!userMessage) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Hiányzó üzenet (message).' }),
      };
    }

    // Szerver oldali védelem – 10 üzenet után limit
    if (count >= 10) {
      return {
        statusCode: 429,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message:
            'Ebben a demó chatben 10 üzenet után lezárjuk a beszélgetést, hogy védjük az AI erőforrásokat. ' +
            'Ha saját, korlátlan Aurion Studio AI asszisztenst szeretnél, jelezd nekünk az ajánlatkérő űrlapon.',
        }),
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.6,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI hiba:', openaiRes.status, text);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'AI válasz hiba.',
          detail: text,
        }),
      };
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error('Function hiba:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Belső szerverhiba.' }),
    };
  }
};
