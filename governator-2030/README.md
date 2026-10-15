# Governator — ElevenLabs Agent demo

A minimal voice interface: an orb, one question, generic visual components, and a compact journey checklist. The main conversation is driven by **ElevenLabs Agents**, using the official `@elevenlabs/client` SDK over WebRTC. It is not the old keyword-matching speech loop.

## Hosted setup

The existing private Site uses server runtime variables:

- `ELEVENLABS_API_KEY` — secret, used only on the server to obtain short-lived conversation tokens.
- `ELEVENLABS_AGENT_ID` — the configured agent ID.

Both are configured for the current deployment. Hosted variables are separate from local `.env` files. To replace a key, update the Site's production runtime environment variables and redeploy a saved version. Settings → Check connection reports readiness without revealing values.

No separate OpenAI API key is required. The language model, voice, prompt, tools and conversation retention are configured on the ElevenLabs agent. The setup script chooses GPT-4.1 and the English Flash v2 voice model; change `ELEVENLABS_AGENT_MODEL` or `ELEVENLABS_VOICE_ID` before rerunning setup to update them.

## Local development

Requires Node 24 and pnpm. Install with `pnpm install`.

1. Edit `.env` in this directory. Add `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`. Use `.env.example` for variable names; do not overwrite an existing `.env` containing your configuration.
2. `pnpm build`
3. `pnpm dev` (default http://localhost:2030; `PORT` overrides it).

The dev server reads `.env` automatically. `.env`, setup progress, node_modules, generated Worker and build output are ignored by Git. The browser receives an ephemeral session token, never the API key. The host's Sites authentication remains in place.

## Create or update an ElevenLabs agent

`node scripts/setup-agent.mjs`

The script reads the local environment, creates eight client tools from `shared/agent-config.mjs`, creates a private/authenticated agent using `agent/system-prompt.md`, and writes its ID into `.env`. Tool/agent IDs are retained in ignored `.agent-setup-state.json` so reruns update existing resources and resume incomplete setup. If `ELEVENLABS_AGENT_ID` is provided, that specific agent is updated. The API key needs Agents/tool creation and conversation access. The script never prints the key.

The current agent is `agent_7601m4y6mnz7fbkr0ef0n13y8sa0`. It has all eight client tools attached with response waiting enabled. Ordinary conversation timing and interruptions are handled by the SDK. The setup config disables stored voice recording and sets a seven-day conversation retention period; account policies still apply.

## Generic tools

- `get_journey` discovers available journeys or loads `drivers_license`, including its workflow, dependencies, preset citizen, existing evidence, progress, fees and valid keys.
- `set_preferences` records explicitly supplied preferences.
- `find_services` returns sample school/doctor/course data and doctor appointment slots.
- `show_cards` lets the agent define card labels, descriptions, icons, selection field and valid option values.
- `show_map` lets the agent select provider markers, labels, centre and zoom. Leaflet displays a real OpenStreetMap basemap. Sample provider positions and ratings are explicitly labelled synthetic.
- `show_calendar` displays the supplied valid slot IDs, with single appointment or multiple preferred-date selection.
- `record_selection` records a spoken choice from the current component; stale presentation IDs, unknown options and mismatched doctor slots are rejected.
- `perform_action` executes an approved, validated simulated booking, application submission, licence issuance, or follow-up plan. Repeated actions are idempotent.

Tool definitions and handlers share the same names. Tool results return JSON to the agent. Clicking a component records the selection through the same engine and sends `sendUserMessage` with the authoritative result; background state uses `sendContextualUpdate`. Components escape agent-generated text and never execute agent-supplied HTML or JavaScript.

## State and demo boundaries

The app owns structured state in browser localStorage, scoped to this prototype. It does not persist microphone audio or raw conversation transcripts. ElevenLabs processes the conversation under the agent/account retention settings. The browser state engine validates the demo; it is not a production government transaction backend.

The preset citizen is Lena Muster, age 24, Graz, with class A and verified first aid. Class B is therefore an extension and first aid is reused. The demo supplies no reusable current medical report, so a new medical step is included. Official first-attempt extension/exam fees total €144 (€73 + €11 + €60); the demo medical fee is €35. Sample providers, ratings, March 2030 slots, identity, medical readiness, training/exam results, payments and licences are simulated. No real appointments, submissions or payments occur.

`get_journey` provides workflow guidance rather than forcing a fixed conversation order. Tools enforce dependencies. The separate **Demo controls** panel simulates provider updates. The agent has no tool that can declare the citizen medically fit, complete lessons, or pass exams. Medical confirmation goes directly from doctor to authority in the demo, with no citizen upload. A labelled **Preview interface** mode exercises the same generic component tools without a live agent; it is separate from the agent-driven conversation.

## Verification

- `pnpm test`: journey validation, generic components, stale selections, invalid provider/slot IDs, approvals, evidence dependencies, idempotency, API identity/origin guards, token handling and secret redaction.
- `node scripts/validate-artifact.mjs`: deployment Worker validity.
- `node scripts/check-agent.mjs`: an optional **live, billable** agent smoke check. It verifies actual tool calls, a spoken school selection, clicked doctor selection, dynamic map/cards/calendar, and preference extraction. It uses a text conversation to test reasoning/tool use without activating a microphone.

Official references: [Agents SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script), [client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [agent creation](https://elevenlabs.io/docs/api-reference/agents/create).

## Phone provider controls (local)

Start the laptop with `PORT=2032 node scripts/dev.mjs`. The server prints a LAN address ending in `/control`. Connect the phone to the same Wi-Fi, open that address, and enter the six-digit code shown under **Provider updates** on the laptop. Keep the assistant page open. The control page sends provider confirmations to that browser and shows acknowledgement when applied. Each control becomes available when its prerequisites are met.

The pairing code is fixed by GOVERNATOR_PAIRING_CODE in the local .env and stays the same when the server restarts. These routes belong to the local Node server; they are not part of the previously published site. ElevenLabs credentials stay on the laptop; voice API routes accept loopback clients only.

The profile's saved home is in Josefstadt, Vienna. Provider tools include straight-line home distances, distances between providers, and the closest-provider ID. The map shows the home pin and approximate distances; these are not routed travel estimates.
