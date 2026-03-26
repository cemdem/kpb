import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import USER_BRAND from '@salesforce/schema/User.RGF_BRAND__c';
import CONTACT_FULL_NAME from '@salesforce/schema/Contact.Name';
import getKpb from '@salesforce/apex/KpbController.getKpb';

const SELECT_ALL_VALUE = '__ALL__';

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;
    @api json;

    isLoading = false;
    fetchError = null;
    parseError = null;
    contactId;
    userBrand;
    nummer = null;
    formType = 'Werknemer';
    freelancerName = '';
    typeLabel = 'Werknemer';
    omschrijving = '';
    kandidaat = '';
    aanvraag = '';
    berekeningstype = '';
    specialisatie = '';
    berekeningswijze = '';
    gemUrenPerWeek;
    margePct;
    verkoopPrijsUur;
    brutoloonMaand;
    gemUrenPerWeekKostprijs;
    opgemaaktDatum;
    teRekenenVanaf;
    processtatus = 'In behandeling';
    consultant = 'John Doe';
    voltijdseMaatman = '';
    freelancerAndereKosten = null;
    mobiliteitRows = [];
    variabeleRows = [];
    variabeleAddValue = null;

    formTypeOptions = [
        { label: 'Werknemer', value: 'Werknemer' },
        { label: 'Freelancer', value: 'Freelancer' }
    ];

    berekeningswijzeOptions = [
        { label: 'Verkoopprijs', value: 'Verkoopprijs' },
        { label: 'Marge', value: 'Marge' }
    ];

    maatmanBaseOptions = [
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

    mobiliteitDefinitions = [
        { key: 'keuze_lease_category', label: 'Keuze lease category', isPicklist: true, unit: '', options: [{ label: 'Categorie 1', value: 'Categorie 1' }, { label: 'Categorie 2', value: 'Categorie 2' }, { label: 'Categorie 3', value: 'Categorie 3' }, { label: 'Categorie 4', value: 'Categorie 4' }, { label: 'Categorie 1E', value: 'Categorie 1E' }, { label: 'Categorie 2E', value: 'Categorie 2E' }, { label: 'Categorie 3E', value: 'Categorie 3E' }, { label: 'Categorie 4E', value: 'Categorie 4E' }], defaultValue: null, disabled: false },
        { key: 'tankkaart_budget', label: 'Tankkaart budget', isPicklist: false, unit: '€ per maand', options: [], defaultValue: 300, disabled: false },
        { key: 'bedrijfswagen_netto_inhouding', label: 'Bedrijfswagen netto-inhouding', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
        { key: 'mobiliteitsprogramma', label: 'Mobiliteitsprogramma', isPicklist: true, unit: '', options: [{ label: 'Fleet Family', value: 'Fleet Family' }, { label: 'Fleet Flex', value: 'Fleet Flex' }], defaultValue: null, disabled: false }
    ];

    variabeleDefinitions = [
        { key: 'parkeerkosten', label: 'Parkeerkosten', isPicklist: false, unit: '€ per maand', options: [], defaultValue: null, disabled: false },
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

    defaultMobiliteitKeys = ['keuze_lease_category'];
    defaultVariabeleKeys = ['parkeerkosten', 'maaltijdcheques', 'gsm'];

    get hasData() {
        return !this.isLoading && !this.fetchError;
    }

    get showFormTypeSelector() {
        return this.action === 'NEW';
    }

    get showWerknemer() {
        return this.formType === 'Werknemer';
    }

    get verkoopprijsDisabled() {
        return this.berekeningswijze !== 'Verkoopprijs';
    }

    get berekeningstypeOptions() {
        if (!this.userBrand) return [];
        return [
            { label: `${this.userBrand}-BT1`, value: `${this.userBrand}-BT1` },
            { label: `${this.userBrand}-BT2`, value: `${this.userBrand}-BT2` }
        ];
    }

    get specialisatieOptions() {
        if (!this.userBrand) return [];
        return [
            { label: `${this.userBrand}-SP1`, value: `${this.userBrand}-SP1` },
            { label: `${this.userBrand}-SP2`, value: `${this.userBrand}-SP2` }
        ];
    }

    get voltijdseMaatmanOptions() {
        if (!this.userBrand) return [];
        return this.maatmanBaseOptions.map(opt => {
            const v = `${this.userBrand}-${opt}`;
            return { label: v, value: v };
        });
    }

    get availableMobiliteitOptions() {
        const used = new Set(this.mobiliteitRows.map(r => r.key));
        return this.mobiliteitDefinitions
            .filter(d => !used.has(d.key))
            .map(d => ({ label: d.label, value: d.key }));
    }

    get availableVariabeleOptions() {
        const used = new Set(this.variabeleRows.map(r => r.key));
        const remaining = this.variabeleDefinitions
            .filter(d => !used.has(d.key))
            .map(d => ({ label: d.label, value: d.key }));
        if (remaining.length === 0) return [];
        return [{ label: 'Selecteer alles', value: SELECT_ALL_VALUE }, ...remaining];
    }

    connectedCallback() {
        this.opgemaaktDatum = new Date().toISOString().split('T')[0];
        this._resetCostRows();
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
        this.nummer         = cg.payroll_id ?? null;
        this.omschrijving   = cg.description ?? '';
        this.kandidaat      = cg.employee?.name ?? '';
        this.aanvraag       = cg.staffing_request?.name ?? '';
        this.berekeningstype  = cg.calculation_type_id ?? '';
        this.berekeningswijze = cg.calculation_method ?? '';
        this.gemUrenPerWeek   = cg.avg_hours_per_week_sales ?? null;
        this.margePct         = cg.margin ?? null;
        this.verkoopPrijsUur  = cg.sales_price_per_hour ?? null;
        this.brutoloonMaand   = cg.real_salary ?? null;
        this.gemUrenPerWeekKostprijs = cg.avg_hours_per_week_cost ?? null;
        this.voltijdseMaatman = cg.fulltime_equivalent_id ?? '';
        this.teRekenenVanaf   = cg.calculate_from_date ?? null;
        this.processtatus     = cg.process_status ?? 'In behandeling';
        if (cg.first_approved_on) this.opgemaaktDatum = cg.first_approved_on;
        if (cg.simulation_type)   this.formType = cg.simulation_type;
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

    @wire(getRecord, { recordId: '$contactId', fields: [CONTACT_FULL_NAME] })
    _wiredContact({ data }) {
        if (data) this.kandidaat = getFieldValue(data, CONTACT_FULL_NAME);
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

    handleVoltijdseMaatmanChange(event) {
        const selected = event.detail.value;
        this.voltijdseMaatman = selected;
        const raw = selected && this.userBrand ? selected.replace(`${this.userBrand}-`, '') : selected;
        const hours = this._extractHoursBeforeUwk(raw);
        if (hours !== null) this.gemUrenPerWeekKostprijs = hours;
    }

    _extractHoursBeforeUwk(text) {
        if (!text) return null;
        const match = text.match(/(\d+(?:[.,]\d+)?)\s*u\/wk/i);
        if (!match) return null;
        const num = Number(match[1].replace(',', '.'));
        return Number.isFinite(num) ? num : null;
    }

    handleAddMobiliteit(event) {
        const def = this.mobiliteitDefinitions.find(d => d.key === event.detail.value);
        if (!def) return;
        this.mobiliteitRows = [...this.mobiliteitRows, this._defToRow(def)];
    }

    handleMobiliteitValueChange(event) {
        const { key } = event.target.dataset;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this.mobiliteitRows = this.mobiliteitRows.map(r => r.key === key ? { ...r, value } : r);
    }

    handleAddVariabele(event) {
        const selected = event.detail.value;
        this.variabeleAddValue = null;
        if (selected === SELECT_ALL_VALUE) {
            this._addAllRemainingVariabele();
            return;
        }
        const def = this.variabeleDefinitions.find(d => d.key === selected);
        if (def) this.variabeleRows = [...this.variabeleRows, this._defToRow(def)];
    }

    _addAllRemainingVariabele() {
        const used = new Set(this.variabeleRows.map(r => r.key));
        const toAdd = this.variabeleDefinitions.filter(d => !used.has(d.key)).map(d => this._defToRow(d));
        this.variabeleRows = [...this.variabeleRows, ...toAdd];
    }

    handleVariabeleValueChange(event) {
        const { key } = event.target.dataset;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        this.variabeleRows = this.variabeleRows.map(r => r.key === key ? { ...r, value } : r);
    }

    handleRemoveRow(event) {
        const { section, key } = event.currentTarget.dataset;
        if (section === 'mobiliteit') {
            this.mobiliteitRows = this.mobiliteitRows.filter(r => r.key !== key);
        } else {
            this.variabeleRows = this.variabeleRows.filter(r => r.key !== key);
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

    _resetCostRows() {
        this.mobiliteitRows = this.defaultMobiliteitKeys
            .map(k => this.mobiliteitDefinitions.find(d => d.key === k))
            .filter(Boolean)
            .map(d => this._defToRow(d));
        this.variabeleRows = this.defaultVariabeleKeys
            .map(k => this.variabeleDefinitions.find(d => d.key === k))
            .filter(Boolean)
            .map(d => this._defToRow(d));
    }

    handleReset() {
        this.formType = 'Werknemer';
        this.freelancerName = '';
        this.omschrijving = '';
        this.kandidaat = '';
        this.aanvraag = '';
        this.berekeningstype = '';
        this.specialisatie = '';
        this.berekeningswijze = '';
        this.gemUrenPerWeek = null;
        this.margePct = null;
        this.verkoopPrijsUur = null;
        this.brutoloonMaand = null;
        this.gemUrenPerWeekKostprijs = null;
        this.opgemaaktDatum = new Date().toISOString().split('T')[0];
        this.teRekenenVanaf = null;
        this.consultant = '';
        this.voltijdseMaatman = '';
        this.freelancerAndereKosten = null;
        this._resetCostRows();
    }

    _wip() {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Work in progress',
            message: 'Deze functionaliteit is nog niet beschikbaar.',
            variant: 'info'
        }));
    }

    handleBewaren() { this._wip(); }
    handleGoedkeuren() { this._wip(); }
    handleBereken() { this._wip(); }
}
