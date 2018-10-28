export class UserLogEntry {
    login: string;
    address: string;

    constructor(login: string, address: string) {
        this.login = login;
        this.address = address;
    }
}

export default UserLogEntry;