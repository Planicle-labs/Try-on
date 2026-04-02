# Lead Generation Data Schema

## Purpose

This document defines the operational schema for the Shopify apparel lead generation pipeline. The schema is designed to work in an Airtable-style base, a relational database, or Google Sheets as an initial system of record. The field names are written to map cleanly into `n8n` workflows and outbound tooling.

The data model is intentionally account-centric. Outreach should be triggered from qualified accounts, with one or more linked contacts and a separate event log for every enrichment, scoring, and messaging action.

## Design Principles

- one account record per merchant domain
- one contact record per human recipient
- one event record per workflow action that should be auditable
- denormalize only when it reduces workflow complexity
- preserve enough raw data to re-score leads later
- store machine classifications separately from operator notes

## Entity Overview

The pipeline should use the following primary entities:

1. `accounts`
2. `contacts`
3. `account_pages`
4. `signals`
5. `scores`
6. `outreach_sequences`
7. `outreach_events`
8. `reply_events`
9. `workflow_runs`

If the first version must stay lightweight, `signals` and `scores` can be collapsed into the `accounts` table. `workflow_runs` can also be deferred, but it is useful for debugging automation.

## 1. accounts

This is the system-of-record table for merchant-level qualification.

### Required Fields

- `account_id`
  - type: string
  - format: `acct_<uuid>` or similar stable identifier
- `brand_name`
  - type: string
- `primary_domain`
  - type: string
  - unique: yes
- `company_country`
  - type: string
- `shopify_status`
  - type: enum
  - values: `confirmed`, `likely`, `unknown`, `not_shopify`
- `business_model`
  - type: enum
  - values: `dtc`, `dtc_wholesale`, `marketplace_heavy`, `wholesale_first`, `unknown`
- `category_primary`
  - type: enum
  - values: `dresses`, `tops`, `bottoms`, `co_ords`, `ethnicwear`, `denim`, `shapewear`, `occasionwear`, `multi_category`, `non_target`
- `fit_sensitivity`
  - type: enum
  - values: `high`, `medium`, `low`, `unknown`
- `account_status`
  - type: enum
  - values: `raw`, `enriched`, `classified`, `scored`, `queued_for_review`, `approved_for_outreach`, `in_sequence`, `replied`, `disqualified`, `suppressed`

### Qualification Fields

- `estimated_scale_band`
  - type: enum
  - values: `micro`, `small`, `mid_market`, `large`, `enterprise`, `unknown`
- `price_band`
  - type: enum
  - values: `budget`, `mid`, `premium`, `luxury`, `unknown`
- `product_count_estimate`
  - type: integer
- `size_chart_present`
  - type: boolean
- `return_policy_present`
  - type: boolean
- `exchange_policy_present`
  - type: boolean
- `international_shipping_present`
  - type: boolean
- `reviews_present`
  - type: boolean
- `active_ads_signal`
  - type: boolean
- `installed_fit_tooling`
  - type: string
  - note: raw text or comma-separated tools if discovered

### Commercial Fields

- `estimated_monthly_traffic_band`
  - type: enum
  - values: `lt_10k`, `10k_50k`, `50k_200k`, `200k_plus`, `unknown`
- `estimated_aov_band`
  - type: enum
  - values: `lt_40`, `40_80`, `80_150`, `150_plus`, `unknown`
- `store_maturity`
  - type: enum
  - values: `early`, `growing`, `scaled`, `enterprise`, `unknown`
- `buyability`
  - type: enum
  - values: `high`, `medium`, `low`, `unknown`

### Source and Audit Fields

- `source_type`
  - type: enum
  - values: `google_search`, `meta_ad_library`, `instagram`, `tiktok`, `directory`, `competitor_customer_list`, `manual`, `import`
- `source_detail`
  - type: string
- `source_url`
  - type: string
- `created_at`
  - type: datetime
- `updated_at`
  - type: datetime
- `last_enriched_at`
  - type: datetime
- `last_scored_at`
  - type: datetime
- `owner`
  - type: string
- `manual_notes`
  - type: long text

### Scoring Fields

- `fit_score`
  - type: integer
- `pain_score`
  - type: integer
- `total_score`
  - type: integer
- `score_reasoning`
  - type: long text
- `outreach_priority`
  - type: enum
  - values: `p1`, `p2`, `p3`, `hold`, `suppress`

### Recommended Unique Constraints

- unique on `primary_domain`
- optional secondary unique on normalized Shopify store URL

## 2. contacts

This table stores contact-level recipients linked to an account.

### Required Fields

- `contact_id`
  - type: string
- `account_id`
  - type: foreign key to `accounts.account_id`
- `full_name`
  - type: string
- `email`
  - type: string
- `contact_status`
  - type: enum
  - values: `new`, `validated`, `invalid`, `active`, `do_not_contact`, `bounced`, `responded`

### Contact Role Fields

- `job_title`
  - type: string
- `role_group`
  - type: enum
  - values: `founder`, `ecommerce`, `growth`, `marketing`, `operations`, `merchandising`, `unknown`
- `seniority`
  - type: enum
  - values: `owner`, `head`, `manager`, `individual_contributor`, `unknown`
- `is_primary_contact`
  - type: boolean

### Channel Fields

- `linkedin_url`
  - type: string
- `instagram_profile_url`
  - type: string
- `email_validation_status`
  - type: enum
  - values: `valid`, `risky`, `invalid`, `unknown`
- `last_contacted_at`
  - type: datetime
- `last_replied_at`
  - type: datetime

### Outreach Preference Fields

- `contact_priority`
  - type: enum
  - values: `high`, `medium`, `low`
- `suppression_reason`
  - type: string
- `unsubscribe_at`
  - type: datetime

## 3. account_pages

This table stores the pages fetched from a merchant site for downstream classification.

### Fields

- `page_id`
  - type: string
- `account_id`
  - type: foreign key
- `page_type`
  - type: enum
  - values: `homepage`, `product_page`, `collection_page`, `size_chart`, `returns_policy`, `shipping_policy`, `faq`, `reviews`
- `page_url`
  - type: string
- `fetch_status`
  - type: enum
  - values: `pending`, `success`, `failed`
- `fetched_at`
  - type: datetime
- `page_title`
  - type: string
- `raw_text_excerpt`
  - type: long text
- `html_snapshot_ref`
  - type: string
  - note: store path, object key, or external blob reference

This table is useful if the team wants to keep fetched evidence separate from account summaries. For a smaller version, only the extracted summary can be stored on the account itself.

## 4. signals

This table stores machine-extracted and manual lead signals. It is useful when you want score transparency rather than a black-box total.

### Fields

- `signal_id`
  - type: string
- `account_id`
  - type: foreign key
- `signal_name`
  - type: enum
  - values:
    - `shopify_confirmed`
    - `apparel_first`
    - `fit_sensitive_catalog`
    - `size_chart_present`
    - `return_language_prominent`
    - `reviews_mention_fit`
    - `active_ads_detected`
    - `international_shipping`
    - `existing_fit_tool_installed`
    - `likely_enterprise`
    - `non_target_category`
- `signal_value`
  - type: enum
  - values: `true`, `false`, `unknown`
- `signal_strength`
  - type: enum
  - values: `high`, `medium`, `low`
- `evidence`
  - type: long text
- `evidence_url`
  - type: string
- `detected_by`
  - type: enum
  - values: `rule`, `llm`, `human`
- `detected_at`
  - type: datetime

## 5. scores

This table stores versioned score snapshots. It prevents rescoring from overwriting earlier output without traceability.

### Fields

- `score_id`
  - type: string
- `account_id`
  - type: foreign key
- `scoring_version`
  - type: string
- `fit_score`
  - type: integer
- `pain_score`
  - type: integer
- `total_score`
  - type: integer
- `priority_band`
  - type: enum
  - values: `p1`, `p2`, `p3`, `hold`, `suppress`
- `score_reasoning`
  - type: long text
- `scored_at`
  - type: datetime
- `approved_by_human`
  - type: boolean

If the team wants a simpler implementation, the latest scores can live directly on `accounts` and historical snapshots can be skipped at first.

## 6. outreach_sequences

This table tracks the sequence assignment at the contact level.

### Fields

- `sequence_id`
  - type: string
- `account_id`
  - type: foreign key
- `contact_id`
  - type: foreign key
- `sequence_name`
  - type: enum
  - values: `global_fit_pain_v1`, `global_fit_pain_v2`, `manual_custom`
- `sequence_status`
  - type: enum
  - values: `draft`, `scheduled`, `active`, `paused`, `completed`, `stopped`
- `personalization_summary`
  - type: long text
- `first_line`
  - type: string
- `cta_variant`
  - type: string
- `enrolled_at`
  - type: datetime
- `current_step`
  - type: integer
- `next_step_due_at`
  - type: datetime
- `stop_reason`
  - type: string

## 7. outreach_events

This is the communication event log. Every outbound touch should produce one row.

### Fields

- `event_id`
  - type: string
- `sequence_id`
  - type: foreign key
- `account_id`
  - type: foreign key
- `contact_id`
  - type: foreign key
- `channel`
  - type: enum
  - values: `email`, `linkedin`, `instagram_dm`, `manual_note`
- `step_number`
  - type: integer
- `message_variant`
  - type: string
- `subject_line`
  - type: string
- `message_body_ref`
  - type: string
  - note: external system id or stored draft body
- `sent_status`
  - type: enum
  - values: `drafted`, `sent`, `delivered`, `bounced`, `failed`
- `provider_message_id`
  - type: string
- `sent_at`
  - type: datetime

## 8. reply_events

This table stores inbound replies and their classification.

### Fields

- `reply_id`
  - type: string
- `event_id`
  - type: foreign key to `outreach_events.event_id`
- `account_id`
  - type: foreign key
- `contact_id`
  - type: foreign key
- `reply_channel`
  - type: enum
  - values: `email`, `linkedin`, `instagram_dm`
- `reply_text`
  - type: long text
- `reply_label`
  - type: enum
  - values: `interested`, `not_now`, `wrong_person`, `already_using_solution`, `pricing_concern`, `unsubscribe`, `unclear`
- `reply_sentiment`
  - type: enum
  - values: `positive`, `neutral`, `negative`, `unknown`
- `needs_human_review`
  - type: boolean
- `suggested_next_action`
  - type: enum
  - values: `book_meeting`, `send_follow_up`, `find_new_contact`, `suppress_contact`, `manual_review`
- `classified_by`
  - type: enum
  - values: `llm`, `human`, `rule`
- `received_at`
  - type: datetime

## 9. workflow_runs

This table tracks automation jobs. It is optional but useful for reliability.

### Fields

- `run_id`
  - type: string
- `workflow_name`
  - type: string
- `entity_type`
  - type: enum
  - values: `account`, `contact`, `sequence`, `reply`
- `entity_id`
  - type: string
- `run_status`
  - type: enum
  - values: `started`, `completed`, `failed`, `skipped`
- `error_summary`
  - type: long text
- `started_at`
  - type: datetime
- `completed_at`
  - type: datetime

## Minimum Viable Schema

If the team wants to start with a lean setup in Airtable or Sheets, the minimum viable schema is:

1. `accounts`
2. `contacts`
3. `outreach_events`
4. `reply_events`

The following fields should still exist even in the lean version:

- `accounts.primary_domain`
- `accounts.account_status`
- `accounts.fit_score`
- `accounts.pain_score`
- `accounts.total_score`
- `accounts.outreach_priority`
- `contacts.email`
- `contacts.role_group`
- `contacts.contact_status`
- `outreach_events.sent_status`
- `reply_events.reply_label`

## Recommended Status Transitions

### Account Status Flow

- `raw` -> `enriched`
- `enriched` -> `classified`
- `classified` -> `scored`
- `scored` -> `queued_for_review`
- `queued_for_review` -> `approved_for_outreach`
- `approved_for_outreach` -> `in_sequence`
- `in_sequence` -> `replied`
- any state -> `disqualified`
- any state -> `suppressed`

### Contact Status Flow

- `new` -> `validated`
- `validated` -> `active`
- `active` -> `responded`
- any state -> `invalid`
- any state -> `bounced`
- any state -> `do_not_contact`

## Deduplication Rules

- dedupe accounts by normalized root domain
- dedupe contacts by normalized email address
- dedupe outreach events by `provider_message_id`
- dedupe workflow runs by `workflow_name + entity_id + logical_run_window`

## Example Account Record

```json
{
  "account_id": "acct_01JX123ABC",
  "brand_name": "Example Apparel",
  "primary_domain": "exampleapparel.com",
  "company_country": "United States",
  "shopify_status": "confirmed",
  "business_model": "dtc",
  "category_primary": "dresses",
  "fit_sensitivity": "high",
  "account_status": "scored",
  "estimated_scale_band": "small",
  "size_chart_present": true,
  "return_policy_present": true,
  "active_ads_signal": true,
  "fit_score": 10,
  "pain_score": 7,
  "total_score": 17,
  "outreach_priority": "p1"
}
```

## Airtable Implementation Notes

- use `accounts` as the primary table
- link `contacts` to `accounts`
- link `outreach_events` and `reply_events` to both `accounts` and `contacts`
- use single-select fields for enums
- use formula fields for `total_score` only if the score model is simple
- if scoring logic becomes conditional and versioned, calculate scores in `n8n` and write results back explicitly

## What Not To Model Yet

Do not introduce pipeline objects for opportunities, meetings, or deals unless the sales process is already structured enough to need them. In the first version, a positive reply can be represented with `reply_events.reply_label = interested` and a simple booked meeting flag on the account or event.
