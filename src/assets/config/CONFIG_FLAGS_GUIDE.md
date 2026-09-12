# Configuration Flags Guide

Quick guide for settings in config.json, config.local.json, and config.prod.json.

---

## Summary Table

| Flag Name | What it Controls | When Set to 0 | When Set to 1 |
| :--- | :--- | :--- | :--- |
| **cco_task_set_access** | Can CCO create and assign Task Sets? | **FULL ACCESS** - CCO can access Task Set Master, create sets and assign tasks. | **BLOCKED / HIDDEN** - Task Set Master is hidden for CCO (CO/Admin only). |
| **direct_subdept_assignment** | How does Sub-Department submit compliance? | **HEAD APPROVAL REQUIRED** - Sub-Dept submits to Head Dept -> Head Dept must review and Accept/Reject -> Head Dept submits to CO. | **DIRECT TO CO/CCO** - Sub-Dept submits directly to CO Review Queue. Head Dept has view-only access (no Accept/Reject needed). |

---

## 1. cco_task_set_access

**Purpose**: Controls whether the Chief Compliance Officer (CCO) can create Task Sets.

- **0 (Full Access)**:
  - CCO sees **Task Set Master** in sidebar menu.
  - CCO can create new Task Sets, upload bulk task files, and assign branches.
- **1 (Blocked / Hidden)**:
  - **Task Set Master** is hidden for CCO.
  - Direct URL access to /task-sets is blocked for CCO.

---

## 2. direct_subdept_assignment

**Purpose**: Controls the workflow after a Head Department delegates tasks to Sub-Departments.

### Mode 1 (Direct to CO & CCO):
```
[CO Assigns Task Set]
         ↓
[Head Dept assigns tasks to Sub-Dept]
         ↓
[Sub-Dept completes remarks & PDF evidence]
         ↓
[Submits DIRECTLY to CO & CCO Review Queue]
```
*(Head Department has view-only access - no Accept/Reject buttons needed).*

### Mode 0 (Head Approval Required):
```
[CO Assigns Task Set]
         ↓
[Head Dept assigns tasks to Sub-Dept]
         ↓
[Sub-Dept submits compliance to Head Dept]
         ↓
[Head Dept reviews and clicks Accept / Reject]
         ↓
[Head Dept clicks "Submit Compliance" to CO & CCO]
```

---

## Example config.json

```json
{
  "apiUrl": "http://192.168.31.180:3580",
  "bank_name": "KREDPOOL SOLUTIONS PVT LTD.",
  
  "cco_task_set_access": 0,
  "direct_subdept_assignment": 1
}
```
