# TechGemini — Customer Onboarding Checklist

Use this to take a new customer organization from signed contract to active counselors and students. Keep recommendations framed as **directional guidance**, not guaranteed outcomes.

## 1. Provision the organization

- [ ] Create the customer organization in TechGemini (via `POST /api/commercial/trial` for trial, or a manual `TRIAL`/`PROFESSIONAL` tenant for a paid account).
- [ ] Set the customer's **plan** (trial 14-day, or paid) so entitlement limits and features match the contract.
- [ ] Create the customer's **Organization Admin** account and share it with the customer's administrator.
- [ ] Verify the org admin can sign in and reach the **Admin dashboard**.

## 2. Admin setup

- [ ] Org admin confirms organization name and branding.
- [ ] Org admin reviews the **Students** and **Counselors** views.
- [ ] Org admin reviews **Billing / plan** (limits and included features match the contract).

## 3. Counselors

- [ ] Request counselor details (name + email) from the customer.
- [ ] Add each counselor under the organization.
- [ ] Verify each counselor can sign in and sees their (empty or populated) student list.
- [ ] Confirm counselor count is within the plan limit.

## 4. Students & data

- [ ] Decide student onboarding approach: (a) org/counselors create student accounts, or (b) students self-register.
- [ ] Create / register the first students.
- [ ] Confirm student profiles capture academics, subjects, interests and study goals.
- [ ] (Optional) Enroll students in a baseline assessment for richer matches.

## 5. First use (soft launch)

- [ ] Run one student through the full journey: profile → recommended careers → study pathways → universities → counselor session.
- [ ] Verify a counselor opens the student **360 view** and sees the recommendations and reasons.
- [ ] Confirm the student and counselor can book a session and add follow-up notes.

## 6. Handover & support

- [ ] Hand over customer-facing guides: `docs/customer/org-admin-guide.md`, `counselor-guide.md`, `student-guide.md`.
- [ ] Confirm the password reset flow works for all roles.
- [ ] Establish a support contact for the customer.

## Go-live gate

- [ ] Org admin can sign in and manage the org.
- [ ] Counselors can sign in and guide students.
- [ ] Students produce recommendations and can reach a counselor.
- [ ] Recommendations use honest, directional language (no guaranteed outcomes).
- [ ] Plan/entitlement matches the contract.