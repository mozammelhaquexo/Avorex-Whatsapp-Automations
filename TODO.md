# TODO - Enhanced Login, Plan Detection & License Key Verification Flow

## Step 1: Backend enforcement of decision tree
- [ ] Update `src/app/api/license/validate/route.ts` to fully validate:
  - account existence + assigned package/plan
  - generated license existence
  - license active/expired/suspended/revoked
  - license key ownership and package match
  - device limit and device authorization (if schema supports)
  - NEVER return full stored license key to frontend (only masked / metadata)
- [ ] Update `src/app/api/activate/route.ts` to strictly verify:
  - key exists and is not disabled/suspended/revoked
  - key belongs to logged-in account/email (ownership)
  - key matches assigned package/plan
  - enforce expiry/suspension/revocation
  - enforce device limit/device authorization if available
  - return only success metadata (no full key)

## Step 2: Frontend routing/screens driven by backend
- [ ] Update `src/app/(dashboard)/dashboard-shell.tsx` to consume backend decision tree result and:
  - show expired renewal page when expired
  - show enter-license-key popup for active paid users
  - show activate-your-license/packages page only when no plan
  - deny access on wrong key / suspended / revoked
- [ ] Locate and update login flow components under `src/app/(auth)` to remove any frontend-only plan/license decisions:
  - ensure “Enter Your License Key” popup is shown based on backend response
  - ensure “Activate Your License” is shown only for “no plan/no license”

## Step 3: Logout / re-login correctness
- [ ] Verify logout only clears session tokens and cached permissions; does NOT delete backend plan/license relationships.
- [ ] Ensure re-login after logout still forces license entry (default “Always Require License Key After Login”).

## Step 4: Security fixes
- [ ] Ensure no endpoint returns full `license_key` to the browser.
- [ ] If any UI currently shows full key on login/profile, mask/remove it per policy.

## Step 5: Testing
- [ ] Run lint/tests/build:
  - `npm test` / `npm run lint` / `npm run build`
- [ ] Add/adjust automated tests for validate/activate routes if test framework exists.
