# Firestore Security Specification — PDF GENIUS

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: A `/users/{userId}` document can only be read, created, or updated by the authenticated, email-verified user whose `request.auth.uid == userId`. Listing `/users` is strictly denied.
2. **Parent-Gated Subcollection**: A `/users/{userId}/activities/{activityId}` document cannot be created unless the parent `/users/{userId}` profile exists and its `uid` matches `request.auth.uid`.
3. **Identity & Temporal Integrity**: `uid` / `userId` and `createdAt` are immutable after creation. Every `create` requires `createdAt == request.time && updatedAt == request.time`; every `update` requires `updatedAt == request.time`.
4. **Strict Payload Keys & Bounds**: No extra shadow keys allowed (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` on update). All strings, integers, and lists have explicit type and boundary limits.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Fail)
1. Unauthenticated read or write to `/users/u1` or `/users/u1/activities/a1`.
2. Unverified email user (`email_verified == false`) attempting to write a profile or activity.
3. Cross-user read (`get` or `list`) of `/users/u2/activities` by `u1`.
4. Cross-user write (`create` or `update`) under `/users/u1/activities/a1` with `userId: "u2"`.
5. Shadow field injection on profile create (e.g., adding `isAdmin: true` or `role: "admin"`).
6. Shadow field injection on activity create (e.g., adding `verifiedBypass: true`).
7. ID poisoning: creating `/users/u1/activities/bad$id..123` or 200-char ID.
8. Client-forged `createdAt` or `updatedAt` timestamp (not equal to `request.time`).
9. Mutating immutable `createdAt` or `userId` on activity update.
10. Unbounded array poisoning: `keyPoints` with 50 items or `chatHistory` with 100 items.
11. Value poisoning on `update`: setting `lastQuizScore` to `"100"` (string) or `99` (> 5).
12. Creating an activity when parent `/users/{userId}` does not exist.
