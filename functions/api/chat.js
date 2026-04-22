// functions/api/chat.js
//
// Cloudflare Pages Function — serves as the backend for the AI chat on the NWP site.
// This replaces the Netlify version. Same purpose, slightly different format.
//
// SETUP:
//   1. Save this file at: functions/api/chat.js  (in your GitHub repo root)
//   2. In Cloudflare dashboard -> your Pages project -> Settings -> Environment variables
//      add: ANTHROPIC_API_KEY = sk-ant-...   (same key as Netlify)
//   3. In index.html, the fetch URL should point to: "/api/chat"
//
// CLIENT REQUEST SHAPE:
//   POST /api/chat
//   { "messages": [ { role: "user", content: "..." }, ... ] }
 
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
 
export async function onRequestPost(context) {
  const { request, env } = context;
 
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }
 
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return new Response('No messages provided.', { status: 400 });
  }
 
  // Cap history length to prevent abuse
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
 
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Chat function error:', err);
    return new Response(
      JSON.stringify({ error: 'Upstream error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
 
// Optional: reject non-POST requests with a friendly message
export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed. Use POST.', { status: 405 });
  }
  return onRequestPost(context);
}
 
