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
export type WizardFeeItem = { name: string; mandatory: boolean };
// amount per fee item name, per class id: amounts[itemName][classId] = naira
export type WizardFeeAmounts = Record<string, Record<string, number>>;
export type WizardStaff = { id: string; name: string; email: string; role: string };
