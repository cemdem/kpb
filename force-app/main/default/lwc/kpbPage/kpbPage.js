import { LightningElement, api, track } from 'lwc';

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

const NESTED_KEYS = [
    'agreement_detail',
    'employee',
    'project',
    'reason_refusal',
    'reference_salary',
    'staffing_request',
    'audit'
];

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;
    @api json;

    @track _costgroup = null;
    @track parseError = null;

    connectedCallback() {
        this._parse();
    }

    _parse() {
        if (!this.json) return;
        try {
            const raw = JSON.parse(this.json);
            this._costgroup = raw.costgroup || raw;
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

    get components() {
        if (!this._costgroup || !Array.isArray(this._costgroup.components)) return [];
        return this._costgroup.components.map((comp, i) => ({
            id: String(comp.id != null ? comp.id : i),
            label: `Component ${i + 1} — ${comp.component_type || ''}`,
            fields: toFields(comp, `comp-${comp.id}`),
            valueFields: toFields(comp.value || {}, `comp-${comp.id}-value`),
            auditFields: toFields(comp.audit || {}, `comp-${comp.id}-audit`)
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
            const idx = cg.components.findIndex(c => String(c.id) === String(compId));
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
