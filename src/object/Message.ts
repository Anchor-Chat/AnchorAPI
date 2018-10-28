import User from "./User";

export class Message {

    author: User;
    text: string;

    constructor(author: User, text: string) {
        this.author = author;
        this.text   = text;
    }
}
export default Message;