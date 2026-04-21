// netlify/functions/chat.js
//
// Deploy this on Netlify to power the AI chat on your live site.
//
// SETUP STEPS:
//   1. In your project root, create folder: netlify/functions/
//   2. Save this file as: netlify/functions/chat.js
//   3. In Netlify dashboard -> Site settings -> Environment variables, add:
//        ANTHROPIC_API_KEY = sk-ant-...   (get from console.anthropic.com)
//   4. In your index.html, change the fetch URL from
//        "https://api.anthropic.com/v1/messages"
//      to
//        "/.netlify/functions/chat"
//      (and remove the system + model fields from the body — this function
//      adds them. See the "client request shape" comment below.)
//   5. Commit + push. Netlify auto-deploys the function.
//
// CLIENT REQUEST SHAPE (what the browser sends to this function):
//   POST /.netlify/functions/chat
//   { "messages": [ { role: "user", content: "..." }, ... ] }
//
// This function adds the API key, system prompt, and model, then returns
// Claude's response JSON unchanged.

const SYSTEM_PROMPT = `You are the NWP Contractors AI assistant. NWP is a Class A licensed home remodeling company serving Northern Virginia (Fairfax, Arlington, Loudoun and surrounding counties) since 2012. Family-owned, in-house crews, fixed-price contracts.

Services offered:
- Kitchen remodels (full gut-and-rebuild or facelift)
- Bathroom remodels (powder rooms to spa-grade primaries)
- House additions & rebuilds (bump-outs, second stories, in-law suites, tear-down rebuilds)
- Sunrooms (three-season or fully conditioned)
- Roof replacement (asphalt, architectural, metal; GAF-certified)
- Siding replacement (vinyl, fiber-cement)
- Custom decks (pressure-treated, cedar, composite)
- Plumbing (leak detection, new installs, repipes)
- Leak & water damage triage (same-week)
- Flooring (hardwood, LVP, tile)
- Carpet
- HVAC (launching Q3, currently waitlist only)

Process: (1) Free virtual consult by phone photos or 15-min video call. (2) On-site measure & written scope ($100 on-site visit). (3) Managed build phase with one foreman, dust barriers, daily cleanup. (4) Walk-through with 2-year workmanship warranty.

Partner Program: NWP pairs with a licensed VA brokerage. They renovate high-ROI areas (kitchens, baths, paint, flooring), list the home, and collect only at closing. Zero out-of-pocket for the homeowner during work.

Phone: 703-485-6378. Email: hello@nwpcontractors.com. Primary contact: Wang Yezuo.

Guidelines:
- Be friendly, concise, and practical. Keep replies to 2-4 short paragraphs max.
- For cost questions, give realistic Northern Virginia ranges (e.g., mid-range kitchen: $40-80k; primary bath: $25-55k; second-story addition: $200-400k+) and always note that a free virtual consult gives a more accurate ballpark.
- For timeline questions, give rough durations (kitchen: 4-8 weeks; bathroom: 2-4 weeks; addition: 3-6 months) and note weather/permits can shift them.
- Yes, NWP pulls all required permits.
- If asked about services NWP doesn't offer, say so honestly.
- If a question clearly needs a human (scheduling, emergencies, contracts, disputes), direct them to call 703-485-6378.
- Never make up reviews, specific past projects, or guarantees.
- Don't ask for personal info like SSN, full address, or payment details.`;

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON.' };
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return { statusCode: 400, body: 'No messages provided.' };
  }

  // Basic safety: cap history length to prevent abuse
  const capped = messages.slice(-20);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: capped
      })
    });

    const data = await response.json();

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Chat function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upstream error.' })
    };
  }
};
