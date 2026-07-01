export type WizardSchool = {
  name: string;
  shortName: string | null;
  motto: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  sections: string[];
};
export type WizardClass = { id: string; name: string; arm: string | null };
export type WizardBand = { label: string; minScore: number; maxScore: number; remark: string };
export type WizardFee = { name: string; amount: number; appliesTo: string | null; mandatory: boolean };
export type WizardStaff = { id: string; name: string; email: string; role: string };
