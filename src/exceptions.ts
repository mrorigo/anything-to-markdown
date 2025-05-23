export class FileConversionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileConversionException';
  }
}

export class UnsupportedFormatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatException';
  }
}
