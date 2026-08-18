#!/usr/bin/env bash
set -euo pipefail

base_url="${KPGS_GATEWAY_URL:-http://127.0.0.1:5097}"
out_dir="${KPGS_PROOF_DIR:-/tmp/kopano-progressive-update-proof}"
mkdir -p "$out_dir"

post_update() {
  local input="$1"
  local output="$2"
  local route="${3:-/kpgs/progressive-updates}"
  curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data-binary "@$input" \
    "$base_url$route" > "$output"
}

stage_order='["TELEMETRY","CLASSIFICATION","ROUTING","PROTOCOL_SELECTION","INVARIANT_AUDIT","POC_FOC_CHECK","STATE_UPDATE","DISTRIBUTION"]'

curl --fail --silent --show-error "$base_url/health" > "$out_dir/health.json"
jq -e '.adapters | index("kpgs.progressive-update.execute") != null' "$out_dir/health.json"
jq -e '.adapters | index("kpgs.swfus.distribution.read") != null' "$out_dir/health.json"
jq -e '.progressiveUpdates.schema == "kpgs.progressive-update.v1"' "$out_dir/health.json"
jq -e '.progressiveUpdates.receiptSchema == "kpgs.swfus.receipt.v1"' "$out_dir/health.json"
jq -e '.progressiveUpdates.boundaryMarker == "#NB"' "$out_dir/health.json"
jq -e '.progressiveUpdates.canonicalCommit == "6eeb285d0775a7e74ceadc06e32b4068fcfbc595"' "$out_dir/health.json"
jq -e '.progressiveUpdates.constitutionalAuthority == false and .progressiveUpdates.transportGrantsAuthority == false' "$out_dir/health.json"

cat > "$out_dir/create.json" <<'JSON'
{
  "schema": "kpgs.progressive-update.v1",
  "update_id": "ci-create-001",
  "node_id": "ci:locality:province:client-001",
  "operation": "CREATE",
  "lane": "adaptive-player-preference",
  "context_route": "pwa/profile",
  "protocol": "human-explicit-preference",
  "idempotency_key": "ci-progressive-key-create",
  "value": {"profile":"mobile","maximum_profile":"enhanced","selected_by":"human"},
  "apu_status": "UNSPECIFIED",
  "poc_validated": true,
  "foc_detected": false,
  "invariant_passed": true,
  "authority_effect": "none",
  "state_class": "non_authoritative",
  "evidence_refs": ["ci://explicit-human-selection"],
  "correlation_id": "ci-progressive-correlation",
  "source": "ci-adaptive-pwa",
  "expected_version": null,
  "boundary_marker": "#NB"
}
JSON

post_update "$out_dir/create.json" "$out_dir/create-receipt.json"
jq -e '.schema == "kpgs.swfus.receipt.v1" and .disposition == "APPLIED" and .synchronized == true' "$out_dir/create-receipt.json"
jq -e '.canonical_authority_changed == false and .boundary_marker == "#NB" and .replayed == false' "$out_dir/create-receipt.json"
jq -e --argjson expected "$stage_order" '[.stages[].stage] == $expected' "$out_dir/create-receipt.json"
jq -e '[.stages[].status] | index("NOT_REACHED") == null' "$out_dir/create-receipt.json"

# Exact retry must return the same receipt identity without another distribution effect.
post_update "$out_dir/create.json" "$out_dir/create-replay.json"
jq -e '.replayed == true and .disposition == "APPLIED" and .synchronized == true' "$out_dir/create-replay.json"
create_receipt="$(jq -r '.receipt_id' "$out_dir/create-receipt.json")"
replay_receipt="$(jq -r '.receipt_id' "$out_dir/create-replay.json")"
test "$create_receipt" = "$replay_receipt"

curl --fail --silent --show-error "$base_url/api/kpgs/progressive-updates/distribution" > "$out_dir/distribution-after-replay.json"
jq -e '.events | length == 1' "$out_dir/distribution-after-replay.json"
jq -e '.events[0].canonical == false and .events[0].authority_effect == "none" and .events[0].transport_grants_authority == false' "$out_dir/distribution-after-replay.json"

# Same idempotency key + changed governed content must reject before effects.
jq '.update_id="ci-collision-001" | .value.profile="immersive"' \
  "$out_dir/create.json" > "$out_dir/collision.json"
post_update "$out_dir/collision.json" "$out_dir/collision-receipt.json"
jq -e '.disposition == "REJECTED" and .stages[0].stage == "TELEMETRY" and .stages[0].status == "REJECT"' "$out_dir/collision-receipt.json"
jq -e '.stages[1].status == "NOT_REACHED" and .synchronized == false' "$out_dir/collision-receipt.json"

# APU YELLOW is review/HOLD, never mutation or distribution.
jq '.update_id="ci-yellow-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-yellow" | .apu_status="YELLOW" | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/yellow.json"
post_update "$out_dir/yellow.json" "$out_dir/yellow-receipt.json"
jq -e '.disposition == "HELD" and .synchronized == false' "$out_dir/yellow-receipt.json"
jq -e '.stages[] | select(.stage == "POC_FOC_CHECK") | .status == "HOLD"' "$out_dir/yellow-receipt.json"
jq -e '.stages[] | select(.stage == "STATE_UPDATE") | .status == "NOT_REACHED"' "$out_dir/yellow-receipt.json"

# FOC and boundary violations fail closed before state effects.
jq '.update_id="ci-foc-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-foc" | .foc_detected=true | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/foc.json"
post_update "$out_dir/foc.json" "$out_dir/foc-receipt.json"
jq -e '.disposition == "REJECTED" and .synchronized == false' "$out_dir/foc-receipt.json"
jq -e '.stages[] | select(.stage == "POC_FOC_CHECK") | .status == "REJECT"' "$out_dir/foc-receipt.json"

jq '.update_id="ci-boundary-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-boundary" | .boundary_marker="NB" | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/boundary.json"
post_update "$out_dir/boundary.json" "$out_dir/boundary-receipt.json"
jq -e '.disposition == "REJECTED" and .synchronized == false' "$out_dir/boundary-receipt.json"
jq -e '.stages[] | select(.stage == "INVARIANT_AUDIT") | .status == "REJECT"' "$out_dir/boundary-receipt.json"

# Authoritative classes are forbidden at the Hub adapter membrane.
jq '.update_id="ci-authority-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-authority" | .state_class="constitutional_truth" | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/authority.json"
post_update "$out_dir/authority.json" "$out_dir/authority-receipt.json"
jq -e '.disposition == "REJECTED" and .synchronized == false' "$out_dir/authority-receipt.json"
jq -e '.stages[] | select(.stage == "CLASSIFICATION") | .status == "REJECT"' "$out_dir/authority-receipt.json"

# Valid optimistic UPDATE advances the bounded projection.
jq '.update_id="ci-update-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-update" | .value.profile="enhanced" | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/update.json"
post_update "$out_dir/update.json" "$out_dir/update-receipt.json"
jq -e '.disposition == "APPLIED" and .synchronized == true and .state_digest != null' "$out_dir/update-receipt.json"

# Stale optimistic writer is held rather than overwriting version 2.
jq '.update_id="ci-stale-001" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-stale" | .value.profile="lite" | .expected_version=1' \
  "$out_dir/create.json" > "$out_dir/stale.json"
post_update "$out_dir/stale.json" "$out_dir/stale-receipt.json"
jq -e '.disposition == "HELD" and .synchronized == false' "$out_dir/stale-receipt.json"
jq -e '.stages[] | select(.stage == "STATE_UPDATE") | .status == "HOLD"' "$out_dir/stale-receipt.json"

# READ is observation only; exercise the API-prefixed alias too.
jq '.update_id="ci-read-001" | .operation="READ" | .idempotency_key="ci-progressive-key-read" | .protocol="" | .poc_validated=false | .evidence_refs=[] | .expected_version=null' \
  "$out_dir/create.json" > "$out_dir/read.json"
post_update "$out_dir/read.json" "$out_dir/read-receipt.json" "/api/kpgs/progressive-updates"
jq -e '.disposition == "OBSERVED" and .synchronized == false and .state_digest != null' "$out_dir/read-receipt.json"
jq -e '.stages[] | select(.stage == "DISTRIBUTION") | .status == "SKIP"' "$out_dir/read-receipt.json"

# DELETE is proof-gated and must match the current optimistic version.
jq '.update_id="ci-delete-001" | .operation="DELETE" | .idempotency_key="ci-progressive-key-delete" | .expected_version=2' \
  "$out_dir/create.json" > "$out_dir/delete.json"
post_update "$out_dir/delete.json" "$out_dir/delete-receipt.json"
jq -e '.disposition == "APPLIED" and .synchronized == true and .state_digest == null' "$out_dir/delete-receipt.json"

# A later UPDATE cannot recreate a deleted target implicitly.
jq '.update_id="ci-update-after-delete" | .operation="UPDATE" | .idempotency_key="ci-progressive-key-after-delete" | .expected_version=null' \
  "$out_dir/create.json" > "$out_dir/update-after-delete.json"
post_update "$out_dir/update-after-delete.json" "$out_dir/update-after-delete-receipt.json"
jq -e '.disposition == "HELD" and .synchronized == false' "$out_dir/update-after-delete-receipt.json"
jq -e '.stages[] | select(.stage == "STATE_UPDATE") | .status == "HOLD"' "$out_dir/update-after-delete-receipt.json"

curl --fail --silent --show-error "$base_url/api/kpgs/progressive-updates/distribution" > "$out_dir/distribution-final.json"
jq -e '.events | length == 3' "$out_dir/distribution-final.json"
jq -e '[.events[].operation] == ["CREATE","UPDATE","DELETE"]' "$out_dir/distribution-final.json"
jq -e 'all(.events[]; .canonical == false and .authority_effect == "none" and .transport_grants_authority == false)' "$out_dir/distribution-final.json"

curl --fail --silent --show-error "$base_url/api/kpgs/progressive-updates/status" > "$out_dir/status.json"
jq -e '.canonicalContract.commit == "6eeb285d0775a7e74ceadc06e32b4068fcfbc595"' "$out_dir/status.json"
jq -e '.projection.nodes == 0 and .projection.authoritative == false' "$out_dir/status.json"
jq -e '.distribution.events == 3 and .distribution.transportGrantsAuthority == false' "$out_dir/status.json"

jq -n \
  --slurpfile health "$out_dir/health.json" \
  --slurpfile create "$out_dir/create-receipt.json" \
  --slurpfile replay "$out_dir/create-replay.json" \
  --slurpfile yellow "$out_dir/yellow-receipt.json" \
  --slurpfile foc "$out_dir/foc-receipt.json" \
  --slurpfile boundary "$out_dir/boundary-receipt.json" \
  --slurpfile authority "$out_dir/authority-receipt.json" \
  --slurpfile update "$out_dir/update-receipt.json" \
  --slurpfile stale "$out_dir/stale-receipt.json" \
  --slurpfile read "$out_dir/read-receipt.json" \
  --slurpfile delete "$out_dir/delete-receipt.json" \
  --slurpfile distribution "$out_dir/distribution-final.json" \
  '{schema:"kopano.gateway.progressive-update-proof.v1",gate:"ALLOW",canonicalCommit:"6eeb285d0775a7e74ceadc06e32b4068fcfbc595",health:$health[0],receipts:{create:$create[0],replay:$replay[0],yellow:$yellow[0],foc:$foc[0],boundary:$boundary[0],authority:$authority[0],update:$update[0],stale:$stale[0],read:$read[0],delete:$delete[0]},distribution:$distribution[0],truthBoundary:"Proof covers the volatile non-authoritative .NET adapter. Synchronization remains non-canonical and transport cannot grant authority."}' \
  > "$out_dir/progressive-update-proof.json"

echo "PASS: canonical APU -> Progressive Update -> #NB -> bounded CRUD -> SWFUS gateway proof"
