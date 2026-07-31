const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AuthorityInput {
  roomId: string
  playerId: string
  sequence: number
  matchTimeMs: number
  action: string
  x: number
  z: number
  magnitude: number
  clientTimeMs: number
  previousHash: string
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function validate(input: AuthorityInput): string[] {
  const reasons: string[] = []
  if (!input.roomId || !input.playerId) reasons.push('missing-identity')
  if (!Number.isInteger(input.sequence) || input.sequence < 0) reasons.push('invalid-sequence')
  if (!Number.isFinite(input.matchTimeMs) || input.matchTimeMs < 0) reasons.push('invalid-match-time')
  if (!Number.isFinite(input.clientTimeMs) || Math.abs(Date.now() - input.clientTimeMs) > 5000) reasons.push('clock-drift')
  if (!Number.isFinite(input.x) || !Number.isFinite(input.z) || Math.abs(input.x) > 80 || Math.abs(input.z) > 80) reasons.push('position-out-of-bounds')
  if (!Number.isFinite(input.magnitude) || input.magnitude < 0 || input.magnitude > 1.35) reasons.push('invalid-magnitude')
  if (!/^[a-z0-9-]{1,40}$/i.test(input.action)) reasons.push('invalid-action')
  if (!/^[a-f0-9]{8,64}$/i.test(input.previousHash) && input.previousHash !== 'genesis') reasons.push('invalid-previous-hash')
  return reasons
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'missing-user-jwt' }, 401)

  let input: AuthorityInput
  try {
    input = await request.json() as AuthorityInput
  } catch {
    return json({ error: 'invalid-json' }, 400)
  }

  const reasons = validate(input)
  const accepted = reasons.length === 0
  const riskScore = Math.min(100, reasons.length * 25)
  const canonical = [input.roomId, input.playerId, input.sequence, input.matchTimeMs, input.action, input.x.toFixed(3), input.z.toFixed(3), input.magnitude.toFixed(3), input.clientTimeMs, input.previousHash].join('|')
  const eventHash = await sha256(canonical)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseUrl || !publishableKey) return json({ error: 'service-not-configured' }, 503)

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/efu_match_events`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: authorization,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      room_id: input.roomId,
      player_id: input.playerId,
      sequence: input.sequence,
      match_time_ms: input.matchTimeMs,
      action: input.action,
      previous_hash: input.previousHash,
      event_hash: eventHash,
      payload: input,
      risk_score: riskScore,
      accepted,
    }),
  })

  if (!insertResponse.ok) {
    const details = await insertResponse.text()
    return json({ error: 'event-persistence-failed', details }, insertResponse.status)
  }

  return json({
    accepted,
    reasons,
    riskScore,
    correctionRequired: reasons.some((reason) => ['clock-drift', 'position-out-of-bounds', 'invalid-sequence'].includes(reason)),
    acknowledgement: {
      sequence: input.sequence,
      eventHash,
      serverTimeMs: Date.now(),
    },
  }, accepted ? 200 : 422)
})
