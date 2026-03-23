import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getKpb from '@salesforce/apex/KpbController.getKpb';

function formatLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fieldInputType(val) {
    if (typeof val === 'boolean') return 'checkbox';
    if (typeof val === 'number') return 'number';
    return 'text';
}

function isPrimitive(val) {
    return val === null || typeof val !== 'object';
}

function toFields(obj, prefix) {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
        .filter(([, v]) => isPrimitive(v))
        .map(([k, v], i) => ({
            id: `${prefix}-${k}-${i}`,
            key: k,
            label: formatLabel(k),
            value: v === null ? '' : (typeof v === 'boolean' ? v : String(v)),
            inputType: fieldInputType(v),
            isCheckbox: typeof v === 'boolean'
        }));
}

function compKey(comp, i) {
    return comp.id != null ? String(comp.id) : `idx-${i}`;
}

const NESTED_KEYS = [
    'agreement_detail',
    'employee',
    'project',
    'reason_refusal',
    'reference_salary',
    'staffing_request',
    'audit'
];

const NEW_COMPONENT_TEMPLATE = {
    id: null,
    legacy_id: null,
    component_type: null,
    avg_day_per_month: null,
    avg_hours_per_day: null,
    parent_component_id: null,
    unit: null,
    unit_quantity: null,
    value: { total: null, per_day: null, per_hour: null, per_hour_excl: null, per_month: null },
    audit: { created_by: null, created_on: null, modified_by: null, modified_on: null }
};

const NEW_COSTGROUP_TEMPLATE = {
    payroll_id: null,
    account: null,
    agreement_id: null,
    approve_margin: null,
    avg_days_per_week_cost: null,
    avg_days_per_week_sales: null,
    avg_hours_per_week_cost: null,
    avg_hours_per_week_sales: null,
    calculate_from_date: null,
    calculation_method: null,
    calculation_type_id: null,
    car_cost: null,
    car_cost_unit: null,
    description: null,
    first_approved_on: null,
    first_validated_on: null,
    fulltime_equivalent_id: null,
    indexation_date: null,
    indexation_operator_id: null,
    label_id: null,
    last_transaction_id: null,
    leave_of_absence: false,
    margin: null,
    approved_margin: null,
    old_calculation: false,
    old: false,
    other_cost: null,
    other_cost_unit: null,
    part_time_factor: null,
    previous_employer: false,
    process_status: null,
    proposal_calculation_id: null,
    real_salary: null,
    remarks: null,
    salary_cost: null,
    salary_cost_unit: null,
    sales_price_per_day: null,
    sales_price_per_hour: null,
    simulation_type: null,
    status: null,
    total_cost_per_day: null,
    total_cost_per_hour_excl: null,
    total_cost_per_month: null,
    unit_id: null,
    weight: null,
    creation_user_id: null,
    agreement_detail: { id: null, name: null, annex_remark: null },
    employee: { id: null, number: null, name: null, type: null, delete_status: null },
    project: { id: null, name: null },
    reason_refusal: { code: null, description: null },
    reference_salary: { before_indexation: null, salary: null, unit: null, unit_hours: null },
    staffing_request: { id: null, name: null },
    audit: { created_by: null, created_on: null, modified_by: null, modified_on: null },
    components: []
};

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;
    @api json;

    @track _costgroup = null;
    @track parseError = null;
    @track fetchError = null;
    @track isLoading = false;
    @track _visibleComponentIds = [];
    @track _selectedCompId = '';

    _initialCostgroup = null;

    connectedCallback() {
        if (this.action === 'NEW') {
            this._costgroup = JSON.parse(JSON.stringify(NEW_COSTGROUP_TEMPLATE));
            return;
        }
        if (this.recordId) {
            this._fetchKpb();
        } else {
            this._parse();
        }
    }

    async _fetchKpb() {
        this.isLoading = true;
        try {
            const result = await getKpb({ recordId: this.recordId });
            if (result.success) {
                const raw = JSON.parse(result.result);
                this._costgroup = raw.costgroup || raw;
                this._initialCostgroup = JSON.parse(JSON.stringify(this._costgroup));
            } else {
                this.fetchError = `HTTP ${result.httpCode}: ${result.result}`;
            }
        } catch (e) {
            this.fetchError = (e.body && e.body.message) ? e.body.message : (e.message || 'Unknown error');
        } finally {
            this.isLoading = false;
        }
    }

    _parse() {
        if (!this.json) return;
        try {
            const raw = JSON.parse(this.json);
            this._costgroup = raw.costgroup || raw;
            this._initialCostgroup = JSON.parse(JSON.stringify(this._costgroup));
        } catch (e) {
            this.parseError = e.message;
        }
    }

    get hasData() {
        return !!this._costgroup;
    }

    get mainFields() {
        if (!this._costgroup) return [];
        return toFields(this._costgroup, 'main');
    }

    get sections() {
        if (!this._costgroup) return [];
        return NESTED_KEYS
            .filter(k => {
                const v = this._costgroup[k];
                return v && typeof v === 'object' && !Array.isArray(v);
            })
            .map(k => ({
                name: k,
                label: formatLabel(k),
                fields: toFields(this._costgroup[k], k)
            }));
    }

    get selectedCompId() {
        return this._selectedCompId;
    }

    get componentOptions() {
        if (!this._costgroup || !Array.isArray(this._costgroup.components)) return [];
        return this._costgroup.components
            .map((comp, i) => ({ comp, i }))
            .filter(({ comp, i }) => !this._visibleComponentIds.includes(compKey(comp, i)))
            .map(({ comp, i }) => ({
                label: `Component ${i + 1} — ${comp.component_type || ''}`,
                value: compKey(comp, i)
            }));
    }

    get hasComponentOptions() {
        return this.componentOptions.length > 0;
    }

    get isNewAction() {
        return this.action === 'NEW';
    }

    get visibleComponents() {
        if (!this._costgroup || !Array.isArray(this._costgroup.components)) return [];
        return this._costgroup.components
            .map((comp, i) => ({ comp, i }))
            .filter(({ comp, i }) => this._visibleComponentIds.includes(compKey(comp, i)))
            .map(({ comp, i }) => {
                const key = compKey(comp, i);
                return {
                    id: key,
                    label: `Component ${i + 1} — ${comp.component_type || ''}`,
                    fields: toFields(comp, `comp-${key}`),
                    valueFields: toFields(comp.value || {}, `comp-${key}-value`),
                    auditFields: toFields(comp.audit || {}, `comp-${key}-audit`)
                };
            });
    }

    handleAddComponent() {
        const cg = JSON.parse(JSON.stringify(this._costgroup));
        const newComp = JSON.parse(JSON.stringify(NEW_COMPONENT_TEMPLATE));
        cg.components = [...(cg.components || []), newComp];
        const newIdx = cg.components.length - 1;
        const newKey = compKey(newComp, newIdx);
        this._costgroup = cg;
        this._visibleComponentIds = [...this._visibleComponentIds, newKey];
    }

    handleComponentSelect(event) {
        const selected = event.detail.value;
        if (selected && !this._visibleComponentIds.includes(selected)) {
            this._visibleComponentIds = [...this._visibleComponentIds, selected];
        }
        this._selectedCompId = '';
    }

    handleComponentHide(event) {
        const id = event.currentTarget.dataset.compId;
        this._visibleComponentIds = this._visibleComponentIds.filter(v => v !== id);
    }

    handleReset() {
        if (this.action === 'NEW') {
            this._costgroup = JSON.parse(JSON.stringify(NEW_COSTGROUP_TEMPLATE));
        } else {
            this._costgroup = JSON.parse(JSON.stringify(this._initialCostgroup));
        }
        this._visibleComponentIds = [];
        this._selectedCompId = '';
        this.dispatchEvent(new ShowToastEvent({
            title: 'Reset',
            message: 'KPB reset uitgevoerd',
            variant: 'success'
        }));
    }

    handleFieldChange(event) {
        const { key, section, compId, subSection } = event.target.dataset;

        let val;
        if (event.target.type === 'checkbox') {
            val = event.target.checked;
        } else if (event.target.type === 'number') {
            val = event.target.value === '' ? null : parseFloat(event.target.value);
        } else {
            val = event.target.value === '' ? null : event.target.value;
        }

        const cg = JSON.parse(JSON.stringify(this._costgroup));

        if (compId !== undefined) {
            const idx = cg.components.findIndex((c, i) => compKey(c, i) === compId);
            if (idx !== -1) {
                const target = subSection ? cg.components[idx][subSection] : cg.components[idx];
                target[key] = val;
            }
        } else if (section) {
            cg[section][key] = val;
        } else {
            cg[key] = val;
        }

        this._costgroup = cg;
    }
}
