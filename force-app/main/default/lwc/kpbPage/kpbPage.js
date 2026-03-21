import { LightningElement, api } from 'lwc';

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;
}
