import { User } from "./User";

/**
 * A mesage object
 * Contains info about the message
 */
export class Message {

    author: User;
    text: string;

    constructor(author: User, text: string) {
        this.author = author;
        this.text   = text;
    }
}