# Security Specification - Bazi Studio

## Data Invariants
1. **Profile Integrity**: A `profiles` document ID MUST match the `userId` field, and both MUST match the `request.auth.uid`.
2. **User Metadata Isolation**: Documents in `users` collection MUST have an ID equal to `request.auth.uid`.
3. **Credit Integrity**: Users cannot arbitrarily increase their own `credits`.
4. **Temporal Consistency**: `updatedAt` and `lastFreeUsed` (when set) must be server timestamps.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing (Create)**:
   - Auth: `uid: 'attacker'`
   - Target: `/profiles/victim`
   - Payload: `{ "userId": "victim", "name": "Hack", ... }`
   - **Expected**: PERMISSION_DENIED

2. **Shadow Field Injection**:
   - Auth: `uid: 'user1'`
   - Target: `/profiles/user1`
   - Payload: `{ "userId": "user1", "name": "User", "isVip": true, "hiddenRoot": true }`
   - **Expected**: PERMISSION_DENIED (Strict schema)

3. **Credit Multiplication**:
   - Auth: `uid: 'user1'`
   - Target: `/users/user1`
   - Payload: `{ "credits": 999999 }`
   - **Expected**: PERMISSION_DENIED (Only specific fields or increments allowed if implemented)

4. **Resource Exhaustion (Denial of Wallet)**:
   - Auth: `uid: 'user1'`
   - Target: `/profiles/user1`
   - Payload: `{ "userId": "user1", "name": "A" * 50000 }` (Giant string)
   - **Expected**: PERMISSION_DENIED (Size limits)

5. **Type Poisoning**:
   - Auth: `uid: 'user1'`
   - Target: `/users/user1`
   - Payload: `{ "credits": "fifty" }`
   - **Expected**: PERMISSION_DENIED (Type safety)

6. **ID Poisoning**:
   - Auth: `uid: 'user1'`
   - Target: `/profiles/very-long-id-intended-to-crash-indexes-or-exhaust-resources-12345`
   - **Expected**: PERMISSION_DENIED (ID validation)

7. **Cross-User Leak (Read)**:
   - Auth: `uid: 'attacker'`
   - Action: `get(/profiles/victim)`
   - **Expected**: PERMISSION_DENIED

8. **Blanket Query (List)**:
   - Auth: `uid: 'attacker'`
   - Action: `list(/profiles)` (Query without where clause)
   - **Expected**: PERMISSION_DENIED

9. **Terminal State Bypass**:
   - Auth: `uid: 'user1'`
   - Target: `/profiles/user1`
   - Action: Update `userId` after creation.
   - **Expected**: PERMISSION_DENIED (Immutability)

10. **Timestamp Spoofing**:
    - Auth: `uid: 'user1'`
    - Target: `/users/user1`
    - Payload: `{ "lastFreeUsed": "2000-01-01T00:00:00Z" }` (Client-side past date)
    - **Expected**: PERMISSION_DENIED (Server timestamp required)

11. **Orphaned Writes**:
    - Auth: `uid: 'attacker'`
    - Target: `/users/victim`
    - Payload: `{ "credits": 0 }`
    - **Expected**: PERMISSION_DENIED

12. **Missing Pillars**:
    - Auth: `uid: 'user1'`
    - Target: `/profiles/user1`
    - Payload: `{ "userId": "user1", "name": "Incomplete" }` (Missing `pillars`)
    - **Expected**: PERMISSION_DENIED (Required fields)
