# KPB (Kostprijsberekening) — Cost Component Feature

High-level functional documentation with technical details, in plain English.

---

## 1. What this feature does

This feature lets recruiters create, view, edit, copy, delete and approve
**cost-price calculations** ("Kostprijsberekeningen", KPB) for a candidate.
A KPB calculates what a candidate costs per hour/day/month and what the sales
price/margin is, based on salary and a set of cost components (car, meal
vouchers, eco-cheques, insurance, etc.).

The actual calculation engine lives in an **external system called IFOrce**
(reached through a gateway called **SPOT**). Salesforce is the front-end:
it shows the data, lets the user edit it, and sends it back to IFOrce.

There are three building blocks:

| Layer | Component | Role |
|-------|-----------|------|
| Flow  | `RGF_Screen_Flow_Cost_Component` | Orchestrates the screens: shows the list of existing KPBs, routes the user to the right screen |
| LWC   | `kpbGenericButton` | The Nieuw/Kopiëren/Bewerken/Verwijderen buttons under each list |
| LWC   | `kpbPage` | The actual KPB form (all fields + cost components) |
| LWC   | `kpbPageModal` | A wrapper that opens `kpbPage` inside a popup (modal) |
| Apex  | `KpbController` | Talks to the IFOrce/SPOT REST API and to Salesforce records |

---

## 2. How a user reaches the screen (the Flow)

The flow `RGF_Screen_Flow_Cost_Component` can be started in **three ways**, and
it figures out which one happened using input variables.

### Input variables
- `recordId` — the Salesforce record the user started from (a Contact, a Job, or an Application)
- `startByConsultant` (true/false) — started from the consultant's own "to approve" list
- `startedByLink` (true/false) — opened by clicking a link (e.g. the "Open KPB" link on an Application)
- `kpbId` — the IFOrce id of a specific KPB (used by the link path)
- `applicationId` — the Application record id (used by the link path)

### The routing logic (decisions)

1. **`Started_By`** — Is this the consultant's own list (`startByConsultant = true`)?
   - **Yes** → look up the `User`, then call **`Get_Costs_With_Id`** (only KPBs with status `GT` = "to approve") and show the **Consultant** screen.
   - **No** → go to **`Incoming_from_job`**.

2. **`Incoming_from_job`** — Look at the first 3 characters of `recordId`
   (the Salesforce "key prefix" that tells you the object type):
   - prefix **`003`** = Contact → use it directly as the candidate.
   - any other prefix (e.g. a Job/Application) → **`Get_Applicant_Id`** finds the
     linked Applicant, and we use the Contact behind it.

3. After we know the Contact, **`Contact`** lookup loads the candidate, then
   **`Check_Iforce_info`** checks the candidate actually has the IFOrce data we need
   (`iforceEmployeeId` and `payroll` are not blank):
   - **Valid** → call **`Get_Costs`** to fetch all the candidate's KPBs from IFOrce.
   - **Invalid** → show `iforceInfoIncompleteScreen` (only a "Nieuw" button, because
     there's nothing to list yet).

4. **`Check_Opened_By_Link`** — if `startedByLink = true`, skip the list entirely
   and open the KPB form straight away on the **`KPB_Page_By_Link`** screen.

### Turning the IFOrce response into tables

IFOrce returns one big list of cost groups. The flow loops over them
(**`Create_Cost_Collections`** loop) and, for each one:

1. **`Status_Mapping`** converts the short status code into Dutch text
   (`BL`→Blanco, `T`→Te valideren, `V`→Gevalideerd, `GG`→Goedgekeurd,
   `VE`→Verwerkt, `GT`→Goed te keuren, `R`→Afgekeurd).
2. **`Check_Cost_Type`** sorts each KPB into one of four buckets by its
   `simulation_type`, and **`Check_Archived`** drops archived (`A`) candidate rows:
   - `EMP` → Kandidaat list
   - `WRK` → Voorstelling list
   - `OVK` → Overeenkomst list
   - `PRJ` → Project list

Each bucket becomes its own datatable on the **Costs Screen** (`tableEMP`,
`tableWRK`, `tableOVK`, `tablePRJ`). Every table shows the same columns:
Id, Omschrijving, Status, Total cost/hour, Margin, Sales price/hour,
Sales price/day, Simulation type. Column headers use Custom Labels
(`{!$Label.RGF_KPB_*}`) so they can be translated.

### Selecting a row

The user can select **one** row across all four tables. Formula fields
(`selectedCountCandidate`, `selectedIdFromTables`) count the selection and grab
the selected IFOrce id. The buttons component reads these so it knows which KPB
to copy/edit/delete.

---

## 3. The buttons (`kpbGenericButton`)

This component renders Nieuw / Kopiëren / Bewerken / Verwijderen and decides
what to open. It receives from the flow: the selected `recordId`, `brand`,
`candidateName`, `pNumber`, `genericEmployeeId/Number`, `contactId`,
`freelance`, `office`, and the `selectionCount`.

- **Validation** — Copy/Edit/Delete only work when exactly **one** row is selected;
  otherwise a warning toast appears.
- **New / Copy / Edit** — calls `KpbPageModal.open({...})`, which opens `kpbPage`
  inside a popup and passes all the props through. If the modal returns
  `{ saved: true }`, the button fires `FlowNavigationNextEvent` so the flow
  re-runs the list query and the table refreshes.
- **Delete** — first fetches the KPB (`getKpb`); if its type is `PRJ` or `OVK`
  it refuses to delete (those are protected). Otherwise it calls `deleteKpb`,
  shows a success/error toast, and fires `FlowNavigationNextEvent` to refresh.

---

## 4. The KPB form (`kpbPage`)

This is the heart of the feature — a large LWC (~1300 lines) that renders the
full form: identification, follow-up/status, salary & calculation fields, and
two cost-component tables (Mobiliteit and Variabel).

### How it loads (`connectedCallback`)
- **action = NEW** → start an empty form. If a `genericEmployeeId` is present and
  it's not a freelancer, it tries to **prefill from an existing OVK** (the
  candidate's contract) via `_fetchOvk`, and ensures the candidate has an IFOrce
  PJS number (`_ensurePjsNumber`, creating one asynchronously if needed).
- **action = EDIT / COPY** → fetch the existing KPB by id (`_fetchKpb`) and fill
  the form (`_populate`).

### Brand- and type-based defaults
When the user picks a **calculation type**, the form pre-fills sensible defaults:
- **BPL (Bright Plus)** — `_applyBplDefaults` (Junior/Medior/Senior): FTE, hours,
  mobility and visible variable components.
- **UNQ (Unique)** — `_applyUnqDefaults` (Ad hoc, Advanced, Expert, …): tankkaart,
  lease category row, and visible variable components.

Important rule: the **grey (calculated) components** — ecocheques, forfaitaire
onkostenvergoeding, and the BPL insurance/SD-Worx rows — are **not** shown at
first. They only appear **after** a successful Berekenen/Bewaren, because IFOrce
computes them. (When IFOrce returns 0 for the UNQ "forfaitaire" value, the form
substitutes the known per-type default.)

### The main actions
- **Berekenen (Calculate)** — validates the numbers, builds the payload
  (`_buildPayload` + `_buildComponents`), sends it to IFOrce (`createKpb` or
  `updateKpb`), and shows the recalculated result + any quality-check warnings.
  The form stays open.
- **Bewaren (Save)** — same as Calculate, but on success it also closes the form
  and (for a voorstelling) writes the result back to the Salesforce Application.
- **Goedkeuren (Approve)** — first saves (so IFOrce has the latest numbers); if
  there are no blocking quality checks it shows a reason box; submitting it calls
  `requestApproval` with just the reason. **No cost data is sent on approval** —
  it was already saved in the calculate/save step.
- **Sluiten (Close)** / **Reset** — close the form / clear it back to defaults.

### Read-only rule
A KPB becomes **read-only** when its `simulationType` is `PRJ` or `OVK`, **or**
its status is `GT` (goed te keuren) or `GG` (goedgekeurd). When prefilling a new
KPB from an OVK, the inherited status is cleared so the new KPB stays editable.

### Writing back to the Salesforce Application
For a "potential voorstelling" with an `applicationId`, after a successful
Berekenen or Bewaren (and on Sluiten) the form calls `linkKpbToApplication`,
which stores on the Application:
- `RGF_KPB_Id__c` ← the IFOrce KPB id
- `RGF_KPB_Cost__c` ← **sales price per hour** (`sales_price_per_hour`)
- `RGF_KPB_Margin__c` ← the margin

It then calls `getRecordNotifyChange` so any Bullhorn/list component on the
record page refreshes automatically.

### Closing in different contexts (the navigation trick)
`kpbPage` can run in three places, each needing a different "close" signal:
- Inside the **modal** → fires a `close` custom event the modal listens for.
- As the **last screen of a flow** (Bullhorn embed) → fires `FlowNavigationFinishEvent`.
- As a flow screen **followed by another element** (e.g. a redirect) → must fire
  `FlowNavigationNextEvent` instead, otherwise Salesforce throws a "FINISH not
  supported" error.

To handle the last two safely, `kpbPage` has an opt-in `navigationMode` property:
set it to `NEXT` only on the screen that has a following element; everywhere else
it defaults to FINISH. This keeps every context working without side effects.

---

## 5. The popup wrapper (`kpbPageModal`)

A thin `LightningModal` subclass. Its only job is to receive all the props from
the button, pass them straight into `kpbPage`, and close itself (returning the
`{ saved }` result) when `kpbPage` fires its `close` event. The modal also acts
as an "event barrier", which is why `kpbPage` can safely fire a
`FlowNavigationFinishEvent` inside the modal without disturbing the outer flow.

---

## 6. The server side (`KpbController` Apex)

All calls to IFOrce go through one private helper, `callSpotInternal`, which:
- Gets an OAuth token (cached in **Platform Cache** so we don't re-auth every call).
- Adds the standard headers (auth, correlation ids, language, and the recruiter's
  P-number as `x-operator-id`).
- Sends the request to the named credential `RGF_SPOT_BaseURL` and returns a
  small result object `{ success, httpCode, result, headerLocation }`.

Public methods exposed to the LWCs:

| Method | What it does |
|--------|--------------|
| `getKpb` | GET one KPB by id |
| `createKpb` | POST a new KPB |
| `updateKpb` | PUT (update) an existing KPB |
| `deleteKpb` | DELETE a KPB |
| `listCandidateCosts` | GET the candidate's OVK cost groups (used for prefill) |
| `requestApproval` | POST the approval request (`{ reason }` only) |
| `triggerPjsCreation` | Fire-and-forget: ask IFOrce to create a PJS number for a candidate (async `@future` callout, sends `managing_office`) |
| `getContactPjsNumber` | Read the candidate's PJS number from the Contact |
| `getContactsByBrand` | List contacts for a brand (form dropdown) |
| `getConsultantName` | Current user's name |
| `linkKpbToApplication` | Write KPB id + cost + margin onto the Application |
| `unlinkKpbFromApplication` | Clear the KPB id from the Application |

---

## 7. Important business rules & gotchas

- **Office on the KPB comes from `unit_id`**, which is currently hardcoded
  (UNQ → 14023, BPL → 3855). This is why a KPB can show a different office than
  the recruiter's/vacancy's office in IFOrce. The dynamic `managing_office` is
  only sent when creating the PJS number, not on the KPB itself.
- **Approval sends no cost data** — only the reason. The numbers must already be
  saved beforehand.
- **PRJ and OVK KPBs cannot be deleted** and are read-only.
- **Grey/calculated components are deferred** until after a successful calculation.
- **`RGF_KPB_Cost__c` holds the sales price per hour**, not the internal cost price.

---

## 8. Glossary

| Code | Meaning |
|------|---------|
| KPB  | Kostprijsberekening (cost-price calculation) |
| EMP  | Kandidaat (candidate) |
| WRK  | Voorstelling (proposal) |
| OVK  | Overeenkomst (agreement/contract) |
| PRJ  | Project |
| BL / T / V / GG / VE / GT / R | Blanco / Te valideren / Gevalideerd / Goedgekeurd / Verwerkt / Goed te keuren / Afgekeurd |
| UNQ / BPL | Unique / Bright Plus (the two brands) |
| PJS  | The IFOrce employee number/id for the candidate |
| SPOT | The API gateway in front of IFOrce |
