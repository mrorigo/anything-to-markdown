import { AxiosResponse } from 'axios';

export interface DocumentConverterResult {
  title: string | null;
  textContent: string;
}

export interface ConvertOptions {
  fileExtension?: string;
  url?: string;
  [key: string]: any;
}

export type ConversionSource = string | AxiosResponse;

export abstract class DocumentConverter {
  abstract convert(localPath: string, options?: ConvertOptions): Promise<DocumentConverterResult | null>;
}
