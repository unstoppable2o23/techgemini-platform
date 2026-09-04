# TechGemini — Customer Onboarding Checklist

Use this to take a new customer organization from signed contract to active counselors and students. Keep recommendations framed as **directional guidance**, not guaranteed outcomes.

## 1. Provision the organization

- [ ] Create the customer organization in TechGemini (via `POST /api/commercial/trial` for trial, or a manual `TRIAL`/`PROFESSIONAL` tenant for a paid account).
- [ ] Set the customer's **plan** (trial 14-day, or paid) so entitlement limits and features match the contract.
- [ ] Create the customer's **Organization Admin** account and share it with the customer's administrator.
- [ ] Verify the org admin can sign in and reach the **Admin dashboard**.

## 2. Admin setup

- [ ] Org admin completes the **setup wizard** (organization → counselors → students → configure → launch).
- [ ] Org admin confirms organization name and branding (colors and logo).
- [ ] Org admin reviews the **Students** and **Counselors** views.
- [ ] Org admin reviews **Billing / plan** (limits and included features match the contract).

## 3. Counselors

- [ ] Request counselor details (name + email) from the customer.
- [ ] Add each counselor under the organization.
- [ ] Verify each counselor can sign in and sees their (empty or populated) student list.
- [ ] Confirm counselor count is within the plan limit.

## 4. Students & data

- [ ] Decide student onboarding approach: (a) bulk **CSV import**, (b) org/counselors create each student, or (c) students self-register.
- [ ] Use the **Students → Import CSV** flow to add the first cohort (validates rows and reports errors per row).
- [ ] Confirm student profiles capture academics, subjects, interests and study goals.
- [ ] **Invite** students so they set their own password via the secure invitation link (valid 7 days). No passwords sent by email.
- [ ] Track invitation status on the dashboard (pending / accepted) until the cohort is fully active.

## 5. First use (soft launch)

- [ ] Run one student through the full journey: profile → recommended careers → study pathways → universities → counselor session.
- [ ] Verify a counselor opens the student **360 view** and sees the recommendations and reasons.
- [ ] Confirm the student and counselor can book a session and add follow-up notes.
- [ ] Confirm the org admin can see **pilot metrics** on the Overview tab.

## 6. Handover & support

- [ ] Hand over customer-facing guides: `docs/customer/org-admin-guide.md`, `counselor-guide.md`, `student-guide.md`.
- [ ] Confirm the password reset flow works for all roles.
- [ ] Confirm the org supports the **Help & Support** flow (from the user menu) for questions, problems, and contact requests.

## Go-live gate

- [ ] Org admin can sign in and manage the org.
- [ ] Counselors can sign in and guide students.
- [ ] Students produce recommendations and can reach a counselor.
- [ ] Recommendations use honest, directional language (no guaranteed outcomes).
- [ ] Plan/entitlement matches the contract.