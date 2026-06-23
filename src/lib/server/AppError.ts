export class AppError extends Error {
  public statusCode: number;
  public errorId?: string;
  public type: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, type: string = 'AppError', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.errorId = Math.random().toString(36).substring(7); // Generate consistent unique ID
    Error.captureStackTrace(this, this.constructor);
  }
}
