import { LightningElement, wire, api } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import USER_BRAND from '@salesforce/schema/User.RGF_Brand__c';
import getKpb from '@salesforce/apex/KpbController.getKpb';
import listCandidateCosts from '@salesforce/apex/KpbController.listCandidateCosts';
import triggerPjsCreation from '@salesforce/apex/KpbController.triggerPjsCreation';
import getContactPjsNumber from '@salesforce/apex/KpbController.getContactPjsNumber';
import createKpb from '@salesforce/apex/KpbController.createKpb';
import updateKpb from '@salesforce/apex/KpbController.updateKpb';
import requestApproval from '@salesforce/apex/KpbController.requestApproval';
import linkKpbToApplication from '@salesforce/apex/KpbController.linkKpbToApplication';
import unlinkKpbFromApplication from '@salesforce/apex/KpbController.unlinkKpbFromApplication';
import getContactsByBrand from '@salesforce/apex/KpbController.getContactsByBrand';
import getConsultantName from '@salesforce/apex/KpbController.getConsultantName';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationFinishEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';

const SELECT_ALL_VALUE = '__ALL__';

const BRAND_MAP = {
    'unique':     'UNQ',
    'unq':        'UNQ',
    '3008':       'UNQ',
    'bright plus':'BPL',
    'brightplus': 'BPL',
    'bpl':        'BPL',
    '3000':       'BPL',
};

function normalizeBrand(raw) {
    if (!raw) return null;
    return BRAND_MAP[raw.toLowerCase().trim()] ?? raw;
}

const COMPONENT_ID_TO_TYPE = {
    1: 'CAR', 2: 'CAR', 3: 'CAR', 4: 'CAR', 11020: 'CAR',
    101: 'DIV', 102: 'DIV', 103: 'DIV', 104: 'DIV', 105: 'DIV',
    106: 'DIV', 108: 'DIV', 110: 'DIV', 113: 'DIV', 114: 'DIV',
    123: 'DIV', 10100: 'DIV', 10852: 'DIV', 10855: 'DIV', 10857: 'DIV',
    10858: 'DIV', 10859: 'DIV', 10871: 'DIV', 10891: 'DIV', 10892: 'DIV',
    10893: 'DIV', 10932: 'DIV', 10933: 'DIV', 10934: 'DIV', 10935: 'DIV',
    10936: 'DIV', 10937: 'DIV', 10938: 'DIV', 11000: 'DIV', 11010: 'DIV',
    11030: 'DIV', 11040: 'DIV', 11172: 'DIV',
    124: 'FIX', 125: 'FIX', 10337: 'FIX', 10338: 'FIX', 10340: 'FIX',
    10341: 'FIX', 10342: 'FIX', 10856: 'FIX', 10862: 'FIX',
};

const COMPONENT_ID_TO_KEY = {
    1:     'keuze_lease_category',
    2:     'tankkaart_budget',
    3:     'bedrijfswagen_netto_inhouding',
    4:     'woon_werkverkeer',
    101:   'soc_abon_trein_aantal_km_enkel',
    102:   'soc_abon_tram_metro_bus_aantal_km_enkel',
    103:   'fietsvergoeding_aantal_km_enkel',
    104:   'soc_abon_prive_vervoer_auto_aantal_km_enkel',
    105:   'maaltijdcheques',
    106:   'dagvergoeding',
    108:   'internetvergoeding',
    110:   'andere_kosten_per_maand',
    113:   'ecocheques',
    114:   'gsm',
    123:   'televergoeding',
    10100: '3de_betaler_trein_aantal_km_enkel',
    10852: 'ploegenarbeid_volgens_voorwaarden',
    10855: 'extra_opleiding',
    10857: 'extra_opzegvergoeding',
    10858: 'parkingkosten',
    10859: 'gsm_tussenkomst_aankoop_toestel',
    10871: 'correctie_standaard_leegloop',
    10891: 'projectpremie_per_maand',
    10892: 'bonus_commissies',
    10893: 'andere_kosten',
    10932: 'ancienniteitstoeslag',
    10933: 'andere_premies',
    10934: 'groepsverzekering_yn',
    10935: 'wetsverzekering_yn',
    10936: 'ploegen_nacht_premie',
    10937: 'perc_ploegenarbeid',
    10938: 'hospitalisatieverzekering_yn',
    11000: 'forfaitaire_onkostenvergoeding_maand',
    11010: 'auteursrechten',
    11020: 'mobiliteitsprogramma',
    11030: 'brutopremie_mobiliteit',
    11040: 'kost_leasefiets',
    11172: '3e_betaler_tram_bus_metro',
    124:   'hospitalisatie_verzekering',
    125:   'groepsverzekering',
    10337: 'ziektecontrole',
    10338: 'uniform',
    10340: 'kosten_sd',
    10341: 'gelijkgestelde_rechten',
    10342: 'koopkrachtpremie',
    10856: 'opzegvergoeding_per_jaar',
    10862: 'sport_en_cultuurcheques',
};

const KEY_TO_COMPONENT_ID = Object.fromEntries(
    Object.entries(COMPONENT_ID_TO_KEY).map(([id, key]) => [key, Number(id)])
);

const BPL_CALC_DEFAULTS = {
    '13506': {
        fulltimeEquivalent: '3', avgHoursPerWeekCost: 40,
        mobility: { keuze_lease_category: '1', tankkaart_budget: 350 },
        variable: {
            maaltijdcheques: '325', gsm: '19', ecocheques: 250,
            forfaitaire_onkostenvergoeding_maand: 75,
            gelijkgestelde_rechten: 287.88, groepsverzekering_yn: 'Ja',
            hospitalisatieverzekering_yn: 'Ja', kosten_sd: 72,
            opzegvergoeding_per_jaar: 200, ziektecontrole: 81
        }
    },
    '13502': {
        fulltimeEquivalent: '3', avgHoursPerWeekCost: 40,
        mobility: { keuze_lease_category: '2', tankkaart_budget: 350 },
        variable: {
            maaltijdcheques: '325', gsm: '19', ecocheques: 250,
            forfaitaire_onkostenvergoeding_maand: 105,
            gelijkgestelde_rechten: 287.88, groepsverzekering_yn: 'Ja',
            hospitalisatieverzekering_yn: 'Ja', kosten_sd: 72,
            opzegvergoeding_per_jaar: 200, ziektecontrole: 81
        }
    },
    '13503': {
        fulltimeEquivalent: '3', avgHoursPerWeekCost: 40,
        mobility: { keuze_lease_category: '3', tankkaart_budget: 350 },
        variable: {
            maaltijdcheques: '325', gsm: '19', ecocheques: 250,
            forfaitaire_onkostenvergoeding_maand: 135,
            gelijkgestelde_rechten: 287.88, groepsverzekering_yn: 'Ja',
            hospitalisatieverzekering_yn: 'Ja', kosten_sd: 72,
            opzegvergoeding_per_jaar: 200, ziektecontrole: 81
        }
    }
};

const UNQ_COMMON_MOBILITY = { tankkaart_budget: 300 };
const UNQ_COMMON_VARIABLE = { ecocheques: 250, gsm: '19', maaltijdcheques: '325' };
const UNQ_CALC_DEFAULTS = {
    '13508': { forfaitaire_onkostenvergoeding_maand: 105 },
    '13510': { forfaitaire_onkostenvergoeding_maand: 135 },
    '13507': { forfaitaire_onkostenvergoeding_maand: 105 },
    '13511': { forfaitaire_onkostenvergoeding_maand: 75 },
    '13504': { forfaitaire_onkostenvergoeding_maand: 135 },
    '13513': { forfaitaire_onkostenvergoeding_maand: 135 },
    '13514': { forfaitaire_onkostenvergoeding_maand: 75 },
    '13512': { forfaitaire_onkostenvergoeding_maand: 75, referenceSalary: 2370 }
};

export default class KpbPage extends NavigationMixin(LightningElement) {
    @api recordId;
    @api action;
    @api json;
    @api brand;
    @api candidateName;
    @api pNumber;
    @api genericEmployeeId;
    @api genericEmployeeNumber;
    @api contactId;
    @api vacancyId;
    @api isPotentialVoorstelling = false;
    @api freelance = false;
    @api applicationId;
    @api office;

    @api navigationMode;

    @api callingRecordId;

    isLoading = false;
    fetchError = null;
    parseError = null;
    _qualityChecks = [];
    userBrand;
    number = null;
    resolvedEmployeeNumber = null;
    _formType;
    get formType() { return this._formType ?? (this.freelance ? 'Freelancer' : 'Werknemer'); }
    set formType(v) { this._formType = v; }
    freelancerName = '';
    description = '';
    candidateId = null;
    candidate = '';
    candidateOptions = [];
    request = '';
    calculationType = '';
    specialization = '';
    calculationMethod = '';
    avgHoursPerWeekSales;
    avgDaysPerWeekSales;
    marginPct;
    salesPricePerHour;
    grossSalaryPerMonth;
    avgHoursPerWeekCost;
    createdDate;
    calculateFromDate;
    processStatus = 'In behandeling';
    kpbStatus = '';
    consultant = '';
    fulltimeEquivalent = '';
    freelancerOtherCosts = null;
    avgDaysPerWeekCost;
    salesPricePerDay;
    mobilityRows = [];
    variableRows = [];
    variableAddValue = null;
    totalCostPerHourExcl = null;
    totalCostPerDay = null;
    totalCostPerMonth = null;
    salaryCost = null;
    carCostCalc = null;
    otherCostCalc = null;
    simulationType = null;
    @api kpbId = null;
    showApprovalForm = false;
    approvalReason = '';
    unitId = null;
    staffingRequestId = null;
    employeeSpotId = null;
    employeeNumber = null;
    employeeType = null;
    employeeDeleteStatus = null;
    labelId = null;
    carCost = 0;
    carCostUnit = 'H';
    otherCostUnit = 'H';
    leaveOfAbsence = false;
    refSalaryUnit = 'M';
    refSalaryUnitHours = 160;

    formTypeOptions = [
        { label: 'Werknemer', value: 'Werknemer' },
        { label: 'Freelancer', value: 'Freelancer' }
    ];

    calculationMethodOptions = [
        { label: 'Verkoopprijs', value: 'Verkoopprijs' },
        { label: 'Marge', value: 'Marge' }
    ];

    get specializationOptions() {
        const brand = normalizeBrand(this.brand) || this.userBrand;
        if (brand === 'BPL') {
            return [
                { label: 'Project Outsourcing',    value: '7' },
                { label: 'Total Outsourcing',      value: '14' },
                { label: 'HR Project Outsourcing', value: '18' },
            ];
        }
        return [
            { label: 'Office Projectsourcing',  value: '14005' },
            { label: 'Finance Projectsourcing', value: '14007' },
            { label: 'HR Projectsourcing',      value: '14011' },
            { label: 'Outplacement',            value: '14012' },
            { label: 'Consulting',              value: '14013' },
            { label: 'Projectsourcing',         value: '14014' },
        ];
    }

    fulltimeEquivalentBaseOptions = [
        { id: 3,     label: '01 Bedienden 40 u/wk' },
        { id: 4,     label: '02 Bedienden 38 u/wk' },
        { id: 30,    label: '07 Bedienden 39 u/wk' },
        { id: 30221, label: '20 Bedienden 39,5 u/wk' },
        { id: 30222, label: '21 Bedienden 38,5 u/wk' },
        { id: 30220, label: '24 Bedienden 38,75 u/wk' },
        { id: 30224, label: '26 Bedienden 39,15 u/wk' },
        { id: 30116, label: '28 Bedienden 39,75 u/wk' },
        { id: 30544, label: '29 Bedienden 39,67 u/wk' },
        { id: 30722, label: '30 Bedienden 38,82 u/wk' },
        { id: 396,   label: '98 Bedienden 6 ADV 39 u/wk' },
        { id: 30240, label: '99 Bedienden 12 ADV 40 u/wk' },
    ];

    mobilityDefinitions = [
        { key: 'keuze_lease_category',       label: 'Keuze lease category',         isPicklist: true,  unit: '',           options: [{ label: 'Categorie 1', value: '1' }, { label: 'Categorie 2', value: '2' }, { label: 'Categorie 3', value: '3' }, { label: 'Categorie 4', value: '4' }, { label: 'Categorie 1E', value: '6' }, { label: 'Categorie 2E', value: '7' }, { label: 'Categorie 3E', value: '8' }, { label: 'Categorie 4E', value: '9' }], defaultValue: null, disabled: false },
        { key: 'tankkaart_budget',            label: 'Tankkaart budget',              isPicklist: false, unit: '€ per maand', options: [], defaultValue: 300,  disabled: false },
        { key: 'bedrijfswagen_netto_inhouding', label: 'Bedrijfswagen netto-inhouding', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'woon_werkverkeer',            label: 'Woon-werkverkeer',              isPicklist: false, unit: 'km',          options: [], defaultValue: null, disabled: false },
        { key: 'mobiliteitsprogramma',        label: 'Mobiliteitsprogramma',          isPicklist: true,  unit: '',           options: [{ label: 'Fleet Family', value: 'Fleet Family' }, { label: 'Fleet Flex + Mobiliteitsbudget', value: 'Fleet Flex + Mobiliteitsbudget' }, { label: 'Fleet Flex', value: 'Fleet Flex' }, { label: 'Mobiliteitsbudget', value: 'Mobiliteitsbudget' }], defaultValue: null, disabled: false },
    ];

    variableDefinitions = [
        { key: 'maaltijdcheques',                           label: 'Maaltijdcheques',                              isPicklist: true,  unit: '€ per dag',        options: [{ label: '', value: '' }, { label: '6,91 WG + 1,09 WN', value: '325' }], defaultValue: '', disabled: false },
        { key: 'gsm',                                        label: 'GSM',                                          isPicklist: true,  unit: '€ per maand',      options: [{ label: '0', value: '0' }, { label: '19', value: '19' }], defaultValue: '0', disabled: false },
        { key: '3de_betaler_trein_aantal_km_enkel',          label: '3de betaler trein aantal km enkel',            isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: '3e_betaler_tram_bus_metro',                  label: '3e betaler (tram/bus/metro)',                  isPicklist: true,  unit: '',                 options: [{ label: 'De Lijn', value: 'De Lijn' }, { label: 'MIVB', value: 'MIVB' }, { label: 'Tec', value: 'Tec' }], defaultValue: null, disabled: false },
        { key: 'ancienniteitstoeslag',                       label: 'Anciënniteitstoeslag',                         isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'andere_kosten',                              label: 'Andere kosten',                                isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'andere_kosten_per_maand',                    label: 'Andere kosten per maand',                      isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'andere_premies',                             label: 'Andere premies',                               isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'auteursrechten',                             label: 'Auteursrechten',                               isPicklist: false, unit: '%',                options: [], defaultValue: null, disabled: false },
        { key: 'bonus_commissies',                           label: 'Bonus/Commissies',                             isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'brutopremie_mobiliteit',                     label: 'Brutopremie Mobiliteit',                       isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'correctie_standaard_leegloop',               label: 'Correctie standaard leegloop',                 isPicklist: false, unit: '',                 options: [], defaultValue: null, disabled: false },
        { key: 'dagvergoeding',                              label: 'Forfaitaire onkostenvergoeding (dag)',          isPicklist: false, unit: '€ per dag',        options: [], defaultValue: null, disabled: false },
        { key: 'ecocheques',                                 label: 'Ecocheques',                                   isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: 0,    disabled: true },
        { key: 'extra_opleiding',                            label: 'Extra opleiding',                              isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'extra_opzegvergoeding',                      label: 'Extra opzegvergoeding',                        isPicklist: false, unit: '€ per jaar',       options: [], defaultValue: null, disabled: false },
        { key: 'fietsvergoeding_aantal_km_enkel',            label: 'Fietsvergoeding aantal km enkel',              isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'forfaitaire_onkostenvergoeding_maand',       label: 'Forfaitaire onkostenvergoeding (maand)',       isPicklist: false, unit: '€ per maand',      options: [], defaultValue: 0,    disabled: true },
        { key: 'groepsverzekering_yn',                       label: 'Groepsverzekering',                            isPicklist: true,  unit: '',                 options: [{ label: 'Ja', value: 'Ja' }, { label: 'Nee', value: 'Nee' }], defaultValue: null, disabled: false },
        { key: 'gsm_tussenkomst_aankoop_toestel',            label: 'GSM tussenkomst aankoop toestel',              isPicklist: true,  unit: '€ per jaar',       options: [{ label: '0', value: '0' }, { label: '100', value: '100' }, { label: '150', value: '150' }, { label: '300', value: '300' }], defaultValue: '0', disabled: false },
        { key: 'hospitalisatieverzekering_yn',               label: 'Hospitalisatieverzekering',                    isPicklist: true,  unit: '',                 options: [{ label: 'Ja', value: 'Ja' }, { label: 'Nee', value: 'Nee' }], defaultValue: null, disabled: false },
        { key: 'internetvergoeding',                         label: 'Internetvergoeding',                           isPicklist: true,  unit: '€ per maand',      options: [{ label: '0', value: '0' }, { label: '20', value: '20' }], defaultValue: '0', disabled: false },
        { key: 'kost_leasefiets',                            label: 'Kost leasefiets',                              isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'parkingkosten',                              label: 'Parkingkosten',                                isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'perc_ploegenarbeid',                         label: '% ploegenarbeid',                              isPicklist: false, unit: '%',                options: [], defaultValue: null, disabled: false },
        { key: 'ploegenarbeid_volgens_voorwaarden',          label: 'Ploegenarbeid volgens voorwaarden',            isPicklist: true,  unit: '',                 options: [{ label: '', value: '' }, { label: 'Ja', value: 'Ja' }, { label: 'Nee', value: 'Nee' }], defaultValue: '', disabled: false },
        { key: 'ploegen_nacht_premie',                       label: 'Premie per uur ploegen/nacht',                 isPicklist: false, unit: '€ per uur',        options: [], defaultValue: null, disabled: false },
        { key: 'projectpremie_per_maand',                    label: 'Projectpremie per maand',                      isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_trein_aantal_km_enkel',             label: 'Soc. abon. trein aantal km enkel',             isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_tram_metro_bus_aantal_km_enkel',    label: 'Soc. abon. aantal km enkel (tram, metro, bus)', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_prive_vervoer_auto_aantal_km_enkel', label: 'Soc. abon. privé vervoer auto aantal km enkel', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'televergoeding',                             label: 'Televergoeding',                               isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'wetsverzekering_yn',                         label: 'Wetsverzekering',                              isPicklist: true,  unit: '',                 options: [{ label: 'Ja', value: 'Ja' }, { label: 'Nee', value: 'Nee' }], defaultValue: null, disabled: false },
        { key: 'hospitalisatie_verzekering',                 label: 'Hospitalisatieverzekering',                    isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'groepsverzekering',                          label: 'Groepsverzekering',                            isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'ziektecontrole',                             label: 'Ziektecontrole',                               isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'uniform',                                    label: 'Uniform',                                      isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
        { key: 'kosten_sd',                                  label: 'Kosten SD Worx',                               isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'gelijkgestelde_rechten',                     label: 'Gelijkgestelde rechten',                       isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'koopkrachtpremie',                           label: 'Koopkrachtpremie',                             isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'opzegvergoeding_per_jaar',                   label: 'Opzegvergoeding per jaar',                     isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: true },
        { key: 'sport_en_cultuurcheques',                    label: 'Sport- en cultuurcheques',                     isPicklist: false, unit: '€ per maand',      options: [], defaultValue: null, disabled: false },
    ];

    defaultMobilityKeys = ['keuze_lease_category'];
    defaultVariableKeys = ['parkingkosten', 'maaltijdcheques', 'gsm'];

    get hasData() {
        return !this.isLoading && !this.fetchError;
    }

    get displayCandidateName() {
        return this.candidateName || this.candidate || '';
    }
    get showFormTypeSelector() {
        return this.action === 'NEW';
    }

    get candidateLocked() {
        return this.action === 'NEW';
    }

    get showEmployee() {
        return this.formType === 'Werknemer';
    }

    get showFreelancer() {
        return this.formType === 'Freelancer';
    }

    get refSalaryUnitOptions() {
        return [
            { label: 'Per uur',   value: 'H' },
            { label: 'Per dag',   value: 'D' },
            { label: 'Per week',  value: 'W' },
            { label: 'Per maand', value: 'M' },
        ];
    }

    get typeLabel() {
        const map = { EMP: 'Kandidaat', WRK: 'Voorstelling', OVK: 'Overeenkomst', PRJ: 'Project' };
        return map[this.simulationType] ?? 'Kandidaat';
    }

    get isReadOnly() {
        return this.simulationType === 'PRJ' || this.simulationType === 'OVK'
            || this.kpbStatus === 'GT' || this.kpbStatus === 'GG';
    }

    get approveDisabled() {
        return this.isReadOnly || this.kpbId === null || this.showApprovalForm || this.simulationType === 'EMP';
    }

    get approvalSubmitDisabled() {
        return !this.approvalReason.trim();
    }

    get hasCalcResults() {
        return this.kpbId !== null;
    }

    get kpbStatusLabel() {
        const map = { BL: 'Blanco', T: 'Te valideren', V: 'Gevalideerd', GG: 'Goedgekeurd', VE: 'Verwerkt', GT: 'Goed te keuren', R: 'Afgekeurd' };
        return map[this.kpbStatus] ?? this.kpbStatus ?? '';
    }

    get salesPriceDisabled() {
        return this.calculationMethod !== 'Verkoopprijs';
    }

    get marginDisabled() {
        return this.calculationMethod !== 'Marge';
    }

    get calculationTypeOptions() {
        if (this.formType === 'Freelancer') {
            return [{ label: 'Freelancer', value: '8' }];
        }
        const brand = normalizeBrand(this.brand) || this.userBrand;
        console.log('[kpbPage] calculationTypeOptions — this.brand:', this.brand, '| this.userBrand:', this.userBrand, '| resolved brand:', brand);
        if (!brand) return [];
        if (brand === 'UNQ') {
            return [
                { label: 'Ad hoc consultant',         value: '13508' },
                { label: 'Advanced consultant',      value: '13510' },
                { label: 'Expert consultant',        value: '13507' },
                { label: 'Project consultant',       value: '13511' },
                { label: 'Project consultant BNP',   value: '13504' },
                { label: 'Skilled consultant',       value: '13513' },
                { label: 'Specialist/Gold consultant', value: '13514' },
                { label: 'Trainee consultant',       value: '13512' },
            ];
        }
        if (brand === 'BPL') {
            return [
                { label: 'Junior', value: '13506' },
                { label: 'Medior', value: '13502' },
                { label: 'Senior', value: '13503' },
            ];
        }
        return [
            { label: `${brand}-BT1`, value: `${brand}-BT1` },
            { label: `${brand}-BT2`, value: `${brand}-BT2` }
        ];
    }

    get fulltimeEquivalentOptions() {
        return this.fulltimeEquivalentBaseOptions.map(o => ({ label: o.label, value: String(o.id) }));
    }

    get fulltimeEquivalentDisabled() {
        return false;
    }

    get availableMobilityOptions() {
        const used = new Set(this.mobilityRows.map(r => r.key));
        return this.mobilityDefinitions
            .filter(d => !used.has(d.key))
            .map(d => ({ label: d.label, value: d.key }));
    }

    get availableVariableOptions() {
        const used = new Set(this.variableRows.map(r => r.key));
        const remaining = this.variableDefinitions
            .filter(d => !used.has(d.key))
            .map(d => ({ label: d.label, value: d.key }));
        if (remaining.length === 0) return [];
        return [{ label: 'Selecteer alles', value: SELECT_ALL_VALUE }, ...remaining];
    }

    connectedCallback() {
        console.log('[kpbPage] connectedCallback — brand prop:', this.brand, '| action:', this.action, '| recordId:', this.recordId, '| kpbId:', this.kpbId, '| candidateName:', this.candidateName, '| freelance:', this.freelance, '| pNumber:', this.pNumber, '| callingRecordId:', this.callingRecordId, '| navigationMode:', this.navigationMode);
        this.createdDate = new Date().toISOString().split('T')[0];
        this._initRows();
        if (this.action === 'NEW') {
            this.simulationType = this.isPotentialVoorstelling ? 'WRK' : 'EMP';
            console.log('[kpbPage] NEW — recordId:', this.recordId, '| contactId:', this.contactId, '| genericEmployeeId:', this.genericEmployeeId, '| genericEmployeeNumber:', this.genericEmployeeNumber);
            if (this.recordId) this.candidateId = this.recordId;
            if (this.vacancyId) {
                this.staffingRequestId = this.vacancyId;
                this.request = this.vacancyId;
            }
            if (this.genericEmployeeId && !this.freelance) this._initNew();
            return;
        }
        if (this.kpbId || this.recordId) {
            this._fetchKpb();
        } else if (this.json) {
            this._parse();
        }
    }

    async _fetchKpb() {
        this.isLoading = true;
        try {
            const fetchId = this.kpbId || this.recordId;
            const result = await getKpb({ recordId: fetchId, pNumber: this.pNumber });
            if (result.success) {
                const raw = JSON.parse(result.result);
                console.log('[kpbPage] _fetchKpb response:', JSON.stringify(raw, null, 2));
                this._populate(raw.costgroup || raw);
                if (this.action === 'COPY') {
                    this.simulationType = this.isPotentialVoorstelling ? 'WRK' : 'EMP';
                }
            } else {
                this.fetchError = `HTTP ${result.httpCode}: ${result.result}`;
            }
        } catch (e) {
            this.fetchError = e.body?.message ?? e.message ?? 'Unknown error';
        } finally {
            this.isLoading = false;
        }
    }

    async _initNew() {
        const tasks = [this._fetchOvk()];
        if (!this.genericEmployeeNumber && (this.recordId || this.contactId)) {
            tasks.push(this._ensurePjsNumber());
        }
        await Promise.all(tasks);
    }

    async _ensurePjsNumber() {
        const brand = normalizeBrand(this.brand) || this.userBrand;
        const payrollId = String(brand === 'UNQ' ? 14001 : 6);
        this.isLoading = true;
        try {
            const resolvedContactId = this.contactId || this.recordId;
            const existing = await getContactPjsNumber({ contactId: resolvedContactId });
            if (existing) {
                console.log('[kpbPage] _ensurePjsNumber — already has PJS number:', existing);
                this.resolvedEmployeeNumber = existing;
                return;
            }
            console.log('[kpbPage] _ensurePjsNumber — triggerPjsCreation payrollId:', payrollId, '| brand:', brand, '| employeeId:', this.genericEmployeeId, '| contactSfId:', resolvedContactId, '| office:', this.office);
            const triggerResult = await triggerPjsCreation({
                employeeId: String(this.genericEmployeeId),
                payrollId,
                contactSfId: resolvedContactId,
                managingOffice: this.office
            });
            console.log('[kpbPage] _ensurePjsNumber — triggerPjsCreation httpCode:', triggerResult.httpCode, '| success:', triggerResult.success, '| body:', triggerResult.result);
            for (let attempt = 1; attempt <= 15; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const pjsNumber = await getContactPjsNumber({ contactId: resolvedContactId });
                console.log(`[kpbPage] _ensurePjsNumber — poll ${attempt}/15 — RGF_IFOrce_Number_PJS__c:`, pjsNumber);
                if (pjsNumber) {
                    this.resolvedEmployeeNumber = pjsNumber;
                    return;
                }
            }
        } catch (e) {
            console.warn('[kpbPage] _ensurePjsNumber error:', e.body?.message ?? e.message);
        } finally {
            this.isLoading = false;
        }
    }

    async _fetchOvk() {
        const brand = normalizeBrand(this.brand) || this.userBrand;
        const payrollId = String(brand === 'UNQ' ? 14001 : 6);
        this.isLoading = true;
        try {
            console.log('[kpbPage] _fetchOvk — listCandidateCosts employeeId:', this.genericEmployeeId, '| payrollId:', payrollId);
            const listResult = await listCandidateCosts({ employeeId: String(this.genericEmployeeId), payrollId });
            if (!listResult.success) {
                console.warn('[kpbPage] _fetchOvk — listCandidateCosts failed:', listResult.httpCode, listResult.result);
                return;
            }
            const list = JSON.parse(listResult.result);
            const first = list?.cost_groups?.[0];
            if (!first?.id) {
                console.log('[kpbPage] _fetchOvk — no OVK cost group found');
                return;
            }
            console.log('[kpbPage] _fetchOvk — found OVK id:', first.id);
            const detailResult = await getKpb({ recordId: String(first.id) });
            if (!detailResult.success) return;
            const raw = JSON.parse(detailResult.result);
            this._populate(raw.costgroup || raw);
            this.kpbId = null;
            this.kpbStatus = '';
            this.simulationType = this.isPotentialVoorstelling ? 'WRK' : 'EMP';
        } catch (e) {
            console.warn('[kpbPage] _fetchOvk error:', e.body?.message ?? e.message);
        } finally {
            this.isLoading = false;
        }
    }

    _parse() {
        try {
            const raw = JSON.parse(this.json);
            this._populate(raw.costgroup || raw);
        } catch (e) {
            this.parseError = e.message;
        }
    }

    _toDisplay(n) {
        if (n === null || n === undefined) return null;
        return String(n).replace('.', ',');
    }

    _populate(cg, updateFormType = true) {
        this.kpbId                = cg.id ?? null;
        this.number               = cg.payroll_id ?? null;
        this.unitId               = cg.unit_id ?? null;
        this.labelId              = cg.label_id ?? null;
        this.specialization       = cg.label_id != null ? String(cg.label_id) : '';
        this.carCost              = cg.car_cost ?? 0;
        this.carCostUnit          = cg.car_cost_unit ?? 'H';
        this.otherCostUnit        = cg.other_cost_unit ?? 'H';
        this.leaveOfAbsence       = cg.leave_of_absence ?? false;
        this.refSalaryUnit        = cg.reference_salary?.unit ?? 'M';
        this.refSalaryUnitHours   = cg.reference_salary?.unit_hours ?? 160;
        this.employeeSpotId       = cg.employee?.id ?? null;
        this.employeeNumber       = cg.employee?.number ?? null;
        this.employeeType         = cg.employee?.type ?? null;
        this.employeeDeleteStatus = cg.employee?.delete_status ?? null;
        this.description          = cg.description ?? '';
        this.candidate            = cg.employee?.name ?? '';
        this.staffingRequestId    = cg.staffing_request?.id ?? null;
        this.request              = this.vacancyId ?? (cg.staffing_request?.number != null ? String(cg.staffing_request.number) : (cg.staffing_request?.name ?? ''));
        this.calculationType      = cg.calculation_type_id != null ? String(cg.calculation_type_id) : '';
        this.calculationMethod    = cg.calculation_method === '1' ? 'Verkoopprijs' : cg.calculation_method === '2' ? 'Marge' : '';
        this.avgHoursPerWeekSales = this._toDisplay(cg.avg_hours_per_week_sales ?? null);
        this.avgDaysPerWeekSales  = this._toDisplay(cg.avg_days_per_week_sales ?? null);
        this.marginPct            = this._toDisplay(cg.margin ?? null);
        this.salesPricePerHour    = this._toDisplay(cg.sales_price_per_hour ?? null);
        this.grossSalaryPerMonth  = this._toDisplay(cg.reference_salary?.salary ?? cg.real_salary ?? null);
        this.avgHoursPerWeekCost  = this._toDisplay(cg.avg_hours_per_week_cost ?? null);
        this.avgDaysPerWeekCost   = this._toDisplay(cg.avg_days_per_week_cost ?? null);
        this.salesPricePerDay     = this._toDisplay(cg.sales_price_per_day ?? null);
        this.fulltimeEquivalent   = cg.fulltime_equivalent_id != null ? String(cg.fulltime_equivalent_id) : '';
        this.calculateFromDate    = cg.calculate_from_date ?? null;
        this.kpbStatus            = cg.status ?? '';
        this.totalCostPerHourExcl = this._toDisplay(cg.total_cost_per_hour_excl ?? null);
        this.totalCostPerDay      = this._toDisplay(cg.total_cost_per_day ?? null);
        this.totalCostPerMonth    = this._toDisplay(cg.total_cost_per_month ?? null);
        this.salaryCost           = this._toDisplay(cg.salary_cost ?? null);
        this.carCostCalc          = this._toDisplay(cg.car_cost ?? null);
        this.otherCostCalc        = this._toDisplay(cg.other_cost ?? null);
        if (cg.first_approved_on) this.createdDate = cg.first_approved_on;
        if (cg.simulation_type)   this.simulationType = cg.simulation_type;
        if (updateFormType && Array.isArray(cg.components)) {
            this.formType = cg.components.some(c => c.component_type === 'CAR') ? 'Werknemer' : 'Freelancer';
        }
        if (Array.isArray(cg.components) && cg.components.length > 0) {
            this._populateRows(cg.components);
        }
    }

    _populateRows(components) {
        const mobilityKeySet = new Set(this.mobilityDefinitions.map(d => d.key));
        const variableKeySet = new Set(this.variableDefinitions.map(d => d.key));
        const newMobility = [];
        const newVariable = [];
        for (const comp of components) {
            const key = COMPONENT_ID_TO_KEY[comp.parent_component_id];
            if (!key) continue;
            let value;
            if (comp.component_type === 'FIX') {
                value = comp.value?.per_month ?? null;
            } else if (comp.unit_quantity !== null && comp.unit_quantity !== -1) {
                value = comp.unit_quantity;
            } else {
                value = comp.unit === 'M'
                    ? (comp.value?.per_month ?? null)
                    : (comp.value?.total ?? null);
            }
            if (key === 'bedrijfswagen_netto_inhouding' && value != null) value = Math.abs(value);
            const rawPerHour = comp.value?.per_hour;
            const perHour = (rawPerHour !== null && rawPerHour !== undefined && rawPerHour !== 0) ? this._toDisplay(rawPerHour) : null;
            const valueIsEmpty = value === null || value === undefined || value === 0 || value === '';
            if (valueIsEmpty && !rawPerHour) continue;
            if (mobilityKeySet.has(key)) {
                const def = this.mobilityDefinitions.find(d => d.key === key);
                if (def.isPicklist && value != null) value = String(value);
                newMobility.push({ ...this._defToRow(def), value, perHour });
            } else if (variableKeySet.has(key)) {
                const def = this.variableDefinitions.find(d => d.key === key);
                if (def.isPicklist && value != null) value = String(value);
                newVariable.push({ ...this._defToRow(def), value, perHour });
            }
        }
        if (newMobility.length > 0) this.mobilityRows = newMobility;
        if (newVariable.length > 0) {

            const unqDefaults = UNQ_CALC_DEFAULTS[this._selectedUnqCalcType];
            if (unqDefaults?.forfaitaire_onkostenvergoeding_maand != null) {
                const forfRow = newVariable.find(r => r.key === 'forfaitaire_onkostenvergoeding_maand');
                if (forfRow && (forfRow.value === 0 || forfRow.value === null)) {
                    forfRow.value = unqDefaults.forfaitaire_onkostenvergoeding_maand;
                }
            }
            this.variableRows = newVariable;
        }
    }

    @wire(CurrentPageReference)
    _readPageRef(pageRef) {
        if (pageRef?.state?.c__recordId) {
            this._pageRefRecordId = pageRef.state.c__recordId;
        }
    }

    @wire(getRecord, { recordId: USER_ID, fields: [USER_BRAND] })
    _wiredUser({ data }) {
        if (data) {
            const raw = getFieldValue(data, USER_BRAND);
            this.userBrand = normalizeBrand(raw);
            console.log('[kpbPage] userBrand raw:', raw, '→ normalized:', this.userBrand);
        }
    }

    @wire(getConsultantName)
    _wiredConsultant({ data }) {
        if (data) this.consultant = data;
    }

    @wire(getContactsByBrand, { brand: '$userBrand' })
    _wiredContacts({ data }) {
        if (data) {
            this.candidateOptions = data.map(c => ({ label: c.Name, value: c.Id }));
            if (this.candidate && !this.candidateId) {
                const match = this.candidateOptions.find(o => o.label === this.candidate);
                if (match) this.candidateId = match.value;
            }
        }
    }

    handleCandidateChange(event) {
        this.candidateId = event.detail.value;
        const option = this.candidateOptions.find(o => o.value === this.candidateId);
        this.candidate = option ? option.label : '';
    }

    handleFormTypeChange(event) {
        this.formType = event.detail.value;
        if (this.formType === 'Freelancer') {
            this.calculationType = '8';
            this.refSalaryUnit = '';
        }
    }

    handleRefSalaryUnitChange(event) {
        this.refSalaryUnit = event.detail.value;
    }

    handleFreelancerNameChange(event) {
        this.freelancerName = event.target.value;
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this[field] = value;
        if (field === 'calculationType' && this.action === 'NEW') {
            const brand = normalizeBrand(this.brand) || this.userBrand;
            if (brand === 'BPL') this._applyBplDefaults(value);
            if (brand === 'UNQ') this._applyUnqDefaults(value);
            this._selectedUnqCalcType = brand === 'UNQ' ? value : null;
        }
        if (field === 'salesPricePerHour' || field === 'salesPricePerDay') {
            this._crossCalcSalesPrice(field);
        }
    }

    _crossCalcSalesPrice(changedField) {
        const hours = this._toNumber(this.avgHoursPerWeekCost);
        const days  = this._toNumber(this.avgDaysPerWeekCost);
        if (!hours || !days) return;
        const x = hours / days;
        if (changedField === 'salesPricePerHour' && this.salesPricePerHour !== null && this.salesPricePerHour !== '') {
            const perHour = this._toNumber(this.salesPricePerHour);
            if (perHour !== null) this.salesPricePerDay = this._toDisplay(Math.round(perHour * x * 100) / 100);
        } else if (changedField === 'salesPricePerDay' && this.salesPricePerDay !== null && this.salesPricePerDay !== '') {
            const perDay = this._toNumber(this.salesPricePerDay);
            if (perDay !== null && x !== 0) this.salesPricePerHour = this._toDisplay(Math.round(perDay / x * 100) / 100);
        }
    }

    _applyBplDefaults(typeId) {
        const defaults = BPL_CALC_DEFAULTS[typeId];
        if (!defaults) return;
        this.fulltimeEquivalent = defaults.fulltimeEquivalent;
        this.avgHoursPerWeekCost = this._toDisplay(defaults.avgHoursPerWeekCost);
        const toRows = (defs, values) =>
            Object.entries(values)
                .map(([key, value]) => {
                    const def = defs.find(d => d.key === key);
                    return def ? { ...this._defToRow(def), value } : null;
                })
                .filter(Boolean);
        this.mobilityRows = toRows(this.mobilityDefinitions, defaults.mobility);

        const visibleVariable = Object.fromEntries(
            Object.entries(defaults.variable).filter(([key]) => {
                const def = this.variableDefinitions.find(d => d.key === key);
                return def && !def.disabled;
            })
        );
        this.variableRows = toRows(this.variableDefinitions, visibleVariable);
    }

    _applyUnqDefaults(typeId) {
        const perType = UNQ_CALC_DEFAULTS[typeId];
        if (!perType) return;
        const { referenceSalary, ...variableOverrides } = perType;
        if (referenceSalary != null) this.grossSalaryPerMonth = this._toDisplay(referenceSalary);
        const toRows = (defs, values) =>
            Object.entries(values)
                .map(([key, value]) => {
                    const def = defs.find(d => d.key === key);
                    return def ? { ...this._defToRow(def), value } : null;
                })
                .filter(Boolean);
        const mobilityRows = toRows(this.mobilityDefinitions, UNQ_COMMON_MOBILITY);

        if ('tankkaart_budget' in UNQ_COMMON_MOBILITY && !mobilityRows.some(r => r.key === 'keuze_lease_category')) {
            const leaseDef = this.mobilityDefinitions.find(d => d.key === 'keuze_lease_category');
            if (leaseDef) mobilityRows.unshift(this._defToRow(leaseDef));
        }
        this.mobilityRows = mobilityRows;

        const { ecocheques: _ec, forfaitaire_onkostenvergoeding_maand: _fov, ...visibleValues } = { ...UNQ_COMMON_VARIABLE, ...variableOverrides };
        this.variableRows = toRows(this.variableDefinitions, visibleValues);
    }

    handleFulltimeEquivalentChange(event) {
        const selected = event.detail.value;
        this.fulltimeEquivalent = selected;
        const opt = this.fulltimeEquivalentBaseOptions.find(o => o.id === selected);
        const hours = opt ? this._extractHoursFromUwk(opt.label) : null;
        if (hours !== null) this.avgHoursPerWeekCost = this._toDisplay(hours);
    }

    _extractHoursFromUwk(text) {
        if (!text) return null;
        const match = text.match(/(\d+(?:[.,]\d+)?)\s*u\/wk/i);
        if (!match) return null;
        const num = Number(match[1].replace(',', '.'));
        return Number.isFinite(num) ? num : null;
    }

    handleAddMobility(event) {
        const def = this.mobilityDefinitions.find(d => d.key === event.detail.value);
        if (!def) return;
        this.mobilityRows = [...this.mobilityRows, this._defToRow(def)];
    }

    handleMobilityValueChange(event) {
        const { key } = event.target.dataset;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this.mobilityRows = this.mobilityRows.map(r => r.key === key ? { ...r, value } : r);
    }

    handleAddVariable(event) {
        const selected = event.detail.value;
        this.variableAddValue = null;
        if (selected === SELECT_ALL_VALUE) {
            this._addAllRemainingVariables();
            return;
        }
        const def = this.variableDefinitions.find(d => d.key === selected);
        if (def) this.variableRows = [...this.variableRows, this._defToRow(def)];
    }

    _addAllRemainingVariables() {
        const used = new Set(this.variableRows.map(r => r.key));
        const toAdd = this.variableDefinitions.filter(d => !used.has(d.key)).map(d => this._defToRow(d));
        this.variableRows = [...this.variableRows, ...toAdd];
    }

    handleVariableValueChange(event) {
        const { key } = event.target.dataset;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this.variableRows = this.variableRows.map(r => r.key === key ? { ...r, value } : r);
    }

    handleRemoveRow(event) {
        const { section, key } = event.currentTarget.dataset;
        if (section === 'mobility') {
            this.mobilityRows = this.mobilityRows.filter(r => r.key !== key);
        } else {
            this.variableRows = this.variableRows.filter(r => r.key !== key);
        }
    }

    _toDateOnly(v) {
        if (!v) return null;
        const s = String(v);
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        return m ? m[1] : s;
    }

    _defToRow(def) {
        return {
            key: def.key,
            label: def.label,
            isPicklist: def.isPicklist,
            unit: def.unit,
            options: def.options,
            value: def.defaultValue,
            disabled: !!def.disabled,
            perHour: null
        };
    }

    _initRows() {
        this.mobilityRows = this.defaultMobilityKeys
            .map(k => this.mobilityDefinitions.find(d => d.key === k))
            .filter(Boolean)
            .map(d => this._defToRow(d));
        this.variableRows = this.defaultVariableKeys
            .map(k => this.variableDefinitions.find(d => d.key === k))
            .filter(Boolean)
            .map(d => this._defToRow(d));
    }

    handleReset() {
        this._qualityChecks       = [];
        this._formType            = undefined;
        this.freelancerName       = '';
        this.description          = '';
        this.candidateId          = null;
        this.candidate            = '';
        this.request              = '';
        this.staffingRequestId    = null;
        this.calculationType      = '';
        this.specialization       = '';
        this.calculationMethod    = '';
        this.avgHoursPerWeekSales = null;
        this.avgDaysPerWeekSales  = null;
        this.avgHoursPerWeekCost  = null;
        this.avgDaysPerWeekCost   = null;
        this.marginPct            = null;
        this.salesPricePerHour    = null;
        this.salesPricePerDay     = null;
        this.grossSalaryPerMonth  = null;
        this.refSalaryUnit        = '';
        this.refSalaryUnitHours   = 160;
        this.carCost              = 0;
        this.carCostUnit          = 'H';
        this.leaveOfAbsence       = false;
        this.createdDate          = new Date().toISOString().split('T')[0];
        this.calculateFromDate    = null;
        this.kpbStatus            = '';
        this.consultant           = '';
        this.fulltimeEquivalent   = '';
        this.freelancerOtherCosts = null;
        this.totalCostPerHourExcl = null;
        this.totalCostPerDay      = null;
        this.totalCostPerMonth    = null;
        this.salaryCost           = null;
        this.carCostCalc          = null;
        this.otherCostCalc        = null;
        this._initRows();
    }

    async handleClose() {
        console.log('[kpbPage] handleClose — callingRecordId:', this.callingRecordId, '| navigationMode:', this.navigationMode, '| applicationId:', this.applicationId, '| kpbId:', this.kpbId, '| isPotentialVoorstelling:', this.isPotentialVoorstelling);
        if (this.isPotentialVoorstelling && this.applicationId && this.kpbId) {
            try { await linkKpbToApplication({ applicationId: this.applicationId, kpbId: this.kpbId, costPerHour: this._savedSalesPricePerHour ?? null, margin: this._savedMargin ?? null }); } catch (_) {  }
        }
        if (this.applicationId) getRecordNotifyChange([{ recordId: this.applicationId }]);
        this.dispatchEvent(new CustomEvent('close', { detail: { saved: false } }));
        if (this._returnToCaller()) return;
        this._navigateFlow();
    }

    _returnToCaller() {
        console.log('[kpbPage] _returnToCaller — callingRecordId:', this.callingRecordId);
        if (!this.callingRecordId) {
            console.log('[kpbPage] _returnToCaller — no callingRecordId, falling through to flow navigation');
            return false;
        }

        const url = '/lightning/r/' + this.callingRecordId + '/view';
        console.log('[kpbPage] _returnToCaller — navigating via window.location to:', url);
        window.location.assign(url);
        return true;
    }

    _navigateFlow() {
        if (this.navigationMode === 'NEXT') {
            this.dispatchEvent(new FlowNavigationNextEvent());
        } else {
            this.dispatchEvent(new FlowNavigationFinishEvent());
        }
    }

    _apiError(result) {
        try {
            const body = JSON.parse(result.result);
            const errors = body?.error_message?.errors;
            if (Array.isArray(errors) && errors.length) {
                return errors.map(e => e.error_message).join(' | ');
            }
        } catch (e) {  }
        return `HTTP ${result.httpCode}: ${result.result}`;
    }

    _showQualityChecks(raw) {
        const checks = (raw?.costgroup || raw)?.quality_checks;
        if (!Array.isArray(checks)) return;
        for (const check of checks) {
            if (check.message) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Opgelet',
                    message: check.message,
                    variant: 'warning',
                    mode: 'sticky'
                }));
            }
        }
    }

    _numericFieldRules = [
        { field: 'avgDaysPerWeekCost',  label: 'Gem. dagen/week',           min: 1,     max: 7,      minLabel: '1',     maxLabel: '7',       required: true  },
        { field: 'avgHoursPerWeekCost', label: 'Gem. uren/week (kostprijs)', min: 0,     max: 1000,   minLabel: '0',     maxLabel: '1000',    required: false },
        { field: 'grossSalaryPerMonth', label: 'Referentieloon',             min: 0,     max: 100000, minLabel: '0',     maxLabel: '100.000', required: false },
        { field: 'avgDaysPerWeekSales', label: 'Gem. dagen/week (verkoop)',  min: 1,     max: 7,      minLabel: '1',     maxLabel: '7',       required: true  },
        { field: 'avgHoursPerWeekSales',label: 'Gem. uren/week (verkoop)',   min: 0,     max: 1000,   minLabel: '0',     maxLabel: '1000',    required: false },
        { field: 'marginPct',           label: 'Marge',                      min: -1000, max: 1000,   minLabel: '-1000', maxLabel: '1000',    required: false },
        { field: 'salesPricePerHour',   label: 'Verkoopprijs/uur',           min: 0,     max: 1000,   minLabel: '0',     maxLabel: '1000',    required: false },
        { field: 'salesPricePerDay',    label: 'Verkoopprijs/dag',           min: 0,     max: 100000, minLabel: '0',     maxLabel: '100.000', required: false },
    ];

    _parseDecimal(raw) {
        if (raw === null || raw === undefined || raw === '') return { empty: true, value: null };
        if (typeof raw === 'number') return { empty: false, value: Number.isFinite(raw) ? raw : NaN };
        const cleaned = String(raw).trim().replace(/\./g, '').replace(',', '.');
        const num = Number(cleaned);
        return { empty: false, value: Number.isFinite(num) ? num : NaN };
    }

    _validateNumericFields() {
        const errors = [];
        for (const rule of this._numericFieldRules) {
            const range = `tussen ${rule.minLabel} en ${rule.maxLabel}`;
            const { empty, value } = this._parseDecimal(this[rule.field]);
            if (empty) {
                if (rule.required) {
                    errors.push({ title: rule.label, message: `Waarde moet liggen ${range}.` });
                }
                continue;
            }
            if (Number.isNaN(value)) {
                errors.push({ title: rule.label, message: `${this[rule.field]} is not a valid decimal value. Waarde moet liggen ${range}.` });
            } else if (value < rule.min || value > rule.max) {
                errors.push({ title: rule.label, message: `Waarde moet liggen ${range}.` });
            }
        }
        if (errors.length) {
            for (const e of errors) {
                this.dispatchEvent(new ShowToastEvent({
                    title: e.title,
                    message: e.message,
                    variant: 'error',
                    mode: 'sticky'
                }));
            }
            return false;
        }
        return true;
    }

    _validateSalesPrices() {
        if (this.calculationMethod !== 'Verkoopprijs') return true;
        const hourEmpty = this.salesPricePerHour === null || this.salesPricePerHour === '' || this.salesPricePerHour === undefined;
        const dayEmpty  = this.salesPricePerDay  === null || this.salesPricePerDay  === '' || this.salesPricePerDay  === undefined;
        if (hourEmpty && dayEmpty) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Verkoopprijs ontbreekt',
                message: 'Vul minstens Verkoopprijs / uur of Verkoopprijs / dag in.',
                variant: 'error',
                mode: 'sticky'
            }));
            return false;
        }
        return true;
    }

    async handleCalculate() {
        if (!this._validateNumericFields()) return;
        if (!this._validateSalesPrices()) return;
        this.isLoading = true;
        try {
            const body = this._buildPayload();
            console.log('[kpbPage] handleCalculate — action:', this.action, '| kpbId:', this.kpbId);
            console.log('[kpbPage] handleCalculate — full payload:', body);
            const isNew = this.action === 'NEW' || this.action === 'COPY';
            const result = isNew
                ? await createKpb({ body, pNumber: this.pNumber })
                : await updateKpb({ kpbId: String(this.kpbId), body, pNumber: this.pNumber });
            console.log('[kpbPage] handleCalculate — response httpCode:', result.httpCode, '| success:', result.success, '| body:', result.result);
            if (result.success) {
                if (result.result) {
                    try {
                        const raw = JSON.parse(result.result);
                        this._populate(raw.costgroup || raw, false);
                        this._qualityChecks = (raw?.costgroup || raw)?.quality_checks ?? [];
                        this._showQualityChecks(raw);
                        if (raw?.costgroup?.sales_price_per_hour != null) this._savedSalesPricePerHour = raw.costgroup.sales_price_per_hour;
                        if (raw?.costgroup?.margin != null) this._savedMargin = raw.costgroup.margin;
                    } catch (parseErr) {
                        console.warn('[kpbPage] handleCalculate — could not parse response:', parseErr);
                    }
                }
                if (isNew) this.action = 'EDIT';
                if (this.applicationId) getRecordNotifyChange([{ recordId: this.applicationId }]);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Berekening uitgevoerd.',
                    variant: 'success'
                }));
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Fout bij berekenen',
                    message: this._apiError(result),
                    variant: 'error',
                    mode: 'sticky'
                }));
            }
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Fout bij berekenen',
                message: e.body?.message ?? e.message ?? 'Onbekende fout',
                variant: 'error',
                mode: 'sticky'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    async _performSave() {
        if (!this._validateNumericFields()) return { ok: false };
        if (!this._validateSalesPrices()) return { ok: false };
        const isNew = this.action === 'NEW' || this.action === 'COPY';
        const body = this._buildPayload();
        console.log('[kpbPage] _performSave — action:', this.action, '| kpbId:', this.kpbId);
        console.log('[kpbPage] _performSave — full payload:', body);
        try {
            const result = isNew
                ? await createKpb({ body, pNumber: this.pNumber })
                : await updateKpb({ kpbId: String(this.kpbId), body, pNumber: this.pNumber });
            console.log('[kpbPage] _performSave — response httpCode:', result.httpCode, '| success:', result.success, '| body:', result.result);
            if (!result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Fout bij bewaren',
                    message: this._apiError(result),
                    variant: 'error',
                    mode: 'sticky'
                }));
                return { ok: false, isNew };
            }
            let qualityChecks = [];
            if (result.result) {
                try {
                    const raw = JSON.parse(result.result);
                    qualityChecks = (raw?.costgroup || raw)?.quality_checks ?? [];
                    this._qualityChecks = qualityChecks;
                    this._showQualityChecks(raw);
                    if (isNew) this.action = 'EDIT';
                    if (raw?.costgroup?.id) this.kpbId = raw.costgroup.id;
                    if (raw?.costgroup?.sales_price_per_hour != null) this._savedSalesPricePerHour = raw.costgroup.sales_price_per_hour;
                    if (raw?.costgroup?.margin != null) this._savedMargin = raw.costgroup.margin;
                } catch (_) {  }
            }
            return { ok: qualityChecks.filter(c => c.constraint !== 'PSG_APPROVE_MARGIN').length === 0, isNew };
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Fout bij bewaren',
                message: e.body?.message ?? e.message ?? 'Onbekende fout',
                variant: 'error',
                mode: 'sticky'
            }));
            return { ok: false, isNew };
        }
    }

    async handleSave() {
        this.isLoading = true;
        try {
            const { ok, isNew } = await this._performSave();
            if (ok) {
                if (this.isPotentialVoorstelling && this.applicationId && this.kpbId) {
                    try { await linkKpbToApplication({ applicationId: this.applicationId, kpbId: this.kpbId, costPerHour: this._savedSalesPricePerHour ?? null, margin: this._savedMargin ?? null }); } catch (_) {  }
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: isNew ? 'Kostprijsberekening aangemaakt.' : 'Kostprijsberekening aangepast.',
                    variant: 'success'
                }));
                if (this.applicationId) getRecordNotifyChange([{ recordId: this.applicationId }]);
                this.dispatchEvent(new CustomEvent('close', { detail: { saved: true } }));
                if (this._returnToCaller()) return;
                this._navigateFlow();
            }
        } finally {
            this.isLoading = false;
        }
    }

    _toNumber(v) {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        const cleaned = String(v).trim().replace(/\./g, '').replace(',', '.');
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
    }

    _buildPayload() {
        const isNew = this.action === 'NEW' || this.action === 'COPY';
        const brand = normalizeBrand(this.brand) || this.userBrand;
        const costgroup = {
            payroll_id:              isNew ? (brand === 'UNQ' ? 14001 : 6) : this.number,
            unit_id:                 isNew ? (brand === 'UNQ' ? 14023 : 3855) : this.unitId,
            simulation_type:         this.simulationType || 'EMP',
            avg_days_per_week_cost:  this._toNumber(this.avgDaysPerWeekCost),
            avg_days_per_week_sales: this._toNumber(this.avgDaysPerWeekSales),
            avg_hours_per_week_cost: this._toNumber(this.avgHoursPerWeekCost),
            avg_hours_per_week_sales:this._toNumber(this.avgHoursPerWeekSales),
            calculate_from_date:     this._toDateOnly(this.calculateFromDate),
            calculation_method:      this.calculationMethod === 'Verkoopprijs' ? '1' : '2',
            calculation_type_id:     this.calculationType ? Number(this.calculationType) : null,
            car_cost:                isNew ? 0 : this.carCost,
            car_cost_unit:           isNew ? 'H' : this.carCostUnit,
            description:             this.description || null,
            employee:                isNew
                ? { id: Number(this.genericEmployeeId), number: Number(this.resolvedEmployeeNumber ?? this.genericEmployeeNumber), type: this.formType === 'Freelancer' ? '1' : '2' }
                : { id: this.employeeSpotId, number: this.employeeNumber, name: this.candidateName || this.candidate, type: this.employeeType, delete_status: this.employeeDeleteStatus },
            fulltime_equivalent_id:  this.fulltimeEquivalent ? Number(this.fulltimeEquivalent) : (isNew ? 4 : null),
            label_id:                this.specialization ? Number(this.specialization) : (isNew ? (brand === 'UNQ' ? 14014 : 7) : this.labelId),
            leave_of_absence:        isNew ? false : this.leaveOfAbsence,
            margin:                  this._toNumber(this.marginPct),
            other_cost:              this.formType === 'Freelancer' ? null : this._toNumber(this.freelancerOtherCosts),
            other_cost_unit:         isNew ? 'H' : this.otherCostUnit,
            reference_salary: {
                salary:     this._toNumber(this.grossSalaryPerMonth),
                unit:       this.refSalaryUnit || null,
                unit_hours: this.refSalaryUnitHours || 160
            },
            sales_price_per_day:  this._toNumber(this.salesPricePerDay),
            sales_price_per_hour: this._toNumber(this.salesPricePerHour),
            staffing_request: { id: null, number: this.request ? Number(this.request) : null },
            created_by:  this.pNumber,
            components:  this._buildComponents()
        };
        if (!isNew && this.kpbId) costgroup.id = this.kpbId;
        return JSON.stringify({ costgroup });
    }

    _buildComponents() {
        const result = [];
        if (this.formType === 'Freelancer') {
            if (this.freelancerOtherCosts != null && this.freelancerOtherCosts !== '') {
                result.push({
                    component_id:        110,
                    component_type:      'DIV',
                    reference_type_code: null,
                    value: { total: this._toNumber(this.freelancerOtherCosts) }
                });
            }
            return result;
        }
        for (const row of [...this.mobilityRows, ...this.variableRows]) {
            const componentId = KEY_TO_COMPONENT_ID[row.key];
            if (!componentId || row.value == null) continue;
            const componentType = COMPONENT_ID_TO_TYPE[componentId] ?? 'DIV';
            const total = componentType === 'FIX'
                ? 1
                : (this._toNumber(row.value) ?? (row.value === 'Ja' ? 1 : row.value === 'Nee' ? 0 : row.value));
            result.push({
                component_id:        componentId,
                component_type:      componentType,
                reference_type_code: null,
                value: { unit: null, total }
            });
        }
        return result;
    }

    async handleApprove() {
        console.log('[kpbPage] handleApprove — kpbId:', this.kpbId);
        if (!this._validateNumericFields()) return;
        if (!this._validateSalesPrices()) return;
        this.isLoading = true;
        try {
            const body = this._buildPayload();
            const isNew = this.action === 'NEW' || this.action === 'COPY';
            const result = isNew
                ? await createKpb({ body, pNumber: this.pNumber })
                : await updateKpb({ kpbId: String(this.kpbId), body, pNumber: this.pNumber });
            if (!result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Fout bij berekenen',
                    message: this._apiError(result),
                    variant: 'error',
                    mode: 'sticky'
                }));
                return;
            }
            const raw = JSON.parse(result.result);
            this._populate(raw.costgroup || raw, false);
            this._qualityChecks = (raw?.costgroup || raw)?.quality_checks ?? [];
            this._showQualityChecks(raw);
            if (isNew) this.action = 'EDIT';
            const blocking = this._qualityChecks.filter(c => c.constraint !== 'PSG_APPROVE_MARGIN');
            if (blocking.length === 0) {
                this.approvalReason = '';
                this.showApprovalForm = true;
            }
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Fout bij berekenen',
                message: e.body?.message ?? e.message ?? 'Onbekende fout',
                variant: 'error',
                mode: 'sticky'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    handleApprovalReasonChange(event) {
        this.approvalReason = event.target.value;
    }

    handleApprovalCancel() {
        this.showApprovalForm = false;
        this.approvalReason = '';
    }

    async handleApprovalSubmit() {
        if (!this.approvalReason.trim()) return;
        this.showApprovalForm = false;
        this.isLoading = true;
        try {
            const body = JSON.stringify({ reason: this.approvalReason.trim() });
            const result = await requestApproval({ kpbId: String(this.kpbId), body, pNumber: this.pNumber });
            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({ title: 'Goedkeuring aangevraagd.', variant: 'success' }));
            } else {
                this.dispatchEvent(new ShowToastEvent({ title: 'Goedkeuren niet toegelaten.', message: this._apiError(result), variant: 'error', mode: 'sticky' }));
            }
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Goedkeuren niet toegelaten.', message: e.body?.message ?? e.message ?? 'Onbekende fout', variant: 'error', mode: 'sticky' }));
        } finally {
            this.isLoading = false;
            this.approvalReason = '';
        }
    }
}

