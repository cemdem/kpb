import { LightningElement, wire, api } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import USER_BRAND from '@salesforce/schema/User.RGF_BRAND__c';
import getKpb from '@salesforce/apex/KpbController.getKpb';
import getContactsByBrand from '@salesforce/apex/KpbController.getContactsByBrand';
import getConsultantName from '@salesforce/apex/KpbController.getConsultantName';

const SELECT_ALL_VALUE = '__ALL__';

const COMPONENT_ID_TO_KEY = {
    1:     'keuze_lease_category',
    2:     'tankkaart_budget',
    3:     'bedrijfswagen_netto_inhouding',
    105:   'maaltijdcheques',
    108:   'gsm',
    113:   'andere_kosten',
    114:   'parkingkosten',
    11000: 'projectpremie_per_maand',
};

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;
    @api json;
    @api brand;

    isLoading = false;
    fetchError = null;
    parseError = null;
    userBrand;
    number = null;
    formType = 'Werknemer';
    freelancerName = '';
    typeLabel = 'Werknemer';
    description = '';
    candidateId = null;
    candidate = '';
    candidateOptions = [];
    request = '';
    calculationType = '';
    specialization = '';
    calculationMethod = '';
    avgHoursPerWeekSales;
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
    simulationType = null;

    formTypeOptions = [
        { label: 'Werknemer', value: 'Werknemer' },
        { label: 'Freelancer', value: 'Freelancer' }
    ];

    calculationMethodOptions = [
        { label: 'Verkoopprijs', value: 'Verkoopprijs' },
        { label: 'Marge', value: 'Marge' }
    ];

    specializationOptions = [
        { label: 'Consulting',              value: 'Consulting' },
        { label: 'Finance projectsourcing', value: 'Finance projectsourcing' },
        { label: 'HR projectsourcing',      value: 'HR projectsourcing' },
        { label: 'Office projectsourcing',  value: 'Office projectsourcing' },
        { label: 'Outplacement',            value: 'Outplacement' },
        { label: 'Projectsourcing',         value: 'Projectsourcing' }
    ];

    fulltimeEquivalentBaseOptions = [
        '01 Bedienden 40 u/wk',
        '02 Bedienden 38 u/wk',
        '07 Bedienden 39 u/wk',
        '20 Bedienden 39,5 u/wk',
        '21 Bedienden 38,5 u/wk',
        '24 Bedienden 39,65 u/wk',
        '37,5 u/wk',
        '38,67 u/wk',
        '38,75 u/wk',
        '39,17 u/wk',
        '99 Bedienden 12 ADV 40 u/wk'
    ];

    mobilityDefinitions = [
        { key: 'keuze_lease_category', label: 'Keuze lease category', isPicklist: true, unit: '', options: [{ label: 'Categorie 1', value: 'Categorie 1' }, { label: 'Categorie 2', value: 'Categorie 2' }, { label: 'Categorie 3', value: 'Categorie 3' }, { label: 'Categorie 4', value: 'Categorie 4' }, { label: 'Categorie 1E', value: 'Categorie 1E' }, { label: 'Categorie 2E', value: 'Categorie 2E' }, { label: 'Categorie 3E', value: 'Categorie 3E' }, { label: 'Categorie 4E', value: 'Categorie 4E' }], defaultValue: null, disabled: false },
        { key: 'tankkaart_budget', label: 'Tankkaart budget', isPicklist: false, unit: '€ per maand', options: [], defaultValue: 300, disabled: false },
        { key: 'bedrijfswagen_netto_inhouding', label: 'Bedrijfswagen netto-inhouding', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'mobiliteitsprogramma', label: 'Mobiliteitsprogramma', isPicklist: true, unit: '', options: [{ label: 'Fleet Family', value: 'Fleet Family' }, { label: 'Fleet Flex + Mobiliteitsbudget', value: 'Fleet Flex + Mobiliteitsbudget' }, { label: 'Fleet Flex', value: 'Fleet Flex' }, { label: 'Mobiliteitsbudget', value: 'Mobiliteitsbudget' }], defaultValue: null, disabled: false }
    ];

    variableDefinitions = [
        { key: 'maaltijdcheques', label: 'Maaltijdcheques', isPicklist: true, unit: '€ per dag', options: [{ label: '', value: '' }, { label: '6,91 WG + 1,09 WN', value: '6,91 WG + 1,09 WN' }], defaultValue: '', disabled: false },
        { key: 'gsm', label: 'GSM', isPicklist: true, unit: '€ per maand', options: [{ label: '0', value: '0' }, { label: '19', value: '19' }], defaultValue: '0', disabled: false },
        { key: '3de_betaler_trein_aantal_km_enkel', label: '3de betaler trein aantal km enkel', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: '3e_betaler_tram_bus_metro', label: '3e betaler (tram/bus/metro)', isPicklist: true, unit: '', options: [{ label: 'De Lijn', value: 'De Lijn' }, { label: 'MIVB', value: 'MIVB' }, { label: 'Tec', value: 'Tec' }], defaultValue: null, disabled: false },
        { key: 'andere_kosten', label: 'Andere kosten', isPicklist: false, unit: '€ per jaar', options: [], defaultValue: null, disabled: false },
        { key: 'bonus_commissies', label: 'Bonus/Commissies', isPicklist: false, unit: '€ per jaar', options: [], defaultValue: null, disabled: false },
        { key: 'correctie_standaard_leegloop', label: 'Correctie standaard leegloop', isPicklist: false, unit: '', options: [], defaultValue: null, disabled: false },
        { key: 'ecocheques', label: 'Ecocheques', isPicklist: false, unit: '€ per jaar', options: [], defaultValue: 0, disabled: true },
        { key: 'extra_opleiding', label: 'Extra opleiding', isPicklist: false, unit: '€ per jaar', options: [], defaultValue: null, disabled: false },
        { key: 'extra_opzegvergoeding', label: 'Extra opzegvergoeding', isPicklist: false, unit: '€ per jaar', options: [], defaultValue: null, disabled: false },
        { key: 'fietsvergoeding_aantal_km_enkel', label: 'Fietsvergoeding aantal km enkel', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'forfaitaire_onkostenvergoeding_maand', label: 'Forfaitaire onkostenvergoeding (maand)', isPicklist: false, unit: '€ per maand', options: [], defaultValue: 0, disabled: true },
        { key: 'gsm_tussenkomst_aankoop_toestel', label: 'GSM tussenkomst aankoop toestel', isPicklist: true, unit: '€ per jaar', options: [{ label: '0', value: '0' }, { label: '100', value: '100' }, { label: '150', value: '150' }, { label: '300', value: '300' }], defaultValue: '0', disabled: false },
        { key: 'internetvergoeding', label: 'Internetvergoeding', isPicklist: true, unit: '€ per maand', options: [{ label: '0', value: '0' }, { label: '20', value: '20' }], defaultValue: '0', disabled: false },
        { key: 'parkingkosten', label: 'Parkingkosten', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'ploegenarbeid_volgens_voorwaarden', label: 'Ploegenarbeid volgens voorwaarden', isPicklist: true, unit: '', options: [{ label: '', value: '' }, { label: 'Ja', value: 'Ja' }, { label: 'Nee', value: 'Nee' }], defaultValue: '', disabled: false },
        { key: 'projectpremie_per_maand', label: 'Projectpremie per maand', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_trein_aantal_km_enkel', label: 'Soc. abon. trein aantal km enkel', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_tram_metro_bus_aantal_km_enkel', label: 'Soc. abon. aantal km enkel (tram, metro, bus)', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'soc_abon_prive_vervoer_auto_aantal_km_enkel', label: 'Soc. abon. privé vervoer auto aantal km enkel', isPicklist: false, unit: 'Kilometers per dag', options: [], defaultValue: null, disabled: false },
        { key: 'televergoeding', label: 'Televergoeding', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'auteursrechten', label: 'Auteursrechten', isPicklist: false, unit: '%', options: [], defaultValue: null, disabled: false },
        { key: 'brutopremie_mobiliteit', label: 'Brutopremie Mobiliteit', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'kost_leasefiets', label: 'Kost leasefiets', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false }
    ];

    defaultMobilityKeys = ['keuze_lease_category'];
    defaultVariableKeys = ['parkingkosten', 'maaltijdcheques', 'gsm'];

    get hasData() {
        return !this.isLoading && !this.fetchError;
    }

    get showFormTypeSelector() {
        return this.action === 'NEW';
    }

    get showEmployee() {
        return this.formType === 'Werknemer';
    }

    get showApprove() {
        return this.simulationType === 'WRK';
    }

    get salesPriceDisabled() {
        return this.calculationMethod !== 'Verkoopprijs';
    }

    get marginDisabled() {
        return this.calculationMethod !== 'Marge';
    }

    get calculationTypeOptions() {
        if (this.brand === 'UNQ') {
            return [
                'Ad hoc consultant',
                'Advanced consultant',
                'Expert consultant',
                'Project consultant',
                'Project consultant BNP',
                'Skilled consultant',
                'Specialist/Gold consultant',
                'Trainee consultant'
            ].map(v => ({ label: v, value: v }));
        }
        if (this.brand === 'BPL') {
            return [
                'Junior',
                'Medior',
                'Senior'
            ].map(v => ({ label: v, value: v }));
        }
        if (!this.userBrand) return [];
        return [
            { label: `${this.userBrand}-BT1`, value: `${this.userBrand}-BT1` },
            { label: `${this.userBrand}-BT2`, value: `${this.userBrand}-BT2` }
        ];
    }

    get fulltimeEquivalentOptions() {
        if (!this.userBrand) return [];
        return this.fulltimeEquivalentBaseOptions.map(opt => {
            const v = `${this.userBrand}-${opt}`;
            return { label: v, value: v };
        });
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
        this.createdDate = new Date().toISOString().split('T')[0];
        this._initRows();
        if (this.action === 'NEW') return;
        if (this.recordId) {
            this._fetchKpb();
        } else if (this.json) {
            this._parse();
        }
    }

    async _fetchKpb() {
        this.isLoading = true;
        try {
            const result = await getKpb({ recordId: this.recordId });
            if (result.success) {
                const raw = JSON.parse(result.result);
                this._populate(raw.costgroup || raw);
            } else {
                this.fetchError = `HTTP ${result.httpCode}: ${result.result}`;
            }
        } catch (e) {
            this.fetchError = e.body?.message ?? e.message ?? 'Unknown error';
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

    _populate(cg) {
        this.number               = cg.payroll_id ?? null;
        this.description          = cg.description ?? '';
        this.candidate            = cg.employee?.name ?? '';
        this.request              = cg.staffing_request?.name ?? '';
        this.calculationType      = cg.calculation_type_id ?? '';
        this.calculationMethod    = cg.calculation_method ?? '';
        this.avgHoursPerWeekSales = cg.avg_hours_per_week_sales ?? null;
        this.marginPct            = cg.margin ?? null;
        this.salesPricePerHour    = cg.sales_price_per_hour ?? null;
        this.grossSalaryPerMonth  = cg.real_salary ?? null;
        this.avgHoursPerWeekCost  = cg.avg_hours_per_week_cost ?? null;
        this.avgDaysPerWeekCost   = cg.avg_days_per_week_cost ?? null;
        this.salesPricePerDay     = cg.sales_price_per_day ?? null;
        this.fulltimeEquivalent   = cg.fulltime_equivalent_id ?? '';
        this.calculateFromDate    = cg.calculate_from_date ?? null;
        this.kpbStatus            = cg.status ?? '';
        if (cg.first_approved_on) this.createdDate = cg.first_approved_on;
        if (cg.simulation_type)   this.simulationType = cg.simulation_type;
        if (Array.isArray(cg.components)) {
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
            let value = comp.unit_quantity ?? comp.value?.per_month ?? comp.value?.total ?? null;
            if (key === 'bedrijfswagen_netto_inhouding' && value != null) value = Math.abs(value);
            if (mobilityKeySet.has(key)) {
                const def = this.mobilityDefinitions.find(d => d.key === key);
                newMobility.push({ ...this._defToRow(def), value });
            } else if (variableKeySet.has(key)) {
                const def = this.variableDefinitions.find(d => d.key === key);
                newVariable.push({ ...this._defToRow(def), value });
            }
        }
        if (newMobility.length > 0) this.mobilityRows = newMobility;
        if (newVariable.length > 0) this.variableRows = newVariable;
    }

    @wire(CurrentPageReference)
    _readPageRef(pageRef) {
        if (pageRef?.state?.c__recordId) {
            this.contactId = pageRef.state.c__recordId;
        }
    }

    @wire(getRecord, { recordId: USER_ID, fields: [USER_BRAND] })
    _wiredUser({ data }) {
        if (data) this.userBrand = getFieldValue(data, USER_BRAND);
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
    }

    handleFreelancerNameChange(event) {
        this.freelancerName = event.target.value;
    }

    handleFieldChange(event) {
        this[event.target.dataset.field] = event.target.value;
    }

    handleFulltimeEquivalentChange(event) {
        const selected = event.detail.value;
        this.fulltimeEquivalent = selected;
        const raw = selected && this.userBrand ? selected.replace(`${this.userBrand}-`, '') : selected;
        const hours = this._extractHoursFromUwk(raw);
        if (hours !== null) this.avgHoursPerWeekCost = hours;
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

    _defToRow(def) {
        return {
            key: def.key,
            label: def.label,
            isPicklist: def.isPicklist,
            unit: def.unit,
            options: def.options,
            value: def.defaultValue,
            disabled: !!def.disabled
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
        this.formType           = 'Werknemer';
        this.freelancerName     = '';
        this.description        = '';
        this.candidateId        = null;
        this.candidate          = '';
        this.request            = '';
        this.calculationType    = '';
        this.specialization     = '';
        this.calculationMethod  = '';
        this.avgHoursPerWeekSales = null;
        this.marginPct          = null;
        this.salesPricePerHour  = null;
        this.grossSalaryPerMonth = null;
        this.avgHoursPerWeekCost  = null;
        this.avgDaysPerWeekCost   = null;
        this.salesPricePerDay     = null;
        this.createdDate          = new Date().toISOString().split('T')[0];
        this.calculateFromDate    = null;
        this.kpbStatus            = '';
        this.consultant           = '';
        this.fulltimeEquivalent   = '';
        this.freelancerOtherCosts = null;
        this._initRows();
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleCalculate() {}
    handleSave()      {}
    handleApprove()   {}
}
