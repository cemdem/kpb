# KPB Module – Technische Documentatie

## Overzicht
De KPB-module (Kostprijsberekening) is een Salesforce Lightning Web Component-gebaseerde oplossing voor het beheren van kostprijsberekeningen. De module werkt samen met een Screen Flow en de SPOT API.

---

## LWC-componenten

### `kpbPage`
Het hoofdformulier voor het aanmaken, bewerken en kopiëren van kostprijsberekeningen.

**Input-eigenschappen:**
- `recordId` (String) – ID van de KPB in SPOT
- `action` (String) – Actie: `NEW`, `EDIT` of `COPY`
- `json` (String) – Optioneel legacy JSON-invoer (bevat volledige KPB-gegevens)
- `brand` (String) – Merktag van de gebruiker (bijv. UNQ, BPL)
- `candidateName` (String) – Naam van de kandidaat (read-only veld)

**Gedrag:**
- Bij `NEW`: toont lege vorm, geen kandidaat
- Bij `EDIT` of `COPY`: laadt KPB-gegevens via GET API, vult formulier in
- `json` kan gebruikt worden als fallback wanneer `recordId` niet beschikbaar is
- Slaat formulier op via POST (NEW/COPY) of PUT (EDIT) naar SPOT API
- API-fouten worden leesbaar weergegeven in een toast-melding

---

### `kpbGenericButton`
Knoppen-component op het schermflow-scherm. Toont: **Nieuw**, **Kopieer**, **Bewerk**, **Verwijderen** (altijd zichtbaar).

**Input-eigenschappen:**
- `recordId` (String) – ID van de geselecteerde KPB
- `selectionCount` (Integer) – Aantal geselecteerde rijen (niet-functioneel, enkel voor validatie)
- `brand` (String) – Brand van de gebruiker
- `candidateName` (String) – Naam van de kandidaat

**Gedrag:**
- Bij Kopieer/Bewerk/Verwijderen: valideert of een rij geselecteerd is
- Bij klikken: navigeert naar flow (Nieuw/Kopieer/Bewerk) of roept delete API aan (Verwijderen)
- Bij succesvolle verwijdering: toont groene toast en navigeert flow verder via `FlowNavigationNextEvent` zodat de lijsten verversen

---

## Screen Flow: `RGF - Screen Flow - Cost Component`

**Doel:** Beheren van KPB's op de Contact-recordpagina.

**Werkstroom:**
1. Flow start met invoer: `recordId` (Contact-ID) en `startByConsultant` (boolean)
2. **Logica-split op `startByConsultant`:**
   - **Nee (kandidaatpad):**
     - Haalt Contact op
     - Valideert of IForce-nummer en sub-brand aanwezig zijn
     - Roept `GetCostsForCandidate` API aan (gefilterd op sub-brand en IForce-medewerker-ID)
     - Doorloopt resultaten en mapt statuscodes naar Nederlandse labels
     - Sorteert per type (EMP/OVK/WRK/PRJ)
     - Toont `Costs_Screen` met vier datatables
   
   - **Ja (consultantpad):**
     - Haalt User op
     - Roept `GetCostWithId` API aan (gefilterd op status GT)
     - Doorloopt resultaten
     - Toont `Costs_Screen_Consultant`

3. Beide schermen tonen `kpbGenericButton` (Nieuw/Kopieer/Bewerk/Verwijderen)
4. Na actie: navigeert terug naar stap 2 zodat lijsten verversen
5. Bij ontbrekende IForce-info: toont `iforceInfoIncompleteScreen` (enkel Nieuw-knop)
6. Logging via Nebula FlowLogEntry (start, eind, fouten)

**Datatables:** Kandidaat, Overeenkomst, Voorstelling, Project

---

## API-integratie

**SPOT API-calls via `KpbController` (Apex):**
- `getKpb(recordId)` – Haalt één KPB op (GET)
- `createKpb(body)` – Maakt KPB aan (POST)
- `updateKpb(kpbId, body)` – Werkt KPB bij (PUT)
- `deleteKpb(kpbId)` – Verwijdert KPB (DELETE)
- `getContactsByBrand(brand)` – Haalt contacten op gefilterd op brand

**Headers:** Authorization, X-Caller-Ref (BHS), x-userrole (CONSULENT), Accept-Language (NL)

**Success:** HTTP 200/201/202

---

## Opmerkingen

- `candidateName` wordt als read-only veld doorgegeven vanuit de flow
- Berekeningstype-opties zijn merk-afhankelijk (UNQ, BPL, overige)
- Foutmeldingen van SPOT API worden geparst en in toasts getoond
- Bij verwijdering navigeert de flow terug naar begin voor verversing
