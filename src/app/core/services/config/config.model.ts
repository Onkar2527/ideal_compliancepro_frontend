export interface Config {
  company_uuid4: string;
  apiUrl: string;
  bank_name?: string;
  cco_task_set_access?: number | boolean | string;
  direct_subdept_assignment?: number | boolean | string;
}