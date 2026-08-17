# KPB Generieke Knop

## Werking

De `kpbGenericButton` component is een Flow-schermcomponent die één knop toont. Via de Flow-eigenschappen stel je in welke actie de knop uitvoert:

| Eigenschap | Omschrijving |
|---|---|
| `label` | Tekst op de knop |
| `action` | `NEW`, `COPY` of `EDIT` |
| `recordId` | Verplicht bij COPY en EDIT — het te laden record |

Bij klikken opent de knop de `kpbPageModal` als een overlay.

## Stroom

```
kpbGenericButton
  └─ handleClick()
       └─ KpbPageModal.open({ recordId, action })
            └─ c-kpb-page (record-id, action)
                 ├─ NEW    → leeg formulier via template
                 ├─ COPY   → ophalen via API (recordId)
                 └─ EDIT   → ophalen via API (recordId)
```

## kpbPage — gegevens laden

- **NEW**: het formulier start leeg op basis van een vaste sjabloon.
- **COPY / EDIT**: de pagina haalt de kostgroep op via de Apex-methode `getKpb` met het meegegeven `recordId`.

De pagina toont de velden gegroepeerd in secties (Identificatie, Status & Type, Kosten, etc.) en de geneste objecten (werknemer, project, audit …) elk in een eigen kaart.
