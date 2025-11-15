// netlify/functions/aurion-chat.js

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
        body: JSON.stringify({ error: 'AI motor nincs bekötve (hiányzó API key).' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // 1) Ha a frontend egyetlen "message" stringet küld (ahogy most):
    const singleMessage = body.message;

    // 2) Ha később messages tömböt küldenél, azt is elfogadjuk:
    let messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      if (!singleMessage || typeof singleMessage !== 'string') {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Hiányzó üzenet (message vagy messages).' }),
        };
      }

      // Itt építjük fel a teljes chat kontextust
      messages = [
        {
          role: 'system',
          content:
            'Te az Aurion Studio weboldal AI asszisztense vagy. ' +
            'Segíts barátságosan és érthetően válaszolni webfejlesztés, webshop, AI chat és együttműködés témában. ' +
            'Válaszaid legyenek rövidek, lényegre törők, és tegező hangvételűek.',
        },
        {
          role: 'user',
          content: singleMessage,
        },
      ];
    }

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
        body: JSON.stringify({ error: 'AI válasz hiba.', detail: text }),
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
