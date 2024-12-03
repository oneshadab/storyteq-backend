export class Trade {
    /**
     * @param {Date} timestamp
     * @param {string} company
     * @param {string} orderType
     * @param {number} quantity
     */
    constructor(timestamp, company, orderType, quantity) {
        this.timestamp = timestamp;
        this.company = company;
        this.orderType = orderType;
        this.quantity = quantity;
    }
}
