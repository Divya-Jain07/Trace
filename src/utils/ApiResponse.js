export class ApiResponse {
    constructor(statusCode, message,data = null) {
        this.message = message;
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.data = data;
    }
}