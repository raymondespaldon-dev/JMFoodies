# Architecture Decision Records — JMFoodies

Numbered decisions with context, alternatives, and consequences. One file per decision, never rewritten after acceptance — superseded decisions get a new number that references the old one.

| # | Decision | Status | Date |
|---|---|---|---|
| 0001 | [Atomic booking RPC](0001-atomic-booking-rpc.md) | proposed | — |

## Format

```
# NNNN — Title

Status: proposed | accepted | superseded by NNNN
Date: YYYY-MM-DD
Context: what forced a choice
Decision: what we chose
Alternatives: what we rejected and why
Consequences: what this makes easy, what it makes hard
Revisit if: the signal that would reopen this
```

## Rules

- Every decision that would be expensive to reverse gets a number.
- "We just did what the tutorial said" is not a decision — record the reason.
- An ADR is not a spec. `SLICE_3_SPEC.md` describes the contract; the ADR explains why the contract looks like that.
