export class AppError extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode: number, code: string){
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
    }
    
}

export class AuthError extends AppError {
    constructor(message: string = 'Authentication failed'){
        super(message, 401, 'AUTH_ERROR');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied'){
        super(message, 403, 'FORBIDDEN');
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed'){
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found'){
        super(message, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests'){
        super(message, 429, 'RATE_LIMIT');
    }
}