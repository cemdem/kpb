# KPB Module – Technische Documentatie

## Overzicht
De KPB-module (Kostprijsberekening) is een Salesforce Lightning Web Component-gebaseerde oplossing voor het beheren van kostprijsberekeningen. De module werkt samen met een Screen Flow en de SPOT API.

---

## LWC-componenten

### `kpbPage`
Het hoofdformulier voor het aanmaken, bewerken en kopiëren van kostprijsberekeningen. Gemodal ingebouwd via `kpbPageModal`.

**Input-eigenschappen:**
- `recordId` (String) – ID van de KPB in SPOT (enkel bij EDIT/COPY)
- `action` (String) – Actie: `NEW`, `EDIT` of `COPY`
- `json` (String) – Optioneel legacy JSON-invoer (bevat volledige KPB-gegevens) als `recordId` niet beschikbaar
- `brand` (String) – Merktag van de gebruiker (bijv. UNQ, BPL) bepaalt berekeningstype-opties
- `candidateName` (String) – Naam van de kandidaat (read-only veld, doorgegeven vanuit flow)

**Acties:**

**`NEW` – Nieuwe KPB aanmaken**
- Toont leeg formulier
- Veld "Kandidaat" bevat doorgegeven `candidateName`, niet editable
- Gebruiker vult in: beschrijving, berekeningstype, salaris/verkoopprijs, mobiliteit, variabelen
- Bij opslaan: POST naar SPOT API met payload
- Defaultwaarden per brand (BPL heeft specifieke defaults: FL/Junior/Medior/Senior)

**`EDIT` – Bestaande KPB wijzigen**
- Haalt KPB-gegevens via GET API op basis van `recordId`
- Vult alle velden in met huidige waarden
- Kandidaat read-only
- Bij opslaan: PUT naar SPOT API met bijgewerkte payload

**`COPY` – KPB dupliceren**
- Haalt huidige KPB-gegevens op (identiek aan EDIT)
- Wist het ID-veld (zodat SPOT een nieuwe record aanmaakt)
- Bij opslaan: POST naar SPOT API (niet PUT)

**Formulier-secties:**
1. **Identificatie:** Nummer (read-only, uit SPOT), Omschrijving, Kandidaat (read-only), Aanvraag, Berekeningstype, Type (read-only)
2. **Opvolging:** Opgemaakt (datum), Te rekenen vanaf (datum), Processingstatus, KPB-status, Consultant, Voltijds-equivalent
3. **Salaris/Vergoeding:** Bruto salaris/maand, Gym, Ecocheques, Gemiddelde uren/week, Gemiddelde dagen/week
4. **Verkoopprijs:** Verkoopprijs/uur, Verkoopprijs/dag, Marge (%), Berekenings-methode (Verkoopprijs/Marge)
5. **Mobiliteit:** Lease-categorie, Tankkaart-budget, Bedrijfswagen netto-inhouding, Mobiliteitsprogramma
6. **Variabelen:** Maaltijdcheques, GSM, Reiskosten, Andere kosten, Bonussen, Opleiding, enzovoort

**Payload bij opslaan:**
- Alle invulvelden
- Mobility-rijen (als component-array: component_id, unit_id, value, unit)
- Variable-rijen (als component-array: component_id, unit_id, value, unit)
- Payroll_id en unit_id afhankelijk van brand (UNQ: 6/19, BPL: 14001/14023)

**Foutafhandeling:**
- Bij API-fout (POST/PUT): parse JSON response, extract error_message strings, display in toast
- Bij validatie-fout: toast met foutmelding
- Na succes: groene toast "Kostprijsberekening opgeslagen", modale sluit, flow vervrist

---

### `kpbGenericButton`
Knoppen-component op het schermflow-scherm (Costs_Screen en Costs_Screen_Consultant). Toont vier knoppen: **Nieuw**, **Kopieer**, **Bewerk**, **Verwijderen** (altijd zichtbaar, onafhankelijk van selectie).

**Input-eigenschappen:**
- `recordId` (String) – ID van de geselecteerde KPB rij (uit datatable-formula `selectedIdFromTables`)
- `selectionCount` (Integer) – Aantal geselecteerde rijen (gebruikt voor validatie)
- `brand` (String) – Brand van de gebruiker (bijv. UNQ, BPL)
- `candidateName` (String) – Naam van de kandidaat (uit flow, doorgegeven aan `kpbPage`)

**Knopgedrag:**

**Nieuw**
- Opent `kpbPageModal` met `action='NEW'`
- Stuurt geen `recordId` (nieuwe KPB)
- Stuurt `candidateName` zodat kandidaat-veld voorgevuld is
- Modal sluit na succes, flow navigeert terug voor refresh

**Kopieer**
- Validatie: controleert of `recordId` aanwezig en `selectionCount > 0`
- Opent `kpbPageModal` met `action='COPY'` en `recordId`
- `kpbPage` haalt KPB op via GET, wist het ID-veld, slaat op als POST (nieuw)
- Na succes: flow navigeert terug voor refresh

**Bewerk**
- Validatie: identiek aan Kopieer
- Opent `kpbPageModal` met `action='EDIT'` en `recordId`
- `kpbPage` haalt KPB op, wijzigt velden, slaat op als PUT
- Na succes: flow navigeert terug voor refresh

**Verwijderen**
- Validatie: identiek aan Kopieer
- Roept Apex `deleteKpb(recordId)` aan
- **Dialoog eerst:** "Weet u zeker?" (yes/no)
- **Bij succes:** 
  - Toont groene toast: "Kostprijsberekening verwijderd"
  - Dispatcht `FlowNavigationNextEvent` om flow terug naar begin te sturen (refresh)
- **Bij fout:** 
  - Toont rode toast: "Kostprijsberekening verwijderen niet toegelaten" (of andere API-fout)
  - Flow blijft op hetzelfde scherm

**Integratie met flow:**
- Alle knoppen (behalve Verwijderen) openen `kpbPageModal` modal
- Modal bevat volledige `kpbPage` form
- Bij succesvolle save: modal sluit, `FlowNavigationNextEvent` stelt flow in staat terug te navigeren
- Flow loopt dan opnieuw van begin (Contact ophalen → API → Datatables opnieuw laden)

---

## Screen Flow: `RGF - Screen Flow - Cost Component`

**Doel:** Beheren van KPB's op de Contact-recordpagina. Twee entry-punten: rechtstreeks als kandidaat of via een consultant.

### Invoer-variabelen
- `recordId` (String) – Salesforce Contact-ID
- `startByConsultant` (Boolean, standaard: false) – Bepaalt welk pad gevolgd wordt

### Werkstroom – Kandidaatpad (startByConsultant = false)

1. **Contact ophalen**
   - Haalt Contact-record op via `recordId`

2. **IForce-validatie**
   - Controleert of twee velden ingevuld zijn:
     - `RGF_IForce_Number_PJS__c` of `RGF_IForce_Number_PJS_Temp__c` (IForce-medewerker-ID)
     - `Berekende sub-brand` (formule die numerieke sub-brand bepaalt)
   - **Indien incompleet:** springt naar `iforceInfoIncompleteScreen` (alleen Nieuw-knop)

3. **API-call: GetCostsForCandidate**
   - Parameters: `payroll_id` (sub-brand), `employee_id` (IForce-ID), `show_old=Y` (inclusief oude KPB's)
   - Retourneert array van kostgroepen met velden: `id`, `payroll_id`, `employee_id`, `status`, `type`, enzovoort

4. **Resultaten verwerken**
   - **Lus door kostgroepen:** Voor elke kostgroep:
     - Lees `status`-veld (codes: T, V, GG, GT, R, BL, VE)
     - Zet om naar Nederlands label:
       - `T` → Te valideren
       - `V` → Vanuit leverancier
       - `GG` → Goedgekeurd
       - `GT` → Goed te keuren
       - `R` → Afgewezen
       - `BL` → In behandeling
       - `VE` → Verlopen
     - Lees `type`-veld (codes: EMP, OVK, WRK, PRJ)

5. **Datasplitsing – vier datatables**
   - **Werknemer** (`type = EMP`): kostgroepen werknemerskosten
   - **Overeenkomst** (`type = OVK`): kostgroepen overeenkomststype
   - **Voorstelling** (`type = WRK`): kostgroepen voorstelingen/projectwerk
   - **Project** (`type = PRJ`): kostgroepen projecten
   - Elke tabel gesorteerd en gefilterd op type

6. **Scherm tonen: `Costs_Screen`**
   - Vier datatables met kolommen: ID, Kandidatnaam, Payroll-ID, Status (Nederlands), Type
   - Gebruiker selecteert rij en klikt op knop (Nieuw/Kopieer/Bewerk/Verwijderen)
   - `kpbGenericButton` ontvangt: geselecteerde rij-ID, aantal selecties, brand, kandidaatnaam

### Werkstroom – Consultantpad (startByConsultant = true)

1. **User ophalen**
   - Haalt ingelogde User-record op

2. **API-call: GetCostWithId**
   - Parameters: `payroll_id=6` (vaste waarde), `created_by=[User-ID]`, `status=GT` (alleen goed te keuren)
   - Retourneert array met kostgroepen aangemaakt door deze consultant

3. **Resultaten verwerken**
   - **Lus door kostgroepen:** voor elke kostgroep:
     - Status is altijd `GT` (geen conversie nodig)
     - Lees `type`-veld (EMP/OVK/WRK/PRJ)

4. **Datasplitsing – vier datatables** (identiek aan kandidaatpad)
   - Gerund op type

5. **Scherm tonen: `Costs_Screen_Consultant`**
   - Vier datatables (identieke structuur)
   - `kpbGenericButton` ontvangt: geselecteerde rij-ID, aantal selecties, brand, kandidaatnaam

### Naverwerking – Beide paden

1. **Knopactie opvangen**
   - `kpbGenericButton` dispatcht event bij Nieuw/Kopieer/Bewerk/Verwijderen
   - Flow detecteert welke actie

2. **Na succesvolle actie**
   - Flow navigeert **terug naar stap 1 van het huidige pad** (Contact/User ophalen)
   - Dit triggert volledig refresh: API opnieuw aanroepen, datatables opnieuw opbouwen
   - Stelt gebruiker in staat meerdere acties achter elkaar uit te voeren

3. **Foutafhandeling**
   - Bij API-fout: FlowError opgelost in Toast (via `kpbGenericButton` of `kpbPage`)
   - Logging via Nebula FlowLogEntry:
     - Start van flow
     - Einde van flow
     - Fouten (bijv. ontbrekende IForce-info, API-failure)

### Speciale schermen

- **`iforceInfoIncompleteScreen`:** Toont foutmelding en enkel Nieuw-knop wanneer IForce-gegevens onvolledig zijn
- **`Costs_Screen`:** Kandidaatpad-scherm met vier datatables
- **`Costs_Screen_Consultant`:** Consultantpad-scherm met vier datatables (identieke layout)

### Datatabellen – Kolommen

Alle vier datatables hebben:
- KPB-ID (geselecteerd via `recordId` input van tabel naar `kpbGenericButton`)
- Kandidaatnaam / Consultant-naam
- Payroll-ID
- Status (Nederlandse label)
- Type (EMP/OVK/WRK/PRJ)

### Variabelen in flow

**Collections:**
- `costsEMP`, `costsOVK`, `costsWRK`, `costsPRJ` – Arrays van kostgroepen per type

**Scalars:**
- `selectedIdFromTables` – ID van rij geselecteerd in datatable (doorgegeven aan `kpbGenericButton`)
- `selectedCountCandidate` / `selectedCountConsultant` – Aantal geselecteerde rijen (validatie)
- `iforceEmployeeId` – IForce-medewerker-ID (uit Contact)
- `subbrandFormula` – Numerieke sub-brand (uit Contact)
- `consultantName` – Naam van de User (consultantpad)

### Logging

Via Nebula Logger (`FlowLogEntry`):
- Start van flow (recordId, pad)
- Einde van flow
- Fouten met stacktrace

---

## API-integratie

Alle communicatie met SPOT gaat via `KpbController.cls` (Apex). De controller maakt directe HttpRequest-calls (niet via OutboundCallFlow).

### `KpbController` – Apex-klasse

**Methodes:**

**`getKpb(recordId: String): Map<String, Object>`**
- GET request naar SPOT
- Endpoint: `/costgroups/{recordId}`
- Return: `{ success: true, result: "{...JSON...}" }` of `{ success: false, result: "error message", httpCode: 400 }`

**`createKpb(body: String): Map<String, Object>`**
- POST request naar SPOT
- Endpoint: `/costgroups`
- Body: JSON-string met KPB-velden (payroll_id, unit_id, description, employee_id, enzovoort)
- Return: `{ success: true, result: "{...JSON van nieuwe KPB...}" }` of `{ success: false, ... }`

**`updateKpb(kpbId: String, body: String): Map<String, Object>`**
- PUT request naar SPOT
- Endpoint: `/costgroups/{kpbId}`
- Body: JSON-string met gewijzigde velden
- Return: `{ success: true, result: "{...updated JSON...}" }` of `{ success: false, ... }`

**`deleteKpb(kpbId: String): Map<String, Object>`**
- DELETE request naar SPOT
- Endpoint: `/costgroups/{kpbId}`
- Return: `{ success: true }` of `{ success: false, result: "error message" }`

**`getContactsByBrand(brand: String): List<Map<String, String>>`**
- GET request naar SPOT
- Endpoint: `/contacts?brand={brand}`
- Return: Array van Contact-objecten (voor kandidaat-dropdown in forms)

**`getConsultantName(): String`**
- Haalt naam van ingelogde User op
- Return: gebruikersnaam

### HTTP-headers (alle requests)

```
Authorization: Bearer {OAuthToken}        // OAuth token via OAuthFlowController
X-Caller-Ref: BHS                         // Standaard caller ID
x-userrole: CONSULENT                     // Rollen-header voor audit/authorisatie
Accept-Language: nl                       // Respons in Nederlands
X-Message-Id: {UUID}                      // Unieke request ID
X-Correlation-ID: {UUID}                  // Tracing
```

### Foutafhandeling

**Successcodes:** HTTP 200, 201 (created), 202 (accepted)

**Foutresponse-formaat:**
```json
{
  "errors": [
    {
      "error_message": "Beschrijving van de fout"
    },
    {
      "error_message": "Nog een fout"
    }
  ]
}
```

**In LWC:**
- Response wordt geparst
- Enkel `error_message` strings worden geëxtraheerd
- Samengevoegd in Toast-melding zodat volledige JSON niet getronqueerd wordt

### Payload-voorbeelden

**POST /costgroups (Nieuwe KPB):**
```json
{
  "payroll_id": 6,              // UNQ: 6, BPL: 14001
  "unit_id": 19,                // UNQ: 19, BPL: 14023
  "employee_id": 123456,
  "description": "Senior Consultant",
  "calculation_type_id": "Advanced consultant",
  "calculation_method": "1",    // 1=Verkoopprijs, 2=Marge
  "gross_salary_monthly": 4500,
  "avg_hours_per_week": 40,
  "avg_days_per_week": 5,
  "reference_salary": {
    "unit": "M",                // M=Maand, H=Uur
    "unit_hours": 160
  },
  "components": [               // Mobiliteit + Variabelen
    {
      "component_id": 1,        // Lease-categorie
      "unit_id": 19,
      "value": "Categorie 2",
      "unit": ""
    },
    {
      "component_id": 105,      // Maaltijdcheques
      "unit_id": 19,
      "value": "6,91 WG + 1,09 WN",
      "unit": "€ per dag"
    }
  ]
}
```

**Component-ID mapping (mobilitair + variabelen):**
- 1: Keuze lease category (CAR)
- 2: Tankkaart budget (CAR)
- 3: Bedrijfswagen netto-inhouding (CAR)
- 105: Maaltijdcheques (DIV)
- 108: GSM (DIV)
- 113: Andere kosten (DIV)
- 114: Parkingkosten (DIV)
- 11000: Projectpremie per maand (DIV)

---

## Implementatie-details

### Datadoorgave: Flow → LWC

**Kandidaatpad:**
1. Flow verzamelt geselecteerde rij-ID in `selectedIdFromTables` (datatable formula)
2. Stuurt naar `kpbGenericButton`: `recordId = selectedIdFromTables`, `candidateName = Contact.Name`
3. `kpbGenericButton` opent `kpbPageModal`
4. `kpbPageModal` geeft door aan `kpbPage`: `recordId`, `action`, `brand`, `candidateName`

**Consultantpad:** Identiek, maar `candidateName` is User-naam

### Candidaat-naamveld

- `candidateName` wordt doorgegeven vanuit flow (Contact.Name of User.Name)
- In `kpbPage` is dit een read-only input (disabled)
- Geen separate API-call nodig voor candidate lookup
- Alle acties (NEW/EDIT/COPY) tonen dezelfde kandidaatnaam

### Brand en berekeningstype

- `userBrand` wordt bepaald via `@wire` op User.RGF_BRAND__c
- Berekeningstype-opties zijn merk-afhankelijk:
  - **UNQ:** Ad hoc consultant, Advanced consultant, Expert consultant, Project consultant, Project consultant BNP, Skilled consultant, Specialist/Gold consultant, Trainee consultant
  - **BPL:** Junior, Medior, Senior
  - **Overige:** `{BRAND}-BT1`, `{BRAND}-BT2`
- Payroll_id en unit_id ook afhankelijk:
  - **UNQ:** payroll_id=6, unit_id=19
  - **BPL:** payroll_id=14001, unit_id=14023

### Modal-constructor

**`kpbPageModal.open({ recordId, action, brand, candidateName })`**
- Programmatisch openen van LightningModal
- Props doorgegeven aan onderliggende `kpbPage`
- Na succes: modal sluit automatisch

### Foutafhandeling in LWC

**API-fouten worden geparst:**
```javascript
// Response: { errors: [{ error_message: "..." }, ...] }
const errorMessages = response.errors?.map(e => e.error_message).join('; ') || 'Unknown error';
dispatchEvent(new ShowToastEvent({ title: 'Error', message: errorMessages, variant: 'error' }));
```

- Dit voorkomt dat volledige JSON-responses in toast getoond worden
- Gebruiker ziet enkel leesbare foutmeldingen

### Refresh-mechanisme

Na succesvolle kpb-actie (NEW/EDIT/COPY/DELETE):
1. `FlowNavigationNextEvent` dispatched
2. Flow navigeert terug naar **Begin van huidig pad:**
   - Kandidaatpad: Contact ophalen → IForce-validatie → GetCostsForCandidate API → Datatables
   - Consultantpad: User ophalen → GetCostWithId API → Datatables
3. Alle datatables worden opnieuw gevuld (vorige data wordt gewist)
4. Gebruiker kan volgende actie uitvoeren

### Validatie

**Bij Kopieer/Bewerk/Verwijderen:**
- Controleert `selectionCount > 0`
- Controleert of `recordId` aanwezig
- Toont fouttoast als validatie faalt

**In formulier:**
- Verplichte velden: beschrijving, berekeningstype, salaris/verkoopprijs, opgemaakt-datum, te rekenen vanaf-datum
- Client-side validatie via `required` op input-velden
- Server-side validatie via SPOT API (fout getoond in toast)

### Component-ID's en types

**Mobiliteit-componenten (type CAR):**
- ID 1, 2, 3 → Keuze lease, tankkaart, bedrijfswagen

**Overige componenten (type DIV):**
- ID 105, 108, 113, 114, 11000 → Maaltijd, GSM, kosten, parking, premie

Worden opgeslagen als `components` array in KPB-payload (component_id + value)
