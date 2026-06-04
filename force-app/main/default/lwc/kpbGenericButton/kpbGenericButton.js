import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import KpbPageModal from 'c/kpbPageModal';
import deleteKpb from '@salesforce/apex/KpbController.deleteKpb';
import getKpb from '@salesforce/apex/KpbController.getKpb';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;
    @api selectionCount = 0;
    @api brand;
    @api candidateName;
    @api pNumber;
    @api genericEmployeeId;
    @api genericEmployeeNumber;
    @api contactId;
    @api freelance = false;
    @api office;

    connectedCallback() {
        console.log('[kpbGenericButton] connectedCallback — label:', this.label, '| action:', this.action, '| recordId:', this.recordId, '| selectionCount:', this.selectionCount, '| brand:', this.brand, '| candidateName:', this.candidateName, '| pNumber:', this.pNumber, '| genericEmployeeId:', this.genericEmployeeId, '| genericEmployeeNumber:', this.genericEmployeeNumber, '| contactId:', this.contactId, '| freelance:', this.freelance, '| office:', this.office);
    }

    get hasSelection() {
        return Number(this.selectionCount) === 1;
    }

    _validate() {
        const count = Number(this.selectionCount);
        if (count === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer eerst een rij in één van de tabellen.',
                variant: 'warning',
                mode: 'sticky'
            }));
            return false;
        }
        if (count > 1) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer een rij in slechts één tabel.',
                variant: 'warning',
                mode: 'sticky'
            }));
            return false;
        }
        return true;
    }

    async _open(action) {
        console.log('[kpbGenericButton] _open — action:', action, '| brand:', this.brand, '| candidateName:', this.candidateName, '| recordId:', this.recordId, '| contactId:', this.contactId, '| freelance:', this.freelance, '| office:', this.office, '| pNumber:', this.pNumber, '| genericEmployeeId:', this.genericEmployeeId, '| genericEmployeeNumber:', this.genericEmployeeNumber);
        const result = await KpbPageModal.open({ recordId: this.recordId, action, brand: this.brand, candidateName: this.candidateName, pNumber: this.pNumber, genericEmployeeId: this.genericEmployeeId, genericEmployeeNumber: this.genericEmployeeNumber, contactId: this.contactId, freelance: this.freelance ? 'true' : 'false', office: this.office, size: 'large' });
        if (result?.saved) {
            this.dispatchEvent(new FlowNavigationNextEvent());
        }
    }

    handleNew() {
        this._open('NEW');
    }

    handleCopy() {
        if (this._validate()) this._open('COPY');
    }

    handleEdit() {
        if (this._validate()) this._open('EDIT');
    }

    _apiError(result) {
        try {
            const body = JSON.parse(result.result);
            const errors = body?.error_message?.errors;
            if (Array.isArray(errors) && errors.length) {
                return errors.map(e => e.error_message).join(' | ');
            }
        } catch (e) { /* fall through */ }
        return `HTTP ${result.httpCode}: ${result.result}`;
    }

    async handleDelete() {
        if (!this._validate()) return;
        console.log('[kpbGenericButton] handleDelete — pNumber:', this.pNumber, '| recordId:', this.recordId);
        try {
            const fetchResult = await getKpb({ recordId: this.recordId, pNumber: this.pNumber });
            if (fetchResult.success) {
                const raw = JSON.parse(fetchResult.result);
                const simType = (raw.costgroup || raw)?.simulation_type;
                if (simType === 'PRJ' || simType === 'OVK') {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Kan KPB van type Project/Overeenkomst niet verwijderen',
                        variant: 'error',
                        mode: 'sticky'
                    }));
                    return;
                }
            }
            const result = await deleteKpb({ kpbId: this.recordId, pNumber: this.pNumber });
            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Kostprijsberekening verwijderd.',
                    variant: 'success'
                }));
                this.dispatchEvent(new FlowNavigationNextEvent());
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Kostprijsberekening verwijderen niet toegelaten.',
                    message: this._apiError(result),
                    variant: 'error',
                mode: 'sticky'
                }));
            }
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Kostprijsberekening verwijderen niet toegelaten.',
                message: e.body?.message ?? e.message ?? 'Onbekende fout',
                variant: 'error',
                mode: 'sticky'
            }));
        }
    }
}
