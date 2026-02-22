# Spec Consolidation and Code Cleanup Analysis

## 1. Why Two Sets of Spec Documentation?

### Current Structure:
- **`.kiro/specs/lifestream-flo/`** - Original comprehensive product spec
  - `requirements.md` - Full product requirements (Flo family calendar system)
  - `design.md` - System design and architecture
  - `tasks.md` - Implementation tasks for the full product

- **`.kiro/specs/bedrock-agent-migration/`** - Migration-specific spec
  - `requirements.md` - AWS Bedrock Agent migration requirements
  - `design.md` - Bedrock Agent architecture and design
  - `tasks.md` - Migration implementation tasks (20 tasks completed)

### Analysis:
The two specs represent **different phases of the same project**:
1. **lifestream-flo** = Original product specification (comprehensive)
2. **bedrock-agent-migration** = Migration to AWS Bedrock Agents (implementation-focused)

The bedrock-agent-migration spec is a **subset** focused on replacing the custom agent orchestration with AWS Bedrock Agents. It doesn't replace the original spec; it's a focused implementation guide for one component.

### Recommendation:
**CONSOLIDATE** - Merge into a single spec structure:
- Keep `lifestream-flo` as the primary spec
- Archive or remove `bedrock-agent-migration` 
- Create a unified `tasks.md` that reflects current implementation status

---

## 2. Non-Bedrock Agent References in Code

### Files to Remove (Custom Agent Implementations):
These are being replaced by AWS Bedrock Agents:

```
packages/backend/src/agents/
├── agent-orchestrator.ts (custom orchestration - replace with Bedrock)
├── agent-registry.ts (custom registry - replace with Bedrock)
├── calendar-query-agent.ts (custom - use Bedrock)
├── category-predictor.ts (custom - use Bedrock)
├── context-analyzer.ts (custom - use Bedrock)
├── event-classifier-agent.ts (custom - use Bedrock)
├── event-parser-agent.ts (custom - use Bedrock)
├── feedback-learner.ts (custom - use Bedrock)
├── google-calendar-query-agent.ts (custom - use Bedrock)
├── outlook-calendar-query-agent.ts (custom - use Bedrock)
├── school-app-query-agent.ts (custom - use Bedrock)
├── school-newsletter-parser-agent.ts (custom - use Bedrock)
├── weather-agent.ts (custom - use Bedrock)
├── weather-event-associator.ts (custom - use Bedrock)
├── weather-reminder-generator.ts (custom - use Bedrock)
└── weather-scheduler.ts (custom - use Bedrock)
```

### Files to Keep (Supporting Infrastructure):
```
packages/backend/src/agents/
├── agent-health-monitor.ts (monitoring - keep)
├── data-normalizer.ts (data processing - keep)
├── result-aggregator.ts (result processing - keep)
├── task-queue.ts (queue management - keep)
├── types.ts (type definitions - keep)
├── weather-api-service.ts (external API - keep)
└── index.ts (exports - update)
```

### Backward Compatibility References to Remove:
- `legacy-adapter.ts` - No longer needed (dev phase, no legacy API)
- `bedrock-agent/legacy-adapter.ts` - Remove
- All backward compatibility tests
- Migration comparison utilities

---

## 3. Consolidation Plan

### Step 1: Merge Specs
- Keep `.kiro/specs/lifestream-flo/` as primary
- Delete `.kiro/specs/bedrock-agent-migration/`
- Update `lifestream-flo/tasks.md` with consolidated task list

### Step 2: Clean Up Code
- Delete custom agent implementations (16 files)
- Delete backward compatibility layer
- Update imports and exports
- Keep Bedrock agent implementations

### Step 3: Create Final Task Document
- Consolidate all tasks from both specs
- Mark completed tasks based on current implementation
- Remove migration-specific tasks
- Focus on product delivery tasks

---

## 4. Files to Delete

### Spec Files:
- `.kiro/specs/bedrock-agent-migration/` (entire directory)

### Code Files (Custom Agents):
- `packages/backend/src/agents/agent-orchestrator.ts`
- `packages/backend/src/agents/agent-registry.ts`
- `packages/backend/src/agents/calendar-query-agent.ts`
- `packages/backend/src/agents/category-predictor.ts`
- `packages/backend/src/agents/context-analyzer.ts`
- `packages/backend/src/agents/event-classifier-agent.ts`
- `packages/backend/src/agents/event-parser-agent.ts`
- `packages/backend/src/agents/feedback-learner.ts`
- `packages/backend/src/agents/google-calendar-query-agent.ts`
- `packages/backend/src/agents/outlook-calendar-query-agent.ts`
- `packages/backend/src/agents/school-app-query-agent.ts`
- `packages/backend/src/agents/school-newsletter-parser-agent.ts`
- `packages/backend/src/agents/weather-agent.ts`
- `packages/backend/src/agents/weather-event-associator.ts`
- `packages/backend/src/agents/weather-reminder-generator.ts`
- `packages/backend/src/agents/weather-scheduler.ts`

### Backward Compatibility Files:
- `packages/backend/src/bedrock-agent/legacy-adapter.ts`
- `packages/backend/src/bedrock-agent/__tests__/legacy-adapter.test.ts`

### Test Files (Legacy/Migration):
- `packages/backend/src/__tests__/agent-orchestration.test.ts`
- `packages/backend/src/__tests__/event-classifier.test.ts` (if migration-specific)

---

## 5. Files to Update

### Update Imports:
- `packages/backend/src/agents/index.ts` - Remove custom agent exports
- `packages/backend/src/bedrock-agent/index.ts` - Remove legacy adapter exports
- Any files importing from deleted agents

### Update Configuration:
- Remove backward compatibility configuration
- Update environment variables
- Remove migration-specific settings

---

## Summary

**Action Items:**
1. ✅ Delete 16 custom agent implementation files
2. ✅ Delete 2 backward compatibility files
3. ✅ Delete bedrock-agent-migration spec directory
4. ✅ Consolidate tasks into single lifestream-flo/tasks.md
5. ✅ Update imports and exports
6. ✅ Create final unified task document with status

**Result:**
- Single, unified spec for the Flo product
- Clean codebase with only Bedrock Agent implementations
- Clear task list with completion status
- No legacy/migration code
