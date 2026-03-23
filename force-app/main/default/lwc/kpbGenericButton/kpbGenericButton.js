import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api json;
    @api selectedRows; // JSON string from flow datatable, e.g. '[{"Id":"...", ...}]'

    get _parsedRows() {
        try {
            return this.selectedRows ? JSON.parse(this.selectedRows) : [];
        } catch {
            return [];
        }
    }

    handleNew() {
        KpbPageModal.open({
            action: 'NEW',
            json: this.json,
            size: 'large'
        });
    }

    handleCopy() {
        const rows = this._validateSingleSelection();
        if (!rows) return;
        KpbPageModal.open({
            recordId: rows[0].Id,
            action: 'COPY',
            json: this.json,
            size: 'large'
        });
    }

    handleEdit() {
        const rows = this._validateSingleSelection();
        if (!rows) return;
        KpbPageModal.open({
            recordId: rows[0].Id,
            action: 'EDIT',
            json: this.json,
            size: 'large'
        });
    }

    _validateSingleSelection() {
        const rows = this._parsedRows;
        if (rows.length !== 1) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Selection required',
                message: 'Please select exactly 1 record from the table.',
                variant: 'warning'
            }));
            return null;
        }
        return rows;
    }
}
