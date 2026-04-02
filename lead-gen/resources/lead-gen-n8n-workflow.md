# n8n Workflow Specification for Lead Generation

## Purpose

This document translates the lead generation plan and schema into an `n8n` automation design. The objective is to build a reliable semi-automated system for sourcing, enriching, classifying, scoring, and sequencing Shopify apparel leads.

The workflow design assumes:

- `accounts` is the primary table
- `contacts` is linked to `accounts`
- outbound is email-first
- LLM steps are used for classification and draft generation, not for irreversible actions
- human review remains in the loop before sequence enrollment for top-priority accounts

## System Boundaries

The workflow does not need to automate every possible source from day one. It should begin with a narrow, dependable set of inputs and expand only after data quality is acceptable.

### Phase 1 Scope

- import leads into `accounts`
- enrich account and contact data
- fetch site pages and extract fit-related signals
- score accounts
- generate personalization drafts
- enroll approved contacts into outbound
- classify inbound replies

### Out of Scope for Phase 1

- autonomous LinkedIn messaging
- automatic pricing negotiation
- multi-touch CRM opportunity management
- deep website crawling beyond a few key pages
- enterprise-grade distributed queues

## High-Level Workflow Map

The system should be implemented as multiple smaller `n8n` workflows rather than one large monolith.

1. `lead_ingest`
2. `account_enrichment`
3. `page_fetch_and_classify`
4. `account_scoring`
5. `personalization_and_review_queue`
6. `sequence_enrollment`
7. `reply_ingest_and_classify`
8. `maintenance_and_retries`

Each workflow should be idempotent and safe to rerun.

## Shared Conventions

### Trigger Rules

- process only records in a clearly defined status
- after successful completion, write the next status explicitly
- on failure, write an error status or log row in `workflow_runs`

### Idempotency Rules

- never create duplicate accounts for the same normalized domain
- never create duplicate contacts for the same normalized email
- never enroll the same contact in the same sequence twice
- never send an outbound step if an earlier positive or unsubscribe reply exists

### Recommended Environment Variables

- `AIRTABLE_BASE_ID`
- `AIRTABLE_API_KEY`
- `OPENAI_API_KEY`
- `ENRICHMENT_API_KEY`
- `OUTREACH_API_KEY`
- `DEFAULT_SEQUENCE_NAME`
- `HUMAN_REVIEW_VIEW_NAME`

## Workflow 1: lead_ingest

### Goal

Ingest raw lead candidates into the `accounts` table in a normalized format.

### Trigger Options

- scheduled cron
- webhook from a scraper
- manual CSV import handler

### Input

- brand name
- domain or storefront URL
- source type
- source URL
- optional category hints

### Steps

1. Trigger fires on new source payload or schedule
2. Normalize domain
3. Lookup `accounts` by normalized domain
4. If account exists, update source metadata and skip account creation
5. If account does not exist, create `accounts` row with:
   - `account_status = raw`
   - `shopify_status = unknown`
   - `fit_sensitivity = unknown`
6. Write a `workflow_runs` record

### Output

- new or updated `accounts` row

## Workflow 2: account_enrichment

### Goal

Resolve account-level and contact-level enrichment for raw leads.

### Trigger

- cron every 15 minutes
- query `accounts` where `account_status = raw`

### Steps

1. Fetch batch of `raw` accounts
2. Run domain enrichment
3. Confirm or infer Shopify usage
4. Resolve company country, social URLs, and business hints
5. Search for likely contacts:
   - founder
   - head of e-commerce
   - growth or marketing lead
6. Validate email quality if provider supports it
7. Upsert `contacts`
8. Update `accounts` fields:
   - `shopify_status`
   - `company_country`
   - `business_model`
   - `account_status = enriched`
   - `last_enriched_at`
9. Write success or failure to `workflow_runs`

### Failure Handling

- if enrichment provider fails, leave status as `raw` and increment retry counter
- if no contact is found, account can still move forward if account signals are strong

## Workflow 3: page_fetch_and_classify

### Goal

Fetch a small set of merchant pages and classify fit-related pain signals.

### Trigger

- cron every 15 minutes
- query `accounts` where `account_status = enriched`

### Page Targets

- homepage
- one or two product pages
- size chart page if discoverable
- return or exchange policy page
- FAQ page if easily discoverable

### Steps

1. Read enriched account
2. Build candidate URLs from homepage navigation or known page patterns
3. Fetch page HTML or rendered text
4. Store relevant snippets in `account_pages`
5. Send condensed text to LLM classifier
6. Extract structured outputs:
   - `fit_sensitivity`
   - `size_chart_present`
   - `return_policy_present`
   - `exchange_policy_present`
   - `reviews_present`
   - `active_ads_signal` if known from upstream
   - evidence statements
7. Upsert `signals`
8. Update `accounts.account_status = classified`

### LLM Output Contract

The classifier should return strict JSON with:

```json
{
  "category_primary": "dresses",
  "fit_sensitivity": "high",
  "size_chart_present": true,
  "return_policy_present": true,
  "exchange_policy_present": true,
  "reviews_present": false,
  "signals": [
    {
      "signal_name": "fit_sensitive_catalog",
      "signal_value": "true",
      "signal_strength": "high",
      "evidence": "Multiple tailored dress products with waist and bust sizing."
    }
  ]
}
```

### Guardrails

- limit crawl depth to avoid brittle scraping
- do not block the entire run if one page fetch fails
- classify only from fetched evidence, not speculation

## Workflow 4: account_scoring

### Goal

Assign fit score, pain score, and priority band.

### Trigger

- cron every 15 minutes
- query `accounts` where `account_status = classified`

### Steps

1. Load account and related signals
2. Apply deterministic scoring rules in a Function node
3. Optionally ask LLM for short `score_reasoning` text
4. Write score snapshot to `scores`
5. Update `accounts`:
   - `fit_score`
   - `pain_score`
   - `total_score`
   - `outreach_priority`
   - `account_status = scored`
   - `last_scored_at`

### Priority Routing

- if `total_score >= 8`, route to review queue
- if `total_score` is `6-7`, mark `queued_for_review`
- if `total_score < 6`, set `account_status = disqualified` or `suppressed`

### Important Rule

The score calculation should live in code or an `n8n` Function node, not only in prompts. This keeps qualification logic auditable and stable.

## Workflow 5: personalization_and_review_queue

### Goal

Generate outreach drafts for scored accounts and route them into a reviewable queue.

### Trigger

- cron every 15 minutes
- query `accounts` where:
  - `account_status = scored`
  - `outreach_priority in (p1, p2)`

### Steps

1. Load account plus top-ranked contact
2. Build structured personalization input
3. Generate:
   - first line
   - one-sentence business implication
   - subject line options
   - CTA variant
4. Create or update `outreach_sequences` with:
   - `sequence_status = draft`
   - `sequence_name = global_fit_pain_v1`
5. Update `accounts.account_status = queued_for_review`

### Review Modes

- `p1` accounts require human approval
- `p2` accounts can be auto-approved if the team is comfortable with send quality

### Suggested Review View

In Airtable, create a filtered view showing:

- brand
- domain
- total score
- fit score
- pain score
- first line
- primary contact
- manual approval checkbox

## Workflow 6: sequence_enrollment

### Goal

Enroll approved contacts into the outbound sequence.

### Trigger Options

- cron polling approved records
- Airtable update webhook

### Enrollment Conditions

- `accounts.account_status = approved_for_outreach`
- `contacts.contact_status in (validated, active)`
- no unsubscribe or bounce status
- no active sequence already assigned

### Steps

1. Pull approved account-contact pairs
2. Verify no prior active sequence
3. Push sequence payload to outbound provider
4. Create `outreach_sequences` row if missing
5. Write first `outreach_events` row with `sent_status = sent`
6. Update:
   - `accounts.account_status = in_sequence`
   - `contacts.last_contacted_at`
   - `outreach_sequences.sequence_status = active`

### Stop Conditions

- positive reply
- unsubscribe
- bounce
- manual pause

## Workflow 7: reply_ingest_and_classify

### Goal

Capture inbound replies from the outbound tool and route them correctly.

### Trigger

- webhook from outbound provider

### Steps

1. Receive reply payload
2. Match `provider_message_id` to `outreach_events`
3. Create `reply_events` row
4. Send reply text to classifier
5. Return:
   - `reply_label`
   - `reply_sentiment`
   - `needs_human_review`
   - `suggested_next_action`
6. Update:
   - `contacts.contact_status`
   - `contacts.last_replied_at`
   - `accounts.account_status = replied`
   - `outreach_sequences.sequence_status = stopped` if appropriate

### Automatic Actions by Reply Type

- `interested`
  - stop sequence
  - create meeting task
  - mark for immediate human follow-up
- `wrong_person`
  - stop current contact
  - trigger contact enrichment for another role
- `unsubscribe`
  - mark contact `do_not_contact`
  - stop all active sequences for that contact
- `not_now`
  - pause or complete sequence
  - set reminder for later reactivation
- `unclear`
  - route to manual review

## Workflow 8: maintenance_and_retries

### Goal

Keep the system healthy and avoid silent failures.

### Trigger

- nightly cron

### Tasks

- retry failed enrichment jobs with bounded retry count
- retry failed page fetches if the account is still relevant
- mark stale draft sequences older than a threshold
- detect accounts stuck in a status too long
- produce a summary report of:
  - new accounts
  - enriched accounts
  - scored accounts
  - enrolled contacts
  - replies by label
  - failures by workflow

## Node-Level Suggestions

The exact node set depends on the providers, but a practical implementation looks like this:

### Common Node Types

- `Cron`
- `Webhook`
- `HTTP Request`
- `Set`
- `IF`
- `Function`
- `Merge`
- `Split In Batches`
- `OpenAI` or generic HTTP call to OpenAI API
- Airtable or Sheets nodes

### Practical Pattern

- `Cron` -> `Airtable List` -> `Split In Batches` -> `HTTP Request` or `Function` -> `Airtable Update`

This pattern is easier to debug than large branching workflows with many hidden conditions.

## Prompting Guidelines for LLM Nodes

Use LLM nodes only for tasks that benefit from semantic judgment:

- apparel category classification
- fit-sensitivity classification
- evidence summarization
- outreach first-line drafting
- reply labeling

Do not rely on LLM nodes for:

- deduplication
- status transition logic
- deterministic score arithmetic
- suppression checks

### Recommended LLM Output Strategy

- require strict JSON
- validate schema in an `n8n` Function node
- reject and retry malformed outputs once
- if still malformed, route to manual review or write a workflow error row

## Example Workflow State Machine

The account state machine should behave like this:

- `raw`
  - eligible for enrichment
- `enriched`
  - eligible for page fetch and classification
- `classified`
  - eligible for scoring
- `scored`
  - eligible for review queue
- `queued_for_review`
  - waiting for approval or auto-approval
- `approved_for_outreach`
  - eligible for sequence enrollment
- `in_sequence`
  - waiting for reply or sequence completion
- `replied`
  - handled by sales follow-up
- `disqualified` or `suppressed`
  - excluded from further processing

## Error Handling Requirements

Every workflow should:

- write a `workflow_runs` row on start and completion
- capture provider error payloads where possible
- distinguish between temporary and permanent failures
- cap retries to avoid loops
- fail one record at a time, not the entire batch

## Security and Compliance Notes

- store only the minimum contact data required for outreach
- honor unsubscribe requests immediately
- keep suppression lists centralized
- avoid storing full HTML pages if that creates unnecessary storage or compliance overhead
- ensure sending domains are authenticated before any large-scale sequence enrollment

## Build Order

Implement the workflows in this order:

1. `lead_ingest`
2. `account_enrichment`
3. `page_fetch_and_classify`
4. `account_scoring`
5. `personalization_and_review_queue`
6. `sequence_enrollment`
7. `reply_ingest_and_classify`
8. `maintenance_and_retries`

This order matters because it gives the team an inspectable qualification pipeline before any outbound is sent.

## First-Version Success Criteria

The first implementation is good enough if it can reliably:

- dedupe and create new accounts
- enrich at least one valid contact for a meaningful share of qualified stores
- classify fit-sensitive apparel with acceptable precision
- score accounts into clear priority bands
- generate reviewable personalization drafts
- enroll approved contacts into one outbound sequence
- classify replies without creating workflow chaos

If the system cannot do those things consistently, adding more channels or more sourcing inputs will only scale noise.
