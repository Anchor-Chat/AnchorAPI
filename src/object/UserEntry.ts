/**
 * Represents a [[User]] entry in the [[AnchorAPI.userLog]] database.
 */
export class UserEntry {
    login: string;
    address: string;

    constructor(login: string, address: string) {
        this.login = login;
        this.address = address;
    }
}