export interface ResultFetchMethod<T = any> {
  success: boolean;
  error?: any | null | undefined;
  data?: T | null | undefined;
}
